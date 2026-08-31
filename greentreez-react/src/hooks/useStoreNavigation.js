import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addFromProductForm, isCartTrigger, isProductAddForm } from '../lib/catalog/cloneProduct.js';
import { canonicalProductPath, isLocationRoute } from '../lib/sanitize.js';

/**
 * Intercepts clicks inside imported storefront markup so plain anchors navigate
 * through the router. Pass enabled=false on routes that render their own React
 * UI (the admin), where hijacking links does real damage: canonicalProductPath
 * rewrites /admin/products/new to /products/new and lands on a 404.
 */
export function useStoreNavigation(enabled = true) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return undefined;

    const onClick = (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      if (isCartTrigger(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(new CustomEvent('gtz-open-cart'));
        return;
      }

      if (event.defaultPrevented) return;

      const link = event.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      // Browsers normalise a backslash to a slash, so "/\evil.com" becomes a
      // protocol-relative URL. Reject both forms.
      if (!href || !href.startsWith('/') || href.startsWith('//')) return;
      if (href.includes('\\')) return;
      // Admin routes are ordinary React Router links; leave them alone.
      if (href === '/admin' || href.startsWith('/admin/')) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download')) return;
      if (isLocationRoute(href.split('#')[0])) {
        event.preventDefault();
        navigate('/');
        return;
      }
      if (/^\/(cdn|checkout|checkouts|account|apps)\b/.test(href)) return;
      if (/\.(js|css|json|xml|pdf|png|jpe?g|webp|svg|mp4)(\?|$)/.test(href)) return;

      const [pathAndQuery] = href.split('#');
      const [pathOnly, query] = pathAndQuery.split('?');
      const productPath = canonicalProductPath(pathOnly);
      event.preventDefault();
      navigate((productPath || pathOnly || '/') + (query ? `?${query}` : ''));
    };

    const onSubmit = (event) => {
      const form = event.target.closest('form');
      if (!form) return;

      if (isProductAddForm(form)) {
        event.preventDefault();
        event.stopPropagation();
        addFromProductForm(form);
        return;
      }

      if (form.method.toLowerCase() !== 'get') return;

      const action = form.getAttribute('action') || '';
      if (!action.startsWith('/') || action.startsWith('//')) return;
      if (action === '/admin' || action.startsWith('/admin/')) return;
      if (/^\/(checkout|checkouts|account|apps|cart\/add)\b/.test(action)) return;

      event.preventDefault();
      const query = new URLSearchParams(new FormData(form)).toString();
      navigate(action.split('?')[0] + (query ? `?${query}` : ''));
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, [navigate, enabled]);
}
