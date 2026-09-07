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
const outPath = path.join(projectDir, 'public', 'sitemap.xml');

const BASE_URL = 'https://greentreezcompany.com';

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

  // Collections — high priority, change often as products are added
  ...collections
    .filter((c) => c.handle !== 'all-thc-and-cbd-products') // already in static
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
