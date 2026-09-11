/**
 * Central SEO helper for the Green Treez storefront.
 *
 * All meta tag writes (title, description, canonical, Open Graph, Twitter Card,
 * and product JSON-LD) flow through this one module so every page stays
 * consistent without a head-management library.
 *
 * Usage:
 *   import { updateSEO } from '../lib/seo.js';
 *
 *   // Inside a useEffect:
 *   updateSEO({
 *     title:       'Blue Dream THCA | Green Treez',
 *     description: 'Sativa-dominant hybrid with creative effects...',
 *     canonical:   '/products/blue-dream-thca',
 *     image:       'https://greentreezcompany.com/cdn/...',
 *     type:        'product',   // 'website' | 'product' | 'article'
 *     product:     { ... },     // full product object for JSON-LD
 *   });
 */

import { BASE_URL, DEFAULT_TITLE, SITE_NAME, composeTitle, truncate } from './seoText.js';

const FALLBACK_IMG = `${BASE_URL}/cdn/shop/files/Green_Treez_Logo_Online_49d74201-94de-44f4-984a-9f299aedc9ad.png`;

// ---------------------------------------------------------------------------
// Low-level DOM helpers
// ---------------------------------------------------------------------------

function setTag(selector, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    const [tag, ...attrs] = selector.replace(/\[|\]/g, ' ').split(' ').filter(Boolean);
    el = document.createElement(tag || 'meta');
    // Rebuild the identifying attributes so the element can be found next time
    attrs.forEach((part) => {
      const [key, val] = part.split('=');
      if (key && val) el.setAttribute(key, val.replace(/"/g, ''));
    });
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value || '');
}

function setOrRemoveTag(selector, attr, value) {
  if (value) {
    setTag(selector, attr, value);
  } else {
    const el = document.head.querySelector(selector);
    if (el) el.removeAttribute(attr) || el.remove();
  }
}

/**
 * Drops the JSON-LD the build injected.
 *
 * scripts/prerender.mjs writes Product and BreadcrumbList blocks tagged
 * data-id="prerender". They exist for the raw-HTML pass; once React takes over
 * it writes its own, and leaving both in place ships two Product blocks on the
 * same page. Cleared on the first updateSEO() call, before any are re-added.
 */
let prerenderJsonLdCleared = false;
function clearPrerenderJsonLd() {
  if (prerenderJsonLdCleared) return;
  prerenderJsonLdCleared = true;
  document.head
    .querySelectorAll('script[type="application/ld+json"][data-id="prerender"]')
    .forEach((el) => el.remove());
}

function setJsonLd(id, data) {
  let el = document.head.querySelector(`script[type="application/ld+json"][data-id="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('data-id', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data, null, 2);
}

function removeJsonLd(id) {
  const el = document.head.querySelector(`script[type="application/ld+json"][data-id="${id}"]`);
  if (el) el.remove();
}

// ---------------------------------------------------------------------------
// Product JSON-LD
// ---------------------------------------------------------------------------

function buildProductJsonLd(product, canonical) {
  const price = product.variants?.[0]?.price ?? 0;
  const available = product.variants?.some((v) => v.available) ?? true;
  const images = (product.images || []).map((img) => img.src || img).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.seo_description || product.excerpt || product.description || '',
    url: `${BASE_URL}${canonical}`,
    image: images.length ? images : [FALLBACK_IMG],
    brand: { '@type': 'Brand', name: product.vendor || SITE_NAME },
    sku: product.variants?.[0]?.sku || undefined,
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}${canonical}`,
      priceCurrency: 'USD',
      price: (price / 100).toFixed(2),
      availability: available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

// ---------------------------------------------------------------------------
// BreadcrumbList JSON-LD
// ---------------------------------------------------------------------------

function buildBreadcrumbJsonLd(crumbs) {
  // crumbs: [{ name, path }]
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {string}  opts.title        Full <title> string (already formatted)
 * @param {string}  [opts.description] Meta description (max ~155 chars)
 * @param {string}  [opts.keywords]   Meta keywords
 * @param {string}  [opts.canonical]  Canonical path e.g. '/products/blue-dream'
 * @param {string}  [opts.image]      Absolute OG image URL
 * @param {string}  [opts.type]       OG type: 'website' | 'product' | 'article'
 * @param {object}  [opts.product]    Product object → injects Product JSON-LD
 * @param {Array}   [opts.breadcrumbs] [{name, path}] → injects BreadcrumbList
 * @param {boolean} [opts.noindex]    Set true to add noindex (checkout etc.)
 */
export function updateSEO({
  title,
  description = '',
  keywords = '',
  canonical = '',
  image = '',
  type = 'website',
  product = null,
  breadcrumbs = null,
  noindex = false,
} = {}) {
  clearPrerenderJsonLd();

  // Formatted through the same helpers the build uses, so hydration cannot
  // replace a clean prerendered title with the raw captured one (which still
  // carries mojibake and the old shop suffix, and runs past 60 characters).
  const resolvedTitle = title ? composeTitle(title, DEFAULT_TITLE) : DEFAULT_TITLE;
  const resolvedDescription = truncate(description);
  const resolvedImage = image || FALLBACK_IMG;
  const resolvedCanonical = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  // ── Basic ──────────────────────────────────────────────────────────────────
  document.title = resolvedTitle;

  setTag('meta[name="description"]', 'content', resolvedDescription);

  if (keywords) {
    setTag('meta[name="keywords"]', 'content', keywords);
  }

  // Canonical
  setTag('link[rel="canonical"]', 'href', resolvedCanonical);

  // Robots
  if (noindex) {
    setTag('meta[name="robots"]', 'content', 'noindex, nofollow');
  } else {
    const robots = document.head.querySelector('meta[name="robots"]');
    if (robots) robots.remove();
  }

  // ── Open Graph ─────────────────────────────────────────────────────────────
  setTag('meta[property="og:title"]',       'content', resolvedTitle);
  setTag('meta[property="og:description"]', 'content', resolvedDescription);
  setTag('meta[property="og:type"]',        'content', type);
  setTag('meta[property="og:url"]',         'content', resolvedCanonical);
  setTag('meta[property="og:image"]',       'content', resolvedImage);
  setTag('meta[property="og:site_name"]',   'content', SITE_NAME);
  setTag('meta[property="og:locale"]',      'content', 'en_US');

  // ── Twitter Card ───────────────────────────────────────────────────────────
  setTag('meta[name="twitter:card"]',        'content', 'summary_large_image');
  setTag('meta[name="twitter:title"]',       'content', resolvedTitle);
  setTag('meta[name="twitter:description"]', 'content', resolvedDescription);
  setTag('meta[name="twitter:image"]',       'content', resolvedImage);

  // ── JSON-LD ────────────────────────────────────────────────────────────────
  if (product && canonical) {
    setJsonLd('product', buildProductJsonLd(product, canonical));
  } else {
    removeJsonLd('product');
  }

  if (breadcrumbs?.length) {
    setJsonLd('breadcrumb', buildBreadcrumbJsonLd(breadcrumbs));
  } else {
    removeJsonLd('breadcrumb');
  }
}

/** Shorthand for pages that should never be indexed (checkout, etc.) */
export function setNoIndex(title = '') {
  updateSEO({ title, noindex: true });
}
