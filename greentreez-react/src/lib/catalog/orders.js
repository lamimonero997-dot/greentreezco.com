import { getSupabase, supabaseConfigured } from './supabase.js';

// Orders placed from the storefront checkout. They live in Supabase when it is
// configured so the shop owner sees them on any device; otherwise they are kept
// in this browser so the admin still has something real to work with.
const KEY = 'gtz-orders-v1';
const EVENT = 'gtz-orders-change';

export const ORDER_STATUSES = ['new', 'confirmed', 'paid', 'fulfilled', 'cancelled'];

export const ORDER_STATUS_LABELS = {
  new: 'New',
  confirmed: 'Confirmed',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(orders) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {
    /* quota or private mode: nothing more we can do from the browser */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: orders }));
  return orders;
}

function normalize(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    ...order,
    items,
    status: order.status || 'new',
    subtotal: Number(order.subtotal || 0),
    shipping_fee: Number(order.shipping_fee || 0),
    total: Number(order.total ?? Number(order.subtotal || 0) + Number(order.shipping_fee || 0)),
    item_count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    created_at: order.created_at || new Date().toISOString(),
  };
}

export function orderTotal(order) {
  if (order?.total != null) return Number(order.total);
  return Number(order?.subtotal || 0) + Number(order?.shipping_fee || 0);
}

export function newOrderReference() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const noise = Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0');
  return `GTZ-${stamp}${noise}`;
}

export async function createOrder(order) {
  const record = normalize({
    id: order.id || `o_${crypto.randomUUID()}`,
    ...order,
  });

  if (supabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('orders').insert({
        id: record.id,
        reference: record.reference,
        status: record.status,
        customer_name: record.customer_name || '',
        customer_phone: record.customer_phone || '',
        customer_email: record.customer_email || '',
        delivery_method: record.delivery_method || '',
        delivery_eta: record.delivery_eta || '',
        shipping_address: record.shipping_address || '',
        shipping_fee: record.shipping_fee,
        payment_method: record.payment_method || '',
        notes: record.notes || '',
        items: record.items,
        subtotal: record.subtotal,
        total: record.total,
        created_at: record.created_at,
      });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent(EVENT));
      return { ...record, persisted: 'supabase' };
    } catch (error) {
      // Never block a customer's checkout on a storage failure, but never drop
      // the order either: checkout no longer has a WhatsApp fallback, so this
      // record is the only trace of the sale. Keep it in this browser so the
      // admin can still recover it, and tell the caller it never reached the
      // shared dashboard.
      console.warn('[orders] Supabase insert failed; order kept in this browser only', error);
      writeLocal([record, ...readLocal()]);
      return { ...record, persisted: 'local', error: error?.message || 'Could not reach the orders database' };
    }
  }

  writeLocal([record, ...readLocal()]);
  return { ...record, persisted: 'local' };
}

export async function listOrders() {
  if (supabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      // Any order that fell back to this browser because the insert failed is
      // still a real sale, so show it alongside the stored ones rather than
      // letting a successful read hide it.
      const remote = (data || []).map(normalize);
      const seen = new Set(remote.map((order) => order.id));
      const stranded = readLocal()
        .map(normalize)
        .filter((order) => !seen.has(order.id));
      if (!stranded.length) return remote;
      return [...remote, ...stranded].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.warn('[orders] Supabase read failed, showing local orders', error);
    }
  }
  return readLocal().map(normalize);
}

export async function updateOrder(id, partial) {
  if (supabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('orders').update(partial).eq('id', id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent(EVENT));
      return;
    } catch (error) {
      console.warn('[orders] Supabase update failed, updating locally', error);
    }
  }
  writeLocal(readLocal().map((order) => (order.id === id ? { ...order, ...partial } : order)));
}

export async function deleteOrder(id) {
  if (supabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent(EVENT));
      return;
    } catch (error) {
      console.warn('[orders] Supabase delete failed, deleting locally', error);
    }
  }
  writeLocal(readLocal().filter((order) => order.id !== id));
}

// How often an open admin screen re-checks for orders placed elsewhere. The
// in-page event only fires for changes made in this tab, so without this an
// order placed by a customer would not appear until the admin reloaded.
const POLL_MS = 30000;

export function subscribeOrders(listener) {
  const handler = () => listener();
  window.addEventListener(EVENT, handler);

  // Only worth polling when orders are shared: a local-only install has no
  // source of changes other than this tab.
  if (!supabaseConfigured()) {
    return () => window.removeEventListener(EVENT, handler);
  }

  const timer = setInterval(() => {
    // Skip while the tab is hidden; the focus handler catches up on return.
    if (document.visibilityState === 'visible') handler();
  }, POLL_MS);
  const onFocus = () => handler();
  window.addEventListener('focus', onFocus);

  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('focus', onFocus);
    clearInterval(timer);
  };
}
