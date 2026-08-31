import { Link } from 'react-router-dom';
import { useSiteContact, whatsappUrl } from '../lib/site.js';

const NAV_ITEMS = [
  {
    label: 'Products',
    href: '/collections/all-thc-and-cbd-products',
    submenu: [
      { href: '/collections/all-thc-and-cbd-products', label: 'Shop All Products' },
      { href: '/collections/flower', label: 'Flower' },
      { href: '/collections/edibles', label: 'Edibles' },
      { href: '/collections/pre-rolls', label: 'Pre-Rolls' },
      { href: '/collections/disposable-vapes', label: 'Disposable Vapes' },
      { href: '/collections/concentrates', label: 'Concentrates' },
      { href: '/collections/thc-cartridges', label: 'Cartridges' },
    ],
  },
  {
    label: 'Shop by Effect',
    href: '/pages/shop-thc-and-cbd-by-effect',
    submenu: [
      { href: '/collections/sleepy-effect-products', label: 'Sleep' },
      { href: '/collections/relaxed-effect-products', label: 'Relax' },
      { href: '/collections/energetic-effect-products', label: 'Energy' },
      { href: '/collections/focused-effect-products', label: 'Focus' },
      { href: '/collections/pain-relief', label: 'Pain Relief' },
    ],
  },
  { label: 'Specials/Deals', href: '/pages/daily-deals' },
  {
    label: 'Wholesale',
    href: '/pages/wholesale-and-distribution',
  },
  {
    label: 'More!',
    href: '/pages/about-us',
    submenu: [
      { href: '/pages/about-us', label: 'About Us' },
      { href: '/pages/contact-us', label: 'Contact' },
      { href: '/pages/frequently-asked-questions', label: 'FAQs' },
      { href: '/pages/certificates-of-analysis-lab-reports', label: 'Lab Reports' },
    ],
  },
];

const SHOP_LINKS = [
  { href: '/collections/all-thc-and-cbd-products', label: 'Shop All' },
  { href: '/collections/flower', label: 'Flower' },
  { href: '/collections/edibles', label: 'Edibles' },
  { href: '/collections/pre-rolls', label: 'Pre-Rolls' },
  { href: '/collections/disposable-vapes', label: 'Vapes' },
  { href: '/collections/concentrates', label: 'Concentrates' },
];

function NavItem({ item }) {
  if (!item.submenu) {
    return (
      <div className="gtz-nav__item">
        <Link to={item.href} className="gtz-nav__link">
          {item.label}
        </Link>
      </div>
    );
  }

  return (
    <div className="gtz-nav__item gtz-nav__item--has-dropdown">
      <Link to={item.href} className="gtz-nav__link">
        {item.label}
        <svg className="gtz-nav__arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L2 4h8z" />
        </svg>
      </Link>
      <div className="gtz-nav__dropdown">
        <div className="gtz-nav__dropdown-inner">
          {item.submenu.map((subitem) => (
            <Link key={subitem.href} to={subitem.href} className="gtz-nav__dropdown-link">
              {subitem.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShopChrome({ children }) {
  const contact = useSiteContact();

  return (
    <div className="gtz-chrome">
      <header className="gtz-chrome__header">
        <Link className="gtz-chrome__logo" to="/">
          Green Treez
        </Link>
        <nav className="gtz-chrome__nav">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>
        <button type="button" className="gtz-chrome__cart" onClick={() => window.dispatchEvent(new CustomEvent('gtz-open-cart'))}>
          Cart
        </button>
      </header>
      {children}
      <footer className="footer gtz-footer" id="footer">
        <div className="container gtz-footer__inner">
          <div className="gtz-footer__grid">
            <div className="gtz-footer__col gtz-footer__brand">
              <h3 className="footer-nav__title h5">Green Treez Company</h3>
              <p className="gtz-footer__blurb">Legal THC and CBD products, shipped to your door. Must be 21 or older to purchase.</p>
              <ul className="gtz-footer__contact o-list-bare">
                <li>
                  <a href={contact.telHref}>{contact.phoneDisplay}</a>
                </li>

                <li>
                  <a className="gtz-footer__address" href={contact.mapUrl} target="_blank" rel="noreferrer">
                    {contact.addressLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="footer-nav__title h5">Shop</h3>
              <ul className="footer-nav__items o-list-bare">
                {SHOP_LINKS.map((link) => (
                  <li className="footer-nav__item" key={link.href}>
                    <Link className="footer-nav__link" to={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="footer-nav__title h5">Company</h3>
              <ul className="footer-nav__items o-list-bare">
                <li className="footer-nav__item">
                  <Link className="footer-nav__link" to="/pages/about-us">
                    About us
                  </Link>
                </li>
                <li className="footer-nav__item">
                  <Link className="footer-nav__link" to="/pages/contact-us">
                    Contact
                  </Link>
                </li>
                <li className="footer-nav__item">
                  <Link className="footer-nav__link" to="/pages/frequently-asked-questions">
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="footer-nav__title h5">Help</h3>
              <ul className="footer-nav__items o-list-bare">
                <li className="footer-nav__item">
                  <Link className="footer-nav__link" to="/policies/shipping-policy">
                    Shipping policy
                  </Link>
                </li>
                <li className="footer-nav__item">
                  <Link className="footer-nav__link" to="/policies/privacy-policy">
                    Privacy policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="gtz-footer__bar">
            <p className="gtz-footer__copy">&copy; 2026 Green Treez Company. All rights reserved.</p>
            <p className="gtz-footer__legal">
              Products contain less than 0.3% Delta-9 THC derived from hemp. No statement on this site has been evaluated by
              the FDA. These products are not intended to diagnose, treat, cure, or prevent any disease.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
