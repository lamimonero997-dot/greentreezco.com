/**
 * prerender.mjs
 *
 * Runs after `vite build`. For every product, collection, and static page URL
 * it writes a standalone HTML file under dist/ containing:
 *
 *   - The full <head> from the built index.html (with per-page title,
 *     meta description, canonical, Open Graph, Twitter Card, and
 *     Product JSON-LD overwritten so Googlebot sees real metadata)
 *   - A lightweight <body> with the visible text content (h1, description,
 *     product details, collection product list) that crawlers can read
 *     before JavaScript executes
 *   - The same <script type="module" src="/src/main.jsx"> entry point so
 *     React hydrates normally for real users
 *
 * Strategy:
 *   Products   → /products/:handle/index.html  (from catalog.json)
 *   Collections→ /collections/:handle/index.html (from catalog.json)
 *   Pages/blogs→ /pages/:slug/index.html etc.  (from pages-manifest + page JSON)
 *
 * No headless browser, no React server rendering, no extra dependencies.
 * Pure Node — reads static data files, produces static HTML files.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Shared with src/lib/seo.js so the prerendered head and the head React writes
// after hydration format titles and descriptions identically. If only the build
// cleaned the captured titles, hydration would overwrite them with the raw ones
// and Google - which indexes the rendered DOM - would never see the clean copy.
import {
  cleanTitle,
  composeTitle,
  fixMojibake,
  stripHtml,
  truncate,
} from '../src/lib/seoText.js';

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// scripts/ lives inside greentreez-react/scripts/, so one dirname up = greentreez-react/
const appDir     = path.dirname(fileURLToPath(import.meta.url)).replace(/[/\\]scripts$/, '');
const distDir    = path.join(appDir, 'dist');
const pagesDir   = path.join(appDir, 'public', 'pages');
const catalogPath = path.join(appDir, 'public', 'data', 'catalog.json');
const manifestPath = path.join(appDir, 'public', 'pages-manifest.json');

const BASE_URL   = 'https://www.greentreezco.com';
const SITE_NAME  = 'Green Treez Company';
const FALLBACK_IMG = `${BASE_URL}/cdn/shop/files/Green_Treez_Logo_Online_49d74201-94de-44f4-984a-9f299aedc9ad.png`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function esc(str = '') {
  return fixMojibake(String(str))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Read the built index.html once and cache it. */
let indexHtml = null;
function getIndexHtml() {
  if (!indexHtml) {
    const file = path.join(distDir, 'index.html');
    if (!fs.existsSync(file)) {
      // Vercel may place the output directory differently — try to find it
      console.warn('[prerender] dist/index.html not found at', file);
      console.warn('[prerender] dist contents:', fs.existsSync(distDir) ? fs.readdirSync(distDir).slice(0, 10) : 'dist dir missing');
      return null;
    }
    // The homepage prerender overwrites dist/index.html, so a second run
    // against the same dist would read an already-rendered page as its shell
    // and nest the output. Strip anything a previous run injected.
    indexHtml = fs
      .readFileSync(file, 'utf8')
      .replace(/<div id="root">[\s\S]*?<\/div>\s*<\/div>/, '<div id="root"></div>')
      .replace(/<script type="application\/ld\+json" data-id="prerender">[\s\S]*?<\/script>\n?/g, '')
      .replace(/<style>#prerender-content\{[\s\S]*?<\/style>\n?/g, '');
  }
  return indexHtml;
}

/**
 * Replace the SEO tags in the built index.html head with page-specific values,
 * then append a static <body> section with crawlable content.
 */
function buildHtml({ title, description, canonical, image, ogType = 'website', bodyHtml, jsonLd }) {
  const shell = getIndexHtml();
  if (!shell) return null; // prerender skipped, not fatal

  let html = shell;
  const absImage     = (image || '').startsWith('http') ? image : image ? `${BASE_URL}${image}` : FALLBACK_IMG;
  // Self-referencing canonical. Without this every prerendered page inherits the
  // hardcoded homepage canonical from index.html, which tells Google all 1,700
  // URLs are duplicates of "/" — the site then indexes as a single page.
  const absCanonical = (canonical || '').startsWith('http')
    ? canonical
    : `${BASE_URL}${canonical || '/'}`;
  const safeTitle    = esc(title);
  const safeDesc     = esc(description);

  // ── <title> ──────────────────────────────────────────────────────────────
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${safeTitle}</title>`
  );

  // ── meta description ─────────────────────────────────────────────────────
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${safeDesc}"`
  );

  // ── canonical ─────────────────────────────────────────────────────────────
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${esc(absCanonical)}"`
  );

  // ── Open Graph ────────────────────────────────────────────────────────────
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/,       `$1${safeTitle}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/,  `$1${safeDesc}$2`);
  html = html.replace(/(<meta property="og:type" content=")[^"]*(")/,         `$1${esc(ogType)}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/,          `$1${esc(absCanonical)}$2`);
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/,        `$1${esc(absImage)}$2`);

  // ── Twitter Card ──────────────────────────────────────────────────────────
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/,       `$1${safeTitle}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/,  `$1${safeDesc}$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/,        `$1${esc(absImage)}$2`);

  // ── Page-specific JSON-LD (Product / BreadcrumbList / ItemList) ───────────
  const blocks = (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean);
  if (blocks.length) {
    const tags = blocks
      .map((block) => `<script type="application/ld+json" data-id="prerender">${JSON.stringify(block)}</script>`)
      .join('\n');
    html = html.replace('</head>', `${tags}\n</head>`);
  }

  // Keep the pre-hydration paint readable rather than raw unstyled markup. The
  // theme stylesheet loads async, so this is what shows for the first frame.
  html = html.replace(
    '</head>',
    `<style>#prerender-content{max-width:68rem;margin:0 auto;padding:2rem 1.25rem;` +
      `font:16px/1.6 Poppins,system-ui,-apple-system,sans-serif;color:#1b1b1b}` +
      `#prerender-content h1{font-size:1.75rem;margin:0 0 .5rem}` +
      `#prerender-content nav ol{list-style:none;display:flex;flex-wrap:wrap;gap:.5rem;padding:0;` +
      `margin:0 0 1rem;font-size:.85rem;color:#5c6b5c}` +
      `#prerender-content ul{list-style:none;padding:0}` +
      `#prerender-content img{max-width:100%;height:auto}` +
      `#prerender-content a{color:#2f5d34}</style>\n</head>`
  );

  // ── Crawlable body content ────────────────────────────────────────────────
  // This goes *inside* #root, not into a hidden <noscript>. Googlebot renders
  // with JavaScript enabled, so it never parses <noscript> content as DOM — the
  // previous placement meant the crawlable copy was invisible to the very
  // crawler it existed for, and hiding it behind display:none reads as cloaking
  // besides. React's createRoot().render() clears #root's children on mount, so
  // real users see this only until hydration and the markup they end up with
  // matches what the crawler was served.
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root"><div id="prerender-content">${bodyHtml}</div></div>`
  );

  return html;
}

/**
 * Writes html to dist/{urlPath}.html — "/products/foo" → dist/products/foo.html.
 *
 * Flat files rather than {urlPath}/index.html because vercel.json sets
 * cleanUrls, whose contract is exactly this: serve "/products/foo" from
 * products/foo.html and redirect the .html form back to the clean one. The
 * directory-index layout depends on the host resolving a directory to its
 * index before falling through to the SPA rewrite — which `vite preview`, for
 * one, does not do. A page that falls through is served as the empty shell
 * again, which is the whole failure being fixed here, so it is worth not
 * leaving to host-specific behaviour.
 *
 * The homepage is the exception: it is dist/index.html, the SPA fallback that
 * every unmatched route rewrites to.
 */
function write(urlPath, html) {
  const route = urlPath.replace(/\/+$/, '');
  const file = route === '' || route === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, `${route}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
}

// ---------------------------------------------------------------------------
// Product pre-rendering
// ---------------------------------------------------------------------------

/**
 * A meta description built from this product's own data.
 *
 * The captured catalog reuses the same boilerplate across whole categories —
 * 1,226 of 1,716 active products share a description with at least one other
 * product, and 45 have none at all. Duplicate descriptions across a site this
 * size are a direct reason for Google to drop pages from the index, so any
 * description that is blank or shared gets replaced with one composed from the
 * fields that actually differ per product.
 */
function composeProductDescription(product) {
  const facts = [];
  if (product.strain) facts.push(product.strain);
  if (product.product_type) facts.push(product.product_type);
  const what = facts.join(' ') || 'hemp product';

  const sizes = (product.variants || [])
    .map((variant) => variant.title)
    .filter((title) => title && title !== 'Default' && title !== 'Default Title');
  const available = (product.variants || []).filter((variant) => variant.available);
  const cheapest = (available.length ? available : product.variants || [])
    .map((variant) => Number(variant.price || 0))
    .filter((price) => price > 0)
    .sort((a, b) => a - b)[0];

  const parts = [`${product.title} — ${what}`];
  if (product.vendor && product.vendor !== SITE_NAME) parts[0] += ` by ${product.vendor}`;
  parts[0] += '.';

  if (sizes.length > 1) parts.push(`Available in ${sizes.slice(0, 3).join(', ')}.`);
  else if (sizes.length === 1) parts.push(`${sizes[0]}.`);

  if (cheapest) parts.push(`${sizes.length > 1 ? 'From ' : ''}${money(cheapest)}.`);
  if (product.psychoactivity && product.psychoactivity !== 'None') {
    parts.push(`${product.psychoactivity} psychoactivity.`);
  }
  parts.push('Lab-tested and hemp-derived. Shop online at Green Treez Company in Nashville, TN.');

  return truncate(parts.join(' '));
}

/**
 * Picks the best description for a product and guarantees it is unique across
 * the build. `seen` carries descriptions already used by earlier products.
 */
function productDescription(product, seen) {
  const captured = truncate(product.seo_description || product.excerpt || product.description);
  if (captured && !seen.has(captured.toLowerCase())) {
    seen.add(captured.toLowerCase());
    return captured;
  }
  const composed = composeProductDescription(product);
  if (!seen.has(composed.toLowerCase())) {
    seen.add(composed.toLowerCase());
    return composed;
  }

  // Two catalog entries describe the same item (usually a "-1" duplicate
  // handle). Lead with the size or SKU so the two pages at least do not ship
  // byte-identical descriptions — see the duplicate report at the end of the
  // build for the pairs that should really be merged or canonicalised.
  const marker =
    (product.variants || []).map((v) => v.title).find((t) => t && t !== 'Default') ||
    (product.variants || [])[0]?.sku ||
    product.handle;
  const distinct = truncate(`${marker} · ${composed}`);
  seen.add(distinct.toLowerCase());
  return distinct;
}

/**
 * A unique <title> per product.
 *
 * Two things cause collisions. 53 captured seo_titles are shared outright by
 * 2-3 products, and — more of them — many captured titles share a long common
 * prefix ("Green Treez Company Craft Primo THCa Preroll | …"), so trimming them
 * to fit the 60-character budget collapses distinct products onto one title.
 * Each candidate is therefore checked against the titles already used, falling
 * back to the product's own name and then to distinguishing attributes.
 */
function productTitle(product, seen) {
  const captured = cleanTitle(product.seo_title || '');
  const own = cleanTitle(product.title);
  const size = (product.variants || []).map((v) => v.title).find((t) => t && t !== 'Default');

  const candidates = [
    captured,
    own,
    // The product name leads so the unique part is never the part that is cut.
    captured && own && !captured.startsWith(own) ? `${own} ${captured}` : '',
    [own, product.strain].filter(Boolean).join(' '),
    [own, product.product_type].filter(Boolean).join(' '),
    [own, size].filter(Boolean).join(' '),
    [own, product.vendor].filter(Boolean).join(' '),
    [own, product.strain, size, product.vendor].filter(Boolean).join(' '),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const title = composeTitle(candidate);
    if (!seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      return title;
    }
  }

  // Nothing distinguished it; the handle is unique by definition.
  const title = composeTitle(`${own} ${product.handle.split('-').slice(-2).join(' ')}`);
  seen.add(title.toLowerCase());
  return title;
}

function breadcrumbJsonLd(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path}`,
    })),
  };
}

function productJsonLd(product, canonical, description) {
  const price  = product.variants?.[0]?.price ?? 0;
  const avail  = product.variants?.some((v) => v.available) ?? true;
  const images = (product.images || []).map((img) => {
    const src = img.src || img;
    return src.startsWith('http') ? src : `${BASE_URL}${src}`;
  }).filter(Boolean);

  const sku = product.variants?.[0]?.sku || undefined;
  // Offers must stay valid for Google's merchant listings; a year out is the
  // convention for a catalog without dated pricing.
  const validUntil = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: description || truncate(product.description, 300),
    url: `${BASE_URL}${canonical}`,
    image: images.length ? images : [FALLBACK_IMG],
    brand: { '@type': 'Brand', name: product.vendor || SITE_NAME },
    ...(sku ? { sku, mpn: sku } : {}),
    ...(product.product_type ? { category: product.product_type } : {}),
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}${canonical}`,
      priceCurrency: 'USD',
      price: (price / 100).toFixed(2),
      priceValidUntil: validUntil,
      itemCondition: 'https://schema.org/NewCondition',
      availability: avail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME, url: BASE_URL },
    },
  };
}

/**
 * Titles and descriptions already used by this build.
 *
 * Shared across every renderer, not per-renderer: a product page and a
 * content page can otherwise land on the same title, which is how
 * /pages/care-packages and /products/green-treez-company-gift-card ended up
 * with identical <title> tags.
 */
const SEEN_TITLES = new Set();
const SEEN_DESCRIPTIONS = new Set();

function renderProducts(catalog) {
  const active = (catalog.products || []).filter((p) => p.status === 'active' && p.handle);
  let count = 0;
  let composed = 0;

  for (const product of active) {
    const canonical   = `/products/${product.handle}`;
    const title       = productTitle(product, SEEN_TITLES);
    const captured    = truncate(product.seo_description || product.excerpt || product.description);
    const description = productDescription(product, SEEN_DESCRIPTIONS);
    if (description !== captured) composed++;
    const image       = product.images?.[0]?.src || '';
    // The body carries the full copy; the meta description is the trimmed version.
    const fullDescription = truncate(product.description, 900);

    // Variant price line
    const prices = (product.variants || [])
      .filter((v) => v.available)
      .map((v) => money(v.price));
    const priceStr = prices.length
      ? (prices.length === 1 ? prices[0] : `From ${prices[0]}`)
      : 'Contact for price';

    // Variant options (size picker)
    const variantLines = (product.variants || [])
      .filter((v) => v.title && v.title !== 'Default')
      .map((v) => `<li>${esc(v.title)} — ${money(v.price)}${v.available ? '' : ' (Out of stock)'}</li>`)
      .join('\n');

    // Collection breadcrumb label
    const collHandle   = (product.collection_handles || []).find((h) => h !== 'all-thc-and-cbd-products') || 'all-thc-and-cbd-products';
    const collection   = (catalog.collections || []).find((c) => c.handle === collHandle);
    const collTitle    = collection?.title || 'All Products';

    const bodyHtml = `
<article itemscope itemtype="https://schema.org/Product">
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/collections/${esc(collHandle)}">${esc(collTitle)}</a></li>
      <li><span aria-current="page">${esc(product.title)}</span></li>
    </ol>
  </nav>
  <h1 itemprop="name">${esc(product.title)}</h1>
  ${product.vendor ? `<p itemprop="brand">${esc(product.vendor)}</p>` : ''}
  ${product.product_type ? `<p>${esc(product.product_type)}</p>` : ''}
  ${product.strain ? `<p>Strain: ${esc(product.strain)}</p>` : ''}
  <p itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <span itemprop="price" content="${(product.variants?.[0]?.price || 0) / 100}">${priceStr}</span>
  </p>
  ${variantLines ? `<ul>${variantLines}</ul>` : ''}
  ${image ? `<img src="${esc(image.startsWith('http') ? image : BASE_URL + image)}" alt="${esc(product.title)}" loading="lazy" width="600" height="600">` : ''}
  ${description ? `<p itemprop="description">${esc(description)}</p>` : ''}
  ${fullDescription && fullDescription !== description ? `<div>${esc(fullDescription)}</div>` : ''}
  ${product.lab_report_url ? `<p><a href="${esc(product.lab_report_url)}" rel="nofollow">Certificate of analysis (lab report)</a></p>` : ''}
</article>`;

    try {
      const html = buildHtml({
        title,
        description,
        canonical,
        image: image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : '',
        ogType: 'product',
        bodyHtml,
        jsonLd: [
          productJsonLd(product, canonical, description),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: collTitle, path: `/collections/${collHandle}` },
            { name: product.title, path: canonical },
          ]),
        ],
      });
      if (!html) { count++; continue; }
      write(canonical, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] product ${product.handle}: ${err.message}`);
    }
  }

  console.log(
    `[prerender] ${count} product pages (${composed} descriptions composed from product data ` +
      'to replace blank or duplicated copy)'
  );

  // Products that are the same listing twice. Each one is a pair of URLs
  // competing for the same query, which is a self-inflicted duplicate-content
  // problem no amount of metadata can fix — they want merging in the catalog,
  // or a canonical from the copy to the original.
  const byIdentity = new Map();
  for (const product of active) {
    const key = `${cleanTitle(product.title).toLowerCase()}|${product.product_type}|${product.vendor}`;
    if (!byIdentity.has(key)) byIdentity.set(key, []);
    byIdentity.get(key).push(product.handle);
  }
  const duplicates = [...byIdentity.values()].filter((handles) => handles.length > 1);
  if (duplicates.length) {
    console.warn(
      `[prerender] ${duplicates.length} products are listed more than once under different handles ` +
        '— these compete with each other in search and should be merged or canonicalised:'
    );
    for (const handles of duplicates.slice(0, 10)) console.warn(`[prerender]   ${handles.join('  ↔  ')}`);
    if (duplicates.length > 10) console.warn(`[prerender]   …and ${duplicates.length - 10} more`);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Collection pre-rendering
// ---------------------------------------------------------------------------

function renderCollections(catalog) {
  const collections = (catalog.collections || []).filter(
    (c) =>
      c.published !== false &&
      c.handle &&
      // The four "in-stock-<city>" collections redirect to "/" in the app.
      !isLocationRoute(`/collections/${c.handle}`)
  );
  let count = 0;

  for (const collection of collections) {
    const canonical = `/collections/${collection.handle}`;
    const title = uniqueValue(
      [collection.title, `${collection.title} THC & CBD`, `Shop ${collection.title} Nashville TN`],
      SEEN_TITLES,
      composeTitle
    );

    const all = (catalog.products || []).filter(
      (p) => p.status === 'active' && (p.collection_handles || []).includes(collection.handle)
    );

    // A description built from what is actually in the collection, so no two
    // category pages share the same generic "Shop X at Green Treez" line.
    const types = [...new Set(all.map((p) => p.product_type).filter(Boolean))].slice(0, 3);
    const lowest = all
      .flatMap((p) => (p.variants || []).map((v) => Number(v.price || 0)))
      .filter((price) => price > 0)
      .sort((a, b) => a - b)[0];
    const composedDescription = [
      `Shop ${all.length} ${collection.title} product${all.length === 1 ? '' : 's'} at Green Treez Company, Nashville TN.`,
      types.length ? `${types.join(', ')}.` : '',
      lowest ? `From ${money(lowest)}.` : '',
      'Lab-tested, hemp-derived, with free shipping across Tennessee.',
    ]
      .filter(Boolean)
      .join(' ');

    const description = uniqueValue(
      [collection.description, composedDescription],
      SEEN_DESCRIPTIONS,
      (value) => truncate(value)
    );

    // First 24 products for the static listing
    const products = all.slice(0, 24);

    const productItems = products.map((p) => {
      const price = p.variants?.find((v) => v.available)?.price ?? p.variants?.[0]?.price ?? 0;
      const img   = p.images?.[0]?.src || '';
      return `<li itemscope itemtype="https://schema.org/Product">
  <a href="/products/${esc(p.handle)}">
    ${img ? `<img src="${esc(img.startsWith('http') ? img : BASE_URL + img)}" alt="${esc(p.title)}" loading="lazy" width="300" height="300">` : ''}
    <span itemprop="name">${esc(p.title)}</span>
    <span itemprop="offers" itemscope itemtype="https://schema.org/Offer">
      <span itemprop="price" content="${(price / 100).toFixed(2)}">${money(price)}</span>
    </span>
  </a>
</li>`;
    }).join('\n');

    const bodyHtml = `
<section>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><span aria-current="page">${esc(collection.title)}</span></li>
    </ol>
  </nav>
  <h1>${esc(collection.title)}</h1>
  ${description ? `<p>${esc(description)}</p>` : ''}
  <ul>
    ${productItems}
  </ul>
</section>`;

    try {
      const html = buildHtml({
        title,
        description,
        canonical,
        image: collection.image || '',
        bodyHtml,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: collection.title,
            description,
            url: `${BASE_URL}${canonical}`,
            isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: BASE_URL },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: all.length,
              itemListElement: products.map((p, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${BASE_URL}/products/${p.handle}`,
                name: p.title,
              })),
            },
          },
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: collection.title, path: canonical },
          ]),
        ],
      });
      if (!html) { count++; continue; }
      write(canonical, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] collection ${collection.handle}: ${err.message}`);
    }
  }

  console.log(`[prerender] ${count} collection pages`);
  return count;
}

// ---------------------------------------------------------------------------
// Static page pre-rendering (pages-manifest → public/pages/*.json)
// ---------------------------------------------------------------------------

// Routes we skip — transactional or duplicate, and not worth indexing.
const SKIP_ROUTES = new Set(['/cart', '/checkout', '/search']);

/**
 * Routes rendered by a React component rather than captured page JSON.
 *
 * They still need a prerendered shell: without one they deploy with the
 * homepage canonical from index.html, and /pages/contact-us is in the sitemap.
 * Metadata mirrors the updateSEO() calls in the components so the crawled and
 * the hydrated head agree.
 */
const REACT_ROUTES = [
  {
    route: '/pages/contact-us',
    title: 'Contact Green Treez Company | Nashville THC & CBD Store',
    description:
      'Get in touch with Green Treez Company in Nashville, TN. Call, email, or visit us at 850 Hillwood Blvd Ste 7, Nashville, TN 37209.',
    heading: 'Contact Green Treez Company',
    paragraphs: [
      'Questions about an order, a product, or a lab report? Call or email the Nashville store and a member of the team will get back to you the same day during opening hours.',
      'Visit us at 850 Hillwood Blvd Ste 7, Nashville, TN 37209. Open Monday to Saturday 10am–8pm and Sunday 12pm–6pm.',
    ],
  },
  {
    route: '/pages/daily-deals',
    title: 'Specials & Deals | Green Treez Nashville THC & CBD',
    description:
      'Browse current deals on hemp-derived THC and CBD products at Green Treez Company, Nashville TN. Edibles, THCA flower, vapes, and more — lab tested.',
    heading: 'Specials & Deals',
    paragraphs: [
      'Current offers on hemp-derived THC and CBD products at Green Treez Company in Nashville, Tennessee. Deals rotate weekly across THCA flower, prerolls, edibles, disposables, and cartridges.',
      'Every product is lab tested and hemp-derived, with free shipping on Tennessee orders over $150.',
    ],
  },
];

function renderReactRoutes() {
  let count = 0;
  for (const page of REACT_ROUTES) {
    const bodyHtml = `
<main>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><span aria-current="page">${esc(page.heading)}</span></li>
    </ol>
  </nav>
  <h1>${esc(page.heading)}</h1>
  ${page.paragraphs.map((text) => `<p>${esc(text)}</p>`).join('\n  ')}
</main>`;
    try {
      const html = buildHtml({
        title: page.title,
        description: page.description,
        canonical: page.route,
        bodyHtml,
        jsonLd: breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.heading, path: page.route },
        ]),
      });
      if (!html) continue;
      write(page.route, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] react route ${page.route}: ${err.message}`);
    }
  }
  console.log(`[prerender] ${count} React-rendered pages`);
  return count;
}

// Only pre-render routes that match these prefixes (skip deeply nested tags etc.)
const ALLOWED_PREFIXES = ['/', '/pages/', '/policies/', '/blogs/', '/collections/'];

/**
 * Routes the app redirects to "/" (src/lib/sanitize.js: isLocationRoute). The
 * scraped storefront had four physical stores this one does not, so these pages
 * are deliberately dead. Prerendering them would publish indexable pages for
 * locations that do not exist and hand Google a redirect where the sitemap
 * promised a 200.
 */
const LOCATION_PATHS = new Set([
  '/pages/shop-by-location-green-treez-dispensary-stores',
  '/pages/shop-by-location-store-inventory',
  '/pages/dispensary-store-locations',
  '/pages/visit-dispensary-store-locations-in-tennessee-and-north-carolina',
  '/pages/nashville-dispensary',
  '/pages/nashville-dispensary-offers',
  '/pages/hendersonville-dispensary',
  '/pages/waynesville-nc-dispensary',
  '/pages/dispensary-morganton-nc',
  '/pages/store-locator',
  '/pages/north-carolina-thc-dispensary-locations-green-treez-company-waynesville-wnc',
  '/pages/hillwood-heights-dispensary-tn',
  '/pages/green-treez-company-dispensary-thc-and-cbd-warehouse-outlet-morganton-nc',
]);

export function isLocationRoute(route = '') {
  const path = route.replace(/\/+$/, '').toLowerCase() || '/';
  return (
    LOCATION_PATHS.has(path) ||
    path.startsWith('/collections/in-stock-') ||
    path.startsWith('/pages/thc-dispensary-near-me-')
  );
}

function shouldPrerender(route) {
  if (SKIP_ROUTES.has(route)) return false;
  if (route.startsWith('/admin')) return false;
  if (isLocationRoute(route)) return false;
  // Skip /products/ routes — handled by renderProducts above
  if (route.startsWith('/products/')) return false;
  // Skip /collections/:h/products/:p nested paths — canonical is /products/:p
  if (/^\/collections\/[^/]+\/products\//.test(route)) return false;
  // Skip tag/filter pages
  if (route.includes('/tagged/') || route.includes('+') || route.includes('%2B')) return false;
  return ALLOWED_PREFIXES.some((p) => route === p || route.startsWith(p));
}

/**
 * Pulls the readable copy out of a captured Shopify page.
 *
 * The markup is a full theme render, so most of it is chrome. Taking the h1 and
 * the longest paragraphs gets the page's actual subject matter without trying
 * to parse the whole document.
 */
function extractContent(html) {
  const body = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:nav|header|footer)[\s\S]*?<\/(?:nav|header|footer)>/gi, ' ');

  const grab = (tag, limit) => [
    ...new Set(
      [...body.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi'))]
        .map((match) => stripHtml(match[1]))
        .filter(Boolean)
    ),
  ].slice(0, limit);

  // Theme chrome that survives the tag stripping above — cart drawer labels,
  // the skip link, the announcement bar. Left in, it becomes the meta
  // description for any page whose own description was never captured.
  const CHROME =
    /skip to content|unit price|gift message|add to cart|your cart|shopping cart|subscribe|free shipping into tn|log in|create account|this field is required|check ?out|at least 21 years old|by checking this box/i;

  const paragraphs = grab('p', 40)
    // Skip nav crumbs, prices, and one-word cell text.
    .filter((text) => text.length > 80 && !CHROME.test(text))
    .slice(0, 8);

  return {
    heading: grab('h1', 1)[0] || '',
    subheadings: grab('h2', 6).filter((text) => text.length < 120),
    paragraphs,
  };
}

/**
 * Returns the first candidate that formats to something not already used,
 * recording it in `seen`. The last candidate wins by default so the caller's
 * final fallback is always what ships rather than an empty string.
 */
function uniqueValue(candidates, seen, format) {
  for (const candidate of candidates) {
    const value = format(candidate);
    if (value && !seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase());
      return value;
    }
  }
  const last = format(candidates[candidates.length - 1] || '');
  seen.add(last.toLowerCase());
  return last;
}

function renderStaticPages(manifest) {
  let count = 0;
  let skipped = 0;
  let missingSource = 0;

  for (const [route, slug] of Object.entries(manifest)) {
    if (!shouldPrerender(route)) { skipped++; continue; }

    const file = path.join(pagesDir, `${slug}.json`);
    if (!fs.existsSync(file)) { missingSource++; skipped++; continue; }

    let page;
    try {
      page = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch { skipped++; continue; }

    const rawTitle = cleanTitle(String(page.title || '').replace(/\s*[–|—]\s*[^–|—]*$/, ''));
    const extracted = extractContent(page.html || '');

    // Several captured pages share a title or a description with another page,
    // and two have neither once theme chrome is filtered out. Fall back to the
    // page's own heading and route so no two pages ship identical metadata.
    const slugWords = route.split('/').pop().replace(/-/g, ' ').trim();
    const title = uniqueValue(
      [rawTitle, extracted.heading, `${rawTitle} ${extracted.heading}`, slugWords].filter(Boolean),
      SEEN_TITLES,
      composeTitle
    );
    const description = uniqueValue(
      [
        page.description,
        extracted.paragraphs[0],
        extracted.subheadings.length ? `${rawTitle}. ${extracted.subheadings.join('. ')}.` : '',
        `${rawTitle || slugWords} at Green Treez Company, Nashville TN. Lab-tested hemp-derived THC and CBD, with free shipping across Tennessee.`,
      ].filter(Boolean),
      SEEN_DESCRIPTIONS,
      (value) => truncate(value)
    );

    // Real page copy, not just an h1. A page whose only crawlable content is its
    // own title is a thin page, and thin pages get crawled then dropped.
    const bodyHtml = `
<main>
  <nav aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><span aria-current="page">${esc(rawTitle || SITE_NAME)}</span></li>
    </ol>
  </nav>
  <h1>${esc(extracted.heading || rawTitle || SITE_NAME)}</h1>
  ${description ? `<p>${esc(description)}</p>` : ''}
  ${extracted.paragraphs.map((text) => `<p>${esc(text)}</p>`).join('\n  ')}
  ${extracted.subheadings.map((text) => `<h2>${esc(text)}</h2>`).join('\n  ')}
</main>`;

    try {
      const heading = extracted.heading || rawTitle || SITE_NAME;
      const html = buildHtml({
        title,
        description,
        canonical: route,
        bodyHtml,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: heading,
            description,
            url: `${BASE_URL}${route}`,
            isPartOf: { '@id': `${BASE_URL}/#website` },
            publisher: { '@id': `${BASE_URL}/#organization` },
          },
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: heading, path: route },
          ]),
        ],
      });
      if (!html) { count++; continue; }
      write(route, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] page ${route}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`[prerender] ${count} static pages (${skipped} skipped)`);
  if (missingSource) {
    console.warn(
      `[prerender] ${missingSource} manifest routes have no captured JSON in public/pages ` +
        '(all /blogs/* routes among them) — these 404 in the app and are excluded from the sitemap'
    );
  }
  return count;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

console.log('[prerender] starting…');
console.log('[prerender] appDir:', appDir);
console.log('[prerender] distDir:', distDir);

const catalog  = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const written =
  renderProducts(catalog) +
  renderCollections(catalog) +
  renderStaticPages(manifest) +
  renderReactRoutes();

// Verify dist/index.html still exists (Vercel fallback for unknown routes)
const rootHtml = path.join(distDir, 'index.html');
if (!fs.existsSync(rootHtml)) {
  console.warn('[prerender] dist/index.html missing — prerender skipped entirely, site will still work');
} else {
  console.log(`[prerender] done ✓ — ${written} pages written`);
}

/**
 * Writing nothing is not a warning, it is a broken build.
 *
 * Every caller here wraps buildHtml in a try/catch that logs and continues, so
 * a single typo inside buildHtml (an undefined `absCanonical`, as it happens)
 * silently produced zero pages while the build stayed green. The deploy then
 * served the same empty SPA shell for all 1,700 URLs, which is what collapsed
 * the site to one indexed page. A per-page failure still only warns; producing
 * no pages at all stops the build.
 */
if (written === 0 && (catalog.products || []).length > 0) {
  console.error(
    '[prerender] FAILED: 0 pages written from a catalog of ' +
      `${catalog.products.length} products. Every URL would deploy as the same empty shell.`
  );
  process.exit(1);
}
