const KEY = 'gtz-local-cart-v1';

function empty() {
  return { items: [] };
}

export function readLocalCart() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return empty();
  }
}

export function writeLocalCart(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('gtz-cart-change', { detail: cart }));
}

export function addLocalCartItem({ product, variant, quantity = 1 }) {
  const cart = readLocalCart();
  const id = String(variant.id);
  const existing = cart.items.find((item) => String(item.variant_id) === id);
  if (existing) existing.quantity += quantity;
  else {
    cart.items.push({
      id,
      variant_id: variant.id,
      product_id: product.id,
      handle: product.handle,
      title: product.title,
      variant_title: variant.title,
      image: product.images?.[0]?.src || '',
      price: Number(variant.price || 0),
      quantity,
      url: `/products/${product.handle}`,
    });
  }
  writeLocalCart(cart);
  return cart;
}

export function updateLocalCartItem(variantId, quantity) {
  const cart = readLocalCart();
  cart.items = cart.items
    .map((item) => (String(item.variant_id) === String(variantId) ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0);
  writeLocalCart(cart);
  return cart;
}

export function clearLocalCart() {
  writeLocalCart(empty());
}

export function localCartCount() {
  return readLocalCart().items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function localCartTotal() {
  return readLocalCart().items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}
