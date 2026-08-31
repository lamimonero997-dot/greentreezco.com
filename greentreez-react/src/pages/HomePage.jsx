import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import ShopChrome from '../components/ShopChrome.jsx';
import MapSection from '../components/MapSection.jsx';
import { loadCatalog } from '../lib/catalog/store.js';

const SHOP_CATEGORIES = [
  ['flower', 'Flower', 'Fresh THCa strains'],
  ['edibles', 'Edibles', 'Gummies, chocolates & more'],
  ['pre-rolls', 'Pre-rolls', 'Ready when you are'],
  ['disposable-vapes', 'Vapes', 'Smooth, convenient options'],
  ['concentrates', 'Concentrates', 'Potent extracts'],
  ['tincture', 'Tinctures', 'Simple daily wellness'],
];

function categoryImage(catalog, handle) {
  const collection = catalog.collections.find((item) => item.handle === handle);
  const firstHandle = collection?.product_handles?.[0];
  return catalog.products.find((product) => product.handle === firstHandle)?.images?.[0]?.src || '';
}

export default function HomePage() {
  const [catalog, setCatalog] = useState(null);
  const [ageConfirmed, setAgeConfirmed] = useState(() => sessionStorage.getItem('gtz-age-confirmed') === 'yes');

  useEffect(() => {
    document.body.className = 'gtz-modern-home js-theme-loaded';
    document.title = 'Green Treez | Legal THC & CBD';
    loadCatalog().then(setCatalog).catch(() => setCatalog({ products: [], collections: [] }));
  }, []);

  const featured = useMemo(
    () => (catalog?.products || []).filter((product) => product.status === 'active').filter((product) => product.images?.length).slice(0, 8),
    [catalog]
  );

  function confirmAge() {
    sessionStorage.setItem('gtz-age-confirmed', 'yes');
    setAgeConfirmed(true);
  }

  return (
    <ShopChrome>
      {!ageConfirmed ? (
        <div className="gtz-age-gate" role="dialog" aria-modal="true" aria-labelledby="age-title">
          <div className="gtz-age-gate__card">
            <span className="gtz-eyebrow">Green Treez</span>
            <h1 id="age-title">Are you 21 or older?</h1>
            <p>You must be of legal age to enter this website.</p>
            <div className="gtz-age-gate__actions">
              <button type="button" onClick={confirmAge}>Yes, enter shop</button>
              <a href="https://www.google.com">No, exit</a>
            </div>
          </div>
        </div>
      ) : null}
      <main>
        <section className="gtz-home-hero">
          <div className="gtz-home-hero__content">
            <span className="gtz-eyebrow">Hemp-derived THC & CBD</span>
            <h1>Find your good kind of <em>green.</em></h1>
            <p>Thoughtfully selected products, clear details, and a calmer way to shop.</p>
            <div className="gtz-home-hero__actions">
              <Link to="/collections/all-thc-and-cbd-products">Shop all products</Link>
              <Link className="gtz-link-button" to="/collections/flower">Explore flower <span>→</span></Link>
            </div>
          </div>
          <div className="gtz-home-hero__visual" aria-hidden="true">
            <div className="gtz-home-hero__orb" />
            <p>21+ only<br />Lab tested<br />Fast shipping</p>
          </div>
        </section>

        <section className="gtz-home-section gtz-home-section--categories">
          <div className="gtz-section-heading">
            <div><span className="gtz-eyebrow">Shop your way</span><h2>Choose a category</h2></div>
            <Link to="/collections/all-thc-and-cbd-products">View all <span>→</span></Link>
          </div>
          <div className="gtz-category-grid">
            {SHOP_CATEGORIES.map(([handle, title, subtitle], index) => (
              <Link className={`gtz-category-card gtz-category-card--${index + 1}`} to={`/collections/${handle}`} key={handle}>
                {catalog && categoryImage(catalog, handle) ? <img src={categoryImage(catalog, handle)} alt="" /> : null}
                <div><h3>{title}</h3><p>{subtitle}</p><span>Shop now →</span></div>
              </Link>
            ))}
          </div>
        </section>

        <MapSection />

        <section className="gtz-home-section gtz-home-section--featured">
          <div className="gtz-section-heading">
            <div><span className="gtz-eyebrow">Just in</span><h2>Featured products</h2></div>
            <Link to="/collections/all-thc-and-cbd-products">Shop everything <span>→</span></Link>
          </div>
          {!catalog ? <p className="gtz-catalog-loading">Loading products…</p> : null}
          <div className="o-layout o-layout--small gtz-home-products">
            {featured.map((product) => <ProductCard product={product} key={product.id} />)}
          </div>
        </section>

        <section className="gtz-home-promise">
          <span className="gtz-eyebrow">The Green Treez difference</span>
          <h2>Better information. <em>Better choices.</em></h2>
          <div>
            <article><strong>01</strong><h3>Lab-tested</h3><p>Explore product details and lab reports before you buy.</p></article>
            <article><strong>02</strong><h3>Easy to discover</h3><p>Shop by category, effect, or the experience you want.</p></article>
            <article><strong>03</strong><h3>Made simple</h3><p>Clear pricing and a straightforward cart from product to checkout.</p></article>
          </div>
        </section>
      </main>
    </ShopChrome>
  );
}
