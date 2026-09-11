/**
 * Title and description formatting, shared by the build and the browser.
 *
 * scripts/prerender.mjs writes these values into the static HTML, and
 * src/lib/seo.js rewrites them once React mounts. Google indexes the rendered
 * DOM, so if the two disagree the rendered version wins and the prerendered
 * one may as well not exist — which is exactly what happened when only the
 * build cleaned up the captured titles. Both sides import from here so there
 * is one implementation and no way for them to drift.
 *
 * Plain ESM with no browser or Node APIs, so it imports cleanly into both.
 */

export const SITE_NAME = 'Green Treez Company';
export const BASE_URL = 'https://www.greentreezco.com';
export const BRAND_SUFFIX = ' | Green Treez';
export const DEFAULT_TITLE = `${SITE_NAME} | Legal THC & CBD — Nashville, TN`;

// Google truncates around 60 characters; the brand suffix has to fit inside that.
const TITLE_MAX = 60;
const NAME_BUDGET = TITLE_MAX - BRAND_SUFFIX.length;

/**
 * The captured Shopify metadata was saved as UTF-8 but read back as Latin-1
 * somewhere in the scrape, so every en dash arrives as "â€“". Left alone it
 * ends up in the <title> of 1,600 product pages.
 */
const MOJIBAKE = [
  [/â€™/g, '’'], [/â€œ/g, '“'], [/â€/g, '”'],
  [/â€“/g, '–'], [/â€”/g, '—'], [/â€¦/g, '…'],
  [/â€/g, '”'],  [/Â /g, ' '],  [/Â/g, ''],
];

export function fixMojibake(value = '') {
  let out = String(value);
  for (const [pattern, replacement] of MOJIBAKE) out = out.replace(pattern, replacement);
  return out;
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'",
  nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  ndash: '–', mdash: '—', hellip: '…', trade: '™', reg: '®', deg: '°',
};

export function decodeEntities(text = '') {
  // Twice: the captured JSON double-escapes, so "&amp;nbsp;" is common.
  let out = String(text);
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, name) => {
      const key = name.toLowerCase();
      if (ENTITIES[key] !== undefined) return ENTITIES[key];
      if (key.startsWith('#x')) return String.fromCharCode(parseInt(key.slice(2), 16));
      if (key.startsWith('#')) return String.fromCharCode(Number(key.slice(1)));
      return match;
    });
  }
  return out;
}

export function stripHtml(html = '') {
  return decodeEntities(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(str = '', max = 155) {
  const s = stripHtml(str).trim();
  if (s.length <= max) return s;
  // Cut on a word boundary so a description never ends mid-word.
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:-]+$/, '') + '…';
}

/** Strips the scraped shop suffix and newlines from a captured title. */
export function cleanTitle(raw = '') {
  return fixMojibake(raw)
    .replace(/\s+/g, ' ')
    .replace(/\s*[–—|-]\s*Green\s*Treez(?:\s*Company)?\s*$/i, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
}

/**
 * Fits `name` into the title budget, cutting on a "|" segment first so the
 * keyword phrases the captured titles are built from stay intact, then on a
 * word boundary, and always appends the brand.
 */
export function composeTitle(name, fallback = DEFAULT_TITLE) {
  const clean = cleanTitle(name);
  if (!clean) return fallback;
  if (clean.length <= NAME_BUDGET) return clean + BRAND_SUFFIX;

  const segments = clean.split('|').map((part) => part.trim()).filter(Boolean);
  let built = segments[0] || clean;
  for (const segment of segments.slice(1)) {
    const next = `${built} | ${segment}`;
    if (next.length > NAME_BUDGET) break;
    built = next;
  }
  if (built.length > NAME_BUDGET) {
    const cut = built.slice(0, NAME_BUDGET);
    const lastSpace = cut.lastIndexOf(' ');
    built = (lastSpace > NAME_BUDGET * 0.5 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:|-]+$/, '');
  }
  return built + BRAND_SUFFIX;
}
