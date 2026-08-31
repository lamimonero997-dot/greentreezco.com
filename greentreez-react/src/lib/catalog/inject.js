import { formatMoney, productImage, productPrice } from './model.js';
import { newCatalogProducts, productsForCollection } from './store.js';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function collectionHandleFromPath(pathname) {
  const match = pathname.match(/^\/collections\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function existingHandles(root) {
  const handles = new Set();
  for (const link of root.querySelectorAll('a[href*="/products/"]')) {
    const match = (link.getAttribute('href') || '').match(/\/products\/([^/?#]+)/);
    if (match) handles.add(decodeURIComponent(match[1]));
  }
  return handles;
}

function cardHtml(product) {
  // Escaped: the database is the trust boundary, not the admin form's slugify().
  const href = escapeHtml(`/products/${product.handle}`);
  const image = productImage(product);
  const price = formatMoney(productPrice(product));
  const strain = product.strain
    ? `<span class="product-card__details-strain ${escapeHtml(product.strain)} is-hidden-in-drawer">${escapeHtml(product.strain)}</span>`
    : '';
  return `
<div class="o-layout__item u-1/2 u-1/3@tab u-1/4-grid-desk gtz-dynamic-card" data-gtz-handle="${escapeHtml(product.handle)}">
  <div class="product-card js-product js-product-card product-card--fit product-card--left">
    <div class="product-card-top">
      <div class="o-ratio o-ratio--1:1">
        <div class="o-ratio__content">
          <a href="${href}" class="product-card__link product-card__link--full-opacity">
            <div class="product-card__media">
              ${image ? `<img class="product-card__img" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" width="300" height="300" loading="lazy" decoding="async" fetchpriority="low">` : ''}
            </div>
          </a>
        </div>
      </div>
    </div>
    <div class="product-card__details">
      <a href="${href}" class="product-card__link" title="${escapeHtml(product.title)}">
        <div class="product-card__vendor u-medium-small h3">${escapeHtml(product.vendor || '')}</div>
        <h3 class="product-card__title f-family--heading">${escapeHtml(product.title)}</h3>
      </a>
      <div class="product-card__price">
        <span class="money">${price}</span>
        ${strain}
      </div>
    </div>
  </div>
</div>`;
}

function updateCard(root, product) {
  const image = productImage(product);
  const price = formatMoney(productPrice(product));
  for (const link of root.querySelectorAll(`a[href*="/products/${product.handle}"]`)) {
    const card = link.closest('.product-card') || link.closest('.o-layout__item');
    if (!card) continue;
    const title = card.querySelector('.product-card__title, h3, h2');
    const vendor = card.querySelector('.product-card__vendor');
    const money = card.querySelector('.money');
    const img = card.querySelector('.product-card__img');
    if (title) title.textContent = product.title;
    if (vendor) vendor.textContent = product.vendor || '';
    if (money) money.textContent = price;
    if (img && image) img.setAttribute('src', image);
  }
}

export function injectCatalogIntoCollection(root, pathname, catalog) {
  const handle = collectionHandleFromPath(pathname);
  if (!handle || !root || !catalog) return;

  const section =
    root.querySelector('[data-section-type="collection-template"]') ||
    root.querySelector('.js-section__collection');
  if (!section) return;

  const layout =
    section.querySelector('.o-layout') ||
    section.querySelector('[class*="product-grid"]') ||
    section;

  const seen = existingHandles(section);
  for (const product of productsForCollection(catalog, handle)) {
    if (seen.has(product.handle) && product.source === 'admin') updateCard(section, product);
  }

  const extras = newCatalogProducts(catalog, handle, seen);
  if (!extras.length) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = extras.map((product) => cardHtml(product)).join('');
  const frag = document.createDocumentFragment();
  while (wrap.firstChild) frag.appendChild(wrap.firstChild);
  const first = layout.querySelector('.o-layout__item') || layout.firstElementChild;
  layout.insertBefore(frag, first || null);
}
