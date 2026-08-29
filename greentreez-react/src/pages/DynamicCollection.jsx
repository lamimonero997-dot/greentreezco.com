import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { productsForCollection } from '../lib/catalog/store.js';

export default function DynamicCollection({ collection, catalog }) {
  const products = productsForCollection(catalog, collection.handle);

  useEffect(() => {
    document.body.className = 'template-collection gtz-dynamic-collection js-theme-loaded';
    document.title = `${collection.title} | Green Treez`;
  }, [collection]);

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
                {products.map((product) => (
                  <ProductCard product={product} key={product.id} />
                ))}
              </div>
              {!products.length ? <p>No products in this collection yet.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </StoreShell>
  );
}
