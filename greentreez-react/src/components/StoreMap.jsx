import { Link } from 'react-router-dom';
import { formatMoney } from '../lib/catalog/model.js';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from '../lib/catalog/shipping.js';
import { useSiteContact, whatsappUrl } from '../lib/site.js';

const TESTIMONIALS = [
  {
    id: 1,
    quote: 'Shipping was incredibly fast. Ordered in the evening and it was at my door the next day. Everything was packed perfectly, nothing damaged at all.',
    author: 'Tyrick Handson',
    rating: 4,
  },
  {
    id: 2,
    quote: 'The whole process was so easy from start to finish. Checkout took two minutes, shipping was quick, and the products were exactly as described.',
    author: 'Adam Coldly',
    rating: 4.5,
  },
  {
    id: 3,
    quote: 'Best online experience I have had. Super smooth ordering, fast delivery, and everything arrived in great condition. Will definitely order again.',
    author: 'Mark Williams',
    rating: 5,
  },
];

/**
 * Renders realistic star rating supporting full, half, and empty stars.
 * rating can be e.g. 4, 4.5, 5
 */
function StarRating({ rating }) {
  const total = 5;
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = total - full - half;
  const id    = `half-${rating}`.replace('.', '-');

  return (
    <span className="gtz-map-stars" aria-label={`${rating} out of 5 stars`}>
      {/* SVG gradient definition for half star */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d1d5db" />
          </linearGradient>
        </defs>
      </svg>

      {/* Full stars */}
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className="gtz-star gtz-star--full" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}

      {/* Half star */}
      {half === 1 && (
        <svg key="half" className="gtz-star gtz-star--half" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill={`url(#${id})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}

      {/* Empty stars */}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className="gtz-star gtz-star--empty" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

/** Store details card — left column */
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
          <dt>WhatsApp</dt>
          <dd>
            <a href={whatsappUrl(contact.whatsappGreeting)} target="_blank" rel="noreferrer">
              {contact.whatsappDisplay}
            </a>
          </dd>
        </div>
      </dl>
      <p className="gtz-map__note">Bring a valid photo ID. We check 21+ at the counter and on every delivery.</p>
      <div className="gtz-map__actions">
        <a className="gtz-map__btn" href={contact.mapUrl} target="_blank" rel="noreferrer">
          Get directions
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
