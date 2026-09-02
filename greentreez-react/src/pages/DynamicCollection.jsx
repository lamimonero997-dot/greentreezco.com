import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { productsForCollection } from '../lib/catalog/store.js';

// The full catalog is over 1700 products. Rendering every card at once left the
// browser with more than 1600 lazy images queued at the same time, and it simply
// gave up: nine of them had loaded after six seconds, and scrolling did not
// rescue the rest. Cards are added a page at a time instead, which keeps the
// number of pending images small enough that they actually arrive.
const PAGE_SIZE = 24;

export default function DynamicCollection({ collection, catalog }) {
  const products = productsForCollection(catalog, collection.handle);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Moving to another collection starts the list over. Adjusting during render
  // rather than in an effect avoids painting the new collection with the old
  // scroll position's worth of cards first.
  const [shownHandle, setShownHandle] = useState(collection.handle);
  if (shownHandle !== collection.handle) {
    setShownHandle(collection.handle);
    setVisibleCount(PAGE_SIZE);
  }
  const sentinelRef = useRef(null);

  const visible = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const hasMore = visibleCount < products.length;

  useEffect(() => {
    document.body.className = 'template-collection gtz-dynamic-collection js-theme-loaded';
    document.title = `${collection.title} | Green Treez`;
  }, [collection]);

  // Reveal the next page as the shopper approaches the end of the current one.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) => Math.min(current + PAGE_SIZE, products.length));
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, products.length]);

  return (
    <StoreShell>
      <div className="page-container">
        <div id="main" role="main">
          <section className="section section--collection">
            <div className="container">
              <header className="collection__header-info">
                <nav className="breadcrumb" aria-label="breadcrumbs">
                  <ul className="breadcrumb__items o-list-bare o-list-inline">
                    <li className="breadcrumb__item o-list-inline__item">
                      <Link to="/" className="breadcrumb__link u-small">
                        Home
                      </Link>
                    </li>
                    <li className="breadcrumb__item o-list-inline__item">
                      <span className="breadcrumb__link u-small breadcrumb__link--current">{collection.title}</span>
                    </li>
                  </ul>
                </nav>
                <h1 className="collection__header-info__title section__title-text">{collection.title}</h1>
                {collection.description ? <div className="collection__header-info__text rte">{collection.description}</div> : null}
              </header>
              <div className="o-layout o-layout--small">
                {visible.map((product, index) => (
                  // The first row is what the shopper sees immediately, so it is
                  // fetched straight away rather than waiting on lazy loading.
                  <ProductCard product={product} key={product.id} priority={index < 4} />
                ))}
              </div>
              {hasMore ? (
                <div className="gtz-collection__more" ref={sentinelRef}>
                  <button
                    type="button"
                    className="gtz-collection__more-btn"
                    onClick={() => setVisibleCount((current) => Math.min(current + PAGE_SIZE, products.length))}
                  >
                    Load more products
                  </button>
                  <p>
                    Showing {visible.length} of {products.length}
                  </p>
                </div>
              ) : null}
              {!products.length ? <p>No products in this collection yet.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </StoreShell>
  );
}
