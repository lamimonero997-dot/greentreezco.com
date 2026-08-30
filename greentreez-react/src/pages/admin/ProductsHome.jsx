import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  centsToDollars,
  formatMoney,
  duplicateProduct,
  productAvailable,
  productPrice,
  PRODUCT_TYPES,
} from '../../lib/catalog/model.js';
import {
  catalogSource,
  deleteProducts,
  listCollections,
  listProducts,
  saveProduct,
  saveProducts,
  subscribeCatalog,
} from '../../lib/catalog/store.js';
import { useSiteSettings } from '../../lib/settings.js';
import { ConfirmDialog, downloadCsv, EmptyState, Icon, ICONS, relativeDate, Thumb, useNotify } from './ui.jsx';

const PAGE_SIZE = 25;

const SORTS = {
  updated: { label: 'Recently updated', compare: (a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) },
  title: { label: 'Title A–Z', compare: (a, b) => a.title.localeCompare(b.title) },
  'price-asc': { label: 'Price, low to high', compare: (a, b) => productPrice(a) - productPrice(b) },
  'price-desc': { label: 'Price, high to low', compare: (a, b) => productPrice(b) - productPrice(a) },
  'stock-asc': { label: 'Stock, low to high', compare: (a, b) => stockOf(a) - stockOf(b) },
  type: { label: 'Product type', compare: (a, b) => (a.product_type || '').localeCompare(b.product_type || '') },
};

function stockOf(product) {
  return (product.variants || []).reduce((sum, variant) => sum + Number(variant.inventory_quantity || 0), 0);
}

export default function ProductsHome() {
  const notify = useNotify();
  const navigate = useNavigate();
  const settings = useSiteSettings();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(params.get('status') || 'all');
  const [type, setType] = useState('all');
  const [collection, setCollection] = useState(params.get('collection') || 'all');
  const [issue, setIssue] = useState(params.get('issue') || 'all');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Deep links from the dashboard arrive as query params; clear them once applied
  // so the filters stay editable and the URL does not fight the UI.
  useEffect(() => {
    if (params.get('status') || params.get('issue') || params.get('collection')) setParams({}, { replace: true });
  }, [params, setParams]);

  const threshold = Number(settings.lowStockThreshold) || 0;

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.status === 'active').length,
      draft: products.filter((product) => product.status === 'draft').length,
      soldOut: products.filter((product) => !productAvailable(product)).length,
      lowStock: products.filter((product) => product.status === 'active' && stockOf(product) <= threshold).length,
    }),
    [products, threshold]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = products.filter((product) => {
      if (status === 'soldout') {
        if (productAvailable(product)) return false;
      } else if (status !== 'all' && product.status !== status) {
        return false;
      }
      if (type !== 'all' && product.product_type !== type) return false;
      if (collection !== 'all' && !(product.collection_handles || []).includes(collection)) return false;
      if (issue === 'image' && product.images?.length) return false;
      if (issue === 'seo' && product.seo_description) return false;
      if (issue === 'price' && productPrice(product) > 0) return false;
      if (issue === 'low' && stockOf(product) > threshold) return false;
      if (!needle) return true;
      return [
        product.title,
        product.handle,
        product.vendor,
        product.product_type,
        ...(product.variants || []).map((variant) => variant.sku),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    return [...list].sort(SORTS[sort].compare);
  }, [products, query, status, type, collection, issue, sort, threshold]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const allOnPageSelected = slice.length > 0 && slice.every((product) => selected.has(product.id));

  function resetPage(setter) {
    return (value) => {
      setter(value);
      setPage(0);
    };
  }

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) slice.forEach((product) => next.delete(product.id));
      else slice.forEach((product) => next.add(product.id));
      return next;
    });
  }

  const selectedProducts = products.filter((product) => selected.has(product.id));

  async function bulkStatus(nextStatus) {
    if (!selectedProducts.length || busy) return;
    setBusy(true);
    try {
      await saveProducts(selectedProducts.map((product) => ({ ...product, status: nextStatus })));
      notify?.(`${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} set to ${nextStatus}`);
      setSelected(new Set());
    } catch (error) {
      notify?.(error.message || 'Bulk update failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    setConfirmDelete(false);
    if (!selectedProducts.length || busy) return;
    setBusy(true);
    try {
      const count = selectedProducts.length;
      await deleteProducts(selectedProducts.map((product) => product.id));
      notify?.(`Deleted ${count} product${count === 1 ? '' : 's'}`);
      setSelected(new Set());
    } catch (error) {
      notify?.(error.message || 'Bulk delete failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(product, event) {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const copy = await saveProduct(duplicateProduct(product, new Set(products.map((item) => item.handle))));
      notify?.('Duplicated as a draft');
      navigate(`/admin/products/${copy.id}`);
    } catch (error) {
      notify?.(error.message || 'Could not duplicate', 'error');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) {
      notify?.('Nothing to export with these filters', 'error');
      return;
    }
    downloadCsv(
      `products-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.flatMap((product) =>
        (product.variants?.length ? product.variants : [{}]).map((variant) => ({
          handle: product.handle,
          title: product.title,
          status: product.status,
          type: product.product_type,
          vendor: product.vendor,
          variant: variant.title || '',
          sku: variant.sku || '',
          price: centsToDollars(variant.price || 0),
          compare_at: variant.compare_at_price ? centsToDollars(variant.compare_at_price) : '',
          stock: variant.inventory_quantity ?? '',
          available: variant.available ? 'yes' : 'no',
          collections: (product.collection_handles || []).join(' | '),
          image: product.images?.[0]?.src || '',
        }))
      )
    );
    notify?.(`Exported ${filtered.length} products`);
  }

  const activeFilters = [status !== 'all', type !== 'all', collection !== 'all', issue !== 'all', Boolean(query.trim())].filter(
    Boolean
  ).length;

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Products</h1>
          <p className="gtz-admin__muted">Search, filter, and publish the catalog that powers the storefront.</p>
        </div>
        <div className="gtz-admin__actions">
          <button type="button" className="gtz-btn gtz-btn--ghost" onClick={exportCsv}>
            <Icon path={ICONS.download} size={15} />
            Export CSV
          </button>
          <Link className="gtz-btn" to="/admin/products/new">
            <Icon path={ICONS.add} size={15} />
            Add product
          </Link>
        </div>
      </div>

      {catalogSource() === 'local' ? (
        <p className="gtz-admin__banner">
          This browser is saving a local copy. Connect Supabase to keep the catalog in sync across devices.
        </p>
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
        <div className="gtz-stat">
          <span>Low stock</span>
          <strong>{stats.lowStock}</strong>
        </div>
      </div>

      <div className="gtz-admin__toolbar">
        <label className="gtz-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => resetPage(setQuery)(event.target.value)}
            placeholder="Title, handle, vendor, SKU"
          />
        </label>
        <label className="gtz-field">
          <span>Status</span>
          <select value={status} onChange={(event) => resetPage(setStatus)(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
            <option value="soldout">Sold out</option>
          </select>
        </label>
        <label className="gtz-field">
          <span>Type</span>
          <select value={type} onChange={(event) => resetPage(setType)(event.target.value)}>
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
          <select value={collection} onChange={(event) => resetPage(setCollection)(event.target.value)}>
            <option value="all">All collections</option>
            {collections.map((item) => (
              <option key={item.handle} value={item.handle}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="gtz-field">
          <span>Needs attention</span>
          <select value={issue} onChange={(event) => resetPage(setIssue)(event.target.value)}>
            <option value="all">Anything</option>
            <option value="image">Missing image</option>
            <option value="seo">Missing meta description</option>
            <option value="price">No price set</option>
            <option value="low">Low stock</option>
          </select>
        </label>
        <label className="gtz-field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => resetPage(setSort)(event.target.value)}>
            {Object.entries(SORTS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {activeFilters ? (
          <button
            type="button"
            className="gtz-btn gtz-btn--ghost gtz-clear-filters"
            onClick={() => {
              setQuery('');
              setStatus('all');
              setType('all');
              setCollection('all');
              setIssue('all');
              setPage(0);
            }}
          >
            Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
          </button>
        ) : null}
      </div>

      <div className="gtz-table-wrap">
        <table>
          <thead>
            <tr>
              <th className="gtz-col-check">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={togglePage}
                  aria-label="Select all on this page"
                  disabled={!slice.length}
                />
              </th>
              <th>Product</th>
              <th>Type</th>
              <th>Inventory</th>
              <th>Price</th>
              <th>Status</th>
              <th className="gtz-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!ready ? (
              <tr>
                <td colSpan={7} className="gtz-loading">
                  Loading catalog…
                </td>
              </tr>
            ) : null}
            {ready && !slice.length ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title="No products match these filters"
                    body="Adjust the filters above, or add a new product to the catalog."
                    action={
                      <Link className="gtz-btn" to="/admin/products/new">
                        Add product
                      </Link>
                    }
                  />
                </td>
              </tr>
            ) : null}
            {slice.map((product) => {
              const stock = stockOf(product);
              const isSelected = selected.has(product.id);
              return (
                <tr
                  key={product.id}
                  className={`is-clickable${isSelected ? ' is-selected' : ''}`}
                  onClick={() => navigate(`/admin/products/${product.id}`)}
                >
                  <td className="gtz-col-check" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(product.id)}
                      aria-label={`Select ${product.title}`}
                    />
                  </td>
                  <td>
                    <div className="gtz-admin__product">
                      <Thumb src={product.images?.[0]?.src} alt="" />
                      <div>
                        <strong>{product.title}</strong>
                        <div className="gtz-admin__handle">
                          {product.handle}
                          {product.updated_at ? ` · ${relativeDate(product.updated_at)}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{product.product_type}</td>
                  <td>
                    <span className={stock === 0 ? 'gtz-stock-out' : stock <= threshold ? 'gtz-stock-low' : ''}>
                      {stock} in stock
                    </span>
                    <div className="gtz-admin__handle">{product.variants?.length || 0} variants</div>
                  </td>
                  <td>{formatMoney(productPrice(product))}</td>
                  <td>
                    <span className={`gtz-status is-${productAvailable(product) ? product.status : 'soldout'}`}>
                      {productAvailable(product) ? product.status : 'sold out'}
                    </span>
                  </td>
                  <td className="gtz-col-actions" onClick={(event) => event.stopPropagation()}>
                    <a
                      className="gtz-icon-btn"
                      href={`/products/${product.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View on the storefront"
                    >
                      <Icon path={ICONS.external} size={15} />
                    </a>
                    <button
                      type="button"
                      className="gtz-icon-btn"
                      onClick={(event) => duplicate(product, event)}
                      title="Duplicate as draft"
                    >
                      <Icon path={ICONS.copy} size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="gtz-admin__pager">
        <p className="gtz-admin__muted">
          {filtered.length
            ? `${safePage * PAGE_SIZE + 1}–${Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE)} of ${filtered.length}`
            : '0 products'}
        </p>
        <div className="gtz-admin__actions">
          <button
            className="gtz-btn gtz-btn--ghost"
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span className="gtz-admin__muted">
            Page {safePage + 1} of {pages}
          </span>
          <button
            className="gtz-btn gtz-btn--ghost"
            type="button"
            disabled={safePage + 1 >= pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {selected.size ? (
        <div className="gtz-bulkbar">
          <span>
            {selected.size} selected
            <button type="button" className="gtz-linkish" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </span>
          <div className="gtz-admin__actions">
            <button type="button" className="gtz-btn gtz-btn--ghost" disabled={busy} onClick={() => bulkStatus('active')}>
              Publish
            </button>
            <button type="button" className="gtz-btn gtz-btn--ghost" disabled={busy} onClick={() => bulkStatus('draft')}>
              Draft
            </button>
            <button type="button" className="gtz-btn gtz-btn--ghost" disabled={busy} onClick={() => bulkStatus('archived')}>
              Archive
            </button>
            <button type="button" className="gtz-btn gtz-btn--danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${selected.size} product${selected.size === 1 ? '' : 's'}?`}
        body="They are removed from the catalog and from the storefront. This cannot be undone."
        confirmLabel="Delete permanently"
        danger
        onConfirm={bulkDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
