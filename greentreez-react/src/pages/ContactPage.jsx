import { useEffect, useState } from 'react';
import ShopChrome from '../components/ShopChrome.jsx';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    location: ''
  });
  const [formStatus, setFormStatus] = useState('');

  useEffect(() => {
    document.body.className = 'gtz-contact-page js-theme-loaded';
    document.title = 'Contact Us | Green Treez';
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => {
      setFormStatus('success');
      setFormData({ name: '', email: '', message: '', location: '' });
      setTimeout(() => setFormStatus(''), 5000);
    }, 1000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <ShopChrome>
      <main className="gtz-contact-main">
        <section className="gtz-contact-form-section">
          <div className="gtz-contact-form-wrapper">
            <h1>Contact Us</h1>
            <form onSubmit={handleSubmit} className="gtz-contact-form">
              <div className="gtz-form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gtz-form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="gtz-form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="4"
                />
              </div>

              <div className="gtz-form-group">
                <label htmlFor="location">Contact Location</label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a location</option>
                  <option value="nashville">Nashville, TN</option>
                  <option value="hendersonville">Hendersonville, TN</option>
                  <option value="waynesville">Waynesville, NC</option>
                  <option value="morganton">Morganton, NC</option>
                </select>
              </div>

              {formStatus === 'success' && (
                <div className="gtz-form-success">
                  Thank you! We'll get back to you soon.
                </div>
              )}

              <button type="submit" className="gtz-form-submit" disabled={formStatus === 'sending'}>
                {formStatus === 'sending' ? 'Sending...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </section>

        <section className="gtz-locations-section">
          <h2>Our Locations</h2>

          <div className="gtz-location-grid">
            <div className="gtz-location-card">
              <h3>Nashville, TN</h3>
              <p className="gtz-location-address">850 Hillwood Blvd Ste 7</p>
              <p className="gtz-location-hours">
                <strong>Mon - Sat:</strong> 10am - 7pm<br />
                <strong>Sun:</strong> 10am - 4pm
              </p>
              <p className="gtz-location-phone">
                <a href="tel:+16159154544">(615) 915-4544</a>
                <a href="https://wa.me/16159154544" className="gtz-whatsapp-btn" target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              </p>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3221.7524929887845!2d-86.83766492391659!3d36.13611477248445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x886466a7e6dae3e9%3A0x7e8a1c5e9d4b3f2a!2s850%20Hillwood%20Blvd%20%237%2C%20Nashville%2C%20TN%2037209!5e0!3m2!1sen!2sus!4v1693000000000!5m2!1sen!2sus"
                width="100%"
                height="200"
                style={{ border: 0, marginTop: '16px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Nashville Location"
              />
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=850+Hillwood+Blvd+%237,+Nashville,+TN+37209"
                target="_blank"
                rel="noopener noreferrer"
                className="gtz-directions-link"
              >
                Get directions
              </a>
            </div>

            <div className="gtz-location-card">
              <h3>Hendersonville, TN</h3>
              <p className="gtz-location-address">1208 West Main Street</p>
              <p className="gtz-location-hours">
                <strong>Mon - Sat:</strong> 10am - 8pm<br />
                <strong>Sun:</strong> 10am - 6pm
              </p>
              <p className="gtz-location-phone">
                <a href="tel:+16154315158">(615) 431-5158</a>
              </p>
            </div>
          </div>
        </section>
      </main>
    </ShopChrome>
  );
}
