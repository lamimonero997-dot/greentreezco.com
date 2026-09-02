import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StoreMap from '../components/StoreMap.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { emailConfigured, sendContactEmail } from '../lib/email.js';
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
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useEffect(() => {
    document.title = `Contact ${contact.storeName}`;
    document.body.setAttribute('class', 'template-page gtz-contact-page js-theme-loaded');
    window.scrollTo(0, 0);
  }, [contact.storeName]);

  const set = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
    setStatus((current) => (current.state === 'idle' ? current : { state: 'idle', message: '' }));
  };

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Required';
    if (!form.message.trim()) next.message = 'Tell us how we can help';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** The same message as a WhatsApp chat, used as the fallback route. */
  function whatsappMessage() {
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
    return lines.join('\n');
  }

  function openWhatsapp() {
    if (!validate()) return;
    window.open(whatsappUrl(whatsappMessage()), '_blank', 'noopener');
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (status.state === 'sending') return;
    if (!validate()) return;

    // With no mail service configured the shop still runs on WhatsApp, so the
    // form keeps its original behaviour rather than silently doing nothing.
    if (!emailConfigured()) {
      window.open(whatsappUrl(whatsappMessage()), '_blank', 'noopener');
      return;
    }

    setStatus({ state: 'sending', message: '' });
    const result = await sendContactEmail({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      topic: form.topic,
      message: form.message.trim(),
    });

    if (result.ok) {
      setForm(EMPTY);
      setStatus({ state: 'sent', message: 'Thanks - your message is on its way. We usually reply the same day.' });
      return;
    }

    setStatus({
      state: 'error',
      message: 'That did not send. Please try again, or send it to us on WhatsApp instead.',
    });
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
              {emailConfigured()
                ? `This goes straight to ${contact.email}. Prefer to chat? Use the WhatsApp button below the form.`
                : `Fill this in and we will open WhatsApp with your message ready to send to ${contact.whatsappDisplay}.`}
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
            {status.message ? (
              <p
                className={`gtz-contact__status is-${status.state}`}
                role={status.state === 'error' ? 'alert' : 'status'}
              >
                {status.message}
              </p>
            ) : null}
            <div className="gtz-contact__actions">
              <button type="submit" className="gtz-contact__submit" disabled={status.state === 'sending'}>
                {!emailConfigured()
                  ? 'Send on WhatsApp'
                  : status.state === 'sending'
                    ? 'Sending…'
                    : 'Send message'}
              </button>
              {emailConfigured() ? (
                <button type="button" className="gtz-contact__alt" onClick={openWhatsapp}>
                  Send on WhatsApp instead
                </button>
              ) : null}
            </div>
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
