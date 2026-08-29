import { applyOverrides, deleteOverride, readOverrides, upsertOverride } from './local.js';
import { getSupabase, supabaseConfigured } from './supabase.js';

let cache = null;
let loading = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener(cache);
}

function rowToProduct(row, collectionHandles = []) {
  return {
    ...row,
    tags: row.tags || [],
    effects: row.effects || [],
    images: row.images || [],
    options: row.options || [],
    variants: row.variants || [],
    collection_handles: collectionHandles,
  };
}

async function loadSeed() {
  const response = await fetch('/data/catalog.json');
  if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
  return response.json();
}

async function loadFromSupabase() {
  const supabase = getSupabase();
  const [{ data: products, error: productError }, { data: collections, error: collectionError }, { data: joins, error: joinError }] =
    await Promise.all([
      supabase.from('products').select('*').order('title'),
      supabase.from('collections').select('*').order('sort_order'),
      supabase.from('collection_products').select('*'),
    ]);
  if (productError) throw productError;
  if (collectionError) throw collectionError;
  if (joinError) throw joinError;

  const handlesByProduct = new Map();
  const collectionById = new Map((collections || []).map((collection) => [collection.id, collection]));
  const productHandlesByCollection = new Map();

  for (const join of joins || []) {
    const collection = collectionById.get(join.collection_id);
    if (!collection) continue;
    if (!handlesByProduct.has(join.product_id)) handlesByProduct.set(join.product_id, []);
    handlesByProduct.get(join.product_id).push(collection.handle);
  }

  const mappedProducts = (products || []).map((row) => rowToProduct(row, handlesByProduct.get(row.id) || []));
  const handleById = new Map(mappedProducts.map((product) => [product.id, product.handle]));

  for (const join of joins || []) {
    const handle = handleById.get(join.product_id);
    if (!handle) continue;
    if (!productHandlesByCollection.has(join.collection_id)) productHandlesByCollection.set(join.collection_id, []);
    productHandlesByCollection.get(join.collection_id).push(handle);
  }

  return {
    version: 1,
    source: 'supabase',
    products: mappedProducts,
    collections: (collections || []).map((collection) => ({
      ...collection,
      product_handles: productHandlesByCollection.get(collection.id) || [],
    })),
  };
}

export function catalogSource() {
  return supabaseConfigured() ? 'supabase' : 'local';
}

export async function loadCatalog(force = false) {
  if (cache && !force) return cache;
  if (loading && !force) return loading;

  loading = (async () => {
    if (supabaseConfigured()) {
      try {
        cache = await loadFromSupabase();
        notify();
        return cache;
      } catch (error) {
        console.warn('[catalog] Supabase unavailable, using local catalog', error);
      }
    }
    const seed = await loadSeed();
    cache = { ...applyOverrides(seed, readOverrides()), source: 'local' };
    notify();
    return cache;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export function getCachedCatalog() {
  return cache;
}

export function subscribeCatalog(listener) {
  listeners.add(listener);
  if (cache) listener(cache);
  return () => listeners.delete(listener);
}

export async function listProducts() {
  const catalog = await loadCatalog();
  return catalog.products;
}

export async function getProductByHandle(handle) {
  const catalog = await loadCatalog();
  return catalog.products.find((product) => product.handle === handle) || null;
}

export async function getProductById(id) {
  const catalog = await loadCatalog();
  return catalog.products.find((product) => product.id === id) || null;
}

export async function listCollections() {
  const catalog = await loadCatalog();
  return catalog.collections;
}

function productColumns(product) {
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
    source: product.source || 'admin',
    featured: Boolean(product.featured),
  };
}

async function syncCollectionJoins(product) {
  const supabase = getSupabase();
  const { data: collections } = await supabase.from('collections').select('id, handle');
  const ids = (collections || [])
    .filter((collection) => (product.collection_handles || []).includes(collection.handle))
    .map((collection) => collection.id);

  await supabase.from('collection_products').delete().eq('product_id', product.id);
  if (!ids.length) return;
  await supabase.from('collection_products').insert(
    ids.map((collectionId, position) => ({
      collection_id: collectionId,
      product_id: product.id,
      position,
    }))
  );
}

export async function saveProduct(product) {
  const next = { ...product, updated_at: new Date().toISOString(), source: 'admin' };
  if (supabaseConfigured()) {
    const supabase = getSupabase();
    const { error } = await supabase.from('products').upsert(productColumns(next));
    if (error) throw error;
    await syncCollectionJoins(next);
    await loadCatalog(true);
    return next;
  }
  upsertOverride('products', next);
  const seed = await loadSeed();
  cache = { ...applyOverrides(seed, readOverrides()), source: 'local' };
  notify();
  return next;
}

export async function deleteProduct(id) {
  if (supabaseConfigured()) {
    const supabase = getSupabase();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await loadCatalog(true);
    return;
  }
  deleteOverride('products', id);
  const seed = await loadSeed();
  cache = { ...applyOverrides(seed, readOverrides()), source: 'local' };
  notify();
}

export async function saveCollection(collection) {
  const next = { ...collection, updated_at: new Date().toISOString() };
  if (supabaseConfigured()) {
    const supabase = getSupabase();
    const { error } = await supabase.from('collections').upsert({
      id: next.id,
      handle: next.handle,
      title: next.title,
      description: next.description || '',
      image: next.image || '',
      body_html: next.body_html || '',
      sort_order: next.sort_order || 100,
      published: next.published !== false,
    });
    if (error) throw error;
    await loadCatalog(true);
    return next;
  }
  upsertOverride('collections', next);
  const seed = await loadSeed();
  cache = { ...applyOverrides(seed, readOverrides()), source: 'local' };
  notify();
  return next;
}

export function productsForCollection(catalog, handle) {
  return (catalog?.products || []).filter(
    (product) => product.status === 'active' && (product.collection_handles || []).includes(handle)
  );
}

export function newCatalogProducts(catalog, handle, existingHandles) {
  return productsForCollection(catalog, handle).filter(
    (product) => product.source === 'admin' && !existingHandles.has(product.handle)
  );
}
