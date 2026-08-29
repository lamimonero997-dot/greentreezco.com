import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(root, '..');
const pagesDir = path.join(projectDir, 'public', 'pages');
const outFile = path.join(projectDir, 'public', 'data', 'catalog.json');

const TYPE_BY_COLLECTION = {
  flower: 'Flower',
  edibles: 'Edibles',
  'pre-rolls': 'Pre-Rolls',
  'disposable-vapes': 'Disposables',
  concentrates: 'Concentrates',
  'thc-cartridges': 'Cartridges',
  tincture: 'Tinctures',
  topicals: 'Topicals',
  'pet-products': 'Pets',
  'thc-beverages-and-drinks': 'Beverages',
  mushrooms: 'Mushrooms',
};

const CORE_COLLECTIONS = [
  { handle: 'all-thc-and-cbd-products', title: 'All products' },
  { handle: 'flower', title: 'Flower' },
  { handle: 'edibles', title: 'Edibles' },
  { handle: 'thc-beverages-and-drinks', title: 'Beverages' },
  { handle: 'mushrooms', title: 'Mushrooms' },
  { handle: 'pre-rolls', title: 'Pre-rolls' },
  { handle: 'disposable-vapes', title: 'Disposable vapes' },
  { handle: 'concentrates', title: 'Concentrates' },
  { handle: 'thc-cartridges', title: 'Cartridges' },
  { handle: 'tincture', title: 'Tinctures' },
  { handle: 'pet-products', title: 'Pet products' },
  { handle: 'topicals', title: 'Topicals' },
];

function decodeEntities(text = '') {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLocalImage(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'https://greentreezcompany.com');
    if (parsed.pathname.startsWith('/cdn/')) return `${parsed.pathname}${parsed.search}`;
    return url;
  } catch {
    return url;
  }
}

function firstJsonLdProduct(html) {
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(match[1]);
      if (data?.['@type'] === 'Product') return data;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extractVariants(html) {
  for (const match of html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = match[1].trim();
    if (!body.startsWith('[')) continue;
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed) && parsed[0] && ('sku' in parsed[0] || 'price' in parsed[0] || 'option1' in parsed[0])) {
        return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function numericFromHandle(handle) {
  let hash = 0;
  for (const char of handle) hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  return String(900_000_000_000_00 + (Math.abs(hash) % 1_000_000_000_000));
}

const TYPE_RULES = [
  { type: 'Pets', collection: 'pet-products', pattern: /\b(pet|dog|cat|canine)\b/i },
  { type: 'Mushrooms', collection: 'mushrooms', pattern: /\b(mushroom|shroom|shrumfuzed)\b/i },
  { type: 'Beverages', collection: 'thc-beverages-and-drinks', pattern: /\b(seltzer|soda|drink|beverage|tea|lemonade|margarita)\b/i },
  { type: 'Edibles', collection: 'edibles', pattern: /\b(gummy|gummies|edible|chocolate|cookie|brownie|lozenge)\b/i },
  { type: 'Pre-Rolls', collection: 'pre-rolls', pattern: /\b(preroll|pre-roll|pre roll|cone|joint)\b/i },
  { type: 'Disposables', collection: 'disposable-vapes', pattern: /\b(disposable|vape juice)\b/i },
  { type: 'Cartridges', collection: 'thc-cartridges', pattern: /\b(cartridge|cart\b|1g cart|2g cart)\b/i },
  { type: 'Tinctures', collection: 'tincture', pattern: /\b(tincture|oil drops)\b/i },
  { type: 'Topicals', collection: 'topicals', pattern: /\b(topical|balm|lotion|cream|salve)\b/i },
  { type: 'Concentrates', collection: 'concentrates', pattern: /\b(concentrate|rosin|resin|diamond|wax|dabs|badder|crumble)\b/i },
  { type: 'Flower', collection: 'flower', pattern: /\b(flower|thca|eighth|3\.5g|7g|oz\b|bud)\b/i },
];

function inferFromText(title = '', handle = '') {
  const haystack = `${title} ${handle.replace(/-/g, ' ')}`;
  for (const rule of TYPE_RULES) {
    if (rule.pattern.test(haystack)) return rule;
  }
  return null;
}

function inferType(handles = [], title = '', handle = '') {
  for (const collectionHandle of handles) {
    if (TYPE_BY_COLLECTION[collectionHandle]) return TYPE_BY_COLLECTION[collectionHandle];
  }
  return inferFromText(title, handle)?.type || 'Product';
}

function mergeHandles(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

function extractGallery(html, alt) {
  const start = html.indexOf('media-gallery');
  if (start < 0) return [];
  const markers = ['complementary-products', 'product-recommendations', 'id="shopify-section-template'];
  let end = start + 40000;
  for (const marker of markers) {
    const index = html.indexOf(marker, start + 200);
    if (index > start && index < end) end = index;
  }
  const chunk = html.slice(start, end);
  const skip = /logo|age-verification|preview_images|sweatshirt|favicon|vector_png/i;
  const seen = new Set();
  const images = [];
  for (const match of chunk.matchAll(/cdn\/shop\/(?:files|products)\/[^"'?\s]+\.(?:png|jpe?g|webp)/gi)) {
    const src = `/${match[0].replace(/\\/g, '/').split('?')[0]}`.replace(/^\/\//, '/');
    const key = src.toLowerCase();
    if (skip.test(key) || seen.has(key)) continue;
    seen.add(key);
    images.push({ src, alt, position: images.length });
  }
  return images;
}

function extractProduct(page, collectionHandles) {
  const html = page.html || '';
  const handle = (page.route || '').split('/').pop();
  const ld = firstJsonLdProduct(html);
  const rawVariants = extractVariants(html);
  const productId =
    html.match(/data-product-id="(\d+)"/)?.[1] ||
    html.match(/data-id="(\d{10,})"/)?.[1] ||
    html.match(/"product"\s*:\s*\{\s*"id"\s*:\s*(\d+)/)?.[1] ||
    numericFromHandle(handle);

  const title = ld?.name || page.title?.replace(/\s+[–|].*$/, '').replace(/\s+-\s+.*$/, '') || handle;
  let images = extractGallery(html, title);
  if (!images.length) {
    const ldImages = Array.isArray(ld?.image) ? ld.image : ld?.image ? [ld.image] : [];
    images = ldImages
      .map((src) => toLocalImage(src).split('?')[0])
      .filter(Boolean)
      .map((src, position) => ({ src, alt: title, position }));
  }

  const variants = (rawVariants.length ? rawVariants : []).map((variant, index) => ({
    id: String(variant.id || `${productId}-${index + 1}`),
    title: variant.title || variant.public_title || variant.option1 || 'Default',
    sku: variant.sku || '',
    barcode: variant.barcode || '',
    price: Number(variant.price || 0),
    compare_at_price: variant.compare_at_price == null ? null : Number(variant.compare_at_price),
    available: Boolean(variant.available),
    inventory_quantity: variant.available ? 25 : 0,
    option1: variant.option1 || null,
    option2: variant.option2 || null,
    option3: variant.option3 || null,
    weight: Number(variant.weight || 0),
    requires_shipping: variant.requires_shipping !== false,
    taxable: variant.taxable !== false,
  }));

  if (!variants.length) {
    const offer = Array.isArray(ld?.offers) ? ld.offers[0] : ld?.offers;
    const dollars = Number(offer?.price || 0);
    variants.push({
      id: `${productId}-1`,
      title: 'Default',
      sku: offer?.sku || ld?.sku || '',
      barcode: '',
      price: Math.round(dollars * 100),
      compare_at_price: null,
      available: !/OutOfStock/i.test(offer?.availability || ''),
      inventory_quantity: 25,
      option1: 'Default',
      option2: null,
      option3: null,
      weight: 0,
      requires_shipping: true,
      taxable: true,
    });
  }

  const optionValues = [...new Set(variants.map((variant) => variant.option1).filter(Boolean))];
  const options =
    optionValues.length && !(optionValues.length === 1 && optionValues[0] === 'Default')
      ? [{ name: 'Size', position: 1, values: optionValues }]
      : [];

  const strain = html.match(/product-metafields__strain[^>]*>([^<]+)/)?.[1]?.trim() || '';
  const psychoactivity =
    html.match(/product-metafields__psycho-level[^>]*>\s*([^<]+)/)?.[1]?.trim() || '';

  const inferred = inferFromText(ld?.name || page.title || handle, handle);
  const collections = mergeHandles(
    collectionHandles,
    ['all-thc-and-cbd-products'],
    inferred?.collection ? [inferred.collection] : []
  );

  return {
    id: String(productId),
    handle,
    title,
    vendor: ld?.brand?.name || 'Green Treez Company',
    product_type: inferType(collections, ld?.name || page.title || '', handle),
    status: 'active',
    description: decodeEntities(ld?.description || page.description || ''),
    excerpt: decodeEntities(page.description || '').slice(0, 180),
    tags: [inferType(collections, title, handle), strain].filter(Boolean),
    strain: strain || null,
    psychoactivity: psychoactivity || null,
    effects: [],
    images,
    seo_keywords: [title, inferType(collections, title, handle), strain, ld?.brand?.name, 'THC', 'CBD']
      .filter(Boolean)
      .join(', '),
    lab_report_url: '',
    options,
    variants,
    collection_handles: collections,
    seo_title: page.title || '',
    seo_description: page.description || '',
    source: 'clone',
    featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function readPageMeta(file) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(8000);
  const bytes = fs.readSync(fd, buf, 0, 8000, 0);
  fs.closeSync(fd);
  const head = buf.slice(0, bytes).toString('utf8');
  return {
    route: head.match(/"route":"([^"]+)"/)?.[1] || '',
    title: head.match(/"title":"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"') || '',
    description: head.match(/"description":"((?:\\.|[^"\\])*)"/)?.[1]?.replace(/\\"/g, '"') || '',
  };
}

const manifest = JSON.parse(fs.readFileSync(path.join(projectDir, 'public', 'pages-manifest.json'), 'utf8'));
const productsByHandle = new Map();
const collectionProductHandles = new Map();

for (const route of Object.keys(manifest)) {
  const nested = route.match(/^\/collections\/([^/]+)\/products\/([^/]+)$/);
  if (nested) {
    const [, collectionHandle, productHandle] = nested;
    if (!collectionProductHandles.has(collectionHandle)) collectionProductHandles.set(collectionHandle, new Set());
    collectionProductHandles.get(collectionHandle).add(productHandle);
  }
  const direct = route.match(/^\/products\/([^/]+)$/);
  if (direct) productsByHandle.set(direct[1], manifest[route]);
}

const handleCollections = new Map();
for (const [collectionHandle, handles] of collectionProductHandles) {
  for (const handle of handles) {
    if (!handleCollections.has(handle)) handleCollections.set(handle, []);
    handleCollections.get(handle).push(collectionHandle);
  }
}

const products = [];
const handles = [...productsByHandle.keys()];
console.log(`Extracting ${handles.length} products...`);

for (let i = 0; i < handles.length; i += 1) {
  const handle = handles[i];
  const slug = productsByHandle.get(handle);
  const file = path.join(pagesDir, `${slug}.json`);
  if (!fs.existsSync(file)) continue;
  try {
    const page = JSON.parse(fs.readFileSync(file, 'utf8'));
    products.push(extractProduct(page, handleCollections.get(handle) || []));
  } catch (error) {
    console.warn('skip', handle, error.message);
  }
  if ((i + 1) % 150 === 0) console.log(`  ${i + 1}/${handles.length}`);
}

for (const product of products) {
  for (const collectionHandle of product.collection_handles || []) {
    if (!collectionProductHandles.has(collectionHandle)) collectionProductHandles.set(collectionHandle, new Set());
    collectionProductHandles.get(collectionHandle).add(product.handle);
  }
}

const collections = [];
const collectionHandles = new Set([
  ...CORE_COLLECTIONS.map((item) => item.handle),
  ...collectionProductHandles.keys(),
]);

for (const handle of collectionHandles) {
  const slug = manifest[`/collections/${handle}`];
  const preset = CORE_COLLECTIONS.find((item) => item.handle === handle);
  let title = preset?.title || handle.replace(/-/g, ' ');
  let description = '';
  let image = '';
  if (slug) {
    const file = path.join(pagesDir, `${slug}.json`);
    if (fs.existsSync(file)) {
      const meta = readPageMeta(file);
      title = (meta.title || title).replace(/\s+[–|].*$/, '').replace(/\s+-\s+.*$/, '').trim() || title;
      description = meta.description || '';
    }
  }
  collections.push({
    id: handle,
    handle,
    title,
    description,
    image,
    body_html: '',
    sort_order: preset ? CORE_COLLECTIONS.indexOf(preset) : 100,
    published: true,
    product_handles: [...(collectionProductHandles.get(handle) || [])],
    updated_at: new Date().toISOString(),
  });
}

collections.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));

const catalog = {
  version: 1,
  generated_at: new Date().toISOString(),
  products,
  collections,
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(catalog));
console.log(`Wrote ${products.length} products and ${collections.length} collections to ${path.relative(projectDir, outFile)}`);
console.log(`Size ${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB`);
