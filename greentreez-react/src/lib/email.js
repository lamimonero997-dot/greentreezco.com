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
// Customer confirmation email — "thanks, we have received your order".
//
// Web3Forms only ever delivers to the one inbox its key is registered to, so it
// cannot answer the customer. EmailJS can: it takes the recipient as a
// parameter, which is what lets this reach the buyer's own inbox.
//
// The whole message is composed here and handed over as {{{message_html}}}, so
// the EmailJS template can be a single line and the wording stays in this repo
// under version control. The individual fields are sent as well, for templates
// that would rather lay the order out themselves.
//
// Setup (free, 200 emails/month):
//   1. Create an account at https://www.emailjs.com
//   2. Email Services → Add New Service → connect Gmail (info@greentreezco.com)
//   3. Email Templates → Create New Template and set:
//        To email:  {{to_email}}
//        Reply to:  {{reply_to}}
//        Subject:   {{subject}}
//        Content:   {{{message_html}}}      (triple braces, so it is not escaped)
//   4. Account → General → copy the Public Key
//   5. Fill these in .env, then redeploy:
//        VITE_EMAILJS_PUBLIC_KEY=...
//        VITE_EMAILJS_SERVICE_ID=...
//        VITE_EMAILJS_TEMPLATE_ID=...
//
// Only needed if the EmailJS account has strict API mode switched on:
//        VITE_EMAILJS_PRIVATE_KEY=...
// ---------------------------------------------------------------------------
const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function emailjsConfigured() {
  return Boolean(
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY &&
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  );
}

/** Whether a confirmation to the customer can be sent at all. */
export function customerEmailConfigured() {
  return emailjsConfigured();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function lineLabel(item) {
  const variant =
    item.variant_title && item.variant_title !== 'Default Title' ? ` (${item.variant_title})` : '';
  return `${item.title}${variant}`;
}

function lineTotal(item) {
  return Number(item.price || 0) * Number(item.quantity || 0);
}

/** The confirmation as plain text, for the text part and for hand-built templates. */
function confirmationText({ reference, firstName, fulfillment, payment, items, amounts, notes }) {
  return [
    `Hi ${firstName},`,
    '',
    'Thanks for your order — we have received it.',
    '',
    `Order reference: ${reference}`,
    '',
    'WHAT YOU ORDERED',
    ...items.map((item) => `  ${item.quantity} x ${lineLabel(item)} — ${money(lineTotal(item))}`),
    '',
    `  Subtotal: ${money(amounts.subtotal)}`,
    `  Shipping: ${amounts.shipping === 0 ? 'Free' : money(amounts.shipping)}`,
    `  Total: ${money(amounts.total)}`,
    '',
    'DELIVERY',
    `  ${fulfillment.method} — ${fulfillment.eta}`,
    `  ${fulfillment.address}`,
    '',
    `Payment method chosen: ${payment}`,
    notes ? `Your notes: ${notes}` : null,
    '',
    'Our team will contact you shortly to confirm availability and arrange payment.',
    'Nothing has been charged yet.',
    '',
    `Questions? Reply to this email or write to ${contactEmail()}.`,
    '',
    'Green Treez Company',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** The same confirmation as HTML, kept plain so every mail client agrees on it. */
function confirmationHtml({ reference, firstName, fulfillment, payment, items, amounts, notes }) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
            ${escapeHtml(lineLabel(item))}<br>
            <span style="color:#777777;font-size:13px;">Qty ${escapeHtml(item.quantity)}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;">
            ${money(lineTotal(item))}
          </td>
        </tr>`
    )
    .join('');

  const totalRow = (label, value, strong) => `
    <tr>
      <td style="padding:4px 0;${strong ? 'font-weight:700;' : 'color:#555555;'}">${label}</td>
      <td style="padding:4px 0;text-align:right;${strong ? 'font-weight:700;' : 'color:#555555;'}">${value}</td>
    </tr>`;

  const notesBlock = notes
    ? `<h2 style="font-size:15px;margin:24px 0 6px;">Your notes</h2>
  <p style="margin:0;color:#555555;font-size:15px;">${escapeHtml(notes)}</p>`
    : '';

  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="font-size:22px;margin:0 0 4px;">Thanks, ${escapeHtml(firstName)} — we have your order</h1>
  <p style="color:#555555;margin:0 0 20px;">
    Order reference <strong style="color:#1a1a1a;">${escapeHtml(reference)}</strong>
  </p>

  <table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}</table>

  <table style="width:100%;border-collapse:collapse;font-size:15px;margin-top:12px;">
    ${totalRow('Subtotal', money(amounts.subtotal))}
    ${totalRow('Shipping', amounts.shipping === 0 ? 'Free' : money(amounts.shipping))}
    ${totalRow('Total', money(amounts.total), true)}
  </table>

  <h2 style="font-size:15px;margin:24px 0 6px;">Delivery</h2>
  <p style="margin:0;color:#555555;font-size:15px;">
    ${escapeHtml(fulfillment.method)} — ${escapeHtml(fulfillment.eta)}<br>
    ${escapeHtml(fulfillment.address)}
  </p>

  <h2 style="font-size:15px;margin:24px 0 6px;">Payment</h2>
  <p style="margin:0;color:#555555;font-size:15px;">
    ${escapeHtml(payment)}. Nothing has been charged yet — our team will contact you shortly to confirm
    availability and arrange payment.
  </p>

  ${notesBlock}

  <p style="margin:28px 0 0;color:#777777;font-size:13px;">
    Questions? Reply to this email or write to
    <a href="mailto:${escapeHtml(contactEmail())}" style="color:#1a7f42;">${escapeHtml(contactEmail())}</a>.
  </p>
  <p style="margin:8px 0 0;color:#777777;font-size:13px;">Green Treez Company</p>
</div>`.trim();
}

/**
 * Sends "thanks, we have received your order" to the customer's own address.
 *
 * Resolves to { ok: false, skipped: true } when there is no address to send to
 * or EmailJS is not configured, so checkout can tell the customer the truth
 * instead of promising a message that was never sent.
 */
export async function sendCustomerConfirmationEmail({
  reference,
  customer,
  fulfillment,
  payment,
  items,
  money: amounts,
  notes,
}) {
  if (!customer?.email) return { ok: false, skipped: true, reason: 'no-address' };
  if (!emailjsConfigured()) return { ok: false, skipped: true, reason: 'not-configured' };

  const firstName = (customer.name || '').trim().split(/\s+/)[0] || 'there';
  const content = { reference, firstName, fulfillment, payment, items, amounts, notes };
  const text = confirmationText(content);

  const body = JSON.stringify({
    service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
    ...(import.meta.env.VITE_EMAILJS_PRIVATE_KEY
      ? { accessToken: import.meta.env.VITE_EMAILJS_PRIVATE_KEY }
      : {}),
    template_params: {
      to_email: customer.email,
      to_name: customer.name || 'Valued customer',
      reply_to: contactEmail(),
      subject: `We have your order ${reference} — Green Treez Company`,
      message_html: confirmationHtml(content),
      message_text: text,
      // Kept so a template written against the older setup notes still works.
      message: text,
      order_ref: reference,
      order_total: money(amounts.total),
      order_items: items
        .map((item) => `${item.quantity}x ${lineLabel(item)} — ${money(lineTotal(item))}`)
        .join('\n'),
      fulfillment_method: fulfillment.method,
      fulfillment_eta: fulfillment.eta,
      fulfillment_address: fulfillment.address,
      payment_method: payment,
      notes: notes || 'None',
    },
  });

  try {
    const response = await fetch(EMAILJS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
    if (response.ok) return { ok: true };
    // EmailJS explains failures in a plain-text body, and surfacing it turns a
    // bare 400 into something the shop owner can actually act on.
    const detail = await response.text().catch(() => '');
    return { ok: false, error: detail || `EmailJS returned ${response.status}` };
  } catch (error) {
    return { ok: false, error: error.message || 'Could not reach EmailJS' };
  }
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
