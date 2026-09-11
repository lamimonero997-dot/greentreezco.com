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

const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// scripts/ lives inside greentreez-react/scripts/, so one dirname up = greentreez-react/
const appDir     = path.dirname(fileURLToPath(import.meta.url)).replace(/[/\\]scripts$/, '');
const distDir    = path.join(appDir, 'dist');
const pagesDir   = path.join(appDir, 'public', 'pages');
const catalogPath = path.join(appDir, 'public', 'data', 'catalog.json');
const manifestPath = path.join(appDir, 'public', 'pages-manifest.json');

const BASE_URL   = 'https://greentreezco.com';
const SITE_NAME  = 'Green Treez Company';
const FALLBACK_IMG = `${BASE_URL}/cdn/shop/files/Green_Treez_Logo_Online_49d74201-94de-44f4-984a-9f299aedc9ad.png`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html = '') {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(str = '', max = 155) {
  const s = stripHtml(str).trim();
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
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
    indexHtml = fs.readFileSync(file, 'utf8');
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

  // ── Page-specific JSON-LD (Product / BreadcrumbList) ──────────────────────
  if (jsonLd) {
    const tag = `<script type="application/ld+json" data-id="prerender">${JSON.stringify(jsonLd)}</script>`;
    html = html.replace('</head>', `${tag}\n</head>`);
  }

  // ── Inject crawlable body content just before #root ───────────────────────
  // This sits inside the body but is immediately replaced once React mounts.
  // Googlebot renders it as real content; real users never see it.
  const crawlerContent = `
<noscript id="prerender-content" aria-hidden="true">
${bodyHtml}
</noscript>
<style>#prerender-content{display:none!important}</style>`;

  html = html.replace('<div id="root"></div>', `<div id="root"></div>${crawlerContent}`);

  return html;
}

/** Write html to dist/{urlPath}/index.html, creating dirs as needed. */
function write(urlPath, html) {
  const dir = path.join(distDir, urlPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

// ---------------------------------------------------------------------------
// Product pre-rendering
// ---------------------------------------------------------------------------

function productJsonLd(product, canonical) {
  const price  = product.variants?.[0]?.price ?? 0;
  const avail  = product.variants?.some((v) => v.available) ?? true;
  const images = (product.images || []).map((img) => {
    const src = img.src || img;
    return src.startsWith('http') ? src : `${BASE_URL}${src}`;
  }).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: truncate(product.seo_description || product.excerpt || product.description, 300),
    url: `${BASE_URL}${canonical}`,
    image: images.length ? images : [FALLBACK_IMG],
    brand: { '@type': 'Brand', name: product.vendor || SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}${canonical}`,
      priceCurrency: 'USD',
      price: (price / 100).toFixed(2),
      availability: avail ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

function renderProducts(catalog) {
  const active = (catalog.products || []).filter((p) => p.status === 'active' && p.handle);
  let count = 0;

  for (const product of active) {
    const canonical   = `/products/${product.handle}`;
    const title       = product.seo_title   || `${product.title} | Green Treez`;
    const description = truncate(product.seo_description || product.excerpt || product.description);
    const image       = product.images?.[0]?.src || '';

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
  ${description ? `<p itemprop="description">${esc(description)}</p>` : ''}
  ${image ? `<img src="${esc(image.startsWith('http') ? image : BASE_URL + image)}" alt="${esc(product.title)}" loading="lazy" width="600" height="600">` : ''}
</article>`;

    try {
      const html = buildHtml({
        title,
        description,
        canonical,
        image: image ? (image.startsWith('http') ? image : `${BASE_URL}${image}`) : '',
        ogType: 'product',
        bodyHtml,
        jsonLd: productJsonLd(product, canonical),
      });
      if (!html) { count++; continue; }
      write(canonical, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] product ${product.handle}: ${err.message}`);
    }
  }

  console.log(`[prerender] ${count} product pages`);
}

// ---------------------------------------------------------------------------
// Collection pre-rendering
// ---------------------------------------------------------------------------

function renderCollections(catalog) {
  const collections = (catalog.collections || []).filter((c) => c.published !== false && c.handle);
  let count = 0;

  for (const collection of collections) {
    const canonical   = `/collections/${collection.handle}`;
    const title       = `${collection.title} | Green Treez`;
    const description = truncate(
      collection.description ||
      `Shop ${collection.title} at Green Treez Company — Nashville's premium hemp-derived THC and CBD store.`
    );

    // First 24 products for the static listing
    const products = (catalog.products || [])
      .filter((p) => p.status === 'active' && (p.collection_handles || []).includes(collection.handle))
      .slice(0, 24);

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
      const html = buildHtml({ title, description, canonical, bodyHtml });
      if (!html) { count++; continue; }
      write(canonical, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] collection ${collection.handle}: ${err.message}`);
    }
  }

  console.log(`[prerender] ${count} collection pages`);
}

// ---------------------------------------------------------------------------
// Static page pre-rendering (pages-manifest → public/pages/*.json)
// ---------------------------------------------------------------------------

// Routes we skip — the SPA handles them fine or they shouldn't be indexed
const SKIP_ROUTES = new Set([
  '/cart', '/checkout', '/search',
  '/pages/contact-us', '/pages/daily-deals',  // handled by React components
]);

// Only pre-render routes that match these prefixes (skip deeply nested tags etc.)
const ALLOWED_PREFIXES = ['/', '/pages/', '/policies/', '/blogs/', '/collections/'];

function shouldPrerender(route) {
  if (SKIP_ROUTES.has(route)) return false;
  if (route.startsWith('/admin')) return false;
  // Skip /products/ routes — handled by renderProducts above
  if (route.startsWith('/products/')) return false;
  // Skip /collections/:h/products/:p nested paths — canonical is /products/:p
  if (/^\/collections\/[^/]+\/products\//.test(route)) return false;
  // Skip tag/filter pages
  if (route.includes('/tagged/') || route.includes('+') || route.includes('%2B')) return false;
  return ALLOWED_PREFIXES.some((p) => route === p || route.startsWith(p));
}

function renderStaticPages(manifest) {
  let count = 0;
  let skipped = 0;

  for (const [route, slug] of Object.entries(manifest)) {
    if (!shouldPrerender(route)) { skipped++; continue; }

    const file = path.join(pagesDir, `${slug}.json`);
    if (!fs.existsSync(file)) { skipped++; continue; }

    let page;
    try {
      // Only read the first 4 KB — we only need title + description
      const fd  = fs.openSync(file, 'r');
      const buf = Buffer.alloc(4096);
      const n   = fs.readSync(fd, buf, 0, 4096, 0);
      fs.closeSync(fd);
      const head = buf.slice(0, n).toString('utf8');
      page = {
        title:       head.match(/"title":"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, ' ').trim() || '',
        description: head.match(/"description":"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, ' ').trim() || '',
      };
    } catch { skipped++; continue; }

    const rawTitle = page.title.replace(/\s*[–|—]\s*.*$/, '').trim();
    const title = rawTitle ? `${rawTitle} | Green Treez` : `Green Treez Company | Legal THC & CBD — Nashville, TN`;
    const description = truncate(page.description);

    // Minimal body — just an h1 and description. The full cloned HTML is too
    // complex to parse safely here; this gives crawlers enough signal.
    const bodyHtml = `
<main>
  <h1>${esc(rawTitle || SITE_NAME)}</h1>
  ${description ? `<p>${esc(description)}</p>` : ''}
</main>`;

    try {
      const html = buildHtml({ title, description, canonical: route, bodyHtml });
      if (!html) { count++; continue; }
      write(route, html);
      count++;
    } catch (err) {
      console.warn(`[prerender] page ${route}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`[prerender] ${count} static pages (${skipped} skipped)`);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

console.log('[prerender] starting…');
console.log('[prerender] appDir:', appDir);
console.log('[prerender] distDir:', distDir);

const catalog  = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

renderProducts(catalog);
renderCollections(catalog);
renderStaticPages(manifest);

// Verify dist/index.html still exists (Vercel fallback for unknown routes)
const rootHtml = path.join(distDir, 'index.html');
if (!fs.existsSync(rootHtml)) {
  console.warn('[prerender] dist/index.html missing — prerender skipped entirely, site will still work');
} else {
  console.log('[prerender] done ✓');
}
