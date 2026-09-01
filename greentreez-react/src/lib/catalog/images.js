import { getSupabase, supabaseConfigured } from './supabase.js';

/**
 * Product photos, taken straight from the shop owner's phone or computer.
 *
 * Phone cameras produce 3-5MB files that are far larger than a product card
 * ever needs, and without Supabase the catalog lives in localStorage, where a
 * handful of those would blow the quota. So every upload is decoded, rotated
 * upright using its EXIF orientation, scaled to fit MAX_EDGE and re-encoded
 * before it goes anywhere.
 */
const BUCKET = 'product-images';
const MAX_EDGE = 1600;
const QUALITY = 0.82;

// A data URL this size is roughly 900KB of localStorage once base64-encoded.
// Past that we re-encode smaller rather than let a save fail on quota.
const MAX_INLINE_BYTES = 650_000;

export const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,image/heic,image/heif';

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(blob);
  });
}

async function decode(file) {
  // `from-image` applies the EXIF rotation a phone camera records, so portrait
  // shots do not arrive on their side.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* Safari on older iOS: fall through to an <img> decode */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaledSize(source, maxEdge) {
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function encode(source, maxEdge, quality) {
  const { width, height } = scaledSize(source, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not process that image');
  return blob;
}

/** Decoded, rotated upright and shrunk to something a product page can use. */
async function normalize(file) {
  const source = await decode(file);
  let blob = await encode(source, MAX_EDGE, QUALITY);

  // Only relevant when the image has to be inlined; a bucket upload keeps the
  // full MAX_EDGE version.
  if (!supabaseConfigured()) {
    for (const [edge, quality] of [
      [1200, 0.78],
      [900, 0.72],
      [640, 0.68],
    ]) {
      if (blob.size <= MAX_INLINE_BYTES) break;
      blob = await encode(source, edge, quality);
    }
  }

  source.close?.();
  return blob;
}

/**
 * Stores one image and returns the `src` to save on the product.
 *
 * With Supabase configured that is a public URL in the product-images bucket,
 * so the photo is visible to every visitor on every device. Without it, the
 * image is inlined as a data URL alongside the rest of the local catalog.
 */
export async function uploadProductImage(file, productId = 'product') {
  if (!file) throw new Error('No file selected');
  if (file.type && !file.type.startsWith('image/')) throw new Error('That file is not an image');

  const blob = await normalize(file);

  if (!supabaseConfigured()) {
    const dataUrl = await readAsDataUrl(blob);
    if (dataUrl.length > 4_000_000) {
      throw new Error('That image is too large to store in this browser');
    }
    return dataUrl;
  }

  const supabase = getSupabase();
  const path = `${productId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) {
    throw new Error(
      /bucket/i.test(error.message)
        ? `Storage bucket "${BUCKET}" is missing. Run supabase/schema.sql to create it.`
        : error.message
    );
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
