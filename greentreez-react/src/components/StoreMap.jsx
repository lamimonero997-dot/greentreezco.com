import { useSiteContact, whatsappUrl } from '../lib/site.js';

/**
 * Google's embed endpoint drops a pin on the query without needing an API key,
 * so the store location renders the same way in development and in production.
 */
function embedUrl(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&z=15&output=embed`;
}

function MapFrame({ contact, title }) {
  return (
    <div className="gtz-map__frame">
      <iframe
        title={title}
        src={embedUrl(contact.addressOneLine)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <a className="gtz-map__pin" href={contact.mapUrl} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
          <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
        </svg>
        <span>
          <strong>{contact.storeName}</strong>
          {contact.addressOneLine}
        </span>
      </a>
    </div>
  );
}

/** The details card shown beside the map: address, hours, and the ways to reach us. */
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
 * The map block used on the home page and the contact page. `compact` drops the
 * heading so it can sit inside a page that already has one.
 */
export default function StoreMap({ compact = false, heading = 'Find us in Nashville', intro }) {
  const contact = useSiteContact();

  return (
    <section className={`gtz-map${compact ? ' gtz-map--compact' : ''}`} aria-label="Store location">
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
          <MapFrame contact={contact} title={`Map showing ${contact.storeName} at ${contact.addressOneLine}`} />
          <StoreDetailsCard contact={contact} />
        </div>
      </div>
    </section>
  );
}
