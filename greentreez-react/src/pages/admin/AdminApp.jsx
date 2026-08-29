import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import {
  catalogSource,
  deleteProduct,
  listCollections,
  listProducts,
  loadCatalog,
  saveCollection,
  saveProduct,
  subscribeCatalog,
} from '../../lib/catalog/store.js';
import {
  centsToDollars,
  dollarsToCents,
  EFFECT_OPTIONS,
  formatMoney,
  joinList,
  newProduct,
  parseList,
  productAvailable,
  productPrice,
  PRODUCT_TYPES,
  PSYCHO_LEVELS,
  slugify,
  STRAINS,
} from '../../lib/catalog/model.js';
import './admin.css';

const SESSION_KEY = 'gtz-admin-session';
const LOGO_SRC = '/cdn/shop/files/Green_Treez_Logo_Online_49d74201-94de-44f4-984a-9f299aedc9ad.png'; // Update this with your brand logo

function expectedPassword() {
  return import.meta.env.VITE_ADMIN_PASSWORD || 'greentreez';
}

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function Login({ onOk }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    if (password !== expectedPassword()) {
      setError('That password does not match.');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');
    onOk();
  }

  return (
    <div className="gtz-admin-login">
      <form onSubmit={submit}>
        <Link className="gtz-admin__logo" to="/admin">
          <img src={LOGO_SRC} alt="Green Treez" />
          <span>Catalog</span>
        </Link>
        <h1>Sign in to manage the shop</h1>
        <p className="gtz-admin__muted">Edit products, prices, inventory, and collections. Changes publish to the live storefront.</p>
        <label className="gtz-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
        </label>
        {error ? <p className="gtz-error">{error}</p> : null}
        <button type="submit">Continue</button>
        <p className="gtz-admin__muted">Demo password: greentreez</p>
      </form>
    </div>
  );
}

function Layout({ onLogout, children }) {
  const remote = catalogSource() === 'supabase';
  return (
    <div className="gtz-admin">
      <aside className="gtz-admin__side">
        <Link className="gtz-admin__logo" to="/admin">
          <img src={LOGO_SRC} alt="Green Treez" />
          <span>Catalog</span>
        </Link>
        <div className="gtz-admin__nav">
          <NavLink to="/admin" end>
            <Icon path="M4 6h16M4 12h10M4 18h16" />
            Products
          </NavLink>
          <NavLink to="/admin/products/new">
            <Icon path="M12 5v14M5 12h14" />
            Add product
          </NavLink>
          <NavLink to="/admin/collections">
            <Icon path="M4 7h6v6H4zM14 7h6v6h-6zM4 17h16" />
            Collections
          </NavLink>
        </div>
        <div className="gtz-admin__side-foot">
          <p className="gtz-admin__pill">{remote ? 'Supabase connected' : 'Local workspace'}</p>
          <a href="/" target="_self">
            <Icon path="M3 11l9-8 9 8M5 10v10h14V10" />
            View shop
          </a>
          <button type="button" onClick={onLogout}>
            <Icon path="M9 6H5v12h4M16 12H9M13 9l3 3-3 3" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="gtz-admin__main">{children}</main>
    </div>
  );
}

function Thumb({ src, alt = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="gtz-admin__thumb" aria-hidden="true" />;
  return <img className="gtz-admin__thumb" src={src} alt={alt} onError={() => setFailed(true)} />;
}

export function ProductsHome() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [collection, setCollection] = useState('all');
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stop = subscribeCatalog((catalog) => {
      if (!catalog) return;
      setProducts(catalog.products || []);
      setCollections(catalog.collections || []);
      setReady(true);
    });
    Promise.all([listProducts(), listCollections()]).then(([nextProducts, nextCollections]) => {
      setProducts(nextProducts);
      setCollections(nextCollections);
      setReady(true);
    });
    return stop;
  }, []);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.status === 'active').length;
    const draft = products.filter((product) => product.status === 'draft').length;
    const soldOut = products.filter((product) => !productAvailable(product)).length;
    return { total: products.length, active, draft, soldOut };
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (status !== 'all' && product.status !== status) return false;
      if (type !== 'all' && product.product_type !== type) return false;
      if (collection !== 'all' && !(product.collection_handles || []).includes(collection)) return false;
      if (!needle) return true;
      return [product.title, product.handle, product.vendor, product.product_type, ...(product.variants || []).map((variant) => variant.sku)]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [products, query, status, type, collection]);

  const pageSize = 25;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Products</h1>
          <p className="gtz-admin__muted">Search, filter, and publish the catalog that powers the storefront.</p>
        </div>
        <div className="gtz-admin__actions">
          <Link className="gtz-btn" to="/admin/products/new">
            Add product
          </Link>
        </div>
      </div>

      {catalogSource() === 'local' ? (
        <p className="gtz-admin__banner">This browser is saving a local copy. Connect Supabase to keep the catalog in sync across devices.</p>
      ) : (
        <p className="gtz-admin__banner is-ok">Connected to Supabase. Saved products update the live shop immediately.</p>
      )}

      <div className="gtz-admin__stats">
        <div className="gtz-stat">
          <span>Catalog</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="gtz-stat">
          <span>Active</span>
          <strong>{stats.active}</strong>
        </div>
        <div className="gtz-stat">
          <span>Drafts</span>
          <strong>{stats.draft}</strong>
        </div>
        <div className="gtz-stat">
          <span>Sold out</span>
          <strong>{stats.soldOut}</strong>
        </div>
      </div>

      <div className="gtz-admin__toolbar">
        <label className="gtz-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Title, handle, vendor, SKU"
          />
        </label>
        <label className="gtz-field">
          <span>Status</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="gtz-field">
          <span>Type</span>
          <select value={type} onChange={(event) => { setType(event.target.value); setPage(0); }}>
            <option value="all">All types</option>
            {PRODUCT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="gtz-field">
          <span>Collection</span>
          <select value={collection} onChange={(event) => { setCollection(event.target.value); setPage(0); }}>
            <option value="all">All collections</option>
            {collections.map((item) => (
              <option key={item.handle} value={item.handle}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="gtz-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Inventory</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!ready ? (
              <tr>
                <td colSpan={5} className="gtz-loading">
                  Loading catalog…
                </td>
              </tr>
            ) : null}
            {ready && !slice.length ? (
              <tr>
                <td colSpan={5} className="gtz-empty">
                  No products match these filters.
                </td>
              </tr>
            ) : null}
            {slice.map((product) => {
              const stock = (product.variants || []).reduce((sum, variant) => sum + Number(variant.inventory_quantity || 0), 0);
              return (
                <tr key={product.id} className="is-clickable" onClick={() => navigate(`/admin/products/${product.id}`)}>
                  <td>
                    <div className="gtz-admin__product">
                      <Thumb src={product.images?.[0]?.src} alt="" />
                      <div>
                        <strong>{product.title}</strong>
                        <div className="gtz-admin__handle">{product.handle}</div>
                      </div>
                    </div>
                  </td>
                  <td>{product.product_type}</td>
                  <td>
                    {stock} in stock
                    <div className="gtz-admin__handle">{product.variants?.length || 0} variants</div>
                  </td>
                  <td>{formatMoney(productPrice(product))}</td>
                  <td>
                    <span className={`gtz-status is-${productAvailable(product) ? product.status : 'soldout'}`}>
                      {productAvailable(product) ? product.status : 'sold out'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="gtz-admin__pager">
        <p className="gtz-admin__muted">
          {filtered.length ? `${safePage * pageSize + 1}–${Math.min(filtered.length, safePage * pageSize + pageSize)} of ${filtered.length}` : '0 products'}
        </p>
        <div className="gtz-admin__actions">
          <button className="gtz-btn gtz-btn--ghost" type="button" disabled={safePage <= 0} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <button className="gtz-btn gtz-btn--ghost" type="button" disabled={safePage + 1 >= pages} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </div>
      </div>
    </>
  );
}

export function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [product, setProduct] = useState(null);
  const [collections, setCollections] = useState([]);
  const [collectionQuery, setCollectionQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setMissing(false);
    Promise.all([loadCatalog(), listCollections()]).then(([catalog, nextCollections]) => {
      setCollections(nextCollections);
      if (isNew) setProduct(newProduct({ status: 'active' }));
      else {
        const found = catalog.products.find((item) => item.id === id);
        if (!found) setMissing(true);
        setProduct(
          found
            ? {
                ...found,
                images: (found.images || []).map((image, position) => ({
                  src: image.src || image,
                  alt: image.alt || found.title,
                  position,
                })),
                tags: found.tags || [],
                effects: found.effects || [],
                seo_keywords: found.seo_keywords || '',
                excerpt: found.excerpt || '',
                lab_report_url: found.lab_report_url || '',
              }
            : null
        );
      }
    });
  }, [id, isNew]);

  const visibleCollections = useMemo(() => {
    const needle = collectionQuery.trim().toLowerCase();
    return collections.filter((item) => !needle || item.title.toLowerCase().includes(needle) || item.handle.includes(needle));
  }, [collections, collectionQuery]);

  if (missing) {
    return (
      <div className="gtz-admin-card gtz-empty">
        <h1>Product not found</h1>
        <p>This listing is not in the catalog.</p>
        <Link className="gtz-btn" to="/admin">
          Back to products
        </Link>
      </div>
    );
  }

  if (!product) return <p className="gtz-loading">Loading product…</p>;

  function patch(partial) {
    setProduct((current) => ({ ...current, ...partial }));
  }

  function patchVariant(index, partial) {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => (variantIndex === index ? { ...variant, ...partial } : variant)),
    }));
  }

  function patchImage(index, partial) {
    patch({
      images: (product.images || []).map((image, imageIndex) => (imageIndex === index ? { ...image, ...partial } : image)),
    });
  }

  function moveImage(index, direction) {
    const next = [...(product.images || [])];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ images: next.map((image, position) => ({ ...image, position })) });
  }

  function setFeaturedImage(index) {
    const next = [...(product.images || [])];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    patch({ images: next.map((image, position) => ({ ...image, position })) });
  }

  async function onSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await saveProduct({
        ...product,
        handle: slugify(product.handle || product.title),
        tags: parseList(product.tags),
        effects: parseList(product.effects),
        images: (product.images || [])
          .filter((image) => image.src)
          .map((image, position) => ({ ...image, position })),
        options: product.variants?.length
          ? [{ name: 'Size', position: 1, values: [...new Set(product.variants.map((variant) => variant.title || variant.option1).filter(Boolean))] }]
          : [],
      });
      setToast('Product saved');
      setTimeout(() => setToast(''), 2200);
      navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (saveError) {
      setError(saveError.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete ${product.title}? This removes it from the catalog.`)) return;
    await deleteProduct(product.id);
    navigate('/admin');
  }

  const actionLabel = saving ? (isNew ? 'Publishing…' : 'Updating…') : isNew ? 'Publish' : 'Update';

  return (
    <form className="gtz-admin-form" onSubmit={onSave}>
      <div className="gtz-editor-bar">
        <div>
          <p className="gtz-admin__crumb">
            <Link to="/admin">Products</Link>
            <span>/</span>
            <span>{isNew ? 'Add new product' : 'Edit product'}</span>
          </p>
          <h1>{isNew ? 'Add new product' : 'Edit product'}</h1>
        </div>
        <div className="gtz-admin__actions">
          <a className="gtz-btn gtz-btn--ghost" href={`/products/${product.handle}`}>
            Preview
          </a>
          <button className="gtz-btn" type="submit" disabled={saving}>
            {actionLabel}
          </button>
        </div>
      </div>
      {error ? <p className="gtz-error">{error}</p> : null}

      <div className="gtz-admin-layout">
        <div className="gtz-admin-stack">
          <section className="gtz-admin-card">
            <h2>Product details</h2>
            <div className="gtz-admin__form-grid">
              <label className="gtz-field is-full">
                <span>Title</span>
                <input
                  value={product.title}
                  onChange={(event) => patch({ title: event.target.value, handle: isNew ? slugify(event.target.value) : product.handle })}
                />
              </label>
              <label className="gtz-field is-full">
                <span>Short description</span>
                <textarea
                  value={product.excerpt || ''}
                  onChange={(event) => patch({ excerpt: event.target.value })}
                  placeholder="One or two sentences for cards and search results"
                  style={{ minHeight: '88px' }}
                />
              </label>
              <label className="gtz-field is-full">
                <span>Description</span>
                <textarea value={product.description || ''} onChange={(event) => patch({ description: event.target.value })} />
              </label>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Product images</h2>
            <p className="gtz-admin__muted">The first image is the featured photo. Additional images appear as gallery shots on the product page.</p>
            <div className="gtz-gallery">
              {(product.images || []).map((image, index) => (
                <article className={`gtz-gallery__card${index === 0 ? ' is-featured' : ''}`} key={`img-${index}`}>
                  <div className="gtz-gallery__badge">{index === 0 ? 'Featured' : `Gallery ${index}`}</div>
                  <div className="gtz-gallery__preview">
                    {image.src ? <img src={image.src} alt={image.alt || product.title} /> : <span>No preview</span>}
                  </div>
                  <label className="gtz-field">
                    <span>Image URL</span>
                    <input value={image.src} onChange={(event) => patchImage(index, { src: event.target.value })} placeholder="/cdn/shop/files/product.png" />
                  </label>
                  <label className="gtz-field">
                    <span>Alt text</span>
                    <input value={image.alt || ''} onChange={(event) => patchImage(index, { alt: event.target.value })} placeholder={product.title} />
                  </label>
                  <div className="gtz-gallery__actions">
                    <button className="gtz-btn gtz-btn--ghost" type="button" disabled={index === 0} onClick={() => moveImage(index, -1)}>
                      Up
                    </button>
                    <button className="gtz-btn gtz-btn--ghost" type="button" disabled={index === (product.images?.length || 1) - 1} onClick={() => moveImage(index, 1)}>
                      Down
                    </button>
                    {index !== 0 ? (
                      <button className="gtz-btn gtz-btn--ghost" type="button" onClick={() => setFeaturedImage(index)}>
                        Set featured
                      </button>
                    ) : null}
                    <button className="gtz-btn gtz-btn--ghost" type="button" onClick={() => patch({ images: product.images.filter((_, itemIndex) => itemIndex !== index) })}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <button
              className="gtz-btn gtz-btn--ghost"
              type="button"
              onClick={() =>
                patch({
                  images: [...(product.images || []), { src: '', alt: product.title, position: product.images?.length || 0 }],
                })
              }
            >
              Add gallery image
            </button>
          </section>

          <section className="gtz-admin-card">
            <h2>Variants</h2>
            <div className="gtz-variant-head">
              <span>Option</span>
              <span>SKU</span>
              <span>Price</span>
              <span>Compare-at</span>
              <span>Inventory</span>
              <span>Available</span>
              <span></span>
            </div>
            {(product.variants || []).map((variant, index) => (
              <div className="gtz-variant-row" key={variant.id || index}>
                <input value={variant.title} onChange={(event) => patchVariant(index, { title: event.target.value, option1: event.target.value })} placeholder="Size" />
                <input value={variant.sku || ''} onChange={(event) => patchVariant(index, { sku: event.target.value })} placeholder="SKU" />
                <input value={centsToDollars(variant.price)} onChange={(event) => patchVariant(index, { price: dollarsToCents(event.target.value) })} />
                <input
                  value={variant.compare_at_price ? centsToDollars(variant.compare_at_price) : ''}
                  onChange={(event) =>
                    patchVariant(index, { compare_at_price: event.target.value ? dollarsToCents(event.target.value) : null })
                  }
                  placeholder="—"
                />
                <input type="number" value={variant.inventory_quantity ?? 0} onChange={(event) => patchVariant(index, { inventory_quantity: Number(event.target.value) || 0 })} />
                <label className="gtz-stock">
                  <span className="gtz-switch">
                    <input type="checkbox" checked={Boolean(variant.available)} onChange={(event) => patchVariant(index, { available: event.target.checked })} />
                    <span />
                  </span>
                  In stock
                </label>
                <button className="gtz-btn gtz-btn--ghost" type="button" onClick={() => patch({ variants: product.variants.filter((_, itemIndex) => itemIndex !== index) })}>
                  Remove
                </button>
              </div>
            ))}
            <button
              className="gtz-btn gtz-btn--ghost"
              type="button"
              onClick={() =>
                patch({
                  variants: [
                    ...(product.variants || []),
                    {
                      id: `${product.id}-${Date.now()}`,
                      title: 'New size',
                      sku: '',
                      price: 0,
                      compare_at_price: null,
                      available: true,
                      inventory_quantity: 10,
                      option1: 'New size',
                    },
                  ],
                })
              }
            >
              Add variant
            </button>
          </section>

          <section className="gtz-admin-card">
            <h2>Search engine listing</h2>
            <p className="gtz-admin__muted">Controls the product URL and how this page appears in Google.</p>
            <div className="gtz-seo-preview">
              <div className="gtz-seo-preview__url">
                {typeof window !== 'undefined' ? window.location.host : 'shop.local'} › products › {product.handle || 'slug'}
              </div>
              <div className="gtz-seo-preview__title">{product.seo_title || product.title || 'Product title'}</div>
              <div className="gtz-seo-preview__desc">
                {product.seo_description || product.excerpt || product.description || 'Meta description will show here.'}
              </div>
            </div>
            <div className="gtz-admin__form-grid">
              <label className="gtz-field is-full">
                <span>URL slug</span>
                <div className="gtz-slug">
                  <span>/products/</span>
                  <input value={product.handle} onChange={(event) => patch({ handle: slugify(event.target.value) })} />
                </div>
              </label>
              <label className="gtz-field is-full">
                <span>
                  SEO title <em className={(product.seo_title || '').length > 60 ? 'is-over' : ''}>{(product.seo_title || '').length}/60</em>
                </span>
                <input
                  value={product.seo_title || ''}
                  onChange={(event) => patch({ seo_title: event.target.value })}
                  placeholder={product.title}
                />
              </label>
              <label className="gtz-field is-full">
                <span>
                  Meta description{' '}
                  <em className={(product.seo_description || '').length > 160 ? 'is-over' : ''}>{(product.seo_description || '').length}/160</em>
                </span>
                <textarea
                  value={product.seo_description || ''}
                  onChange={(event) => patch({ seo_description: event.target.value })}
                  placeholder={product.excerpt || 'Write a clear summary for search results'}
                  style={{ minHeight: '96px' }}
                />
              </label>
              <label className="gtz-field is-full">
                <span>Keywords</span>
                <input
                  value={typeof product.seo_keywords === 'string' ? product.seo_keywords : joinList(product.seo_keywords)}
                  onChange={(event) => patch({ seo_keywords: event.target.value })}
                  placeholder="THCa flower, hybrid, White Widow"
                />
              </label>
            </div>
          </section>
        </div>

        <div className="gtz-admin-stack">
          <section className="gtz-publish">
            <h2>Publish</h2>
            <label className="gtz-field">
              <span>Status</span>
              <select value={product.status} onChange={(event) => patch({ status: event.target.value })}>
                <option value="active">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="gtz-stock" style={{ marginTop: '0.75rem' }}>
              <span className="gtz-switch">
                <input type="checkbox" checked={Boolean(product.featured)} onChange={(event) => patch({ featured: event.target.checked })} />
                <span />
              </span>
              Featured product
            </label>
            <p className="gtz-admin__muted">{product.handle ? `/products/${product.handle}` : 'Save to create the product URL'}</p>
            <div className="gtz-publish__row">
              {!isNew ? (
                <button className="gtz-btn gtz-btn--danger" type="button" onClick={onDelete}>
                  Move to trash
                </button>
              ) : (
                <span />
              )}
              <button className="gtz-btn" type="submit" disabled={saving}>
                {actionLabel}
              </button>
            </div>
          </section>
          <section className="gtz-admin-card">
            <h2>Organization</h2>
            <div className="gtz-admin-stack">
              <label className="gtz-field">
                <span>Vendor</span>
                <input value={product.vendor || ''} onChange={(event) => patch({ vendor: event.target.value })} />
              </label>
              <label className="gtz-field">
                <span>Type</span>
                <select value={product.product_type} onChange={(event) => patch({ product_type: event.target.value })}>
                  {PRODUCT_TYPES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="gtz-field">
                <span>Tags</span>
                <input
                  value={Array.isArray(product.tags) ? joinList(product.tags) : product.tags || ''}
                  onChange={(event) => patch({ tags: event.target.value })}
                  placeholder="Flower, Hybrid, indoor"
                />
              </label>
              <label className="gtz-field">
                <span>Strain</span>
                <select value={product.strain || ''} onChange={(event) => patch({ strain: event.target.value })}>
                  <option value="">None</option>
                  {STRAINS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="gtz-field">
                <span>Psychoactivity</span>
                <select value={product.psychoactivity || ''} onChange={(event) => patch({ psychoactivity: event.target.value })}>
                  <option value="">None</option>
                  {PSYCHO_LEVELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="gtz-admin-card">
            <h2>Effects</h2>
            <div className="gtz-checks">
              {EFFECT_OPTIONS.map((effect) => {
                const checked = (product.effects || []).includes(effect);
                return (
                  <label className="gtz-check" key={effect}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(product.effects || []);
                        if (checked) next.delete(effect);
                        else next.add(effect);
                        patch({ effects: [...next] });
                      }}
                    />
                    {effect}
                  </label>
                );
              })}
            </div>
          </section>
          <section className="gtz-admin-card">
            <h2>Lab report</h2>
            <label className="gtz-field">
              <span>COA / lab report URL</span>
              <input
                value={product.lab_report_url || ''}
                onChange={(event) => patch({ lab_report_url: event.target.value })}
                placeholder="https://..."
              />
            </label>
          </section>
          <section className="gtz-admin-card">
            <h2>Collections</h2>
            <p className="gtz-admin__muted">{(product.collection_handles || []).length} selected</p>
            <label className="gtz-field">
              <span>Find a collection</span>
              <input type="search" value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} placeholder="Search collections" />
            </label>
            <div className="gtz-checks">
              {visibleCollections.map((item) => {
                const checked = (product.collection_handles || []).includes(item.handle);
                return (
                  <label className="gtz-check" key={item.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const handles = new Set(product.collection_handles || []);
                        if (checked) handles.delete(item.handle);
                        else handles.add(item.handle);
                        patch({ collection_handles: [...handles] });
                      }}
                    />
                    {item.title}
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      {toast ? <div className="gtz-toast">{toast}</div> : null}
    </form>
  );
}

export function CollectionsHome() {
  const [collections, setCollections] = useState([]);
  const [draft, setDraft] = useState({ title: '', handle: '' });
  const [titles, setTitles] = useState({});

  useEffect(() => {
    listCollections().then((next) => {
      setCollections(next);
      setTitles(Object.fromEntries(next.map((item) => [item.id, item.title])));
    });
  }, []);

  async function saveExisting(collection, partial) {
    const saved = await saveCollection({ ...collection, ...partial });
    setCollections((current) => current.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
  }

  async function addCollection(event) {
    event.preventDefault();
    const handle = slugify(draft.handle || draft.title);
    if (!handle) return;
    const saved = await saveCollection({
      id: handle,
      handle,
      title: draft.title || handle,
      description: '',
      image: '',
      body_html: '',
      sort_order: collections.length + 1,
      published: true,
      product_handles: [],
    });
    setCollections((current) => [...current, saved]);
    setTitles((current) => ({ ...current, [saved.id]: saved.title }));
    setDraft({ title: '', handle: '' });
  }

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Collections</h1>
          <p className="gtz-admin__muted">Group products the way they appear in the shop. Assign membership from each product.</p>
        </div>
      </div>
      <form className="gtz-admin-card" onSubmit={addCollection}>
        <h2>Create collection</h2>
        <div className="gtz-admin__form-grid">
          <label className="gtz-field">
            <span>Title</span>
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, handle: slugify(event.target.value) })} placeholder="Summer flower" />
          </label>
          <label className="gtz-field">
            <span>Handle</span>
            <input value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: slugify(event.target.value) })} placeholder="summer-flower" />
          </label>
        </div>
        <div className="gtz-admin__actions" style={{ marginTop: '0.85rem' }}>
          <button className="gtz-btn" type="submit">
            Add collection
          </button>
        </div>
      </form>
      <div className="gtz-table-wrap" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Handle</th>
              <th>Products</th>
              <th>Live</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id}>
                <td>
                  <input
                    value={titles[collection.id] ?? collection.title}
                    onChange={(event) => setTitles((current) => ({ ...current, [collection.id]: event.target.value }))}
                    onBlur={() => {
                      const title = (titles[collection.id] ?? collection.title).trim();
                      if (title && title !== collection.title) saveExisting(collection, { title });
                    }}
                  />
                </td>
                <td>
                  <span className="gtz-admin__handle">/{collection.handle}</span>
                </td>
                <td>{collection.product_handles?.length || 0}</td>
                <td>
                  <label className="gtz-stock">
                    <span className="gtz-switch">
                      <input
                        type="checkbox"
                        checked={collection.published !== false}
                        onChange={(event) => saveExisting(collection, { published: event.target.checked })}
                      />
                      <span />
                    </span>
                    {collection.published !== false ? 'Published' : 'Hidden'}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminApp() {
  const [ready, setReady] = useState(sessionStorage.getItem(SESSION_KEY) === '1');

  useEffect(() => {
    document.body.className = 'gtz-admin-page';
    document.title = 'Admin · Green Treez';
    return () => {
      document.body.className = '';
    };
  }, []);

  if (!ready) return <Login onOk={() => setReady(true)} />;

  return (
    <Layout
      onLogout={() => {
        sessionStorage.removeItem(SESSION_KEY);
        setReady(false);
      }}
    >
      <Outlet />
    </Layout>
  );
}
