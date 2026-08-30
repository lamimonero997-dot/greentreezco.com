import { DEFAULT_SETTINGS, getSettings, useSiteSettings } from './settings.js';

// Derived contact details for the storefront. Everything that renders a phone
// number, WhatsApp link, or street address reads from here so the site never
// drifts out of sync with what the admin has saved.

function derive(settings) {
  const addressLines = [
    settings.addressStreet,
    [settings.addressCity, settings.addressRegion].filter(Boolean).join(', ') +
      (settings.addressPostal ? ` ${settings.addressPostal}` : ''),
  ].filter((line) => line && line.trim());
  const addressOneLine = addressLines.join(', ');

  return {
    ...settings,
    telHref: `tel:${settings.phoneE164}`,
    mailtoHref: `mailto:${settings.email}`,
    addressLines,
    addressOneLine,
    mapUrl: addressOneLine ? `https://maps.google.com/?q=${encodeURIComponent(addressOneLine)}` : '#',
  };
}

export function siteContact() {
  return derive(getSettings());
}

export function useSiteContact() {
  return derive(useSiteSettings());
}

export function whatsappUrl(message = '') {
  const base = `https://wa.me/${getSettings().whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Static defaults, kept for modules that only need a fallback value.
export const SITE_PHONE_DISPLAY = DEFAULT_SETTINGS.phoneDisplay;
export const SITE_PHONE_E164 = DEFAULT_SETTINGS.phoneE164;
export const SITE_TEL_HREF = `tel:${DEFAULT_SETTINGS.phoneE164}`;
export const SITE_WHATSAPP_NUMBER = DEFAULT_SETTINGS.whatsappNumber;
export const SITE_EMAIL = DEFAULT_SETTINGS.email;
export const SITE_ADDRESS_LINES = derive(DEFAULT_SETTINGS).addressLines;
export const SITE_ADDRESS_ONE_LINE = derive(DEFAULT_SETTINGS).addressOneLine;
export const SITE_MAP_URL = derive(DEFAULT_SETTINGS).mapUrl;
