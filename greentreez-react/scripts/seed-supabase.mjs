import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');

if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'catalog.json'), 'utf8'));
const supabase = createClient(url, key, { auth: { persistSession: false } });

function productRow(product) {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    vendor: product.vendor || '',
    product_type: product.product_type || 'Product',
    status: product.status || 'active',
    description: product.description || '',
    tags: product.tags || [],
    strain: product.strain || null,
    psychoactivity: product.psychoactivity || null,
    effects: product.effects || [],
    images: product.images || [],
    options: product.options || [],
    variants: product.variants || [],
    seo_title: product.seo_title || '',
    seo_description: product.seo_description || '',
    seo_keywords: product.seo_keywords || '',
    excerpt: product.excerpt || '',
    lab_report_url: product.lab_report_url || '',
    source: product.source || 'clone',
    featured: Boolean(product.featured),
  };
}

// Postgres rejects an ON CONFLICT DO UPDATE that touches the same row twice in
// one command, so collapse duplicate keys before sending a batch. Later rows win.
function dedupe(rows, keyOf) {
  const byKey = new Map();
  for (const row of rows) byKey.set(keyOf(row), row);
  return [...byKey.values()];
}

async function upsert(table, rows, keyOf, chunkSize = 200) {
  const unique = dedupe(rows, keyOf);
  if (unique.length !== rows.length) {
    console.log(`  ${table}: skipped ${rows.length - unique.length} duplicate rows`);
  }
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(slice);
    if (error) throw error;
    console.log(`  ${table} ${Math.min(i + chunkSize, unique.length)}/${unique.length}`);
  }
}

const collections = catalog.collections.map((collection) => ({
  id: collection.id,
  handle: collection.handle,
  title: collection.title,
  description: collection.description || '',
  image: collection.image || '',
  body_html: collection.body_html || '',
  sort_order: collection.sort_order || 100,
  published: collection.published !== false,
}));

const products = catalog.products.map(productRow);
const handleToId = new Map(catalog.products.map((product) => [product.handle, product.id]));
const joins = [];
for (const collection of catalog.collections) {
  (collection.product_handles || []).forEach((handle, position) => {
    const productId = handleToId.get(handle);
    if (!productId) return;
    joins.push({ collection_id: collection.id, product_id: productId, position });
  });
}

console.log(`Seeding ${products.length} products, ${collections.length} collections...`);
await upsert('collections', collections, (row) => row.id);
await upsert('products', products, (row) => row.id);
await supabase.from('collection_products').delete().neq('product_id', '');
await upsert('collection_products', joins, (row) => `${row.collection_id}::${row.product_id}`, 500);
console.log('Done.');
