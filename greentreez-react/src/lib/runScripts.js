const loadedClassicScripts = new Set();

function shouldSkipScript(old) {
  const src = old.getAttribute('src') || '';
  if (/cdn\.shopify\.com\/extensions|googletagmanager|google-analytics|gtag\/|scrollreveal|product-single|photoswipe|plyr\.min/i.test(src)) return true;
  return false;
}

export function runInjectedScripts(container) {
  if (!container?.querySelectorAll) return;
  const scripts = [...container.querySelectorAll('script')];

  for (const old of scripts) {
    try {
      const type = (old.getAttribute('type') || 'text/javascript').toLowerCase();
      if (type.includes('json') || type.includes('ld+json')) continue;
      if (shouldSkipScript(old)) {
        old.remove();
        continue;
      }

      const src = old.getAttribute('src');
      const next = document.createElement('script');
      for (const attr of old.attributes) next.setAttribute(attr.name, attr.value);

      if (src) {
        if (type !== 'module') {
          if (loadedClassicScripts.has(src)) {
            old.remove();
            continue;
          }
          loadedClassicScripts.add(src);
        }
        next.onerror = () => console.warn('[theme] injected script failed:', src);
      } else if (type === 'module') {
        const code = old.textContent
          .replaceAll('"/cdn/', `"${location.origin}/cdn/`)
          .replaceAll("'/cdn/", `'${location.origin}/cdn/`);
        next.src = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        next.onerror = () => console.warn('[theme] injected module failed');
      } else {
        next.textContent = `(function(){\ntry {\n${old.textContent}\n} catch (error) { console.warn('[theme] inline script failed', error); }\n})();`;
      }

      old.replaceWith(next);
    } catch (error) {
      console.warn('[theme] could not run injected script', error);
      old.remove();
    }
  }
}
