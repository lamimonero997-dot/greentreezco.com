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
    /* quota or private mode: the order still reached WhatsApp */
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
      return record;
    } catch (error) {
      // Never block a customer's checkout on a logging failure. The order still
      // reaches us over WhatsApp, so do not persist the customer's name, phone,
      // and address into their own browser as a consolation prize.
      console.warn('[orders] Supabase insert failed; order continues to WhatsApp only', error);
      return record;
    }
  }

  writeLocal([record, ...readLocal()]);
  return record;
}

export async function listOrders() {
  if (supabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(normalize);
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

export function subscribeOrders(listener) {
  const handler = () => listener();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
