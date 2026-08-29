import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { loadCatalog } from '../lib/catalog/store.js';

const DEAL_GROUPS = [
  { handle: 'edibles', label: 'Edibles', copy: 'Flavor-forward THC treats for your next night in.' },
  { handle: 'thca-flower', label: 'THCa Flower', copy: 'Fresh strains, clear details, and premium picks.' },
  { handle: 'disposable-vapes', label: 'Vapes', copy: 'Convenient, ready-to-enjoy favorites.' },
];

export default function SpecialDealsPage() {
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    document.body.className = 'gtz-specials-page js-theme-loaded';
    document.title = 'Specials & Deals | Green Treez';
    loadCatalog().then(setCatalog).catch(() => setCatalog({ products: [], collections: [] }));
  }, []);

  const featured = useMemo(
    () => {
      const active = (catalog?.products || []).filter((product) => product.status === 'active' && product.images?.length);
      const featuredHandles = new Set(DEAL_GROUPS.map((group) => group.handle));
      return [...active].sort((a, b) => {
        const aPriority = a.collections?.some((collection) => featuredHandles.has(collection.handle)) ? 1 : 0;
        const bPriority = b.collections?.some((collection) => featuredHandles.has(collection.handle)) ? 1 : 0;
        return bPriority - aPriority;
      }).slice(0, 8);
    },
    [catalog]
  );

  return (
    <StoreShell>
      <main className="gtz-specials" id="main">
        <section className="gtz-specials__hero">
          <div>
            <span>Green Treez offers</span>
            <h1>Discover your next <em>favorite.</em></h1>
            <p>A considered edit of hemp-derived THC and CBD products. Browse with confidence, then find the format that fits your day.</p>
            <Link to="/collections/all-thc-and-cbd-products">Shop all products <b>→</b></Link>
          </div>
          <aside><span>THE GREEN TREEZ EDIT</span><strong>21+</strong><p>Quality products.<br />Clear product details.</p><small>Explore what’s in season</small></aside>
        </section>
        <section className="gtz-specials__trust" aria-label="Why shop Green Treez">
          <p><b>01</b> Straightforward product information</p>
          <p><b>02</b> Lab reports when available</p>
          <p><b>03</b> A simpler way to shop</p>
        </section>
        <section className="gtz-specials__categories" aria-label="Shop deals by category">
          {DEAL_GROUPS.map((group, index) => (
            <Link to={`/collections/${group.handle}`} className={`gtz-specials__category gtz-specials__category--${index + 1}`} key={group.handle}>
              <span>0{index + 1}</span><h2>{group.label}</h2><p>{group.copy}</p><b>Explore →</b>
            </Link>
          ))}
        </section>
        <section className="gtz-specials__products">
          <header><div><span>Featured edit</span><h2>Worth a closer look</h2><p>Popular product types, selected to make finding your next favorite easier.</p></div><Link to="/collections/all-thc-and-cbd-products">View all <b>→</b></Link></header>
          {!catalog ? <p>Loading products…</p> : <div className="o-layout o-layout--small">{featured.map((product) => <ProductCard product={product} key={product.id} />)}</div>}
        </section>
      </main>
    </StoreShell>
  );
}
