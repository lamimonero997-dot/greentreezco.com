import { Link } from 'react-router-dom';
import { useSiteContact } from '../lib/site.js';

const LOGO_SRC = '/cdn/shop/files/Green_Treez_Logo_Online_3c7e5760-a12d-437c-adcf-ef85dfd7fc8e_480x480.png';

const SHOP_LINKS = [
  ['Flower', '/collections/flower'],
  ['Edibles', '/collections/edibles'],
  ['Pre-Rolls', '/collections/pre-rolls'],
  ['Vapes', '/collections/disposable-vapes'],
  ['Concentrates', '/collections/concentrates'],
];

const HELP_LINKS = [
  ['About us', '/pages/about-us'],
  ['FAQs', '/pages/frequently-asked-questions'],
  ['Lab reports', '/pages/certificates-of-analysis-lab-reports'],
  ['Contact', '/pages/contact-us'],
];

export default function CompactFooter() {
  const contact = useSiteContact();

  return (
    <footer className="gtz-compact-footer">
      <div className="gtz-compact-footer__topline" />
      <div className="gtz-compact-footer__inner">
        <section className="gtz-compact-footer__brand">
          <div className="gtz-compact-footer__lockup">
            <img className="gtz-compact-footer__mark" src={LOGO_SRC} alt="" width="52" height="52" loading="lazy" />
            <Link to="/" className="gtz-compact-footer__logo">Green Treez</Link>
          </div>
          <p>Thoughtfully selected hemp-derived THC and CBD, with clear information from browse to checkout.</p>
          <Link className="gtz-compact-footer__newsletter" to="/collections/all-thc-and-cbd-products">Explore the shop <span>→</span></Link>
          <address className="gtz-compact-footer__contact">
            <a className="gtz-compact-footer__phone" href={contact.telHref}>{contact.phoneDisplay}</a>
            <a className="gtz-compact-footer__map" href={contact.mapUrl} target="_blank" rel="noreferrer">
              {contact.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </a>
          </address>
        </section>
        <nav aria-label="Shop categories">
          <h2>Categories</h2>
          {SHOP_LINKS.map(([label, href]) => <Link to={href} key={href}>{label}</Link>)}
        </nav>
        <nav aria-label="Helpful links">
          <h2>Useful links</h2>
          <Link to="/collections/all-thc-and-cbd-products">Shop all</Link>
          <Link to="/pages/daily-deals">Specials & deals</Link>
          <Link to="/pages/about-us">Our story</Link>
          <Link to="/pages/contact-us">Contact</Link>
        </nav>
        <nav aria-label="Support links">
          <h2>Support</h2>
          {HELP_LINKS.map(([label, href]) => <Link to={href} key={href}>{label}</Link>)}
        </nav>
      </div>
      <div className="gtz-compact-footer__assurances" aria-label="Shopping assurances">
        <span><b>21+</b> Adults only</span>
        <span><b>✦</b> Lab-tested products</span>
        <span><b>↗</b> Fast, simple shopping</span>
      </div>
      <div className="gtz-compact-footer__bottom">
        <p>© 2026 Green Treez Company. All rights reserved.</p>
        <p>21+ only · Lab tested · Hemp-derived</p>
      </div>
    </footer>
  );
}
