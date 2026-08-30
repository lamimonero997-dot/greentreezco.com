import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { centsToDollars, dollarsToCents, formatMoney } from '../../lib/catalog/model.js';
import { listProducts, saveProduct, subscribeCatalog } from '../../lib/catalog/store.js';
import { useSiteSettings } from '../../lib/settings.js';
import { downloadCsv, EmptyState, Icon, ICONS, Thumb, useNotify } from './ui.jsx';

/**
 * A fast, spreadsheet-style view for the job a shop owner does most often:
 * correcting stock counts and prices without opening each product.
 */
export default function Inventory() {
  const notify = useNotify();
  const settings = useSiteSettings();
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stop = subscribeCatalog((catalog) => {
      if (catalog) setProducts(catalog.products || []);
    });
    listProducts().then((next) => {
      setProducts(next);
      setReady(true);
    });
    return stop;
  }, []);

  const threshold = Number(settings.lowStockThreshold) || 0;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = [];
    for (const product of products) {
      if (product.status === 'archived') continue;
      for (const [index, variant] of (product.variants || []).entries()) {
        const stock = Number(variant.inventory_quantity || 0);
        if (filter === 'low' && (stock > threshold || stock === 0)) continue;
        if (filter === 'out' && stock !== 0) continue;
        if (filter === 'unavailable' && variant.available) continue;
        if (
          needle &&
          ![product.title, product.handle, product.vendor, variant.sku, variant.title]
            .join(' ')
            .toLowerCase()
            .includes(needle)
        ) {
          continue;
        }
        list.push({ product, variant, index, stock, key: `${product.id}::${index}` });
      }
    }
    return list;
  }, [products, query, filter, threshold]);

  const totals = useMemo(() => {
    let units = 0;
    let value = 0;
    let low = 0;
    let out = 0;
    for (const row of rows) {
      units += row.stock;
      value += row.stock * Number(row.variant.price || 0);
      if (row.stock === 0) out += 1;
      else if (row.stock <= threshold) low += 1;
    }
    return { units, value, low, out };
  }, [rows, threshold]);

  function draftFor(row) {
    return drafts[row.key] || {};
  }

  function setDraft(row, partial) {
    setDrafts((current) => ({ ...current, [row.key]: { ...current[row.key], ...partial } }));
  }

  const dirtyKeys = Object.keys(drafts);

  async function saveAll() {
    if (!dirtyKeys.length || saving) return;
    setSaving(true);
    try {
      // Group edits by product so each product is written once, not once per variant.
      const byProduct = new Map();
      for (const key of dirtyKeys) {
        const [productId, indexText] = key.split('::');
        const index = Number(indexText);
        const base = byProduct.get(productId) || products.find((item) => item.id === productId);
        if (!base) continue;
        const draft = drafts[key];
        const variants = (base.variants || []).map((variant, variantIndex) =>
          variantIndex === index
            ? {
                ...variant,
                ...(draft.inventory_quantity !== undefined
                  ? { inventory_quantity: Math.max(0, Number(draft.inventory_quantity) || 0) }
                  : {}),
                ...(draft.price !== undefined ? { price: dollarsToCents(draft.price) } : {}),
                ...(draft.available !== undefined ? { available: draft.available } : {}),
              }
            : variant
        );
        byProduct.set(productId, { ...base, variants });
      }

      for (const product of byProduct.values()) {
        await saveProduct(product);
      }
      setDrafts({});
      notify?.(`Saved ${byProduct.size} product${byProduct.size === 1 ? '' : 's'}`);
    } catch (error) {
      notify?.(error.message || 'Could not save inventory', 'error');
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    if (!rows.length) {
      notify?.('Nothing to export with these filters', 'error');
      return;
    }
    downloadCsv(
      `inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((row) => ({
        product: row.product.title,
        handle: row.product.handle,
        variant: row.variant.title,
        sku: row.variant.sku || '',
        price: centsToDollars(row.variant.price),
        stock: row.stock,
        available: row.variant.available ? 'yes' : 'no',
        status: row.product.status,
      }))
    );
    notify?.(`Exported ${rows.length} rows`);
  }

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Inventory</h1>
          <p className="gtz-admin__muted">Adjust stock, price, and availability across every variant without leaving this page.</p>
        </div>
        <div className="gtz-admin__actions">
          <button type="button" className="gtz-btn gtz-btn--ghost" onClick={exportCsv}>
            <Icon path={ICONS.download} size={15} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="gtz-admin__stats">
        <div className="gtz-stat">
          <span>Units on hand</span>
          <strong>{totals.units.toLocaleString()}</strong>
        </div>
        <div className="gtz-stat">
          <span>Retail value</span>
          <strong>{formatMoney(totals.value)}</strong>
        </div>
        <div className="gtz-stat">
          <span>Low stock</span>
          <strong>{totals.low}</strong>
        </div>
        <div className="gtz-stat">
          <span>Out of stock</span>
          <strong>{totals.out}</strong>
        </div>
      </div>

      <div className="gtz-admin__toolbar">
        <label className="gtz-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Product, SKU, variant"
          />
        </label>
        <label className="gtz-field">
          <span>Show</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">Everything</option>
            <option value="low">Low stock (≤ {threshold})</option>
            <option value="out">Out of stock</option>
            <option value="unavailable">Marked unavailable</option>
          </select>
        </label>
      </div>

      <div className="gtz-table-wrap">
        <table className="gtz-inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Variant</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>In stock</th>
            </tr>
          </thead>
          <tbody>
            {!ready ? (
              <tr>
                <td colSpan={6} className="gtz-loading">
                  Loading inventory…
                </td>
              </tr>
            ) : null}
            {ready && !rows.length ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="Nothing here" body="No variants match these filters." />
                </td>
              </tr>
            ) : null}
            {rows.slice(0, 300).map((row) => {
              const draft = draftFor(row);
              const stock = draft.inventory_quantity ?? row.stock;
              const available = draft.available ?? Boolean(row.variant.available);
              const dirty = Boolean(drafts[row.key]);
              return (
                <tr key={row.key} className={dirty ? 'is-dirty' : ''}>
                  <td>
                    <div className="gtz-admin__product">
                      <Thumb src={row.product.images?.[0]?.src} alt="" />
                      <div>
                        <Link to={`/admin/products/${row.product.id}`}>{row.product.title}</Link>
                        <div className="gtz-admin__handle">{row.product.product_type}</div>
                      </div>
                    </div>
                  </td>
                  <td>{row.variant.title}</td>
                  <td className="gtz-admin__handle">{row.variant.sku || '—'}</td>
                  <td>
                    <input
                      className="gtz-cell-input"
                      value={draft.price ?? centsToDollars(row.variant.price)}
                      onChange={(event) => setDraft(row, { price: event.target.value })}
                      inputMode="decimal"
                    />
                  </td>
                  <td>
                    <input
                      className={`gtz-cell-input${Number(stock) === 0 ? ' is-zero' : Number(stock) <= threshold ? ' is-low' : ''}`}
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(event) => setDraft(row, { inventory_quantity: event.target.value })}
                    />
                  </td>
                  <td>
                    <label className="gtz-stock">
                      <span className="gtz-switch">
                        <input
                          type="checkbox"
                          checked={available}
                          onChange={(event) => setDraft(row, { available: event.target.checked })}
                        />
                        <span />
                      </span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 300 ? (
        <p className="gtz-admin__muted" style={{ marginTop: '0.75rem' }}>
          Showing the first 300 of {rows.length} variants. Narrow the search to reach the rest.
        </p>
      ) : null}

      {dirtyKeys.length ? (
        <div className="gtz-bulkbar">
          <span>
            {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
          </span>
          <div className="gtz-admin__actions">
            <button type="button" className="gtz-btn gtz-btn--ghost" onClick={() => setDrafts({})} disabled={saving}>
              Discard
            </button>
            <button type="button" className="gtz-btn" onClick={saveAll} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
