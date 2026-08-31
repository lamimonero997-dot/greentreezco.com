import { Link } from 'react-router-dom';

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
                  <a href="tel:+16159154544">(615) 915-4544</a>
                </li>
                <li>
                  <a href="https://wa.me/16159154544" target="_blank" rel="noopener noreferrer" className="gtz-footer__whatsapp">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    WhatsApp
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
