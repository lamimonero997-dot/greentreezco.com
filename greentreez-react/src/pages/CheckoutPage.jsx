import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PaymentMarkRow from '../components/PaymentMarks.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { clearLocalCart, localCartTotal, readLocalCart, updateLocalCartItem } from '../lib/catalog/cart.js';
import { formatMoney } from '../lib/catalog/model.js';
import { createOrder, newOrderReference } from '../lib/catalog/orders.js';
import { customerEmailConfigured, sendCustomerConfirmationEmail, sendOrderEmail } from '../lib/email.js';
import {
  DEFAULT_SHIPPING_ID,
  SHIPPING_METHODS,
  findShippingMethod,
  freeShippingRemainder,
  shippingFee,
  shippingPriceLabel,
} from '../lib/catalog/shipping.js';
import { useSiteContact } from '../lib/site.js';
import { setNoIndex } from '../lib/seo.js';

// Minimum subtotal required to place an order (in cents — $100.00).
const MIN_ORDER_CENTS = 10000;

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / debit card', note: 'Visa, Mastercard, Amex. Secure link sent after order is confirmed' },
  { id: 'cashapp', label: 'Cash App', note: 'Pay to our verified $cashtag' },
  { id: 'zelle', label: 'Zelle', note: 'Bank to bank, no fees' },
  { id: 'venmo', label: 'Venmo', note: 'Fast peer-to-peer transfer' },
  { id: 'wallet', label: 'Apple Pay / Google Pay', note: 'One tap from your wallet' },
  { id: 'crypto', label: 'Bitcoin / USDT', note: 'On-chain, address sent on request' },
  { id: 'cash', label: 'Cash on delivery or pickup', note: 'Pay when you receive your order' },
];

// How long checkout will wait for the order confirmation email before continuing.
const MAIL_WAIT_MS = 4000;

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
  // Once an order is placed we store the confirmation details here and show
  // the success screen instead of the form.
  const [placed, setPlaced] = useState(null);
  const contact = useSiteContact();

  useEffect(() => {
    const sync = (event) => setCart(event.detail || readLocalCart());
    window.addEventListener('gtz-cart-change', sync);
    return () => window.removeEventListener('gtz-cart-change', sync);
  }, []);

  useEffect(() => {
    setNoIndex('Secure checkout | Green Treez Company');
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
  const belowMinimum = subtotal < MIN_ORDER_CENTS;
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
    // Ten digits is the shortest usable US number, and the team calls it to confirm.
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = 'Enter a valid phone number';
    // Required, because this is where the order confirmation is sent.
    if (!form.email.trim()) next.email = 'Required — your order confirmation is sent here';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
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
    if (belowMinimum) return;
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
    const customerName = `${form.firstName} ${form.lastName}`.trim();
    const shippingAddress = shipping.requiresAddress
      ? [form.address, form.apartment, `${form.city}, ${form.region} ${form.postalCode}`]
          .filter(Boolean)
          .join(', ')
      : contact.addressOneLine;
    const fulfillmentAddress = shipping.requiresAddress
      ? shippingAddress
      : `Pickup at ${contact.addressOneLine}`;

    // Persist the order so it appears in the admin dashboard immediately.
    // A storage failure must never prevent the customer from seeing a
    // confirmation, so createOrder already swallows its own errors.
    const saved = await createOrder({
      reference,
      status: 'new',
      customer_name: customerName,
      customer_phone: form.phone,
      customer_email: form.email.trim(),
      delivery_method: shipping.label,
      delivery_eta: shipping.eta,
      shipping_fee: shippingCost,
      shipping_address: shippingAddress,
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

    // Notify the admin by email. Awaited with a cap so a slow mail service
    // never delays the confirmation screen shown to the customer.
    const mailed = sendOrderEmail({
      reference,
      customer: {
        name: customerName,
        phone: form.phone,
        email: form.email.trim(),
      },
      fulfillment: {
        method: shipping.label,
        eta: shipping.eta,
        address: fulfillmentAddress,
      },
      payment: payment.label,
      items: cart.items,
      money: { subtotal, shipping: shippingCost, total },
      notes: form.notes.trim(),
    });

    // Send the customer their own "we have your order" confirmation. Fired in
    // parallel with the admin email; both are capped by the same timeout so
    // neither can stall the confirmation screen.
    const customerMailed = sendCustomerConfirmationEmail({
      reference,
      customer: {
        name: customerName,
        phone: form.phone,
        email: form.email.trim(),
      },
      fulfillment: {
        method: shipping.label,
        eta: shipping.eta,
        address: fulfillmentAddress,
      },
      payment: payment.label,
      items: cart.items,
      money: { subtotal, shipping: shippingCost, total },
      notes: form.notes.trim(),
    });

    const results = await Promise.race([
      Promise.all([mailed, customerMailed]),
      new Promise((resolve) => setTimeout(() => resolve(null), MAIL_WAIT_MS)),
    ]);

    // A null result means the mail service was still working when the timeout
    // fired. The requests carry keepalive, so they are very likely to land -
    // treat that as sent rather than alarming the customer over a slow service.
    const confirmationSent = results ? results[1]?.ok !== false : true;

    clearLocalCart();
    setPlaced({
      reference,
      total,
      customerName,
      email: form.email.trim(),
      confirmationSent,
      // Supabase was unreachable, so this order is only in this browser.
      offline: saved?.persisted === 'local' && Boolean(saved?.error),
    });
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (!cart.items.length && !submitting && !placed) {
    return (
      <StoreShell>
        <main className="gtz-checkout gtz-checkout--empty">
          <div className="gtz-checkout__empty-card">
            <span className="gtz-checkout__eyebrow">Secure checkout</span>
            <h1>Your cart is empty</h1>
            <p>Add a few products and they will show up here, ready to order.</p>
            <Link className="gtz-checkout__submit" to="/collections/all-thc-and-cbd-products">
              Browse the shop
            </Link>
          </div>
        </main>
      </StoreShell>
    );
  }

  if (placed) {
    return (
      <StoreShell>
        <main className="gtz-checkout gtz-checkout--empty">
          <div className="gtz-checkout__empty-card">
            <span className="gtz-checkout__eyebrow">Order placed</span>
            <h1>Thank you{placed.customerName ? `, ${placed.customerName.split(' ')[0]}` : ''}!</h1>
            <p>
              Your order <strong>{placed.reference}</strong> ({formatMoney(placed.total)}) has been received. Our team
              will be in touch shortly to confirm availability and arrange payment.
            </p>
            {placed.confirmationSent && placed.email ? (
              <p>
                A confirmation is on its way to <strong>{placed.email}</strong>. If it is not there in a few
                minutes, check your spam folder.
              </p>
            ) : (
              <p>
                Keep your reference handy — we will confirm everything by phone and email shortly.
              </p>
            )}
            {placed.offline ? (
              <p className="gtz-admin__muted">
                Please take a screenshot of this page. We had trouble reaching our system, so quoting{' '}
                <strong>{placed.reference}</strong> will help us find your order faster.
              </p>
            ) : null}
            <p className="gtz-admin__muted">
              For any questions email us at{' '}
              <a href="mailto:info@greentreezco.com">info@greentreezco.com</a>.
            </p>
            <Link className="gtz-checkout__submit" to="/collections/all-thc-and-cbd-products">
              Continue shopping
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
              Confirm your details and preferred payment method. Our team will reach out to confirm availability and
              arrange payment.
            </p>
          </div>
          <ol className="gtz-checkout__steps">
            <li className="is-done">Cart</li>
            <li className="is-active">Details &amp; payment</li>
            <li>Order confirmed</li>
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
                <Field label="Phone" error={errors.phone}>
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="(615) 000-0000"
                    value={form.phone}
                    onChange={setField('phone')}
                  />
                </Field>
                <Field label="Email" error={errors.email}>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={setField('email')}
                  />
                  {customerEmailConfigured() ? (
                    <span className="gtz-field__hint">Your order confirmation is sent here.</span>
                  ) : null}
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
                Choose how you would like to pay. Our team will reach out with payment details after your order is
                confirmed — we never ask for card numbers on this page.
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
              <button type="submit" className="gtz-checkout__submit" disabled={submitting || belowMinimum}>
                <span className="gtz-checkout__submit-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
                {submitting ? 'Placing order…' : `Place order — ${formatMoney(total)}`}
              </button>
              <p className="gtz-checkout__legal">
                By continuing you confirm you are 21 or older. Our team will contact you to confirm your order and
                arrange payment.
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
              {belowMinimum && (
                <div className="gtz-checkout__min-order" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span>
                    <strong>Minimum order is {formatMoney(MIN_ORDER_CENTS)}</strong>
                    <br />
                    Add {formatMoney(MIN_ORDER_CENTS - subtotal)} more to place your order.
                  </span>
                </div>
              )}
              <ul className="gtz-checkout__assurance">
                <li>Your details stay on this device until you submit</li>
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
