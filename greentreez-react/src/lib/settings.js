import { useEffect, useState } from 'react';

// Storefront settings the shop owner can edit from the admin. Defaults live here
// so the site renders correctly before anything has been saved.
const KEY = 'gtz-site-settings-v1';
const EVENT = 'gtz-settings-change';

export const DEFAULT_SETTINGS = {
  storeName: 'Green Treez Company',
  phoneDisplay: '(510) 394-2813',
  phoneE164: '+15103942813',
  whatsappNumber: '15103942813',
  email: 'hello@example.com',
  addressStreet: '850 Hillwood Blvd Ste 7',
  addressCity: 'Nashville',
  addressRegion: 'TN',
  addressPostal: '37209',
  hours: 'Mon-Sat 10am-8pm, Sun 12pm-6pm',
  announcementText: 'Free Shipping into TN! Shop Broad Spectrum',
  announcementLinkLabel: 'View Selection',
  announcementLinkHref: '/collections/free-shipping-to-tennessee',
  whatsappGreeting: 'Hi Green Treez Company, I have a question about your products.',
  lowStockThreshold: 10,
  showWhatsappButton: true,
};

let cache = null;

function read() {
  if (cache) return cache;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    cache = { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}

export function getSettings() {
  return read();
}

export function saveSettings(partial) {
  const next = { ...read(), ...partial };
  next.lowStockThreshold = Math.max(0, Number(next.lowStockThreshold) || 0);
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: settings stay in memory for this session */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

export function resetSettings() {
  cache = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: cache }));
  return cache;
}

export function subscribeSettings(listener) {
  const onChange = (event) => listener(event.detail || read());
  // A save in another tab arrives as a storage event, not our custom one.
  const onStorage = (event) => {
    if (event.key && event.key !== KEY) return;
    cache = null;
    listener(read());
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(read);
  useEffect(() => subscribeSettings(setSettings), []);
  return settings;
}
