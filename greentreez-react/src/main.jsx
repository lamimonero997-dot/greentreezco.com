import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { patchCustomElements } from './lib/customElements.js';
import { initThemeCart } from './lib/initCart.js';
import { loadThemeScripts } from './lib/loadTheme.js';
import './styles.css';

// Initialize Cookies polyfill FIRST before any theme scripts load
const cookiesAPI = {
  get: (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  },
  set: (name, value, options = {}) => {
    let cookieString = `${name}=${value}`;
    if (options.expires) {
      const date = new Date();
      date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
      cookieString += `; expires=${date.toUTCString()}`;
    }
    if (options.path) cookieString += `; path=${options.path}`;
    document.cookie = cookieString;
  },
  remove: (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
};

window.Cookies = cookiesAPI;
window.theme = window.theme || {};
window.theme.lib = window.theme.lib || {};
window.theme.lib.Cookies = cookiesAPI;

function quiet(event) {
  const message = String(event?.reason?.message || event?.message || event?.reason || '');
  if (
    /ResizeObserver|custom element|Failed to fetch|NetworkError|AbortError|quick-shop|jQuery/i.test(
      message
    )
  ) {
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
  }
}

window.addEventListener('error', quiet);
window.addEventListener('unhandledrejection', quiet);

// Requests the imported theme scripts make, which get a stub response rather
// than being allowed to fail loudly. Anything else - our own API calls included
// - must see the real outcome.
const STORE_REQUEST_RE = /view=quick-shop|\/cart\/|\.js(\?|$)|section_id=|sections=|\/search\/suggest/;

const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (/\/products\/[^/?]+\.js/.test(url)) {
    const catalogResponse = await catalogProductResponse(url);
    if (catalogResponse) return catalogResponse;
  }
  try {
    const response = await nativeFetch(input, init);
    if (response.ok) return response;
    if (!STORE_REQUEST_RE.test(url)) return response;
    console.warn('[store] request failed', url, response.status);
    return fallbackStoreResponse(url);
  } catch (error) {
    // Only the theme's own requests get a stub. Substituting one for, say, a
    // failed contact-form send would report success for a message that never
    // left the browser, so every other caller gets the real error.
    if (!STORE_REQUEST_RE.test(url)) throw error;
    console.warn('[store] request error', url, error);
    return fallbackStoreResponse(url);
  }
};

async function catalogProductResponse(url) {
  const match = url.match(/\/products\/([^/?#]+)\.js/);
  if (!match) return null;
  try {
    const { getProductByHandle } = await import('./lib/catalog/store.js');
    const { toShopifyProduct } = await import('./lib/catalog/model.js');
    const product = await getProductByHandle(decodeURIComponent(match[1]));
    if (!product) return null;
    return new Response(JSON.stringify(toShopifyProduct(product)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch {
    return null;
  }
}

function fallbackStoreResponse(url) {
  if (/\/products\/[^/?]+\.js/.test(url)) {
    return new Response('{"id":0,"title":"","handle":"","variants":[],"available":false}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (/\/cart/.test(url) || /\/search\/suggest/.test(url)) {
    return new Response('{"items":[],"item_count":0,"total_price":0,"items_subtotal_price":0}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return new Response('<div></div>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });
}

patchCustomElements();

function render() {
  createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

// The admin renders its own UI and never touches the cloned theme, so booting
// the storefront's scripts there only delays the dashboard.
if (window.location.pathname.startsWith('/admin')) {
  render();
} else {
  // Initialize cart store before loading theme scripts
  initThemeCart()
    .catch((error) => console.warn('[cart] init failed', error))
    .then(() => loadThemeScripts())
    .catch((error) => console.warn('[theme] boot failed', error))
    .then(render);
}
