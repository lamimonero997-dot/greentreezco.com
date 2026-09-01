import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  centsToDollars,
  dollarsToCents,
  EFFECT_OPTIONS,
  duplicateProduct,
  formatMoney,
  joinList,
  newProduct,
  parseList,
  PRODUCT_TYPES,
  PSYCHO_LEVELS,
  slugify,
  STRAINS,
} from '../../lib/catalog/model.js';
import { ACCEPTED_TYPES, uploadProductImage } from '../../lib/catalog/images.js';
import { deleteProduct, listCollections, listProducts, loadCatalog, saveProduct } from '../../lib/catalog/store.js';
import { ConfirmDialog, Icon, ICONS, useNotify } from './ui.jsx';

function normalizeLoaded(found) {
  return {
    ...found,
    images: (found.images || []).map((image, position) => ({
      src: image.src || image,
      alt: image.alt || found.title,
      position,
    })),
    tags: found.tags || [],
    effects: found.effects || [],
    seo_keywords: found.seo_keywords || '',
    excerpt: found.excerpt || '',
    lab_report_url: found.lab_report_url || '',
  };
}

export default function ProductEditor() {
  const notify = useNotify();
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [product, setProduct] = useState(null);
  const [collections, setCollections] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [collectionQuery, setCollectionQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setMissing(false);
    setDirty(false);
    // A blank product needs nothing from the catalog, so show the form at once
    // and let the collection list and handle check arrive behind it. Waiting on
    // the full catalog first left "Add product" staring at a spinner.
    if (isNew) setProduct(newProduct({ status: 'active' }));

    let cancelled = false;
    Promise.all([loadCatalog(), listCollections(), listProducts()]).then(([catalog, nextCollections, nextProducts]) => {
      if (cancelled) return;
      setCollections(nextCollections);
      setAllProducts(nextProducts);
      if (isNew) return;
      const found = catalog.products.find((item) => item.id === id);
      if (!found) {
        setMissing(true);
        setProduct(null);
        return;
      }
      setProduct(normalizeLoaded(found));
    });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Leaving with unsaved edits is the classic way to lose an afternoon's work.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const patch = useCallback((partial) => {
    setProduct((current) => ({ ...current, ...partial }));
    setDirty(true);
  }, []);

  const visibleCollections = useMemo(() => {
    const needle = collectionQuery.trim().toLowerCase();
    return collections.filter(
      (item) => !needle || item.title.toLowerCase().includes(needle) || item.handle.includes(needle)
    );
  }, [collections, collectionQuery]);

  if (missing) {
    return (
      <div className="gtz-admin-card gtz-empty">
        <h1>Product not found</h1>
        <p>This listing is not in the catalog.</p>
        <Link className="gtz-btn" to="/admin/products">
          Back to products
        </Link>
      </div>
    );
  }

  if (!product) return <p className="gtz-loading">Loading product…</p>;

  function patchVariant(index, partial) {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...partial } : variant
      ),
    }));
    setDirty(true);
  }

  function patchImage(index, partial) {
    patch({
      images: (product.images || []).map((image, imageIndex) =>
        imageIndex === index ? { ...image, ...partial } : image
      ),
    });
  }

  /**
   * Takes files straight from the picker - on a phone that is the camera or the
   * photo library - and appends them, or replaces one that is already there.
   */
  async function addFiles(fileList, replaceIndex = null) {
    const files = [...(fileList || [])];
    if (!files.length) return;
    setUploading(true);
    try {
      const sources = [];
      for (const file of files) {
        sources.push(await uploadProductImage(file, product.id));
      }
      setProduct((current) => {
        const images = [...(current.images || [])];
        if (replaceIndex !== null && images[replaceIndex]) {
          images[replaceIndex] = { ...images[replaceIndex], src: sources[0] };
        } else {
          for (const src of sources) images.push({ src, alt: current.title, position: images.length });
        }
        return { ...current, images: images.map((image, position) => ({ ...image, position })) };
      });
      setDirty(true);
      notify?.(files.length > 1 ? `${files.length} images added` : 'Image added');
    } catch (error) {
      notify?.(error.message || 'Could not add that image', 'error');
    } finally {
      setUploading(false);
    }
  }

  function moveImage(index, direction) {
    const next = [...(product.images || [])];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ images: next.map((image, position) => ({ ...image, position })) });
  }

  function setFeaturedImage(index) {
    const next = [...(product.images || [])];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    patch({ images: next.map((image, position) => ({ ...image, position })) });
  }

  /** The product URL, derived from the title and nudged if it is already taken. */
  function uniqueHandle() {
    const base = slugify(product.handle || product.title) || `product-${Date.now()}`;
    const taken = new Set(allProducts.filter((item) => item.id !== product.id).map((item) => item.handle));
    if (!taken.has(base)) return base;
    let suffix = 2;
    while (taken.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  function validate() {
    const next = {};
    if (!product.title.trim()) next.title = 'Give the product a title';
    if (!(product.variants || []).length) next.variants = 'Add at least one variant';
    else if (product.variants.some((variant) => !String(variant.title || '').trim())) {
      next.variants = 'Every variant needs an option name';
    }
    if (product.status === 'active' && !(product.variants || []).some((variant) => Number(variant.price) > 0)) {
      next.variants = 'Set a price before publishing';
    }
    setErrors(next);
    return next;
  }

  async function onSave(event) {
    event.preventDefault();
    const problems = validate();
    if (Object.keys(problems).length) {
      notify?.(Object.values(problems)[0], 'error');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveProduct({
        ...product,
        handle: uniqueHandle(),
        tags: parseList(product.tags),
        effects: parseList(product.effects),
        images: (product.images || []).filter((image) => image.src).map((image, position) => ({ ...image, position })),
        options: product.variants?.length
          ? [
              {
                name: 'Size',
                position: 1,
                values: [...new Set(product.variants.map((variant) => variant.title || variant.option1).filter(Boolean))],
              },
            ]
          : [],
      });
      setDirty(false);
      notify?.(isNew ? 'Product published' : 'Product saved');
      if (isNew || saved.id !== id) navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (saveError) {
      notify?.(saveError.message || 'Could not save product', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    setConfirmDelete(false);
    try {
      await deleteProduct(product.id);
      setDirty(false);
      notify?.(`Deleted ${product.title}`);
      navigate('/admin/products');
    } catch (error) {
      notify?.(error.message || 'Could not delete product', 'error');
    }
  }

  async function onDuplicate() {
    setSaving(true);
    try {
      const saved = await saveProduct(
        duplicateProduct(product, new Set(allProducts.map((item) => item.handle)))
      );
      setDirty(false);
      notify?.('Duplicated as a draft');
      navigate(`/admin/products/${saved.id}`);
    } catch (error) {
      notify?.(error.message || 'Could not duplicate', 'error');
    } finally {
      setSaving(false);
    }
  }

  const lowestPrice = Math.min(...[...(product.variants || []).map((variant) => Number(variant.price || 0)), Infinity]);
  const actionLabel = saving ? (isNew ? 'Publishing…' : 'Saving…') : isNew ? 'Publish' : dirty ? 'Save changes' : 'Saved';

  return (
    <form className="gtz-admin-form" onSubmit={onSave}>
      <div className="gtz-editor-bar">
        <div>
          <p className="gtz-admin__crumb">
            <Link to="/admin/products">Products</Link>
            <span>/</span>
            <span>{isNew ? 'Add new product' : product.title}</span>
          </p>
          <h1>
            {isNew ? 'Add new product' : 'Edit product'}
            {dirty ? <em className="gtz-dirty-flag">Unsaved changes</em> : null}
          </h1>
        </div>
        <div className="gtz-admin__actions">
          {!isNew ? (
            <button type="button" className="gtz-btn gtz-btn--ghost" onClick={onDuplicate} disabled={saving}>
              <Icon path={ICONS.copy} size={15} />
              Duplicate
            </button>
          ) : null}
          <a className="gtz-btn gtz-btn--ghost" href={`/products/${product.handle}`} target="_blank" rel="noreferrer">
            <Icon path={ICONS.external} size={15} />
            Preview
          </a>
          <button className="gtz-btn" type="submit" disabled={saving || (!dirty && !isNew)}>
            {actionLabel}
          </button>
        </div>
      </div>

      <div className="gtz-admin-layout">
        <div className="gtz-admin-stack">
          <section className="gtz-admin-card">
            <h2>Product details</h2>
            <div className="gtz-admin__form-grid">
              <label className={`gtz-field is-full${errors.title ? ' is-invalid' : ''}`}>
                <span>Title</span>
                <input
                  value={product.title}
                  onChange={(event) =>
                    patch({ title: event.target.value, handle: isNew ? slugify(event.target.value) : product.handle })
                  }
                />
                {errors.title ? <em className="gtz-field__error">{errors.title}</em> : null}
              </label>
              <label className="gtz-field is-full">
                <span>
                  Short description <em>{(product.excerpt || '').length} characters</em>
                </span>
                <textarea
                  value={product.excerpt || ''}
                  onChange={(event) => patch({ excerpt: event.target.value })}
                  placeholder="One or two sentences for cards and search results"
                  style={{ minHeight: '88px' }}
                />
              </label>
              <label className="gtz-field is-full">
                <span>Description</span>
                <textarea
                  value={product.description || ''}
                  onChange={(event) => patch({ description: event.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Product images</h2>
            <p className="gtz-admin__muted">
              The first image is the featured photo. Additional images appear as gallery shots on the product page.
              Photos are resized for the web when you add them, so shooting straight from your phone is fine.
            </p>
            {!(product.images || []).length ? (
              <p className="gtz-admin__banner">
                This product has no image. Listings without a photo convert poorly on the storefront.
              </p>
            ) : null}
            <div className="gtz-gallery">
              {(product.images || []).map((image, index) => (
                <article className={`gtz-gallery__card${index === 0 ? ' is-featured' : ''}`} key={`img-${index}`}>
                  <div className="gtz-gallery__badge">{index === 0 ? 'Featured' : `Gallery ${index}`}</div>
                  <div className="gtz-gallery__preview">
                    {image.src ? <img src={image.src} alt={image.alt || product.title} /> : <span>No preview</span>}
                  </div>
                  <label className="gtz-upload gtz-upload--inline">
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES}
                      disabled={uploading}
                      onChange={(event) => {
                        addFiles(event.target.files, index);
                        event.target.value = '';
                      }}
                    />
                    <span>{uploading ? 'Working…' : 'Replace photo'}</span>
                  </label>
                  <label className="gtz-field">
                    <span>Alt text</span>
                    <input
                      value={image.alt || ''}
                      onChange={(event) => patchImage(index, { alt: event.target.value })}
                      placeholder={product.title}
                    />
                  </label>
                  <div className="gtz-gallery__actions">
                    <button
                      className="gtz-btn gtz-btn--ghost"
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                    >
                      Up
                    </button>
                    <button
                      className="gtz-btn gtz-btn--ghost"
                      type="button"
                      disabled={index === (product.images?.length || 1) - 1}
                      onClick={() => moveImage(index, 1)}
                    >
                      Down
                    </button>
                    {index !== 0 ? (
                      <button className="gtz-btn gtz-btn--ghost" type="button" onClick={() => setFeaturedImage(index)}>
                        Set featured
                      </button>
                    ) : null}
                    <button
                      className="gtz-btn gtz-btn--ghost"
                      type="button"
                      onClick={() => patch({ images: product.images.filter((_, itemIndex) => itemIndex !== index) })}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <label className="gtz-upload">
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                disabled={uploading}
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <span>
                <Icon path={ICONS.add} size={15} />
                {uploading ? 'Adding photos…' : (product.images || []).length ? 'Add more photos' : 'Add photos'}
              </span>
            </label>
          </section>

          <section className={`gtz-admin-card${errors.variants ? ' is-invalid' : ''}`}>
            <div className="gtz-card-head">
              <h2>Variants</h2>
              <span className="gtz-admin__muted">
                from {Number.isFinite(lowestPrice) ? formatMoney(lowestPrice) : '$0.00'}
              </span>
            </div>
            {errors.variants ? <p className="gtz-error">{errors.variants}</p> : null}
            <div className="gtz-variant-head">
              <span>Option</span>
              <span>Price</span>
              <span>Available</span>
              <span />
            </div>
            {(product.variants || []).map((variant, index) => {
              return (
                <div className="gtz-variant-row" key={variant.id || index}>
                  <input
                    value={variant.title}
                    onChange={(event) => patchVariant(index, { title: event.target.value, option1: event.target.value })}
                    placeholder="Size"
                  />
                  <input
                    value={centsToDollars(variant.price)}
                    onChange={(event) => patchVariant(index, { price: dollarsToCents(event.target.value) })}
                    inputMode="decimal"
                  />
                  <label className="gtz-stock">
                    <span className="gtz-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(variant.available)}
                        onChange={(event) => patchVariant(index, { available: event.target.checked })}
                      />
                      <span />
                    </span>
                    In stock
                  </label>
                  <button
                    className="gtz-icon-btn is-danger"
                    type="button"
                    title="Remove variant"
                    onClick={() => patch({ variants: product.variants.filter((_, itemIndex) => itemIndex !== index) })}
                  >
                    <Icon path={ICONS.trash} size={15} />
                  </button>
                </div>
              );
            })}
            <button
              className="gtz-btn gtz-btn--ghost"
              type="button"
              onClick={() =>
                patch({
                  variants: [
                    ...(product.variants || []),
                    {
                      id: `${product.id}-${Date.now()}`,
                      title: 'New size',
                      sku: '',
                      price: 0,
                      compare_at_price: null,
                      available: true,
                      inventory_quantity: 10,
                      option1: 'New size',
                    },
                  ],
                })
              }
            >
              <Icon path={ICONS.add} size={15} />
              Add variant
            </button>
          </section>
        </div>

        <div className="gtz-admin-stack">
          <section className="gtz-publish">
            <h2>Publish</h2>
            <label className="gtz-field">
              <span>Status</span>
              <select value={product.status} onChange={(event) => patch({ status: event.target.value })}>
                <option value="active">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="gtz-stock" style={{ marginTop: '0.75rem' }}>
              <span className="gtz-switch">
                <input
                  type="checkbox"
                  checked={Boolean(product.featured)}
                  onChange={(event) => patch({ featured: event.target.checked })}
                />
                <span />
              </span>
              Featured product
            </label>
            <p className="gtz-admin__muted">
              {product.handle ? `/products/${product.handle}` : 'Save to create the product URL'}
            </p>
            <div className="gtz-publish__row">
              {!isNew ? (
                <button className="gtz-btn gtz-btn--danger" type="button" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              ) : (
                <span />
              )}
              <button className="gtz-btn" type="submit" disabled={saving || (!dirty && !isNew)}>
                {actionLabel}
              </button>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Organization</h2>
            <div className="gtz-admin-stack">
              <label className="gtz-field">
                <span>Vendor</span>
                <input value={product.vendor || ''} onChange={(event) => patch({ vendor: event.target.value })} />
              </label>
              <label className="gtz-field">
                <span>Type</span>
                <select value={product.product_type} onChange={(event) => patch({ product_type: event.target.value })}>
                  {PRODUCT_TYPES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="gtz-field">
                <span>Tags</span>
                <input
                  value={Array.isArray(product.tags) ? joinList(product.tags) : product.tags || ''}
                  onChange={(event) => patch({ tags: event.target.value })}
                  placeholder="Flower, Hybrid, indoor"
                />
              </label>
              <label className="gtz-field">
                <span>Strain</span>
                <select value={product.strain || ''} onChange={(event) => patch({ strain: event.target.value })}>
                  <option value="">None</option>
                  {STRAINS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="gtz-field">
                <span>Psychoactivity</span>
                <select
                  value={product.psychoactivity || ''}
                  onChange={(event) => patch({ psychoactivity: event.target.value })}
                >
                  <option value="">None</option>
                  {PSYCHO_LEVELS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Effects</h2>
            <div className="gtz-checks">
              {EFFECT_OPTIONS.map((effect) => {
                const checked = (product.effects || []).includes(effect);
                return (
                  <label className="gtz-check" key={effect}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(product.effects || []);
                        if (checked) next.delete(effect);
                        else next.add(effect);
                        patch({ effects: [...next] });
                      }}
                    />
                    {effect}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="gtz-admin-card">
            <h2>Collections</h2>
            <p className="gtz-admin__muted">{(product.collection_handles || []).length} selected</p>
            <label className="gtz-field">
              <span>Find a collection</span>
              <input
                type="search"
                value={collectionQuery}
                onChange={(event) => setCollectionQuery(event.target.value)}
                placeholder="Search collections"
              />
            </label>
            <div className="gtz-checks gtz-checks--scroll">
              {visibleCollections.map((item) => {
                const checked = (product.collection_handles || []).includes(item.handle);
                return (
                  <label className="gtz-check" key={item.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const handles = new Set(product.collection_handles || []);
                        if (checked) handles.delete(item.handle);
                        else handles.add(item.handle);
                        patch({ collection_handles: [...handles] });
                      }}
                    />
                    {item.title}
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${product.title}?`}
        body="The product is removed from the catalog and disappears from the storefront. This cannot be undone."
        confirmLabel="Delete product"
        danger
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
