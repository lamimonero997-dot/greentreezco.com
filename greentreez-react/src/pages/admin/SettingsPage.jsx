import { useEffect, useState } from 'react';
import { catalogSource } from '../../lib/catalog/store.js';
import { DEFAULT_SETTINGS, getSettings, resetSettings, saveSettings } from '../../lib/settings.js';
import { siteContact, whatsappUrl } from '../../lib/site.js';
import { ConfirmDialog, Icon, ICONS, useNotify } from './ui.jsx';

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export default function SettingsPage() {
  const notify = useNotify();
  const [form, setForm] = useState(() => getSettings());
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    document.title = 'Settings · Green Treez admin';
  }, []);

  const set = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: '' } : current));
    setDirty(true);
  };

  function validate() {
    const next = {};
    if (!form.storeName.trim()) next.storeName = 'Required';
    if (!form.phoneDisplay.trim()) next.phoneDisplay = 'Required';
    if (digitsOnly(form.phoneE164).length < 10) next.phoneE164 = 'Include the country code, e.g. +1 510 394 2813';
    if (digitsOnly(form.whatsappNumber).length < 10) next.whatsappNumber = 'Digits only, including country code';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.addressStreet.trim()) next.addressStreet = 'Required';
    if (!form.addressCity.trim()) next.addressCity = 'Required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      notify?.('Fix the highlighted fields first', 'error');
      return;
    }
    const digits = digitsOnly(form.phoneE164);
    saveSettings({
      ...form,
      phoneE164: form.phoneE164.startsWith('+') ? `+${digits}` : `+${digits}`,
      whatsappNumber: digitsOnly(form.whatsappNumber),
      lowStockThreshold: Math.max(0, Number(form.lowStockThreshold) || 0),
    });
    setForm(getSettings());
    setDirty(false);
    notify?.('Storefront settings saved');
  }

  function onReset() {
    setConfirmReset(false);
    const next = resetSettings();
    setForm(next);
    setDirty(false);
    notify?.('Settings restored to defaults');
  }

  const preview = siteContact();

  return (
    <form className="gtz-admin-form" onSubmit={onSubmit}>
      <div className="gtz-editor-bar">
        <div>
          <p className="gtz-admin__crumb">
            <span>Admin</span>
            <span>/</span>
            <span>Settings</span>
          </p>
          <h1>Store settings</h1>
        </div>
        <div className="gtz-admin__actions">
          <button type="button" className="gtz-btn gtz-btn--ghost" onClick={() => setConfirmReset(true)}>
            Restore defaults
          </button>
          <button className="gtz-btn" type="submit" disabled={!dirty}>
            {dirty ? 'Save settings' : 'Saved'}
          </button>
        </div>
      </div>

      <p className="gtz-admin__banner">
        These details appear across the whole storefront: the announcement bar, both footers, the WhatsApp button, the
        checkout page, and every phone number and map link inside imported pages.
      </p>

      <div className="gtz-admin-layout">
        <div className="gtz-admin-stack">
          <section className="gtz-admin-card">
            <h2>Contact</h2>
            <div className="gtz-admin__form-grid">
              <label className={`gtz-field is-full${errors.storeName ? ' is-invalid' : ''}`}>
                <span>Store name</span>
                <input value={form.storeName} onChange={set('storeName')} />
                {errors.storeName ? <em className="gtz-field__error">{errors.storeName}</em> : null}
              </label>
              <label className={`gtz-field${errors.phoneDisplay ? ' is-invalid' : ''}`}>
                <span>Phone for calls, as displayed</span>
                <input value={form.phoneDisplay} onChange={set('phoneDisplay')} placeholder="(510) 394-2813" />
                {errors.phoneDisplay ? <em className="gtz-field__error">{errors.phoneDisplay}</em> : null}
              </label>
              <label className={`gtz-field${errors.phoneE164 ? ' is-invalid' : ''}`}>
                <span>Phone for calls, dialable</span>
                <input value={form.phoneE164} onChange={set('phoneE164')} placeholder="+15103942813" />
                {errors.phoneE164 ? <em className="gtz-field__error">{errors.phoneE164}</em> : null}
              </label>
              <label className={`gtz-field${errors.whatsappNumber ? ' is-invalid' : ''}`}>
                <span>WhatsApp number, dialable</span>
                <input value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="14133580385" />
                {errors.whatsappNumber ? <em className="gtz-field__error">{errors.whatsappNumber}</em> : null}
              </label>
              <label className="gtz-field">
                <span>WhatsApp number, as displayed</span>
                <input value={form.whatsappDisplay} onChange={set('whatsappDisplay')} placeholder="(413) 358-0385" />
              </label>
              <label className={`gtz-field${errors.email ? ' is-invalid' : ''}`}>
                <span>Email</span>
                <input value={form.email} onChange={set('email')} />
                {errors.email ? <em className="gtz-field__error">{errors.email}</em> : null}
              </label>
              <label className="gtz-field is-full">
                <span>Opening hours</span>
                <input value={form.hours} onChange={set('hours')} />
              </label>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Store address</h2>
            <div className="gtz-admin__form-grid">
              <label className={`gtz-field is-full${errors.addressStreet ? ' is-invalid' : ''}`}>
                <span>Street</span>
                <input value={form.addressStreet} onChange={set('addressStreet')} />
                {errors.addressStreet ? <em className="gtz-field__error">{errors.addressStreet}</em> : null}
              </label>
              <label className={`gtz-field${errors.addressCity ? ' is-invalid' : ''}`}>
                <span>City</span>
                <input value={form.addressCity} onChange={set('addressCity')} />
                {errors.addressCity ? <em className="gtz-field__error">{errors.addressCity}</em> : null}
              </label>
              <label className="gtz-field">
                <span>State</span>
                <input value={form.addressRegion} onChange={set('addressRegion')} />
              </label>
              <label className="gtz-field">
                <span>ZIP</span>
                <input value={form.addressPostal} onChange={set('addressPostal')} />
              </label>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Announcement bar</h2>
            <p className="gtz-admin__muted">The strip above the header on every storefront page.</p>
            <div className="gtz-admin__form-grid">
              <label className="gtz-field is-full">
                <span>Message</span>
                <input value={form.announcementText} onChange={set('announcementText')} />
              </label>
              <label className="gtz-field">
                <span>Link label</span>
                <input value={form.announcementLinkLabel} onChange={set('announcementLinkLabel')} placeholder="Leave blank to hide" />
              </label>
              <label className="gtz-field">
                <span>Link URL</span>
                <input value={form.announcementLinkHref} onChange={set('announcementLinkHref')} placeholder="/collections/..." />
              </label>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>WhatsApp &amp; operations</h2>
            <div className="gtz-admin__form-grid">
              <label className="gtz-field is-full">
                <span>Default chat greeting</span>
                <textarea value={form.whatsappGreeting} onChange={set('whatsappGreeting')} style={{ minHeight: '76px' }} />
              </label>
              <label className="gtz-field">
                <span>Low-stock threshold</span>
                <input type="number" min="0" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
              </label>
              <label className="gtz-stock" style={{ alignSelf: 'end', paddingBottom: '0.6rem' }}>
                <span className="gtz-switch">
                  <input type="checkbox" checked={Boolean(form.showWhatsappButton)} onChange={set('showWhatsappButton')} />
                  <span />
                </span>
                Show floating WhatsApp button
              </label>
            </div>
          </section>
        </div>

        <div className="gtz-admin-stack">
          <section className="gtz-admin-card">
            <h2>Live preview</h2>
            <p className="gtz-admin__muted">What the storefront shows right now, from saved settings.</p>
            <div className="gtz-settings-preview">
              <div className="gtz-settings-preview__bar">
                <span>{preview.announcementText}</span>
                {preview.announcementLinkLabel ? <b>{preview.announcementLinkLabel}</b> : null}
              </div>
              <dl className="gtz-detail-list">
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={preview.telHref}>{preview.phoneDisplay}</a>
                  </dd>
                </div>
                <div>
                  <dt>WhatsApp</dt>
                  <dd>
                    <a href={whatsappUrl(preview.whatsappGreeting)} target="_blank" rel="noreferrer">
                      {preview.whatsappDisplay}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>
                    <a href={preview.mapUrl} target="_blank" rel="noreferrer">
                      {preview.addressOneLine}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Hours</dt>
                  <dd>{preview.hours}</dd>
                </div>
              </dl>
              <a className="gtz-btn gtz-btn--ghost" href="/" target="_blank" rel="noreferrer">
                <Icon path={ICONS.external} size={15} />
                Open the storefront
              </a>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Data</h2>
            <dl className="gtz-detail-list">
              <div>
                <dt>Catalog</dt>
                <dd>{catalogSource() === 'supabase' ? 'Supabase' : 'This browser'}</dd>
              </div>
              <div>
                <dt>Settings</dt>
                <dd>This browser</dd>
              </div>
              <div>
                <dt>Admin password</dt>
                <dd>Set with VITE_ADMIN_PASSWORD</dd>
              </div>
            </dl>
            <p className="gtz-admin__muted">
              Settings are stored per browser. Save them again on any other device you manage the shop from.
            </p>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Restore default settings?"
        body={`Contact details go back to ${DEFAULT_SETTINGS.phoneDisplay} and ${DEFAULT_SETTINGS.addressStreet}.`}
        confirmLabel="Restore defaults"
        danger
        onConfirm={onReset}
        onCancel={() => setConfirmReset(false)}
      />
    </form>
  );
}
