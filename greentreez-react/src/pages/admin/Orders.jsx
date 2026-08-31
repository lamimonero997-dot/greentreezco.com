import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatMoney } from '../../lib/catalog/model.js';
import {
  deleteOrder,
  listOrders,
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  orderTotal,
  subscribeOrders,
  updateOrder,
} from '../../lib/catalog/orders.js';
import { catalogSource } from '../../lib/catalog/store.js';
import { ConfirmDialog, downloadCsv, EmptyState, formatDate, Icon, ICONS, relativeDate, useNotify } from './ui.jsx';

const RANGES = [
  { id: 'all', label: 'All time', days: null },
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
];

function waLink(phone, order) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const number = digits.length === 10 ? `1${digits}` : digits;
  const text = `Hi ${order.customer_name || 'there'}, this is Green Treez Company about order ${order.reference}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function OrderDetail({ order, onClose, onStatus, onDelete }) {
  if (!order) return null;
  const whatsapp = waLink(order.customer_phone, order);

  return (
    <div className="gtz-drawer">
      <button type="button" className="gtz-drawer__scrim" onClick={onClose} aria-label="Close order" />
      <aside className="gtz-drawer__panel" role="dialog" aria-modal="true" aria-label={`Order ${order.reference}`}>
        <header className="gtz-drawer__head">
          <div>
            <p className="gtz-admin__crumb">
              <span>Order</span>
              <span>/</span>
              <span>{relativeDate(order.created_at)}</span>
            </p>
            <h2>{order.reference}</h2>
          </div>
          <button type="button" className="gtz-icon-btn" onClick={onClose} aria-label="Close">
            <Icon path={ICONS.close} size={16} />
          </button>
        </header>

        <div className="gtz-drawer__body">
          <section>
            <h3>Status</h3>
            <div className="gtz-status-picker">
              {ORDER_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`gtz-status-pill is-${status}${order.status === status ? ' is-selected' : ''}`}
                  onClick={() => onStatus(order.id, status)}
                >
                  {ORDER_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Customer</h3>
            <dl className="gtz-detail-list">
              <div>
                <dt>Name</dt>
                <dd>{order.customer_name || '—'}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {order.customer_phone ? <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a> : '—'}
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.customer_email ? <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a> : '—'}</dd>
              </div>
              <div>
                <dt>Placed</dt>
                <dd>{formatDate(order.created_at)}</dd>
              </div>
            </dl>
            {whatsapp ? (
              <a className="gtz-btn gtz-btn--whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
                <Icon path={ICONS.whatsapp} size={16} />
                Message on WhatsApp
              </a>
            ) : null}
          </section>

          <section>
            <h3>Fulfillment &amp; payment</h3>
            <dl className="gtz-detail-list">
              <div>
                <dt>Method</dt>
                <dd>
                  {order.delivery_method || '—'}
                  {order.delivery_eta ? <small> · {order.delivery_eta}</small> : null}
                </dd>
              </div>
              <div>
                <dt>Shipping fee</dt>
                <dd>{Number(order.shipping_fee || 0) === 0 ? 'Free' : formatMoney(order.shipping_fee)}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{order.shipping_address || '—'}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{order.payment_method || '—'}</dd>
              </div>
            </dl>
            {order.notes ? <p className="gtz-note">{order.notes}</p> : null}
          </section>

          <section>
            <h3>Items</h3>
            <ul className="gtz-order-items">
              {(order.items || []).map((item, index) => (
                <li key={`${item.handle || item.title}-${index}`}>
                  <span className="gtz-order-items__qty">{item.quantity}×</span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.variant_title && item.variant_title !== 'Default Title' ? <small>{item.variant_title}</small> : null}
                  </div>
                  <b>{formatMoney(Number(item.price || 0) * Number(item.quantity || 0))}</b>
                </li>
              ))}
            </ul>
            <div className="gtz-order-total">
              <span>Subtotal</span>
              <strong>{formatMoney(order.subtotal)}</strong>
            </div>
            <div className="gtz-order-total">
              <span>Shipping</span>
              <strong>{Number(order.shipping_fee || 0) === 0 ? 'Free' : formatMoney(order.shipping_fee)}</strong>
            </div>
            <div className="gtz-order-total">
              <span>Order total</span>
              <strong>{formatMoney(orderTotal(order))}</strong>
            </div>
          </section>
        </div>

        <footer className="gtz-drawer__foot">
          <button type="button" className="gtz-btn gtz-btn--danger" onClick={() => onDelete(order)}>
            Delete order
          </button>
          <button type="button" className="gtz-btn gtz-btn--ghost" onClick={onClose}>
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default function Orders() {
  const notify = useNotify();
  const [params, setParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState('all');
  const [pendingDelete, setPendingDelete] = useState(null);

  const selectedId = params.get('order');

  async function refresh() {
    const next = await listOrders();
    setOrders(next);
    setReady(true);
  }

  useEffect(() => {
    refresh();
    return subscribeOrders(refresh);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const days = RANGES.find((item) => item.id === range)?.days;
    const cutoff = days ? Date.now() - days * 86_400_000 : null;

    return orders.filter((order) => {
      if (status !== 'all' && order.status !== status) return false;
      if (cutoff && new Date(order.created_at).getTime() < cutoff) return false;
      if (!needle) return true;
      return [order.reference, order.customer_name, order.customer_phone, order.customer_email, order.payment_method]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [orders, query, status, range]);

  const totals = useMemo(() => {
    const live = filtered.filter((order) => order.status !== 'cancelled');
    return {
      count: filtered.length,
      revenue: live.reduce((sum, order) => sum + orderTotal(order), 0),
      units: live.reduce((sum, order) => sum + Number(order.item_count || 0), 0),
    };
  }, [filtered]);

  const selected = orders.find((order) => order.id === selectedId) || null;

  function openOrder(id) {
    const next = new URLSearchParams(params);
    next.set('order', id);
    setParams(next, { replace: true });
  }

  function closeOrder() {
    const next = new URLSearchParams(params);
    next.delete('order');
    setParams(next, { replace: true });
  }

  async function onStatus(id, nextStatus) {
    await updateOrder(id, { status: nextStatus });
    await refresh();
    notify?.(`Order marked ${ORDER_STATUS_LABELS[nextStatus].toLowerCase()}`);
  }

  async function confirmDelete() {
    const order = pendingDelete;
    setPendingDelete(null);
    if (!order) return;
    await deleteOrder(order.id);
    if (selectedId === order.id) closeOrder();
    await refresh();
    notify?.(`Deleted ${order.reference}`);
  }

  function exportCsv() {
    if (!filtered.length) {
      notify?.('Nothing to export with these filters', 'error');
      return;
    }
    downloadCsv(
      `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((order) => ({
        reference: order.reference,
        placed: order.created_at,
        status: order.status,
        customer: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
        delivery: order.delivery_method,
        address: order.shipping_address,
        payment: order.payment_method,
        items: (order.items || []).map((item) => `${item.quantity}x ${item.title}`).join(' | '),
        shipping_eta: order.delivery_eta,
        subtotal: (Number(order.subtotal || 0) / 100).toFixed(2),
        shipping_fee: (Number(order.shipping_fee || 0) / 100).toFixed(2),
        total: (orderTotal(order) / 100).toFixed(2),
        notes: order.notes,
      }))
    );
    notify?.(`Exported ${filtered.length} orders`);
  }

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Orders</h1>
          <p className="gtz-admin__muted">Every checkout from the storefront, with the details your customer sent to WhatsApp.</p>
        </div>
        <div className="gtz-admin__actions">
          <button type="button" className="gtz-btn gtz-btn--ghost" onClick={refresh}>
            <Icon path={ICONS.refresh} size={15} />
            Refresh
          </button>
          <button type="button" className="gtz-btn gtz-btn--ghost" onClick={exportCsv}>
            <Icon path={ICONS.download} size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {catalogSource() === 'local' ? (
        <p className="gtz-admin__banner">
          Orders are stored in this browser. Connect Supabase to collect them centrally and see them from any device.
        </p>
      ) : (
        <p className="gtz-admin__banner is-ok">Connected to Supabase. Orders sync across every device you sign in from.</p>
      )}

      <div className="gtz-admin__stats">
        <div className="gtz-stat">
          <span>Orders shown</span>
          <strong>{totals.count}</strong>
        </div>
        <div className="gtz-stat">
          <span>Revenue</span>
          <strong>{formatMoney(totals.revenue)}</strong>
        </div>
        <div className="gtz-stat">
          <span>Units</span>
          <strong>{totals.units}</strong>
        </div>
        <div className="gtz-stat">
          <span>Awaiting confirmation</span>
          <strong>{orders.filter((order) => order.status === 'new').length}</strong>
        </div>
      </div>

      <div className="gtz-admin__toolbar">
        <label className="gtz-field">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Reference, name, phone, email"
          />
        </label>
        <label className="gtz-field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {ORDER_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="gtz-field">
          <span>Date range</span>
          <select value={range} onChange={(event) => setRange(event.target.value)}>
            {RANGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="gtz-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Fulfillment</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!ready ? (
              <tr>
                <td colSpan={6} className="gtz-loading">
                  Loading orders…
                </td>
              </tr>
            ) : null}
            {ready && !filtered.length ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title={orders.length ? 'No orders match these filters' : 'No orders yet'}
                    body={
                      orders.length
                        ? 'Try a wider date range or clear the search.'
                        : 'When a customer completes checkout on the storefront, the order appears here instantly.'
                    }
                  />
                </td>
              </tr>
            ) : null}
            {filtered.map((order) => (
              <tr key={order.id} className="is-clickable" onClick={() => openOrder(order.id)}>
                <td>
                  <strong>{order.reference}</strong>
                  <div className="gtz-admin__handle">{relativeDate(order.created_at)}</div>
                </td>
                <td>
                  {order.customer_name || '—'}
                  <div className="gtz-admin__handle">{order.customer_phone}</div>
                </td>
                <td>
                  {order.delivery_method || '—'}
                  <div className="gtz-admin__handle">{order.item_count} items</div>
                </td>
                <td>{order.payment_method || '—'}</td>
                <td>{formatMoney(orderTotal(order))}</td>
                <td>
                  <span className={`gtz-order-status is-${order.status}`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrderDetail order={selected} onClose={closeOrder} onStatus={onStatus} onDelete={setPendingDelete} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.reference || 'this order'}?`}
        body="The order record is removed permanently. Your WhatsApp conversation with the customer is not affected."
        confirmLabel="Delete order"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
