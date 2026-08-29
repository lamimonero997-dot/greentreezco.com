const KEY = 'gtz-catalog-overrides-v1';

function empty() {
  return { products: {}, collections: {}, deletedProductIds: [], deletedCollectionIds: [] };
}

export function readOverrides() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return empty();
  }
}

export function writeOverrides(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function applyOverrides(seed, overrides) {
  const products = new Map((seed.products || []).map((product) => [product.id, product]));
  const collections = new Map((seed.collections || []).map((collection) => [collection.id, collection]));

  for (const id of overrides.deletedProductIds || []) products.delete(id);
  for (const id of overrides.deletedCollectionIds || []) collections.delete(id);
  for (const product of Object.values(overrides.products || {})) {
    if (product) products.set(product.id, product);
  }
  for (const collection of Object.values(overrides.collections || {})) {
    if (collection) collections.set(collection.id, collection);
  }

  return {
    ...seed,
    products: [...products.values()],
    collections: [...collections.values()].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
  };
}

export function upsertOverride(kind, record) {
  const data = readOverrides();
  data[kind][record.id] = record;
  if (kind === 'products') data.deletedProductIds = data.deletedProductIds.filter((id) => id !== record.id);
  if (kind === 'collections') data.deletedCollectionIds = data.deletedCollectionIds.filter((id) => id !== record.id);
  writeOverrides(data);
}

export function deleteOverride(kind, id) {
  const data = readOverrides();
  delete data[kind][id];
  if (kind === 'products') data.deletedProductIds = [...new Set([...data.deletedProductIds, id])];
  if (kind === 'collections') data.deletedCollectionIds = [...new Set([...data.deletedCollectionIds, id])];
  writeOverrides(data);
}
