/**
 * Outbound email for the storefront.
 *
 * The site is a static bundle with no server of its own, so mail goes through
 * Web3Forms: a POST carrying an access key, which their service delivers to the
 * address that key was registered to - info@greentreezco.com.
 *
 * The key sits here rather than in a .env file because .env is gitignored,
 * which would leave every deployment built from this repo unable to send. That
 * is safe: a Web3Forms access key is built for client code, it is compiled into
 * the bundle either way, and it only authorises delivery to that one fixed
 * inbox - it cannot be used to send mail anywhere else. Set VITE_WEB3FORMS_KEY
 * to override it.
 */
const DEFAULT_ACCESS_KEY = '1930565f-5d64-477b-83af-7a7bcbdbad83';

const ENDPOINT = import.meta.env.VITE_EMAIL_ENDPOINT || 'https://api.web3forms.com/submit';

function accessKey() {
  return import.meta.env.VITE_WEB3FORMS_KEY || DEFAULT_ACCESS_KEY;
}

export function emailConfigured() {
  return Boolean(accessKey());
}

/** Where mail is delivered, for the copy shown next to the form. */
export function contactEmail() {
  return import.meta.env.VITE_CONTACT_EMAIL || 'info@greentreezco.com';
}

/**
 * Posts one message.
 *
 * `keepalive` lets the request outlive the page so it survives any navigation
 * that happens immediately after checkout.
 */
async function send(payload, { keepalive = false } = {}) {
  if (!emailConfigured()) return { ok: false, skipped: true };

  const body = JSON.stringify({
    access_key: accessKey(),
    ...payload,
  });

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      keepalive,
    });
    const result = await response.json().catch(() => null);
    // Insist on the service's own success flag. Treating "not an explicit
    // failure" as success once let a stubbed response read as a sent message.
    if (!response.ok || result?.success !== true) {
      return { ok: false, error: result?.message || `Mail service returned ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'Could not reach the mail service' };
  }
}

/** A message from the contact page. */
export function sendContactEmail({ name, phone, email, topic, message }) {
  return send({
    subject: `Website enquiry: ${topic}`,
    from_name: name,
    // Web3Forms uses this as the reply-to, so hitting reply answers the customer.
    email: email || undefined,
    name,
    phone: phone || 'Not given',
    topic,
    message,
  });
}

function itemLines(items = []) {
  return items
    .map((item, index) => {
      const variant =
        item.variant_title && item.variant_title !== 'Default Title' ? ` (${item.variant_title})` : '';
      const total = ((Number(item.price || 0) * Number(item.quantity || 0)) / 100).toFixed(2);
      return `${index + 1}. ${item.title}${variant} - qty ${item.quantity} - $${total}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// Customer confirmation email — sent via EmailJS so the "to" address can be
// the customer's own inbox rather than the fixed Web3Forms delivery address.
//
// Setup (free, 200 emails/month):
//   1. Create an account at https://www.emailjs.com
//   2. Add Email Service → connect your Gmail (info@greentreezco.com)
//   3. Create an Email Template with these variables:
//        {{to_email}}   {{to_name}}   {{order_ref}}   {{order_total}}
//        {{order_items}}   {{fulfillment_method}}   {{fulfillment_eta}}
//        {{fulfillment_address}}   {{payment_method}}   {{notes}}
//   4. Copy your Public Key, Service ID, and Template ID into .env:
//        VITE_EMAILJS_PUBLIC_KEY=...
//        VITE_EMAILJS_SERVICE_ID=...
//        VITE_EMAILJS_TEMPLATE_ID=...
// ---------------------------------------------------------------------------
const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function emailjsConfigured() {
  return Boolean(
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY &&
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  );
}

/**
 * Sends an order confirmation directly to the customer's email address.
 * Silently skips if the EmailJS env vars are not configured.
 */
export function sendCustomerConfirmationEmail({ reference, customer, fulfillment, payment, items, money, notes }) {
  if (!emailjsConfigured() || !customer.email) return Promise.resolve({ ok: false, skipped: true });

  const orderItems = items
    .map((item) => {
      const variant =
        item.variant_title && item.variant_title !== 'Default Title' ? ` (${item.variant_title})` : '';
      const lineTotal = ((Number(item.price || 0) * Number(item.quantity || 0)) / 100).toFixed(2);
      return `${item.quantity}× ${item.title}${variant} — $${lineTotal}`;
    })
    .join('\n');

  const body = JSON.stringify({
    service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: customer.email,
      to_name: customer.name || 'Valued customer',
      order_ref: reference,
      order_total: `$${(money.total / 100).toFixed(2)}`,
      order_items: orderItems,
      fulfillment_method: fulfillment.method,
      fulfillment_eta: fulfillment.eta,
      fulfillment_address: fulfillment.address,
      payment_method: payment,
      notes: notes || 'None',
    },
  });

  return fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  })
    .then((res) => (res.ok ? { ok: true } : { ok: false, error: `EmailJS returned ${res.status}` }))
    .catch((err) => ({ ok: false, error: err.message || 'Could not reach EmailJS' }));
}

/**
 * Admin notification sent when a customer places an order through the
 * storefront checkout. Delivered to the inbox the Web3Forms key is registered
 * to (info@greentreezco.com by default).
 */
export function sendOrderEmail({ reference, customer, fulfillment, payment, items, money, notes }) {
  const message = [
    `New order ${reference}`,
    '',
    'CUSTOMER',
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    customer.email ? `Email: ${customer.email}` : null,
    '',
    'FULFILLMENT',
    `Method: ${fulfillment.method}`,
    `Estimated: ${fulfillment.eta}`,
    `Address: ${fulfillment.address}`,
    '',
    'ITEMS',
    itemLines(items),
    '',
    `Subtotal: $${(money.subtotal / 100).toFixed(2)}`,
    `Shipping: ${money.shipping === 0 ? 'Free' : `$${(money.shipping / 100).toFixed(2)}`}`,
    `Total: $${(money.total / 100).toFixed(2)}`,
    '',
    `Payment method: ${payment}`,
    notes ? `\nNOTES\n${notes}` : null,
    '',
    'The order is saved in the admin dashboard. Log in at /admin to confirm it.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return send(
    {
      subject: `New order ${reference} — $${(money.total / 100).toFixed(2)}`,
      from_name: customer.name || 'Storefront checkout',
      // Web3Forms uses this as the reply-to so hitting reply contacts the customer.
      email: customer.email || undefined,
      name: customer.name,
      phone: customer.phone,
      message,
    },
    { keepalive: true }
  );
}
