import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { localCartCount } from '../lib/catalog/cart.js';
import { getStoreChrome } from '../lib/chrome.js';
import { reinitTheme } from '../lib/theme.js';
import { enableNavbarHover } from '../lib/navbarHover.js';
import ShopChrome from './ShopChrome.jsx';
import CompactFooter from './CompactFooter.jsx';

const MORE_MENU_ITEMS = new Set(['about us', 'contact', 'faqs', 'certificates of analysis lab reports']);

function simplifyMoreMenu(root) {
  const more = [...root.querySelectorAll('details[data-link-title]')].find(
    (item) => item.dataset.linkTitle?.trim().toLowerCase() === 'more!'
  );
  if (!more) return;

  const summaryLink = more.querySelector('summary > a');
  if (summaryLink) summaryLink.setAttribute('href', '/pages/about-us');

  more.querySelectorAll('.list-menu__item').forEach((item) => {
    const label = item.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!MORE_MENU_ITEMS.has(label)) item.remove();
  });
}

function simplifyAnnouncement(root) {
  const bar = root.querySelector('.js-section__announcement');
  if (!bar) return;
  bar.querySelectorAll('.announcement__slides').forEach((slide, index) => {
    if (index > 0) slide.remove();
  });
  bar.querySelectorAll('.announcement__carousel-button, .announcement__close').forEach((el) => el.remove());
  const text = bar.querySelector('.announcement__text');
  if (text) {
    text.innerHTML = 'Free Shipping into TN! <a href="/collections/free-shipping-to-tennessee">View Selection</a>';
  }
}

function syncHeaderCartCount(root) {
  const count = String(localCartCount());
  (root || document).querySelectorAll('items-count').forEach((el) => {
    el.textContent = count;
  });
}

function bindHeaderCart(root) {
  if (!root) return undefined;
  const onClick = (event) => {
    const trigger = event.target.closest('.js-cart-trigger, .js-cart-icon, a[href="/cart"], a[href="/cart/"]');
    if (!trigger || !root.contains(trigger)) return;
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('gtz-open-cart'));
  };
  root.addEventListener('click', onClick, true);
  return () => root.removeEventListener('click', onClick, true);
}

export default function StoreShell({ children }) {
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unbind = undefined;
    getStoreChrome()
      .then((chrome) => {
        if (cancelled) return;
        if (headerRef.current) headerRef.current.innerHTML = chrome.header || '';
        simplifyMoreMenu(headerRef.current);
        simplifyAnnouncement(headerRef.current);
        syncHeaderCartCount(headerRef.current);
        unbind = bindHeaderCart(headerRef.current);
        reinitTheme();
        // Enable navbar hover for desktop
        enableNavbarHover();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    const onCart = () => syncHeaderCartCount(headerRef.current);
    window.addEventListener('gtz-cart-change', onCart);

    return () => {
      cancelled = true;
      unbind?.();
      window.removeEventListener('gtz-cart-change', onCart);
    };
  }, []);

  if (failed) return <ShopChrome>{children}</ShopChrome>;

  return (
    <>
      <div className="gtz-shipping-bar">
        <span>Free Shipping into TN! Shop Broad Spectrum</span>
        <Link to="/collections/free-shipping-to-tennessee">View Selection</Link>
      </div>
      <div ref={headerRef} className="gtz-store-chrome gtz-store-chrome--header" />
      {children}
      <div ref={footerRef} className="gtz-store-chrome gtz-store-chrome--footer"><CompactFooter /></div>
    </>
  );
}
