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
        </div>
      </div>
    </section>
  );
}
