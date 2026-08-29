import { addLocalCartItem } from './cart.js';

function moneyToCents(text) {
  const number = Number(String(text || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

export function addFromProductForm(form) {
  if (!form) return;
  const root = form.closest('.product-single, .section--product-single, #main') || document;
  const addBtn = form.querySelector('[name="add"], .product-form__add-btn');
  if (addBtn?.disabled || form.querySelector('.product-form__add.is-disabled')) return;

  const formId = form.getAttribute('id');
  const variantInput =
    form.querySelector('[name="id"]') ||
    (formId ? document.querySelector(`[form="${formId}"][name="id"]`) : null) ||
    root.querySelector('[name="id"]');
  const qtyInput =
    form.querySelector('[name="quantity"]') ||
    (formId ? document.querySelector(`[form="${formId}"][name="quantity"]`) : null) ||
    root.querySelector('[name="quantity"]');

  const title = (root.querySelector('.product-single__title')?.textContent || 'Product').replace(/\s+/g, ' ').trim();
  const image = root.querySelector('.media-gallery__image')?.getAttribute('src') || '';
  const price = moneyToCents(root.querySelector('.price__number .money')?.textContent);
  const variantTitle = (
    root.querySelector('.product-form__swatch__input:checked + label')?.textContent ||
    variantInput?.getAttribute('data-variant-title') ||
    'Default'
  )
    .replace(/\s+/g, ' ')
    .trim();
  const handle = decodeURIComponent((location.pathname.match(/\/products\/([^/]+)/) || [])[1] || '');

  addLocalCartItem({
    product: {
      id: handle || title,
      handle,
      title,
      images: image ? [{ src: image }] : [],
    },
    variant: {
      id: variantInput?.value || `${handle || title}-default`,
      title: variantTitle,
      price,
      available: true,
    },
    quantity: Math.max(1, Number(qtyInput?.value || 1)),
  });
  window.dispatchEvent(new CustomEvent('gtz-open-cart'));
}

export function isCartTrigger(el) {
  return Boolean(el?.closest?.('.js-cart-trigger, .js-cart-icon, a[href="/cart"], a[href="/cart/"]'));
}

export function isProductAddForm(form) {
  if (!form) return false;
  const action = form.getAttribute('action') || '';
  const id = form.getAttribute('id') || '';
  return /\/cart\/add/i.test(action) || /product-form/i.test(id);
}
