export function slugify(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function dollarsToCents(value) {
  const number = Number(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100);
}

export function centsToDollars(cents = 0) {
  return (Number(cents || 0) / 100).toFixed(2);
}

export function formatMoney(cents = 0) {
  return `$${centsToDollars(cents)}`;
}

export function numericId(value) {
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return Math.trunc(asNumber);
  const text = String(value || '');
  let hash = 0;
  for (const char of text) hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  return 90_000_000_000_000 + (Math.abs(hash) % 1_000_000_000_000);
}

export function productPrice(product) {
  const prices = (product?.variants || []).map((variant) => Number(variant.price || 0));
  if (!prices.length) return 0;
  return Math.min(...prices);
}

export function productAvailable(product) {
  return (product?.variants || []).some((variant) => variant.available);
}

export function productImage(product) {
  return product?.images?.[0]?.src || '';
}

export function newProduct(partial = {}) {
  const title = partial.title || 'New product';
  const handle = partial.handle || slugify(title) || `product-${Date.now()}`;
  const id = partial.id || `p_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  return {
    id,
    handle,
    title,
    vendor: 'Green Treez Company',
    product_type: 'Flower',
    status: 'draft',
    description: '',
    excerpt: '',
    tags: [],
    strain: '',
    psychoactivity: '',
    effects: [],
    images: [],
    options: [{ name: 'Size', position: 1, values: ['Default'] }],
    variants: [
      {
        id: `${id}-1`,
        title: 'Default',
        sku: '',
        barcode: '',
        price: 0,
        compare_at_price: null,
        available: true,
        inventory_quantity: 25,
        option1: 'Default',
        option2: null,
        option3: null,
        weight: 0,
        requires_shipping: true,
        taxable: true,
      },
    ],
    collection_handles: ['all-thc-and-cbd-products'],
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    lab_report_url: '',
    source: 'admin',
    featured: false,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

export function toShopifyProduct(product) {
  const variants = (product.variants || []).map((variant) => ({
    id: numericId(variant.id),
    title: variant.title,
    option1: variant.option1,
    option2: variant.option2,
    option3: variant.option3,
    sku: variant.sku,
    requires_shipping: variant.requires_shipping !== false,
    taxable: variant.taxable !== false,
    featured_image: null,
    available: Boolean(variant.available),
    name: `${product.title} - ${variant.title}`,
    public_title: variant.title,
    options: [variant.option1, variant.option2, variant.option3].filter(Boolean),
    price: Number(variant.price || 0),
    weight: Number(variant.weight || 0),
    compare_at_price: variant.compare_at_price,
    inventory_management: 'shopify',
    barcode: variant.barcode || '',
  }));
  const prices = variants.map((variant) => variant.price);
  const images = (product.images || []).map((image) => image.src);
  return {
    id: numericId(product.id),
    title: product.title,
    handle: product.handle,
    description: product.description,
    published_at: product.created_at,
    created_at: product.created_at,
    vendor: product.vendor,
    type: product.product_type,
    tags: product.tags || [],
    price: prices.length ? Math.min(...prices) : 0,
    price_min: prices.length ? Math.min(...prices) : 0,
    price_max: prices.length ? Math.max(...prices) : 0,
    available: variants.some((variant) => variant.available),
    price_varies: prices.some((price) => price !== prices[0]),
    compare_at_price: null,
    compare_at_price_min: 0,
    compare_at_price_max: 0,
    compare_at_price_varies: false,
    variants,
    images,
    featured_image: images[0] || '',
    options: product.options || [],
    url: `/products/${product.handle}`,
    media: images.map((src, index) => ({
      alt: product.title,
      id: numericId(`${product.id}-media-${index}`),
      position: index + 1,
      preview_image: { src },
      src,
    })),
  };
}

export const PRODUCT_TYPES = [
  'Flower',
  'Edibles',
  'Beverages',
  'Mushrooms',
  'Pre-Rolls',
  'Disposables',
  'Concentrates',
  'Cartridges',
  'Tinctures',
  'Topicals',
  'Pets',
  'Product',
];

export const STRAINS = ['Hybrid', 'Indica', 'Sativa'];
export const PSYCHO_LEVELS = ['Low', 'Medium', 'High'];
export const EFFECT_OPTIONS = ['Happy', 'Relaxed', 'Sleepy', 'Creative', 'Energetic', 'Focused', 'Pain relief', 'Aroused'];

export function parseList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinList(value) {
  return parseList(value).join(', ');
}
