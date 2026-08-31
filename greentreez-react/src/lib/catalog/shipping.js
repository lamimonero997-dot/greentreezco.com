import { formatMoney } from './model.js';

/**
 * Fulfillment options offered at checkout.
 *
 * Fees are in cents, like every other price in the catalog. `eta` is what the
 * customer sees on the option and in the WhatsApp order, so it is written as a
 * promise we can keep rather than a guarantee of a delivery date.
 *
 * `freeOver` is a subtotal (in cents) above which the fee is waived; leave it
 * null for options that always carry their fee.
 */
export const FREE_SHIPPING_THRESHOLD = 15_000; // $150.00

export const SHIPPING_METHODS = [
  {
    id: 'pickup',
    label: 'In-store pickup',
    eta: 'Ready in about 1 hour during store hours',
    note: 'Collect at the counter. Bring the ID used to order.',
    fee: 0,
    freeOver: null,
    requiresAddress: false,
  },
  {
    id: 'local',
    label: 'Nashville local delivery',
    eta: 'Same day, 2-4 hours on orders placed before 6pm CT',
    note: 'Driver delivers within the Nashville metro. ID checked at the door.',
    fee: 999,
    freeOver: null,
    requiresAddress: true,
  },
  {
    id: 'standard',
    label: 'Standard shipping',
    eta: '3-5 business days',
    note: 'Discreet, odour-proof packaging with tracking.',
    fee: 699,
    freeOver: FREE_SHIPPING_THRESHOLD,
    requiresAddress: true,
  },
  {
    id: 'express',
    label: 'Express shipping',
    eta: '2 business days',
    note: 'Priority handling, packed and dispatched the same day.',
    fee: 1799,
    freeOver: null,
    requiresAddress: true,
  },
  {
    id: 'overnight',
    label: 'Overnight shipping',
    eta: 'Next business day on orders placed before 12pm CT',
    note: 'Fastest option. Signature required on delivery.',
    fee: 2999,
    freeOver: null,
    requiresAddress: true,
  },
];

export const DEFAULT_SHIPPING_ID = 'standard';

export function findShippingMethod(id) {
  return SHIPPING_METHODS.find((method) => method.id === id) || SHIPPING_METHODS[0];
}

/** What this method actually costs on a cart of `subtotal` cents. */
export function shippingFee(method, subtotal = 0) {
  if (!method) return 0;
  if (method.freeOver !== null && Number(subtotal) >= method.freeOver) return 0;
  return Number(method.fee || 0);
}

/** The price label shown on the option and in the order summary. */
export function shippingPriceLabel(method, subtotal = 0) {
  const fee = shippingFee(method, subtotal);
  return fee === 0 ? 'Free' : formatMoney(fee);
}

/** How far a cart is from free standard shipping, or null once it qualifies. */
export function freeShippingRemainder(subtotal = 0) {
  const remainder = FREE_SHIPPING_THRESHOLD - Number(subtotal || 0);
  return remainder > 0 ? remainder : null;
}
