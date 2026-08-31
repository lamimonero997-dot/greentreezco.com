import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StoreMap from '../components/StoreMap.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { useSiteContact, whatsappUrl } from '../lib/site.js';

const TOPICS = [
  'Order status',
  'Product question',
  'Wholesale enquiry',
  'Lab reports / COAs',
  'Something else',
];

const EMPTY = { name: '', phone: '', email: '', topic: TOPICS[0], message: '' };

function Field({ label, error, wide, children }) {
  return (
    <label className={`gtz-field${wide ? ' gtz-field--wide' : ''}${error ? ' gtz-field--invalid' : ''}`}>
      <span className="gtz-field__label">{label}</span>
      {children}
      {error ? <span className="gtz-field__error">{error}</span> : null}
    </label>
  );
}

export default function ContactPage() {
  const contact = useSiteContact();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.title = `Contact ${contact.storeName}`;
    document.body.setAttribute('class', 'template-page gtz-contact-page js-theme-loaded');
    window.scrollTo(0, 0);
  }, [contact.storeName]);

  const set = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
  };

  function onSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.message.trim()) next.message = 'Tell us how we can help';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    setErrors(next);
    if (Object.keys(next).length) return;

    // The shop is run over WhatsApp, so the form opens a pre-filled chat rather
    // than posting to a mailbox nobody watches.
    const lines = [
      `Hi ${contact.storeName}, I have a question.`,
      '',
      `Name: ${form.name.trim()}`,
      form.phone.trim() ? `Phone: ${form.phone.trim()}` : null,
      form.email.trim() ? `Email: ${form.email.trim()}` : null,
      `Topic: ${form.topic}`,
      '',
      form.message.trim(),
    ].filter((line) => line !== null);

    window.open(whatsappUrl(lines.join('\n')), '_blank', 'noopener');
  }

  const channels = [
    {
      id: 'whatsapp',
      eyebrow: 'Fastest',
      title: 'WhatsApp',
      body: `Message ${contact.whatsappDisplay} for order updates, product advice, and payment details. Usually answered within minutes during opening hours.`,
      action: 'Start a chat',
      href: whatsappUrl(contact.whatsappGreeting),
      external: true,
      featured: true,
    },
    {
      id: 'phone',
      eyebrow: 'Call us',
      title: contact.phoneDisplay,
      body: 'Speak to a budtender about stock, effects, or an order already on its way.',
      action: 'Call now',
      href: contact.telHref,
    },
    {
      id: 'email',
      eyebrow: 'Email',
      title: contact.email,
      body: 'Best for wholesale enquiries, lab reports, and anything with an attachment.',
      action: 'Send an email',
      href: contact.mailtoHref,
    },
    {
      id: 'visit',
      eyebrow: 'In person',
      title: 'Nashville store',
      body: contact.addressOneLine,
      action: 'Get directions',
      href: contact.mapUrl,
      external: true,
    },
  ];

  return (
    <StoreShell>
      <main className="gtz-contact">
        <header className="gtz-contact__hero">
          <div>
            <span className="gtz-eyebrow">Contact</span>
            <h1>We are here to help</h1>
            <p>
              Questions about a product, an order, or wholesale? Reach us however suits you — WhatsApp is the quickest,
              and there is always someone at the Nashville store during opening hours.
            </p>
            <div className="gtz-contact__hero-actions">
              <a
                className="gtz-contact__cta"
                href={whatsappUrl(contact.whatsappGreeting)}
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2A9.9 9.9 0 0 0 2.13 11.9c0 1.75.46 3.46 1.33 4.97L2 22l5.28-1.38a9.87 9.87 0 0 0 4.76 1.21h.01a9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2Zm0 18.06h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.19 8.19 0 0 1-1.26-4.38 8.24 8.24 0 1 1 8.24 8.25Zm4.52-6.17c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.63.8-.78.96-.14.17-.29.19-.53.06-.25-.12-1.05-.38-1.99-1.23a7.4 7.4 0 0 1-1.38-1.71c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.25.25-.41.09-.17.05-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47a.9.9 0 0 0-.66.31c-.22.25-.86.85-.86 2.06s.88 2.39 1 2.55c.13.17 1.74 2.65 4.2 3.71.59.26 1.05.41 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z" />
                </svg>
                Chat on WhatsApp
              </a>
              <a className="gtz-contact__cta gtz-contact__cta--ghost" href={contact.telHref}>
                {contact.phoneDisplay}
              </a>
            </div>
          </div>
          <dl className="gtz-contact__hours">
            <div>
              <dt>Opening hours</dt>
              <dd>{contact.hours}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                {contact.addressLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Age policy</dt>
              <dd>21+ only. Valid ID required in store and on delivery.</dd>
            </div>
          </dl>
        </header>

        <section className="gtz-contact__channels" aria-label="Ways to reach us">
          {channels.map((channel) => (
            <article key={channel.id} className={`gtz-contact__channel${channel.featured ? ' is-featured' : ''}`}>
              <span className="gtz-eyebrow">{channel.eyebrow}</span>
              <h2>{channel.title}</h2>
              <p>{channel.body}</p>
              <a
                href={channel.href}
                {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {channel.action} <span aria-hidden="true">→</span>
              </a>
            </article>
          ))}
        </section>

        <div className="gtz-contact__split">
          <form className="gtz-contact__form" onSubmit={onSubmit} noValidate>
            <h2>Send us a message</h2>
            <p className="gtz-contact__form-note">
              Fill this in and we will open WhatsApp with your message ready to send to {contact.whatsappDisplay}.
            </p>
            <div className="gtz-contact__grid">
              <Field label="Your name" error={errors.name}>
                <input type="text" autoComplete="name" value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Phone (optional)">
                <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Email (optional)" error={errors.email}>
                <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Topic">
                <select value={form.topic} onChange={set('topic')}>
                  {TOPICS.map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
              </Field>
              <Field label="How can we help?" error={errors.message} wide>
                <textarea rows="5" value={form.message} onChange={set('message')} />
              </Field>
            </div>
            <button type="submit" className="gtz-contact__submit">
              Send on WhatsApp
            </button>
            <p className="gtz-contact__legal">
              We only use your details to answer this message. Nothing is stored on this page.
            </p>
          </form>

          <aside className="gtz-contact__faq">
            <h2>Before you write</h2>
            <details>
              <summary>Where is my order?</summary>
              <p>
                Send us your order reference on WhatsApp and we will confirm the status right away. Delivery windows are
                quoted when your order is confirmed.
              </p>
            </details>
            <details>
              <summary>Do you ship outside Tennessee?</summary>
              <p>
                We ship hemp-derived products to most states. Message us with your address and we will confirm before you
                pay.
              </p>
            </details>
            <details>
              <summary>Can I see lab results?</summary>
              <p>
                Every batch is tested. Certificates are on the <Link to="/pages/certificates-of-analysis-lab-reports">lab reports page</Link>, and
                each product page links to its own COA.
              </p>
            </details>
            <details>
              <summary>Do you take wholesale orders?</summary>
              <p>
                Yes. See the <Link to="/pages/wholesale-and-distribution">wholesale page</Link>, then email us with your
                business details and volumes.
              </p>
            </details>
          </aside>
        </div>

        <StoreMap
          heading="Come see us"
          intro="Free parking outside. Walk in for advice from a budtender, or collect an online order at the counter."
        />
      </main>
    </StoreShell>
  );
}
