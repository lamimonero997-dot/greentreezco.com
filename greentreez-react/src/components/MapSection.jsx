import { Link } from 'react-router-dom';
import { useSiteContact } from '../lib/site.js';

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

function StarRating({ rating }) {
  const total = 5;
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = total - full - half;
  const id    = `half-${String(rating).replace('.', '-')}`;

  return (
    <span className="gtz-map-stars" aria-label={`${rating} out of 5 stars`}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d1d5db" />
          </linearGradient>
        </defs>
      </svg>
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className="gtz-star gtz-star--full" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {half === 1 && (
        <svg key="half" className="gtz-star gtz-star--half" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path fill={`url(#${id})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className="gtz-star gtz-star--empty" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function MapSection() {
  const contact = useSiteContact();

  return (
    <section className="gtz-home-section gtz-map-home-section">
      <div className="gtz-section-heading">
        <div>
          <span className="gtz-eyebrow">Visit us</span>
          <h2>Our Nashville Location</h2>
        </div>
        <Link to="/pages/contact-us">View all locations <span>→</span></Link>
      </div>

      <div className="gtz-map-split">
        {/* Left: Contact details */}
        <div className="gtz-map-split__contact">
          <h3 className="gtz-map-split__store-name">West Nashville</h3>
          <p className="gtz-map-address">
            {contact.addressLines.map((line, index) => (
              <span key={line}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </p>
          <p className="gtz-map-hours">{contact.hours}</p>

          <dl className="gtz-map-split__facts">
            <div>
              <dt>Phone</dt>
              <dd><a href={contact.telHref}>{contact.phoneDisplay}</a></dd>
            </div>
          </dl>

          <div className="gtz-map-home-actions">
            <a className="gtz-map-home-btn" href={contact.mapUrl} target="_blank" rel="noreferrer">
              Get directions
            </a>
            <Link className="gtz-map-home-btn gtz-map-home-btn--ghost" to="/pages/contact-us">
              Contact the store
            </Link>
          </div>
        </div>

        {/* Right: Testimonials */}
        <div className="gtz-map-split__testimonials">
          <span className="gtz-eyebrow">What customers say</span>
          <div className="gtz-map-split__reviews">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.id} className="gtz-map-review">
                <div className="gtz-map-review__header">
                  <StarRating rating={t.rating} />
                  <span className="gtz-map-review__score">{t.rating}/5</span>
                </div>
                <p>"{t.quote}"</p>
                <footer>{t.author}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
