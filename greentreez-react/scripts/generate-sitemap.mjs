/**
 * Generates public/sitemap.xml from the local catalog.
 *
 * Run manually:   node scripts/generate-sitemap.mjs
 * Or via npm:     npm run sitemap
 *
 * Includes:
 *   - Static pages (home, contact, deals, collections index)
 *   - Every published collection  (/collections/:handle)
 *   - Every active product        (/products/:handle)
 *
 * Excludes admin, checkout, cart — they are already blocked in robots.txt.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(root, '..');
const catalogPath = path.join(projectDir, 'public', 'data', 'catalog.json');
const manifestPath = path.join(projectDir, 'public', 'pages-manifest.json');
const pagesDir = path.join(projectDir, 'public', 'pages');
const outPath = path.join(projectDir, 'public', 'sitemap.xml');

const BASE_URL = 'https://www.greentreezco.com';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function url({ loc, lastmod = today(), changefreq = 'weekly', priority = '0.7' }) {
  return [
    '  <url>',
    `    <loc>${BASE_URL}${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

// Static pages with known importance
const STATIC_PAGES = [
  { loc: '/',                          changefreq: 'daily',  priority: '1.0' },
  { loc: '/collections/all-thc-and-cbd-products', changefreq: 'daily',  priority: '0.9' },
  { loc: '/pages/daily-deals',         changefreq: 'daily',  priority: '0.8' },
  { loc: '/pages/contact-us',          changefreq: 'monthly', priority: '0.6' },
  { loc: '/pages/certificates-of-analysis-lab-reports', changefreq: 'monthly', priority: '0.5' },
  { loc: '/pages/wholesale-and-distribution', changefreq: 'monthly', priority: '0.5' },
];

/**
 * Routes the app redirects to "/" (src/lib/sanitize.js: isLocationRoute).
 * A sitemap URL that redirects is a crawl-budget leak and a "Page with
 * redirect" exclusion in Search Console, so they never belong here.
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

function isLocationRoute(route = '') {
  const path = route.replace(/\/+$/, '').toLowerCase() || '/';
  return (
    LOCATION_PATHS.has(path) ||
    path.startsWith('/collections/in-stock-') ||
    path.startsWith('/pages/thc-dispensary-near-me-')
  );
}

// Never indexable, or handled elsewhere in this file.
const EXCLUDED_ROUTES = new Set([
  '/', '/cart', '/checkout', '/search',
  ...STATIC_PAGES.map((page) => page.loc),
]);

/**
 * Content pages captured into public/pages — /pages/* and /policies/*.
 *
 * Only routes whose JSON actually exists on disk are listed. The manifest
 * carries 2,857 routes but only 53 were ever captured; every /blogs/* route
 * among them resolves to a missing file and 404s in the app, so listing them
 * would fill the sitemap with URLs that do not exist.
 */
function contentPages() {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    console.warn('[sitemap] No pages-manifest.json — skipping content pages');
    return [];
  }

  const routes = [];
  let missing = 0;

  for (const [route, slug] of Object.entries(manifest)) {
    if (EXCLUDED_ROUTES.has(route) || isLocationRoute(route)) continue;
    if (!/^\/(pages|policies)\//.test(route)) {
      // /blogs/* is counted so the gap gets reported rather than hidden.
      if (route.startsWith('/blogs/')) missing++;
      continue;
    }
    if (!fs.existsSync(path.join(pagesDir, `${slug}.json`))) {
      missing++;
      continue;
    }
    routes.push({
      loc: route,
      changefreq: 'monthly',
      priority: route.startsWith('/policies/') ? '0.3' : '0.5',
    });
  }

  console.log(`[sitemap] ${routes.length} content pages (${missing} routes skipped — no captured content)`);
  return routes;
}

let catalog;
try {
  catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
} catch {
  console.error(`[sitemap] Could not read catalog at ${catalogPath}`);
  process.exit(1);
}

const products = (catalog.products || []).filter((p) => p.status === 'active' && p.handle);
const collections = (catalog.collections || []).filter((c) => c.published !== false && c.handle);

console.log(`[sitemap] ${products.length} active products, ${collections.length} collections`);

const entries = [
  // Static pages
  ...STATIC_PAGES.map(url),

  // Captured /pages/* and /policies/* content
  ...contentPages().map(url),

  // Collections — high priority, change often as products are added
  ...collections
    .filter((c) => c.handle !== 'all-thc-and-cbd-products') // already in static
    .filter((c) => !isLocationRoute(`/collections/${c.handle}`)) // redirects to /
    .map((c) =>
      url({
        loc: `/collections/${c.handle}`,
        changefreq: 'weekly',
        priority: '0.8',
      })
    ),

  // Products — the bulk of the sitemap
  ...products.map((p) =>
    url({
      loc: `/products/${p.handle}`,
      lastmod: p.updated_at ? p.updated_at.slice(0, 10) : today(),
      changefreq: 'weekly',
      priority: '0.7',
    })
  ),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  '</urlset>',
  '',
].join('\n');

fs.writeFileSync(outPath, xml, 'utf8');
console.log(`[sitemap] Written to ${outPath} — ${entries.length} URLs total`);
