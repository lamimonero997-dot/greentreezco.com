function loadScript(src, isModule) {
  return new Promise((resolve) => {
    if (!src || /cdn\.shopify\.com\/extensions|scrollreveal/i.test(src)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    if (isModule) script.type = 'module';
    script.src = src;
    script.onload = resolve;
    script.onerror = () => {
      console.warn('[theme] script failed:', src);
      resolve();
    };
    document.head.appendChild(script);
  });
}

async function loadItem(item) {
  let src = item.src;
  let revoke = false;

  if (!src) {
    let code = item.code
      .replaceAll('"/cdn/', `"${location.origin}/cdn/`)
      .replaceAll("'/cdn/", `'${location.origin}/cdn/`);

    // If this is the Cookies import script, replace it with our polyfill
    if (code.includes('import Cookies from') && code.includes('js-cookie.lib.js')) {
      code = `
        window.theme.lib = window.theme.lib || {};
        window.theme.lib.Cookies = window.Cookies;
        window.theme.cart = window.theme.cart || {};
        window.theme.cart.functions = window.theme.cart.functions || {};
      `;
      item.module = false; // Don't load as module since we're using the polyfill
    }

    src = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    revoke = true;
  }

  try {
    await loadScript(src, item.module);
  } catch (error) {
    console.warn('[theme] failed to load script', src, error);
  }
  if (revoke) URL.revokeObjectURL(src);
}

// Add Cookies polyfill if it doesn't exist
function initCookiesPolyfill() {
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

  // Set up both window.Cookies and window.theme.lib.Cookies
  if (!window.Cookies) {
    window.Cookies = cookiesAPI;
  }

  window.theme = window.theme || {};
  window.theme.lib = window.theme.lib || {};
  if (!window.theme.lib.Cookies) {
    window.theme.lib.Cookies = cookiesAPI;
  }
}

export async function loadThemeScripts() {
  // Initialize Cookies polyfill before loading theme scripts
  initCookiesPolyfill();

  try {
    const response = await fetch('/head-scripts.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let scripts = (await response.json()).filter((item) => !item.src || !/scrollreveal/i.test(item.src));

    // Filter out ES module scripts that cause errors
    scripts = scripts.filter((item) => {
      // Skip inline module scripts (they often have import statements that fail)
      if (!item.src && item.module) return false;

      // Skip specific problematic module scripts and scripts that depend on missing dependencies
      if (item.src) {
        const skipPatterns = [
          'cart-store.js',
          'quantity-input.js',
          'product-form.js',
          'cart-link.js',
          'cart-components.js',
          'cart-free-shipping-bar.js',
          'product-cards.js',
          'product-interactive.js'
        ];
        return !skipPatterns.some(pattern => item.src.includes(pattern));
      }

      return true;
    });

    const jquery = scripts.find((item) => item.src?.includes('jquery.min.js'));
    const vendor = scripts.find((item) => item.src?.includes('vendor.min.js'));
    const rest = scripts.filter((item) => item !== jquery && item !== vendor);

    if (jquery) await loadItem(jquery);
    if (vendor) await loadItem(vendor);

    const deferred = rest.filter((item) => /lottie|swatch-colors|product-interactive/i.test(item.src || ''));
    const critical = rest.filter((item) => !deferred.includes(item));
    await Promise.all(critical.map((item) => loadItem(item).catch((error) => console.warn('[theme] skipped script', item.src || 'inline', error))));
    deferred.forEach((item) => {
      loadItem(item).catch((error) => console.warn('[theme] skipped script', item.src || 'inline', error));
    });
  } catch (error) {
    console.warn('[theme] failed to load theme scripts', error);
  }
}
