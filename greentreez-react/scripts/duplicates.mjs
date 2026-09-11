/**
 * Products the catalog lists twice under different handles.
 *
 * Eleven listings in the captured catalog are the same item entered twice -
 * sometimes as a Shopify "-1" collision suffix (green-crack-...-thca-1),
 * sometimes as two different naming conventions for one product
 * (habit-sauce-thca-cart-1g and triple-og-live-resin-cartridge-1g-thca).
 * Both URLs are live, both carry the same copy, and they compete with each
 * other for the same query - a duplicate-content problem that no amount of
 * per-page metadata fixes.
 *
 * The fix is the standard one: pick a primary, point the other's canonical at
 * it, and keep the copy out of the sitemap. The copy still renders normally
 * for anyone who follows an existing link; it just stops asking to be indexed
 * in its own right.
 *
 * Choosing the primary is a judgement the data cannot make on its own - both
 * entries were created the same day - so it follows a fixed order and logs
 * every decision. To force a different winner, add the handle to PRIMARY_WINS.
 */

/** Handles that are always the primary, overriding the heuristic below. */
const PRIMARY_WINS = new Set([]);

/** Shopify appends "-1", "-2" when a handle collides; those are the copies. */
function hasCollisionSuffix(handle) {
  return /-\d+$/.test(handle);
}

/** Same item, entered twice: identical title, type and vendor. */
function identityKey(product) {
  const title = String(product.title || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${title}|${product.product_type || ''}|${product.vendor || ''}`;
}

/**
 * Ranks two entries for the same item. Lower sorts first and wins.
 * An explicit override, then a clean handle, then whichever listing carries
 * more for a shopper to look at, then the handle itself so the choice is
 * stable across builds.
 */
function compare(a, b) {
  const forced = (p) => (PRIMARY_WINS.has(p.handle) ? 0 : 1);
  if (forced(a) !== forced(b)) return forced(a) - forced(b);

  const suffixed = (p) => (hasCollisionSuffix(p.handle) ? 1 : 0);
  if (suffixed(a) !== suffixed(b)) return suffixed(a) - suffixed(b);

  const images = (p) => (p.images || []).length;
  if (images(a) !== images(b)) return images(b) - images(a);

  const copy = (p) => String(p.description || '').length;
  if (copy(a) !== copy(b)) return copy(b) - copy(a);

  return a.handle.localeCompare(b.handle);
}

/**
 * Maps each duplicate handle to the handle it should canonicalise to.
 * Primaries are absent from the map; a handle that is not in it is canonical
 * in its own right.
 */
export function duplicateCanonicals(products = []) {
  const groups = new Map();
  for (const product of products) {
    if (product.status !== 'active' || !product.handle) continue;
    const key = identityKey(product);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  }

  const canonicalOf = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [primary, ...copies] = [...group].sort(compare);
    for (const copy of copies) canonicalOf.set(copy.handle, primary.handle);
  }
  return canonicalOf;
}

/** One line per decision, so the choices are reviewable in the build log. */
export function reportDuplicates(canonicalOf, log = console.log) {
  if (!canonicalOf.size) return;
  log(
    `[duplicates] ${canonicalOf.size} duplicate listings canonicalised to their primary ` +
      '(rendered for visitors, kept out of the sitemap):'
  );
  for (const [copy, primary] of canonicalOf) log(`[duplicates]   ${copy}  →  ${primary}`);
}
