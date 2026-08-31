import { Link } from 'react-router-dom';

export default function MapSection() {
  return (
    <section className="gtz-home-section gtz-map-home-section">
      <div className="gtz-section-heading">
        <div>
          <span className="gtz-eyebrow">Visit us</span>
          <h2>Our Nashville Location</h2>
        </div>
        <Link to="/pages/contact-us">View all locations <span>→</span></Link>
      </div>
      <div className="gtz-map-home-container">
        <div className="gtz-map-home-info">
          <h3>West Nashville</h3>
          <p className="gtz-map-address">
            850 Hillwood Blvd Ste 7<br />
            Nashville, TN 37209
          </p>
          <p className="gtz-map-hours">
            <strong>Mon - Sat:</strong> 10am - 7pm<br />
            <strong>Sun:</strong> 10am - 4pm
          </p>
          <p className="gtz-map-phone">
            <a href="tel:+16159154544">(615) 915-4544</a>
            <a href="https://wa.me/16159154544" target="_blank" rel="noopener noreferrer" className="gtz-map-whatsapp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </a>
          </p>
        </div>
        <div className="gtz-map-home-embed">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3221.7524929887845!2d-86.83766492391659!3d36.13611477248445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x886466a7e6dae3e9%3A0x7e8a1c5e9d4b3f2a!2s850%20Hillwood%20Blvd%20%237%2C%20Nashville%2C%20TN%2037209!5e0!3m2!1sen!2sus!4v1693000000000!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Green Treez West Nashville Location"
          />
        </div>
      </div>
    </section>
  );
}
