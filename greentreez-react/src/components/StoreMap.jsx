import { Link } from 'react-router-dom';
import { formatMoney } from '../lib/catalog/model.js';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from '../lib/catalog/shipping.js';
import { useSiteContact, whatsappUrl } from '../lib/site.js';

/** Store details: address, hours, and the ways to reach us. */
export function StoreDetailsCard({ contact }) {
  return (
    <div className="gtz-map__card">
      <span className="gtz-eyebrow">Visit us</span>
      <h3>{contact.storeName}</h3>
      <address>
        {contact.addressLines.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
      <dl className="gtz-map__facts">
        <div>
          <dt>Hours</dt>
          <dd>{contact.hours}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>
            <a href={contact.telHref}>{contact.phoneDisplay}</a>
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            <a href={contact.mailtoHref}>{contact.email}</a>
          </dd>
        </div>
      </dl>
      <p className="gtz-map__note">Bring a valid photo ID. We check 21+ at the counter and on every delivery.</p>
      <div className="gtz-map__actions">
        <a className="gtz-map__btn" href={contact.mapUrl} target="_blank" rel="noreferrer">
          Get directions
        </a>
        <a
          className="gtz-map__btn gtz-map__btn--ghost"
          href={whatsappUrl(contact.whatsappGreeting)}
          target="_blank"
          rel="noreferrer"
        >
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}

/**
 * How an order actually reaches the customer, shown beside the store details.
 *
 * It reads the same SHIPPING_METHODS the checkout charges from, so the prices
 * and delivery estimates quoted here can never drift from what is billed.
 */
export function FulfillmentCard() {
  return (
    <div className="gtz-map__card gtz-map__card--ship">
      <span className="gtz-eyebrow">Getting your order</span>
      <h3>Delivery &amp; pickup</h3>
      <p className="gtz-map__lede">
        Every order is packed discreetly and checked against a valid 21+ ID before it leaves us. Choose how fast you
        need it at checkout.
      </p>
      <ul className="gtz-map__ship">
        {SHIPPING_METHODS.map((method) => (
          <li key={method.id}>
            <div>
              <strong>{method.label}</strong>
              <span>{method.eta}</span>
            </div>
            <b>{method.fee === 0 ? 'Free' : formatMoney(method.fee)}</b>
          </li>
        ))}
      </ul>
      <p className="gtz-map__ship-note">
        Standard shipping is free on orders over {formatMoney(FREE_SHIPPING_THRESHOLD)}.
      </p>
      <div className="gtz-map__actions">
        <Link className="gtz-map__btn" to="/collections/all-thc-and-cbd-products">
          Start an order
        </Link>
      </div>
    </div>
  );
}

/**
 * The store-location block used on the contact page and the location pages.
 * `compact` drops the heading so it can sit inside a page that already has one.
 */
export default function StoreMap({ compact = false, heading = 'Find us in Nashville', intro }) {
  const contact = useSiteContact();

  return (
    <section className={`gtz-map${compact ? ' gtz-map--compact' : ''}`} aria-label="Store details">
      <div className="gtz-map__inner">
        {compact ? null : (
          <header className="gtz-map__head">
            <span className="gtz-eyebrow">Our store</span>
            <h2>{heading}</h2>
            <p>
              {intro ||
                'Order online for delivery, or come by the shop and talk to a budtender. We are on Hillwood Blvd, minutes from West Nashville.'}
            </p>
          </header>
        )}
        <div className="gtz-map__body">
          <StoreDetailsCard contact={contact} />
          <FulfillmentCard />
        </div>
      </div>
    </section>
  );
}
