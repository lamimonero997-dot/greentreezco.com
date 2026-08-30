import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney, productAvailable, productPrice } from '../../lib/catalog/model.js';
import { listOrders, ORDER_STATUS_LABELS, subscribeOrders } from '../../lib/catalog/orders.js';
import { listCollections, listProducts, subscribeCatalog } from '../../lib/catalog/store.js';
import { useSiteSettings } from '../../lib/settings.js';
import { EmptyState, Icon, ICONS, relativeDate, Thumb } from './ui.jsx';

function startOfDay(offsetDays = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - offsetDays);
  return date.getTime();
}

/** Revenue for the last `days` days, oldest first, for the sparkline. */
function revenueSeries(orders, days = 14) {
  const buckets = Array.from({ length: days }, (_, index) => ({
    day: startOfDay(days - 1 - index),
    total: 0,
    count: 0,
  }));
  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const time = new Date(order.created_at).getTime();
    if (Number.isNaN(time)) continue;
    const index = buckets.findIndex((bucket, i) => {
      const next = buckets[i + 1]?.day ?? Infinity;
      return time >= bucket.day && time < next;
    });
    if (index >= 0) {
      buckets[index].total += Number(order.subtotal || 0);
      buckets[index].count += 1;
    }
  }
  return buckets;
}

function Sparkline({ points }) {
  const max = Math.max(1, ...points.map((point) => point.total));
  return (
    <div className="gtz-spark" role="img" aria-label={`Revenue over the last ${points.length} days`}>
      {points.map((point) => (
        <span
          key={point.day}
          className={point.total ? 'is-filled' : ''}
          style={{ height: `${Math.max(4, (point.total / max) * 100)}%` }}
          title={`${new Date(point.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${formatMoney(point.total)}`}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const settings = useSiteSettings();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stopCatalog = subscribeCatalog((catalog) => {
      if (!catalog) return;
      setProducts(catalog.products || []);
      setCollections(catalog.collections || []);
    });
    const refreshOrders = () => listOrders().then(setOrders);
    const stopOrders = subscribeOrders(refreshOrders);

    Promise.all([listProducts(), listCollections(), listOrders()]).then(([nextProducts, nextCollections, nextOrders]) => {
      setProducts(nextProducts);
      setCollections(nextCollections);
      setOrders(nextOrders);
      setReady(true);
    });

    return () => {
      stopCatalog();
      stopOrders();
    };
  }, []);

  const stats = useMemo(() => {
    const live = orders.filter((order) => order.status !== 'cancelled');
    const today = startOfDay();
    const weekAgo = startOfDay(7);
    const prevWeekAgo = startOfDay(14);

    const inWindow = (order, from, to = Infinity) => {
      const time = new Date(order.created_at).getTime();
      return time >= from && time < to;
    };

    const week = live.filter((order) => inWindow(order, weekAgo));
    const prevWeek = live.filter((order) => inWindow(order, prevWeekAgo, weekAgo));
    const weekRevenue = week.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
    const prevRevenue = prevWeek.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
    const revenueDelta = prevRevenue ? Math.round(((weekRevenue - prevRevenue) / prevRevenue) * 100) : null;

    return {
      todayOrders: live.filter((order) => inWindow(order, today)).length,
      newOrders: orders.filter((order) => order.status === 'new').length,
      weekOrders: week.length,
      weekRevenue,
      revenueDelta,
      lifetimeRevenue: live.reduce((sum, order) => sum + Number(order.subtotal || 0), 0),
      averageOrder: live.length ? live.reduce((sum, order) => sum + Number(order.subtotal || 0), 0) / live.length : 0,
    };
  }, [orders]);

  const catalogStats = useMemo(() => {
    const threshold = Number(settings.lowStockThreshold) || 0;
    const stockOf = (product) =>
      (product.variants || []).reduce((sum, variant) => sum + Number(variant.inventory_quantity || 0), 0);

    const lowStock = products
      .filter((product) => product.status === 'active' && stockOf(product) <= threshold)
      .map((product) => ({ ...product, stock: stockOf(product) }))
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    return {
      total: products.length,
      active: products.filter((product) => product.status === 'active').length,
      draft: products.filter((product) => product.status === 'draft').length,
      soldOut: products.filter((product) => !productAvailable(product)).length,
      missingImages: products.filter((product) => !product.images?.length).length,
      missingSeo: products.filter((product) => !product.seo_description).length,
      noPrice: products.filter((product) => productPrice(product) <= 0).length,
      collections: collections.length,
      lowStock,
    };
  }, [products, collections, settings.lowStockThreshold]);

  const recentOrders = orders.slice(0, 6);
  const series = useMemo(() => revenueSeries(orders), [orders]);

  const health = [
    { label: 'Products with no image', count: catalogStats.missingImages, to: '/admin/products?issue=image' },
    { label: 'Products with no meta description', count: catalogStats.missingSeo, to: '/admin/products?issue=seo' },
    { label: 'Products priced at $0.00', count: catalogStats.noPrice, to: '/admin/products?issue=price' },
    { label: 'Products sold out', count: catalogStats.soldOut, to: '/admin/products?status=soldout' },
  ].filter((row) => row.count > 0);

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Dashboard</h1>
          <p className="gtz-admin__muted">
            {ready ? `${catalogStats.total} products, ${catalogStats.collections} collections, ${orders.length} orders.` : 'Loading your shop…'}
          </p>
        </div>
        <div className="gtz-admin__actions">
          <Link className="gtz-btn gtz-btn--ghost" to="/admin/orders">
            View orders
          </Link>
          <Link className="gtz-btn" to="/admin/products/new">
            Add product
          </Link>
        </div>
      </div>

      <div className="gtz-admin__stats gtz-admin__stats--kpi">
        <div className="gtz-stat">
          <span>Revenue, last 7 days</span>
          <strong>{formatMoney(stats.weekRevenue)}</strong>
          {stats.revenueDelta !== null ? (
            <em className={stats.revenueDelta >= 0 ? 'is-up' : 'is-down'}>
              {stats.revenueDelta >= 0 ? '▲' : '▼'} {Math.abs(stats.revenueDelta)}% vs previous week
            </em>
          ) : (
            <em>No prior week to compare</em>
          )}
        </div>
        <div className="gtz-stat">
          <span>Orders, last 7 days</span>
          <strong>{stats.weekOrders}</strong>
          <em>{stats.todayOrders} today</em>
        </div>
        <div className="gtz-stat">
          <span>Awaiting action</span>
          <strong>{stats.newOrders}</strong>
          <em>{stats.newOrders ? 'New orders to confirm' : 'Everything is handled'}</em>
        </div>
        <div className="gtz-stat">
          <span>Average order</span>
          <strong>{formatMoney(stats.averageOrder)}</strong>
          <em>{formatMoney(stats.lifetimeRevenue)} lifetime</em>
        </div>
      </div>

      <div className="gtz-dash-grid">
        <section className="gtz-admin-card">
          <div className="gtz-card-head">
            <h2>Revenue, last 14 days</h2>
            <Link to="/admin/orders">All orders</Link>
          </div>
          <Sparkline points={series} />
          <div className="gtz-spark-legend">
            <span>{new Date(series[0].day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            <span>Today</span>
          </div>
        </section>

        <section className="gtz-admin-card">
          <div className="gtz-card-head">
            <h2>Catalog health</h2>
            <Link to="/admin/products">Products</Link>
          </div>
          {health.length ? (
            <ul className="gtz-health">
              {health.map((row) => (
                <li key={row.label}>
                  <Icon path={ICONS.alert} size={15} />
                  <span>{row.label}</span>
                  <strong>{row.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gtz-admin__muted">Every product has an image, a price, and a meta description. Nice.</p>
          )}
          <div className="gtz-admin__stats gtz-admin__stats--mini">
            <div className="gtz-stat">
              <span>Active</span>
              <strong>{catalogStats.active}</strong>
            </div>
            <div className="gtz-stat">
              <span>Drafts</span>
              <strong>{catalogStats.draft}</strong>
            </div>
            <div className="gtz-stat">
              <span>Collections</span>
              <strong>{catalogStats.collections}</strong>
            </div>
          </div>
        </section>

        <section className="gtz-admin-card">
          <div className="gtz-card-head">
            <h2>Recent orders</h2>
            <Link to="/admin/orders">View all</Link>
          </div>
          {recentOrders.length ? (
            <ul className="gtz-recent">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link to={`/admin/orders?order=${encodeURIComponent(order.id)}`}>
                    <div>
                      <strong>{order.reference}</strong>
                      <small>
                        {order.customer_name || 'Customer'} · {relativeDate(order.created_at)}
                      </small>
                    </div>
                    <div className="gtz-recent__right">
                      <span className={`gtz-order-status is-${order.status}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
                      <b>{formatMoney(order.subtotal)}</b>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No orders yet"
              body="Orders placed through the storefront checkout land here the moment a customer taps checkout."
            />
          )}
        </section>

        <section className="gtz-admin-card">
          <div className="gtz-card-head">
            <h2>Low stock</h2>
            <Link to="/admin/inventory">Manage inventory</Link>
          </div>
          {catalogStats.lowStock.length ? (
            <ul className="gtz-recent">
              {catalogStats.lowStock.map((product) => (
                <li key={product.id}>
                  <Link to={`/admin/products/${product.id}`}>
                    <div className="gtz-recent__product">
                      <Thumb src={product.images?.[0]?.src} alt="" />
                      <div>
                        <strong>{product.title}</strong>
                        <small>{product.product_type}</small>
                      </div>
                    </div>
                    <div className="gtz-recent__right">
                      <span className={`gtz-order-status is-${product.stock === 0 ? 'cancelled' : 'new'}`}>
                        {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gtz-admin__muted">
              Nothing is at or below your {settings.lowStockThreshold}-unit threshold. Adjust it in Settings.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
