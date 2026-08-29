import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import NotFound from '../components/NotFound.jsx';
import { injectCatalogIntoCollection } from '../lib/catalog/inject.js';
import { getCachedCatalog, getProductByHandle, loadCatalog } from '../lib/catalog/store.js';
import { getPage } from '../lib/pages.js';
import { runInjectedScripts } from '../lib/runScripts.js';
import { canonicalProductPath, enableProductGallery, isLocationRoute, sanitizeHtml, sanitizePageMeta, stripClonedWidgets } from '../lib/sanitize.js';
import { reinitTheme } from '../lib/theme.js';
import { enableNavbarHover } from '../lib/navbarHover.js';
import DynamicCollection from './DynamicCollection.jsx';
import DynamicProduct from './DynamicProduct.jsx';
import StoreShell from '../components/StoreShell.jsx';

function applyBodyAttrs(attrs) {
  for (const { name } of [...document.body.attributes]) {
    document.body.removeAttribute(name);
  }
  for (const [key, value] of Object.entries(attrs || {})) {
    document.body.setAttribute(key, value);
  }
}

function setMeta(page) {
  if (page.title) document.title = page.title;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', page.description || '');
  let keywords = document.querySelector('meta[name="keywords"]');
  if (page.keywords) {
    if (!keywords) {
      keywords = document.createElement('meta');
      keywords.setAttribute('name', 'keywords');
      document.head.appendChild(keywords);
    }
    keywords.setAttribute('content', page.keywords);
  }
}

export default function StorePage() {
  const { pathname, search } = useLocation();
  const containerRef = useRef(null);
  const [notFound, setNotFound] = useState(false);
  const [catalogProduct, setCatalogProduct] = useState(null);
  const [catalogCollection, setCatalogCollection] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const locationPage = isLocationRoute(pathname);
  const productPath = canonicalProductPath(pathname);
  const route = pathname.replace(/\/+$/, '') || '/';
  const productHandle = productPath ? decodeURIComponent(productPath.slice('/products/'.length)) : null;

  useEffect(() => {
    if (locationPage) return undefined;
    if (productPath && productPath !== route) return undefined;

    let cancelled = false;
    setNotFound(false);
    setCatalogCollection(null);
    setCatalogProduct(null);
    setLoadingPage(true);
    if (containerRef.current) containerRef.current.innerHTML = '';

    const collectionHandle = route.match(/^\/collections\/([^/]+)$/)?.[1];

    function renderClone(rawPage) {
      const page = sanitizePageMeta(rawPage);
      if (!page) return false;
      // If the container isn't ready yet, retry on next frame instead of giving up
      if (!containerRef.current) return 'retry';
      applyBodyAttrs(page.bodyAttrs);
      setMeta(page);
      try {
        containerRef.current.innerHTML = sanitizeHtml(page.html);
        stripClonedWidgets(containerRef.current);
        // Every non-admin route uses StoreShell. Remove the captured page chrome so
        // navigation and footer remain identical on the home page and content pages.
        containerRef.current.querySelectorAll('.shopify-section-group-header-group, .shopify-section-group-footer-group').forEach((el) => el.remove());
        document.body.classList.remove('js-theme-loading');
        document.body.classList.add('js-theme-loaded');
        runInjectedScripts(containerRef.current);
        reinitTheme();
        enableProductGallery(containerRef.current);
        // Enable navbar hover for home page
        if (route === '/') {
          enableNavbarHover();
        }
      } catch (error) {
        console.error('Failed to render page', pathname, error);
        return false;
      }
      window.scrollTo(0, 0);
      return true;
    }

    // Skip loading page JSON for products and collections - use dynamic components
    const skipPageLoad = productHandle || collectionHandle;

    Promise.all([skipPageLoad ? Promise.resolve(null) : getPage(pathname).catch((e) => { console.error('[StorePage] getPage failed', pathname, e); return null; }), collectionHandle || productHandle ? loadCatalog().catch(() => null) : Promise.resolve(getCachedCatalog())])
      .then(async ([rawPage, nextCatalog]) => {
        if (cancelled) return;
        if (nextCatalog) setCatalog(nextCatalog);

        // Render page JSON only if not a product or collection
        if (!skipPageLoad && rawPage) {
          let result = renderClone(rawPage);
          // Container ref may not be attached yet on first render — retry once after a frame
          if (result === 'retry') {
            await new Promise((resolve) => requestAnimationFrame(resolve));
            if (cancelled) return;
            result = renderClone(rawPage);
          }
          if (result === true) {
            setLoadingPage(false);
            requestAnimationFrame(() => {
              if (containerRef.current) enableProductGallery(containerRef.current);
            });
            if (nextCatalog) injectCatalogIntoCollection(containerRef.current, route, nextCatalog);
            if (!collectionHandle && !productHandle) {
              const prefetch = () => loadCatalog().catch(() => {});
              if ('requestIdleCallback' in window) window.requestIdleCallback(prefetch, { timeout: 4000 });
              else setTimeout(prefetch, 2000);
            }
            return;
          }
          // Page render failed, will show 404
        }

        if (productHandle) {
          const product = await getProductByHandle(productHandle).catch(() => null);
          if (cancelled) return;
          if (product && product.status === 'active') {
            setLoadingPage(false);
            setCatalogProduct(product);
            applyBodyAttrs({
              class: 'template-product gtz-dynamic-product js-theme-loaded',
              id: product.handle,
              'data-heading-border': 'true',
            });
            setMeta({
              title: product.seo_title || `${product.title} | Green Treez`,
              description: product.seo_description || product.excerpt || product.description,
              keywords: product.seo_keywords || '',
            });
            window.scrollTo(0, 0);
            return;
          }
        }

        if (collectionHandle) {
          const collection = nextCatalog?.collections?.find((item) => item.handle === collectionHandle && item.published !== false);
          if (collection) {
            setLoadingPage(false);
            setCatalogCollection(collection);
            applyBodyAttrs({
              class: 'template-collection gtz-dynamic-collection js-theme-loaded',
              id: collection.handle,
              'data-heading-border': 'true',
            });
            setMeta({ title: collection.title, description: collection.description });
            window.scrollTo(0, 0);
            return;
          }
        }

        setLoadingPage(false);
        setNotFound(true);
      })
      .catch((error) => {
        console.error('Failed to load page', pathname, error);
        if (!cancelled) {
          setLoadingPage(false);
          setNotFound(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, locationPage, productPath, route, productHandle]);

  if (locationPage) return <Navigate to="/" replace />;
  if (productPath && productPath !== route) {
    return <Navigate to={productPath + search} replace />;
  }
  if (notFound) return <StoreShell><NotFound path={pathname} /></StoreShell>;

  if (catalogProduct) return <DynamicProduct product={catalogProduct} />;
  if (catalogCollection && catalog) return <DynamicCollection collection={catalogCollection} catalog={catalog} />;

  return (
    <StoreShell>
      {loadingPage ? <div className="gtz-page-loading">Loading…</div> : null}
      <div
        ref={containerRef}
      />
    </StoreShell>
  );
}
