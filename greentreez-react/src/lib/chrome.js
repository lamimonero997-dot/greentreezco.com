import { getPage } from './pages.js';
import { sanitizeHtml, stripClonedWidgets } from './sanitize.js';

let chromePromise = null;

export function getStoreChrome() {
  if (!chromePromise) {
    chromePromise = getPage('/')
      .then((page) => {
        const wrap = document.createElement('div');
        wrap.innerHTML = sanitizeHtml(page?.html || '');
        stripClonedWidgets(wrap);
        const header = [...wrap.querySelectorAll('.shopify-section-group-header-group')].map((el) => el.outerHTML).join('');
        const footer = [...wrap.querySelectorAll('.shopify-section-group-footer-group')].map((el) => el.outerHTML).join('');
        return { header, footer };
      })
      .catch((error) => {
        chromePromise = null;
        throw error;
      });
  }
  return chromePromise;
}
