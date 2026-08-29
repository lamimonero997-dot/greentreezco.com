let manifestPromise = null;
let productIndexPromise = null;
const pageCache = new Map();
const PAGE_ALIASES = {
  '/pages/faqs': 'pages__frequently-asked-questions',
  '/pages/faq': 'pages__frequently-asked-questions',
};

function getManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch('/pages-manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        manifestPromise = null;
        throw error;
      });
  }
  return manifestPromise;
}

async function getProductIndex(manifest) {
  if (!productIndexPromise) {
    const byHandle = new Map();
    for (const [route, slug] of Object.entries(manifest)) {
      const match = route.match(/\/products\/([^/]+)$/);
      if (!match) continue;
      const handle = match[1];
      if (!byHandle.has(handle) || route.startsWith('/products/')) {
        byHandle.set(handle, slug);
      }
    }
    productIndexPromise = Promise.resolve(byHandle);
  }
  return productIndexPromise;
}

export async function getPage(pathname) {
  const route = pathname.replace(/\/+$/, '') || '/';
  let slug = route === '/' ? 'index' : PAGE_ALIASES[route] || null;

  if (!slug) {
    const manifest = await getManifest();
    slug = manifest[route];

    if (!slug && /\/products\/[^/]+$/.test(route)) {
      const handle = route.split('/').pop();
      const index = await getProductIndex(manifest);
      slug = index.get(handle) || manifest[`/products/${handle}`] || null;
    }
  }

  if (!slug) return null;

  if (!pageCache.has(slug)) {
    pageCache.set(
      slug,
      fetch(`/pages/${slug}.json`)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .catch((error) => {
          pageCache.delete(slug);
          throw error;
        })
    );
  }

  return pageCache.get(slug);
}
