import { useEffect } from 'react';
import { setNoIndex } from '../lib/seo.js';

/**
 * The 404 page.
 *
 * A static host cannot give this a 404 status: every unknown path is rewritten
 * to index.html and answered with a 200, so to a crawler this looks like a real
 * page that happens to say "not found" - a soft 404. Adding noindex is the
 * mitigation Google documents for exactly this case, and it matters here
 * because the captured manifest names ~2,800 routes whose content was never
 * captured (every /blogs/ article among them). Without it, each one Google
 * stumbles on becomes another thin page competing with the real catalog.
 */
export default function NotFound({ path }) {
  useEffect(() => {
    setNoIndex('Page not found | Green Treez Company');
  }, [path]);

  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p>We could not find a page at “{path}”.</p>
      <p>
        It may have moved, or the link that brought you here may be out of date.
      </p>
      <p>
        <a href="/">Go to the homepage</a> or{' '}
        <a href="/collections/all-thc-and-cbd-products">browse every product</a>.
      </p>
    </div>
  );
}
