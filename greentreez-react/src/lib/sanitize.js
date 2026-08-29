const DROP_SRC = [
  'googletagmanager',
  'google-analytics',
  'gtag/',
  'doubleclick',
  'judge.me',
  'judgeme',
  'cdnwidget.judge',
  'yotpo',
  'govx',
  'web-pixels',
  '/cdn/wpm/',
  'trekkie',
  'monorail',
  'shopify.com/storefront',
  'shopifycloud/storefront',
  'shopifycloud/portable-wallets',
  'shopifycloud/shop-js',
  'aov-cart-drawer',
  'shopify-forms',
  'origin_trials',
  'webmcp',
  'checkouts/internal',
  'bestpush',
  'scrollreveal',
];

const DROP_INLINE = [
  'webPixelsManager',
  'trekkie',
  'monorail',
  'boomerang',
  'SERVER_TIMING',
  'shopify-perf-kit',
  'gtag(',
  'dataLayer',
  'ShopifyAnalytics',
  'jdgmSettings',
  'jdgm.',
  'yotpo',
  'ShopifyPaypal',
  'portableWallets',
  'PaymentButton.init',
  'captcha-bootstrap',
  'shopify.dynamic_checkout',
];

const DROP_SELECTORS = [
  'shopify-chat',
  'shopify-agent',
  'shopify-accelerated-checkout',
  'shopify-accelerated-checkout-cart',
  'shopify-store',
  '#shopify-buyer-consent',
  '#ShopifyChat',
  '.jdgm-widget',
  '.jdgm-all-reviews-widget',
  '.jdgm-carousel-wrapper',
  '.jdgm-prev-badge',
  '.jdgm-preview-badge',
  '.jdgm-revs-tab-btn',
  '.jdgm-all-reviews-text',
  '.yotpo-widget-loyalty-floater-widget',
  '.yotpo-floater-widget-layout',
  '.js-section__apps',
  '.js-section__home-map',
  '[data-section-type="home-map"]',
];

const LOCATION_PATHS = new Set([
  '/pages/shop-by-location-green-treez-dispensary-stores',
  '/pages/shop-by-location-store-inventory',
  '/pages/dispensary-store-locations',
  '/pages/visit-dispensary-store-locations-in-tennessee-and-north-carolina',
  '/pages/nashville-dispensary',
  '/pages/nashville-dispensary-offers',
  '/pages/hendersonville-dispensary',
  '/pages/waynesville-nc-dispensary',
  '/pages/dispensary-morganton-nc',
  '/pages/store-locator',
  '/pages/north-carolina-thc-dispensary-locations-green-treez-company-waynesville-wnc',
  '/pages/hillwood-heights-dispensary-tn',
  '/pages/green-treez-company-dispensary-thc-and-cbd-warehouse-outlet-morganton-nc',
]);

const LOCATION_NAV_LABELS = new Set(['shop by location', 'locations', 'store locator']);

const DEMO_PHONE = '(555) 010-0000';
const DEMO_TEL = 'tel:+15550100000';
const DEMO_EMAIL = 'hello@example.com';
const PHONE_RE = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g;
const ORIGINAL_HOST_RE = /^https?:\/\/(?:www\.)?greentreezcompany\.com/i;
const SOCIAL_HOST_RE = /(?:facebook|instagram|twitter|tiktok|youtube|pinterest|linkedin)\.com|(?:^|\.)x\.com/i;
const MAP_HOST_RE = /maps\.google|google\.com\/maps|maps\.app\.goo\.gl/i;
const MAX_SRCSET_W = 1200;
const HEIC_FALLBACKS = {
  'Wellness_Wednesday_Waynesville.heic': 'Wellness_Wednesday.jpg',
  'Wellness_Wednesday_Waynesville-7e9c38a7959e.heic': 'Wellness_Wednesday.jpg',
  'THC_Drink_Store.heic': 'THC_Beverage_Store.png',
};

export function shouldDropSrc(src = '') {
  return DROP_SRC.some((part) => src.includes(part));
}

export function shouldDropInline(code = '') {
  return DROP_INLINE.some((part) => code.includes(part));
}

function pathFromHref(href = '') {
  const value = href.trim();
  if (!value || value.startsWith('#') || value.startsWith('mailto:') || value.startsWith('tel:')) return '';
  try {
    const url = new URL(value, 'https://local.example');
    return (url.pathname.replace(/\/+$/, '') || '/') + url.search;
  } catch {
    return value.split('#')[0];
  }
}

export function canonicalProductPath(pathname = '') {
  const path = (pathname.split('?')[0] || '').replace(/\/+$/, '') || '/';
  const match = path.match(/\/products\/([^/]+)$/);
  return match ? `/products/${decodeURIComponent(match[1])}` : '';
}

export function isLocationRoute(pathname = '') {
  const path = (pathname.split('?')[0] || '').replace(/\/+$/, '').toLowerCase() || '/';
  if (LOCATION_PATHS.has(path)) return true;
  if (path.startsWith('/collections/in-stock-')) return true;
  if (path.startsWith('/pages/thc-dispensary-near-me-')) return true;
  return false;
}

function isLocationHref(href = '') {
  return isLocationRoute(pathFromHref(href).split('?')[0]);
}

function localizeOriginalUrl(value = '') {
  if (!ORIGINAL_HOST_RE.test(value)) return value;
  try {
    const url = new URL(value);
    return `${url.pathname || '/'}${url.search}${url.hash}` || '/';
  } catch {
    return value.replace(ORIGINAL_HOST_RE, '') || '/';
  }
}

export function sanitizePageMeta(page) {
  if (!page) return page;
  return {
    ...page,
    title: (page.title || '')
      .replace(/\s*\|\s*Visit Store Locations[^\n–|]*/gi, '')
      .replace(/\s*Dispensary Locations(?: in TN and NC!?)?/gi, '')
      .replace(/\s+in TN and NC!?\s*/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim(),
    description: (page.description || '')
      .replace(/plus 4 Dispensary Locations[^.]*\./gi, '')
      .replace(/or local pickup in a hemp store near you\.?/gi, '')
      .replace(/or shop in store locations[^.]*\./gi, '')
      .replace(/speak to a budtender at one of our locations[^.!]*[.!]?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  };
}

export function sanitizeHtml(html) {
  if (!html) return html;

  let out = html
    .replace(/<!--\s*BEGIN app block:[\s\S]*?<!--\s*END app block\s*-->/gi, '')
    .replace(/<!--\s*Start of Judge\.me[\s\S]*?<!--\s*End of Judge\.me[\s\S]*?-->/gi, '')
    .replace(/<!--\s*BEGIN app snippet:[\s\S]*?<!--\s*END app snippet\s*-->/gi, '')
    .replace(/<!--[\s\S]*?\/snippets\/[\s\S]*?-->/g, '')
    .replace(/<!--\s*Header hook for plugins[\s\S]*?-->/gi, '');

  out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
    const src = /src=["']([^"']+)/i.exec(attrs)?.[1] || '';
    if (src && shouldDropSrc(src)) return '';
    if (/cdn\.shopify\.com\/extensions/i.test(src)) return '';
    if (!src && shouldDropInline(body)) return '';
    return full;
  });

  out = out.replace(/<link\b[^>]*>/gi, (tag) => (shouldDropSrc(tag) ? '' : tag));
  out = out.replace(/<style\b[^>]*class=["'][^"']*jdgm[^"']*["'][^>]*>[\s\S]*?<\/style>/gi, '');

  const parts = out.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/gi);
  out = parts
    .map((part) => {
      if (/^<script/i.test(part)) return part;
      return part
        .replace(/href=(["'])(?:https?:)?\/\/(?:www\.)?greentreezcompany\.com([^"']*)\1/gi, (_, quote, path) => `href=${quote}${path || '/'}${quote}`)
        .replace(/info@greentreezcompany\.com/gi, DEMO_EMAIL)
        .replace(/href=(["'])tel:[^"']+\1/gi, `href=$1${DEMO_TEL}$1`)
        .replace(PHONE_RE, DEMO_PHONE)
        .replace(
          /href=(["'])https?:\/\/(?:www\.)?(?:facebook|instagram|twitter|tiktok|youtube|pinterest|linkedin)\.com[^"']*\1/gi,
          'href=$1#$1'
        )
        .replace(
          /href=(["'])https?:\/\/(?:maps\.google|www\.google\.com\/maps|maps\.app\.goo\.gl)[^"']*\1/gi,
          'href=$1#$1'
        );
    })
    .join('');

  return out;
}

function removeEl(el) {
  el?.remove?.();
}

function closestSection(el) {
  return el?.closest?.('.shopify-section, [data-section-type], .section') || el;
}

function stripLocationNav(root) {
  root.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const label = (link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!isLocationHref(href) && !LOCATION_NAV_LABELS.has(label)) return;

    const item =
      link.closest('li.primary-nav__item, li.list-menu__item, li.footer-nav__item, li.mobile-nav__item') ||
      link.closest('li');
    if (item) removeEl(item);
    else removeEl(link);
  });

  root.querySelectorAll('[data-link-title]').forEach((el) => {
    const title = (el.getAttribute('data-link-title') || '').trim().toLowerCase();
    if (LOCATION_NAV_LABELS.has(title)) {
      removeEl(el.closest('li') || el);
    }
  });
}

function stripLocationSections(root) {
  root.querySelectorAll('.js-section__home-map, [data-section-type="home-map"], .home-map').forEach((el) => {
    removeEl(closestSection(el));
  });

  root.querySelectorAll('.footer-locations__container').forEach((el) => {
    removeEl(el.closest('.o-layout__item') || el);
  });

  root.querySelectorAll('.section__title-text, .promo-pop__title, h2, h3, h4').forEach((el) => {
    const text = (el.textContent || '').trim();
    if (!/store locations|shop by location|shop by store location/i.test(text)) return;
    const promo = el.closest('.promo-pop, .js-promo-pop, .js-section__promo-pop');
    if (promo) {
      removeEl(promo.closest('.shopify-section') || promo);
      return;
    }
    removeEl(closestSection(el));
  });

  root.querySelectorAll('.home-carousel__text p').forEach((el) => {
    const text = el.textContent || '';
    if (/visit locations in tennessee and north carolina/i.test(text)) {
      removeEl(el);
      return;
    }
    if (/pickup in store/i.test(text)) {
      const cleaned = text.replace(/\s*Order online and pickup in store!?\s*/gi, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned) el.textContent = cleaned;
      else removeEl(el);
    }
  });
}

function rewriteContactAndOutboundLinks(root) {
  root.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const isSocial =
      SOCIAL_HOST_RE.test(href) ||
      !!link.closest('.social-links, .footer-nav__social-wrapper, .footer-nav__social-items') ||
      !!link.querySelector('.icon--facebook, .icon--instagram, .icon--twitter, .icon--tiktok, .icon--youtube');

    if (ORIGINAL_HOST_RE.test(href)) {
      const local = localizeOriginalUrl(href);
      const productPath = canonicalProductPath(local);
      const query = local.includes('?') ? `?${local.split('?')[1].split('#')[0]}` : '';
      link.setAttribute('href', isLocationHref(local) ? '/' : productPath ? productPath + query : local);
      link.removeAttribute('target');
      return;
    }

    const productPath = canonicalProductPath(href);
    if (productPath) {
      const query = href.includes('?') ? `?${href.split('?')[1].split('#')[0]}` : '';
      link.setAttribute('href', productPath + query);
      link.removeAttribute('tabindex');
      return;
    }

    if (isLocationHref(href)) {
      link.setAttribute('href', '/');
      return;
    }

    if (/^tel:/i.test(href)) {
      link.setAttribute('href', DEMO_TEL);
      link.textContent = (link.textContent || '').replace(PHONE_RE, DEMO_PHONE);
      return;
    }

    if (MAP_HOST_RE.test(href) || isSocial) {
      link.setAttribute('href', '#');
      link.removeAttribute('target');
      return;
    }

    if (/^mailto:/i.test(href)) {
      link.setAttribute('href', `mailto:${DEMO_EMAIL}`);
      if (/@/.test(link.textContent || '')) link.textContent = DEMO_EMAIL;
      return;
    }

    // This cloned storefront is self-contained: navigation may only point to
    // local app routes. Any remaining off-site destination becomes inert.
    if (/^(?:https?:)?\/\//i.test(href)) {
      link.setAttribute('href', '/');
      link.removeAttribute('target');
    }
  });

  root.querySelectorAll('iframe[src]').forEach((frame) => {
    const src = frame.getAttribute('src') || '';
    if (MAP_HOST_RE.test(src) || ORIGINAL_HOST_RE.test(src)) removeEl(frame);
  });
}

function uniqueLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    const key = `${link.href}|${link.text}`;
    if (!link.href || !link.text || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function footerLinkList(links) {
  const ul = document.createElement('ul');
  ul.className = 'footer-nav__items o-list-bare';
  for (const link of links) {
    const li = document.createElement('li');
    li.className = 'footer-nav__item';
    const a = document.createElement('a');
    a.className = 'footer-nav__link';
    a.href = link.href;
    a.textContent = link.text;
    li.append(a);
    ul.append(li);
  }
  return ul;
}

function footerColumn(title, links) {
  const col = document.createElement('div');
  col.className = 'gtz-footer__col footer-nav';
  const heading = document.createElement('h3');
  heading.className = 'footer-nav__title h5';
  heading.textContent = title;
  col.append(heading, footerLinkList(links));
  return col;
}

function tidyFooter(root) {
  const footer = root.querySelector('#footer') || root.querySelector('footer.footer');
  if (!footer || footer.dataset.gtzTidied === 'true') return;
  footer.dataset.gtzTidied = 'true';

  const links = [...footer.querySelectorAll('.footer-nav__item a')].map((a) => ({
    href: a.getAttribute('href') || '',
    text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
  }));

  const shop = uniqueLinks(links.filter((link) => link.href.startsWith('/collections/')));
  const policies = uniqueLinks(
    links.filter((link) => /\/policies\//.test(link.href) || /privacy|terms of service|refund|shipping policy/i.test(link.text))
  );
  const company = uniqueLinks(
    links.filter((link) => !shop.some((item) => item.href === link.href) && !policies.some((item) => item.href === link.href))
  );

  if (!shop.some((link) => /all/i.test(link.text))) {
    shop.unshift({ href: '/collections/all-thc-and-cbd-products', text: 'Shop All' });
  }

  const FAQ_HREF = '/pages/frequently-asked-questions';
  const faqLink = company.find((link) => /faq/i.test(link.text));
  if (faqLink) {
    faqLink.href = FAQ_HREF;
    faqLink.text = 'FAQs';
  } else {
    company.push({ href: FAQ_HREF, text: 'FAQs' });
  }

  const companyOrder = ['about us', 'contact', 'faqs', 'certificates of analysis', 'veterans/military discount'];
  const helpOrder = ['shipping policy', 'refund policy', 'terms of service', 'privacy policy'];
  const sortBy = (order) => (a, b) => {
    const ai = order.findIndex((label) => a.text.toLowerCase() === label);
    const bi = order.findIndex((label) => b.text.toLowerCase() === label);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  };
  company.sort(sortBy(companyOrder));
  policies.sort(sortBy(helpOrder));

  const social = footer.querySelector('.footer-nav__social-wrapper')?.cloneNode(true);

  const inner = document.createElement('div');
  inner.className = 'container gtz-footer__inner';

  const grid = document.createElement('div');
  grid.className = 'gtz-footer__grid';

  const brand = document.createElement('div');
  brand.className = 'gtz-footer__col gtz-footer__brand';
  brand.innerHTML = `
    <h3 class="footer-nav__title h5">Green Treez Company</h3>
    <p class="gtz-footer__blurb">Legal THC and CBD products, shipped to your door. Must be 21 or older to purchase.</p>
    <ul class="gtz-footer__contact o-list-bare">
      <li><a href="${DEMO_TEL}">${DEMO_PHONE}</a></li>
      <li><a href="mailto:${DEMO_EMAIL}">${DEMO_EMAIL}</a></li>
    </ul>
  `;
  if (social) brand.append(social);

  grid.append(brand, footerColumn('Shop', shop), footerColumn('Company', company), footerColumn('Help', policies));
  inner.append(grid);

  const bar = document.createElement('div');
  bar.className = 'gtz-footer__bar';
  bar.innerHTML = `
    <p class="gtz-footer__copy">&copy; 2026 Green Treez Company. All rights reserved.</p>
    <p class="gtz-footer__legal">Products contain less than 0.3% Delta-9 THC derived from hemp. No statement on this site has been evaluated by the FDA. These products are not intended to diagnose, treat, cure, or prevent any disease.</p>
  `;
  inner.append(bar);

  footer.replaceChildren(inner);
  footer.classList.add('gtz-footer');
}

function restyleHero(root) {
  const hero = root.querySelector('.js-section__home-slider');
  if (!hero) return;
  hero.classList.add('gtz-hero', 'gtz-hero-grid');

  const title = hero.querySelector('.home-carousel__title .section__title-text');
  if (title) title.textContent = 'Green Treez';

  const content = hero.querySelector('.home-carousel__content');
  if (content && !content.querySelector('.gtz-hero__eyebrow')) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'gtz-hero__eyebrow';
    eyebrow.textContent = 'Legal hemp  ·  Ships nationwide  ·  21+';
    content.prepend(eyebrow);
  }

  const copyWrap = hero.querySelector('.home-carousel__text');
  if (copyWrap) {
    copyWrap.innerHTML = '<p>THC and CBD products, delivered. No medical card required.</p>';
  }

  const item = hero.querySelector('.home-carousel__item--right');
  if (item) {
    item.classList.remove('home-carousel__item--right');
    item.classList.add('home-carousel__item--left');
  }

  if (!hero.querySelector('.gtz-hero__quick-grid')) {
    const quickGrid = document.createElement('div');
    quickGrid.className = 'gtz-hero__quick-grid';
    quickGrid.setAttribute('aria-label', 'Featured shopping categories');
    quickGrid.innerHTML = `
      <a class="gtz-hero-tile gtz-hero-tile--flower" href="/collections/flower">
        <span class="gtz-hero-tile__eyebrow">Fresh drops · 21+</span>
        <strong>Premium THCa<br>Flower</strong>
        <span class="gtz-hero-tile__action">Shop flower <b>→</b></span>
      </a>
      <a class="gtz-hero-tile gtz-hero-tile--edibles" href="/collections/edibles">
        <strong>THC<br>Edibles</strong>
        <span class="gtz-hero-tile__action">Shop now <b>→</b></span>
      </a>
      <a class="gtz-hero-tile gtz-hero-tile--vapes" href="/collections/disposable-vapes">
        <strong>Vapes &<br>Cartridges</strong>
        <span class="gtz-hero-tile__action">Shop now <b>→</b></span>
      </a>
    `;
    hero.appendChild(quickGrid);
  }

  if (!hero.querySelector('.gtz-hero__lead')) {
    const lead = document.createElement('a');
    lead.className = 'gtz-hero__lead';
    lead.href = '/collections/all-thc-and-cbd-products';
    lead.innerHTML = `
      <span class="gtz-hero__lead-eyebrow">Legal hemp · ships nationwide · 21+</span>
      <span class="gtz-hero__lead-title">Feel good.<br><em>Find green.</em></span>
      <span class="gtz-hero__lead-copy">Shop THC and CBD products with clear details, lab reports, and delivery made simple.</span>
      <span class="gtz-hero__lead-action">Shop all products <b>→</b></span>
    `;
    const quickGrid = hero.querySelector('.gtz-hero__quick-grid');
    hero.insertBefore(lead, quickGrid);
  }
}

function restyleHome(root) {
  if (!document.body.classList.contains('template-index')) return;

  root.querySelector('#main')?.classList.add('gtz-home');

  root.querySelectorAll('[class*="ai-countdown-timer"]').forEach((el) => {
    removeEl(closestSection(el));
  });

  [...root.querySelectorAll('.js-section__home-slider')].slice(1).forEach((slider) => {
    slider.classList.add('gtz-promo');
  });

  root.querySelectorAll('.js-section__collections-list').forEach((el) => el.classList.add('gtz-collections'));
  root.querySelectorAll('.js-section__featured-collections').forEach((el) => {
    el.classList.add('gtz-featured');
    const title = el.querySelector('.section__title-text')?.textContent || '';
    if (/flower/i.test(title)) el.classList.add('gtz-featured--flower');
  });
  root.querySelectorAll('.js-section__home-blog').forEach((el) => el.classList.add('gtz-blog'));
  root.querySelectorAll('.js-section__newsletter').forEach((el) => el.classList.add('gtz-newsletter'));

  root.querySelectorAll('.gtz-promo .home-carousel__btn').forEach((btn) => {
    const href = btn.getAttribute('href') || '';
    if (isLocationHref(href) || href === '/') btn.setAttribute('href', '/collections/flower');
  });

  restylePromo(root);
}

function restylePromo(root) {
  const promo = root.querySelector('.gtz-promo');
  if (!promo) return;

  promo.querySelectorAll('.home-carousel__content').forEach((content) => {
    const title = content.querySelector('.section__title-text');
    const label = (title?.textContent || '').trim();
    let eyebrow = 'Featured';
    if (/daily deals/i.test(label)) {
      eyebrow = 'This week';
      if (title) title.textContent = 'Deals of the week';
      const text = content.querySelector('.home-carousel__text');
      if (text) text.innerHTML = '<p>20% off edibles · 15% off wellness · 10% off flower, prerolls, and vapes.</p>';
    } else if (/thc drinks/i.test(label)) {
      eyebrow = 'In the fridge';
    } else if (/buy 2/i.test(label)) {
      eyebrow = 'Limited offer';
      if (title) title.textContent = 'Buy 2, get 1 free';
    }

    if (!content.querySelector('.gtz-promo__eyebrow')) {
      const el = document.createElement('p');
      el.className = 'gtz-promo__eyebrow';
      el.textContent = eyebrow;
      content.prepend(el);
    }
  });
}

function enableProductCards(root) {
  root.querySelectorAll('quick-shop, .js-quickshop-trigger, [quickshop-trigger]').forEach((el) => {
    if (el.closest('template')) return;
    el.remove();
  });
  root.querySelectorAll('.product-card-btn, product-card-button').forEach((el) => {
    if (el.closest('template, form[action*="/cart/add"]')) return;
    const card = el.closest('.product-card, .js-product-card');
    if (card?.querySelector('a[href*="/products/"]')) el.remove();
  });
}

export function sizeProductLayout(root) {
  const content = root.querySelector('.product-single__content');
  const box = root.querySelector('.product-single__box');
  const media = root.querySelector('.product-single__media');
  if (!content || !box) return;
  const height = Math.max(box.scrollHeight, media?.scrollHeight || 0, box.offsetHeight);
  if (height) content.style.setProperty('--pdp-height', `${height}px`);
}

export function enableProductGallery(root) {
  root.querySelectorAll('.media-gallery--loading').forEach((el) => el.classList.remove('media-gallery--loading'));
  root.querySelectorAll('.media-gallery__slider--loading').forEach((el) => el.classList.remove('media-gallery__slider--loading'));

  root.querySelectorAll('.media-gallery').forEach((gallery) => {
    const slides = [...gallery.querySelectorAll('.media-gallery__wrapper')];
    if (!slides.length) return;

    const thumbs = [...gallery.querySelectorAll('.thumbnail-list__item, [data-thumbnail], button[data-slide-id], a[data-slide-id]')].filter(
      (el) => !el.classList.contains('media-gallery__link')
    );

    const show = (index) => {
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.hidden = !active;
        slide.classList.toggle('is-active', active);
      });
      thumbs.forEach((thumb, i) => thumb.classList.toggle('is-active', i === index));
    };

    show(0);
    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', (event) => {
        event.preventDefault();
        const fromAttr = Number(thumb.getAttribute('data-slide-id'));
        show(Number.isFinite(fromAttr) ? fromAttr : i);
      });
    });
  });

  root.querySelectorAll('a.media-gallery__link[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(href)) return;
    link.addEventListener('click', (event) => event.preventDefault());
  });

  const applySize = () => sizeProductLayout(root);
  applySize();
  requestAnimationFrame(applySize);
  root.querySelectorAll('.product-single__media img, .product-single__box img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', applySize, { once: true });
  });
}

function restyleCtas(root) {
  root.querySelectorAll('.home-carousel__btn.c-btn--mono').forEach((btn) => {
    btn.classList.remove('c-btn--mono');
    btn.classList.add('c-btn--primary');
  });
}

function isCartAccordion(details) {
  const id = details.id || '';
  return /^cart-/i.test(id) || !!details.closest('template, cart-drawer, .js-cart, .drawer--cart, .ajaxcart');
}

function accordionHasContent(details) {
  const content = details.querySelector('details-content') || details.querySelector('summary ~ *');
  return Boolean((content?.textContent || '').replace(/\u00a0/g, ' ').trim());
}

function nativeAccordions(root) {
  root.querySelectorAll('.pdp-faqs__question').forEach((question) => {
    if ((question.textContent || '').trim()) return;
    const answer = question.nextElementSibling;
    if (answer?.classList?.contains('pdp-faqs__answer')) answer.remove();
    question.remove();
  });

  root.querySelectorAll('.faq__category').forEach((category) => {
    const title = (category.querySelector('h2, h3, .faq__category__title-text')?.textContent || '').trim();
    if (!/local pickup|location and hours/i.test(title)) return;
    let sibling = category.nextElementSibling;
    while (sibling && sibling.matches('accordion-group, .gtz-accordion')) {
      const next = sibling.nextElementSibling;
      sibling.remove();
      sibling = next;
    }
    category.remove();
  });

  root.querySelectorAll('accordion-group details').forEach((details) => {
    if (isCartAccordion(details)) return;
    if (!accordionHasContent(details)) {
      const block = details.closest('.product-single__box__block, .faq__category');
      details.remove();
      if (block && !block.querySelector('details')) removeEl(block);
      return;
    }
    details.replaceWith(details.cloneNode(true));
  });

  root.querySelectorAll('accordion-group').forEach((group) => {
    if (group.closest('template')) return;
    if (!group.querySelector('details')) {
      group.remove();
      return;
    }
    if (![...group.querySelectorAll('details')].some((details) => !isCartAccordion(details))) return;
    group.classList.add('gtz-accordion');
  });
}

function restyleFaqPage(root) {
  const faq = root.querySelector('.page--faq, .js-section__faq-page');
  if (!faq) return;
  faq.classList.add('gtz-faq');
  faq.querySelectorAll('.container--tiny').forEach((el) => {
    el.classList.remove('container--tiny');
    el.classList.add('container');
  });
  root.querySelectorAll('.page .page__content.rte').forEach((el) => {
    if (!(el.textContent || '').trim()) removeEl(el);
  });
}

function rewriteAccordionCopy(root) {
  const replacements = [
    [/Orders may be made for local pickup at one of our retail locations\.?/gi, ''],
    [/Purchase online and easily pick-up in store or curbside at[^.]*\./gi, ''],
    [/or local pickup in a hemp store near you\.?/gi, ''],
    [/or visit locations in Tennessee and North Carolina\.?/gi, ''],
    [/Vape products are unavailable for shipping\.\s*/gi, 'Vape products cannot be shipped. '],
  ];

  root.querySelectorAll('.faq__accordion__item-wrap, .product-single__accordion__item-wrap, .pdp-faqs__answer, details-content').forEach((el) => {
    if (el.closest('template, .js-cart, cart-drawer')) return;
    let html = el.innerHTML;
    const next = replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), html);
    if (next !== html) el.innerHTML = next.replace(/<p>\s*<\/p>/gi, '');
  });
}

function rewriteMediaUrl(url = '') {
  let next = url.trim();
  if (!next) return next;
  if (/^(files|collections|articles)\//.test(next)) next = `/cdn/shop/${next}`;
  for (const [from, to] of Object.entries(HEIC_FALLBACKS)) {
    next = next.split(from).join(to);
  }
  next = next.replace(/\.heic(?=([?#]|$))/gi, '.jpg');
  return next;
}

function cleanSrcset(value = '') {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => rewriteMediaUrl(part.replace(/\s+\d+h\b/gi, '')))
    .filter((part) => {
      const width = Number(part.match(/\s(\d+)w\s*$/)?.[1] || 0);
      return !width || width <= MAX_SRCSET_W;
    })
    .join(', ');
}

function optimizeMedia(root) {
  const images = [...root.querySelectorAll('img')];
    images.forEach((img) => {
    const src = rewriteMediaUrl(img.getAttribute('src') || '');
    if (src) img.setAttribute('src', src);
    if (img.hasAttribute('srcset')) img.setAttribute('srcset', cleanSrcset(img.getAttribute('srcset') || ''));

    img.setAttribute('decoding', 'async');
    const aboveFold = Boolean(img.closest('.gtz-hero, .header, .announcement-bar, .announcement'));
    img.setAttribute('loading', aboveFold ? 'eager' : 'lazy');
    const firstHeroImg = img.closest('.gtz-hero')?.querySelector('img');
    img.setAttribute('fetchpriority', img === firstHeroImg ? 'high' : 'low');
    img.addEventListener(
      'error',
      () => {
        img.hidden = true;
        const wrap = img.closest('.collection-top-menu__item, .collection-list__media');
        if (wrap) wrap.classList.add('gtz-img-missing');
      },
      { once: true }
    );
  });

  root.querySelectorAll('source[srcset]').forEach((el) => {
    el.setAttribute('srcset', cleanSrcset(el.getAttribute('srcset') || ''));
  });

  root.querySelectorAll('[style*="background-image"], [style*="background-image"]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    el.setAttribute(
      'style',
      style.replace(/url\((['"]?)([^'")]+)\1\)/g, (_match, quote, url) => `url(${quote}${rewriteMediaUrl(url)}${quote})`)
    );
  });

  root.querySelectorAll('iframe').forEach((frame) => frame.setAttribute('loading', 'lazy'));
}

function quietHomepageMotion() {
  document.body.classList.remove('js-theme-loading');
  document.body.classList.add('js-theme-loaded');
  document.body.setAttribute('data-anim-load', 'false');
  document.body.setAttribute('data-anim-interval', 'false');
  document.querySelectorAll('.page-transition').forEach((el) => el.remove());
}

function safeStep(label, fn) {
  try {
    fn();
  } catch (error) {
    console.warn(`[store] ${label} failed`, error);
  }
}

export function stripClonedWidgets(root) {
  if (!root?.querySelectorAll) return;
  safeStep('drop widgets', () => {
    for (const selector of DROP_SELECTORS) {
      root.querySelectorAll(selector).forEach((el) => el.remove());
    }
    root.querySelectorAll('script[src]').forEach((el) => {
      if (shouldDropSrc(el.getAttribute('src') || '')) el.remove();
    });
  });

  safeStep('strip location nav', () => stripLocationNav(root));
  safeStep('strip location sections', () => stripLocationSections(root));
  safeStep('rewrite links', () => rewriteContactAndOutboundLinks(root));
  safeStep('enable product cards', () => enableProductCards(root));
  safeStep('enable product gallery', () => enableProductGallery(root));
  safeStep('restyle hero', () => restyleHero(root));
  safeStep('restyle home', () => restyleHome(root));
  safeStep('optimize media', () => optimizeMedia(root));
  safeStep('quiet motion', () => quietHomepageMotion());
  safeStep('restyle ctas', () => restyleCtas(root));
  safeStep('rewrite accordion copy', () => rewriteAccordionCopy(root));
  safeStep('native accordions', () => nativeAccordions(root));
  safeStep('restyle faq page', () => restyleFaqPage(root));
  safeStep('tidy footer', () => tidyFooter(root));
}
