import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PaymentMarkRow from '../components/PaymentMarks.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { clearLocalCart, localCartTotal, readLocalCart, updateLocalCartItem } from '../lib/catalog/cart.js';
import { formatMoney } from '../lib/catalog/model.js';
import { createOrder, newOrderReference } from '../lib/catalog/orders.js';
import {
  DEFAULT_SHIPPING_ID,
  SHIPPING_METHODS,
  findShippingMethod,
  freeShippingRemainder,
  shippingFee,
  shippingPriceLabel,
} from '../lib/catalog/shipping.js';
import { useSiteContact, whatsappUrl } from '../lib/site.js';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / debit card', note: 'Visa, Mastercard, Amex. Secure link sent on WhatsApp' },
  { id: 'cashapp', label: 'Cash App', note: 'Pay to our verified $cashtag' },
  { id: 'zelle', label: 'Zelle', note: 'Bank to bank, no fees' },
  { id: 'venmo', label: 'Venmo', note: 'Fast peer-to-peer transfer' },
  { id: 'wallet', label: 'Apple Pay / Google Pay', note: 'One tap from your wallet' },
  { id: 'crypto', label: 'Bitcoin / USDT', note: 'On-chain, address sent on request' },
  { id: 'cash', label: 'Cash on delivery or pickup', note: 'Pay when you receive your order' },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  address: '',
  apartment: '',
  city: '',
  region: 'TN',
  postalCode: '',
  notes: '',
};

function buildWhatsappMessage({ reference, cart, subtotal, shipping, shippingCost, total, payment, form, pickupAddress }) {
  const lines = [
    'Hello Green Treez Company - I would like to place this order.',
    '',
    `Order reference: ${reference}`,
    '',
    'ITEMS',
  ];

  cart.items.forEach((item, index) => {
    const variant = item.variant_title && item.variant_title !== 'Default Title' ? ` (${item.variant_title})` : '';
    lines.push(
      `${index + 1}. ${item.title}${variant} - qty ${item.quantity} - ${formatMoney(item.price * item.quantity)}`
    );
  });

  lines.push(
    '',
    `Subtotal: ${formatMoney(subtotal)}`,
    `${shipping.label}: ${shippingCost === 0 ? 'Free' : formatMoney(shippingCost)}`,
    `Total: ${formatMoney(total)}`,
    '',
    'CUSTOMER',
    `Name: ${form.firstName} ${form.lastName}`.trim(),
    `Phone: ${form.phone}`,
    form.email.trim() ? `Email: ${form.email.trim()}` : null,
    '',
    'FULFILLMENT',
    `Method: ${shipping.label}`,
    `Estimated: ${shipping.eta}`
  );

  if (shipping.requiresAddress) {
    lines.push(
      `Address: ${[form.address, form.apartment].filter(Boolean).join(', ')}`,
      `City/State/ZIP: ${form.city}, ${form.region} ${form.postalCode}`
    );
  } else {
    lines.push(`Pickup at: ${pickupAddress}`);
  }

  lines.push('', 'PAYMENT', `Preferred method: ${payment.label}`);

  if (form.notes.trim()) lines.push('', 'NOTES', form.notes.trim());

  lines.push('', 'Please confirm availability and send payment details. Thank you.');

  return lines.filter((line) => line !== null).join('\n');
}

function Field({ label, error, wide, children }) {
  return (
    <label className={`gtz-field${wide ? ' gtz-field--wide' : ''}${error ? ' gtz-field--invalid' : ''}`}>
      <span className="gtz-field__label">{label}</span>
      {children}
      {error ? <span className="gtz-field__error">{error}</span> : null}
    </label>
  );
}

export default function CheckoutPage() {
  const [cart, setCart] = useState(() => readLocalCart());
  const [shippingId, setShippingId] = useState(DEFAULT_SHIPPING_ID);
  const [paymentId, setPaymentId] = useState('card');
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const contact = useSiteContact();

  useEffect(() => {
    const sync = (event) => setCart(event.detail || readLocalCart());
    window.addEventListener('gtz-cart-change', sync);
    return () => window.removeEventListener('gtz-cart-change', sync);
  }, []);

  useEffect(() => {
    document.title = 'Secure checkout | Green Treez Company';
    document.body.setAttribute('class', 'template-page gtz-checkout-page js-theme-loaded');
    window.scrollTo(0, 0);
  }, []);

  const subtotal = useMemo(() => localCartTotal(), [cart]);
  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cart]
  );

  const shipping = findShippingMethod(shippingId);
  const shippingCost = shippingFee(shipping, subtotal);
  const total = subtotal + shippingCost;
  const freeShippingGap = freeShippingRemainder(subtotal);
  const payment = PAYMENT_METHODS.find((method) => method.id === paymentId) || PAYMENT_METHODS[0];

  const setField = (name) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  function validate() {
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Required';
    if (!form.lastName.trim()) next.lastName = 'Required';
    // Ten digits is the shortest usable US number, and the WhatsApp confirmation depends on it.
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (shipping.requiresAddress) {
      if (!form.address.trim()) next.address = 'Required';
      if (!form.city.trim()) next.city = 'Required';
      if (!form.region.trim()) next.region = 'Required';
      if (!/^\d{5}(-\d{4})?$/.test(form.postalCode.trim())) next.postalCode = 'Enter a valid ZIP code';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!cart.items.length || submitting) return;
    if (!validate()) {
      requestAnimationFrame(() => {
        const firstError = document.querySelector('.gtz-field--invalid input, .gtz-field--invalid textarea');
        firstError?.focus();
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    setSubmitting(true);
    const reference = newOrderReference();
    const message = buildWhatsappMessage({
      reference,
      cart,
      subtotal,
      shipping,
      shippingCost,
      total,
      payment,
      form,
      pickupAddress: contact.addressOneLine,
    });
    const url = whatsappUrl(message);

    // Record the order for the admin before handing the conversation over to
    // WhatsApp, where payment is finalised. A logging failure must never stop
    // the customer from reaching us, so createOrder swallows its own errors.
    await createOrder({
      reference,
      status: 'new',
      customer_name: `${form.firstName} ${form.lastName}`.trim(),
      customer_phone: form.phone,
      customer_email: form.email.trim(),
      delivery_method: shipping.label,
      delivery_eta: shipping.eta,
      shipping_fee: shippingCost,
      shipping_address: shipping.requiresAddress
        ? [form.address, form.apartment, `${form.city}, ${form.region} ${form.postalCode}`].filter(Boolean).join(', ')
        : contact.addressOneLine,
      payment_method: payment.label,
      notes: form.notes.trim(),
      items: cart.items.map((item) => ({
        title: item.title,
        variant_title: item.variant_title,
        handle: item.handle,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      })),
      subtotal,
      total,
    });

    clearLocalCart();
    window.location.href = url;
  }

  if (!cart.items.length && !submitting) {
    return (
      <StoreShell>
        <main className="gtz-checkout gtz-checkout--empty">
          <div className="gtz-checkout__empty-card">
            <span className="gtz-checkout__eyebrow">Secure checkout</span>
            <h1>Your cart is empty</h1>
            <p>Add a few products and they will show up here, ready to confirm over WhatsApp.</p>
            <Link className="gtz-checkout__submit" to="/collections/all-thc-and-cbd-products">
              Browse the shop
            </Link>
          </div>
        </main>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <main className="gtz-checkout">
        <header className="gtz-checkout__masthead">
          <div className="gtz-checkout__masthead-copy">
            <span className="gtz-checkout__eyebrow">Secure checkout</span>
            <h1>Complete your order</h1>
            <p>
              Confirm your details and preferred payment method. Tapping checkout opens WhatsApp with your order ready to
              send to our team on {contact.whatsappDisplay}.
            </p>
          </div>
          <ol className="gtz-checkout__steps">
            <li className="is-done">Cart</li>
            <li className="is-active">Details &amp; payment</li>
            <li>Confirm on WhatsApp</li>
          </ol>
        </header>

        <div className="gtz-checkout__layout">
          <form className="gtz-checkout__form" onSubmit={handleSubmit} noValidate>
            <section className="gtz-checkout__card">
              <h2>
                <span>1</span> Contact
              </h2>
              <div className="gtz-checkout__grid">
                <Field label="First name" error={errors.firstName}>
                  <input type="text" autoComplete="given-name" value={form.firstName} onChange={setField('firstName')} />
                </Field>
                <Field label="Last name" error={errors.lastName}>
                  <input type="text" autoComplete="family-name" value={form.lastName} onChange={setField('lastName')} />
                </Field>
                <Field label="Phone (WhatsApp)" error={errors.phone}>
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(615) 000-0000"
                    value={form.phone}
                    onChange={setField('phone')}
                  />
                </Field>
                <Field label="Email (optional)" error={errors.email}>
                  <input type="email" autoComplete="email" value={form.email} onChange={setField('email')} />
                </Field>
              </div>
            </section>

            <section className="gtz-checkout__card">
              <h2>
                <span>2</span> Shipping method
              </h2>
              {freeShippingGap ? (
                <p className="gtz-checkout__hint">
                  Add {formatMoney(freeShippingGap)} more to unlock free standard shipping.
                </p>
              ) : (
                <p className="gtz-checkout__hint">Your order qualifies for free standard shipping.</p>
              )}
              <div className="gtz-checkout__options">
                {SHIPPING_METHODS.map((method) => {
                  const fee = shippingFee(method, subtotal);
                  const discounted = fee === 0 && method.fee > 0;
                  return (
                    <label key={method.id} className={`gtz-option${shippingId === method.id ? ' is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="shipping"
                        value={method.id}
                        checked={shippingId === method.id}
                        onChange={() => setShippingId(method.id)}
                      />
                      <span className="gtz-option__body">
                        <span className="gtz-option__label">{method.label}</span>
                        <span className="gtz-option__eta">{method.eta}</span>
                        <span className="gtz-option__note">
                          {method.id === 'pickup' ? contact.addressOneLine : method.note}
                        </span>
                      </span>
                      <span className="gtz-option__price">
                        {discounted ? <s>{formatMoney(method.fee)}</s> : null}
                        {shippingPriceLabel(method, subtotal)}
                      </span>
                    </label>
                  );
                })}
              </div>

              {shipping.requiresAddress ? (
                <div className="gtz-checkout__grid gtz-checkout__grid--address">
                  <Field label="Street address" error={errors.address} wide>
                    <input type="text" autoComplete="address-line1" value={form.address} onChange={setField('address')} />
                  </Field>
                  <Field label="Apartment, suite, etc. (optional)" wide>
                    <input
                      type="text"
                      autoComplete="address-line2"
                      value={form.apartment}
                      onChange={setField('apartment')}
                    />
                  </Field>
                  <Field label="City" error={errors.city}>
                    <input type="text" autoComplete="address-level2" value={form.city} onChange={setField('city')} />
                  </Field>
                  <Field label="State" error={errors.region}>
                    <input type="text" autoComplete="address-level1" value={form.region} onChange={setField('region')} />
                  </Field>
                  <Field label="ZIP code" error={errors.postalCode}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={form.postalCode}
                      onChange={setField('postalCode')}
                    />
                  </Field>
                </div>
              ) : (
                <div className="gtz-checkout__pickup">
                  <strong>Pick up at our Nashville store — {shipping.eta.toLowerCase()}</strong>
                  {contact.addressLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  <a href={contact.mapUrl} target="_blank" rel="noreferrer">
                    Get directions
                  </a>
                </div>
              )}
            </section>

            <section className="gtz-checkout__card">
              <h2>
                <span>3</span> Payment method
              </h2>
              <p className="gtz-checkout__hint">
                Choose how you would like to pay. Payment details are confirmed with a budtender on WhatsApp before
                anything is charged, so we never ask for card numbers on this page.
              </p>
              <div className="gtz-checkout__options gtz-checkout__options--payment">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method.id} className={`gtz-option${paymentId === method.id ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentId === method.id}
                      onChange={() => setPaymentId(method.id)}
                    />
                    <span className="gtz-option__body">
                      <span className="gtz-option__label">{method.label}</span>
                      <span className="gtz-option__note">{method.note}</span>
                      <PaymentMarkRow methodId={method.id} />
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="gtz-checkout__card">
              <h2>
                <span>4</span> Order notes
              </h2>
              <Field label="Anything we should know? (optional)" wide>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={setField('notes')}
                  placeholder="Delivery instructions, preferred call time, gift note..."
                />
              </Field>
            </section>

            <div className="gtz-checkout__actions">
              <button type="submit" className="gtz-checkout__submit" disabled={submitting}>
                <span className="gtz-checkout__submit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12.04 2A9.9 9.9 0 0 0 2.13 11.9c0 1.75.46 3.46 1.33 4.97L2 22l5.28-1.38a9.87 9.87 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.19 8.19 0 0 1-1.26-4.38 8.24 8.24 0 1 1 8.24 8.25Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.63.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.05-.38-1.99-1.23a7.4 7.4 0 0 1-1.38-1.71c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.05-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47a.9.9 0 0 0-.66.31c-.22.25-.86.85-.86 2.06s.88 2.39 1 2.55c.13.17 1.74 2.65 4.2 3.71.59.26 1.05.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z" />
                  </svg>
                </span>
                {submitting ? 'Opening WhatsApp...' : `Checkout on WhatsApp - ${formatMoney(total)}`}
              </button>
              <p className="gtz-checkout__legal">
                By continuing you confirm you are 21 or older. You will be redirected to WhatsApp to confirm the order
                with our team on {contact.whatsappDisplay}.
              </p>
            </div>
          </form>

          <aside className="gtz-checkout__summary">
            <div className="gtz-checkout__summary-inner">
              <h2>
                Order summary <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </h2>
              <ul className="gtz-checkout__items">
                {cart.items.map((item) => (
                  <li key={item.variant_id}>
                    <div className="gtz-checkout__thumb">
                      {item.image ? <img src={item.image} alt="" /> : <span aria-hidden="true">GT</span>}
                      <em>{item.quantity}</em>
                    </div>
                    <div className="gtz-checkout__item-body">
                      <Link to={item.url}>{item.title}</Link>
                      {item.variant_title && item.variant_title !== 'Default Title' ? (
                        <small>{item.variant_title}</small>
                      ) : null}
                      <button
                        type="button"
                        className="gtz-checkout__remove"
                        onClick={() => updateLocalCartItem(item.variant_id, 0)}
                      >
                        Remove
                      </button>
                    </div>
                    <span className="gtz-checkout__item-price">{formatMoney(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="gtz-checkout__totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                <div>
                  <dt>
                    {shipping.label}
                    <small>{shipping.eta}</small>
                  </dt>
                  <dd>{shippingPriceLabel(shipping, subtotal)}</dd>
                </div>
                <div className="gtz-checkout__total">
                  <dt>Total due</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>
              <ul className="gtz-checkout__assurance">
                <li>Your details stay on this device until you send them</li>
                <li>Discreet, odour-proof packaging</li>
                <li>Every batch lab tested</li>
              </ul>
              <div className="gtz-checkout__help">
                <strong>Need a hand?</strong>
                <a href={contact.telHref}>{contact.phoneDisplay}</a>
                <address>
                  {contact.addressLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </StoreShell>
  );
}
