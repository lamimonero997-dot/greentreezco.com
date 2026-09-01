import DOMPurify from 'dompurify';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import StoreShell from '../components/StoreShell.jsx';
import { addLocalCartItem } from '../lib/catalog/cart.js';
import { formatMoney, productAvailable, productImage } from '../lib/catalog/model.js';
import { FREE_SHIPPING_THRESHOLD } from '../lib/catalog/shipping.js';
import { getCachedCatalog, loadCatalog, productsForCollection } from '../lib/catalog/store.js';

function Accordion({ title, children }) {
  return (
    <div className="product-single__box__block product-single__box__block--tab">
      <div className="gtz-accordion">
        <details>
          <summary>
            <h3 className="f-family--body u-large u-text-transform--none u-color-text">{title}</h3>
            <summary-icon>
              <i className="icon icon--plus-t" aria-hidden="true" />
            </summary-icon>
          </summary>
          <div className="product-single__accordion__item-wrap rte">{children}</div>
        </details>
      </div>
    </div>
  );
}

function psychoClass(value) {
  const level = String(value || '').toLowerCase();
  if (level === 'high') return 'is-high';
  if (level === 'medium' || level === 'moderate') return 'is-moderate';
  if (level === 'low' || level === 'mild') return 'is-mild';
  return 'is-not';
}

function formatDescription(text) {
  if (!text) return null;

  // Split by double line breaks to get paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  return paragraphs.map((para, index) => {
    const trimmed = para.trim();

    // Check if this paragraph is a section heading (ends with colon and is short)
    const isSectionHeading = /^[A-Za-z\s]+:$/.test(trimmed) && trimmed.length < 50;

    if (isSectionHeading) {
      return <h4 key={index}>{trimmed}</h4>;
    }

    // Check if paragraph starts with bold text pattern (e.g., "**Text:**")
    const boldPattern = /^\*\*(.+?)\*\*:?\s*/;
    if (boldPattern.test(trimmed)) {
      const match = trimmed.match(boldPattern);
      const heading = match[1];
      const content = trimmed.replace(boldPattern, '').trim();

      return (
        <div key={index}>
          <h4>{heading}:</h4>
          {content && <p>{content}</p>}
        </div>
      );
    }

    return <p key={index}>{trimmed}</p>;
  });
}

function safeDescriptionHtml(html) {
  if (typeof html !== 'string') return '';
  // Product copy is editable in the admin, so it is untrusted here: a compromised
  // admin account must not become script execution on every shopper's page.
  // Blacklist regexes cannot do this - "<scr<script>ipt>" reassembles into a live
  // tag once the inner match is removed - so parse and allowlist instead.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
      'h2', 'h3', 'h4', 'blockquote', 'span', 'div', 'a', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'img',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
    FORBID_TAGS: ['style', 'base', 'form'],
    ALLOW_DATA_ATTR: false,
  });
}

function relatedProducts(catalog, product) {
  const handle = product.collection_handles?.[0];
  const pool = handle
    ? productsForCollection(catalog, handle)
    : (catalog?.products || []).filter((item) => item.status === 'active');
  return pool.filter((item) => item.handle !== product.handle).slice(0, 8);
}

export default function DynamicProduct({ product }) {
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id || '');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [catalog, setCatalog] = useState(() => getCachedCatalog());

  useEffect(() => {
    document.body.className = 'template-product gtz-dynamic-product js-theme-loaded';
    document.title = product.seo_title || `${product.title} | Green Treez`;
    setVariantId(product.variants?.[0]?.id || '');
    setQty(1);
    setAdded(false);
    setImageIndex(0);
    setImageError(false);
  }, [product]);

  useEffect(() => {
    if (catalog) return undefined;
    let cancelled = false;
    loadCatalog()
      .then((next) => {
        if (!cancelled) setCatalog(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [catalog]);

  const variant = useMemo(
    () => product.variants?.find((item) => String(item.id) === String(variantId)) || product.variants?.[0],
    [product, variantId]
  );
  const images = (product.images || []).filter((item) => item?.src);
  const image = images[imageIndex]?.src || productImage(product);
  const available = variant ? Boolean(variant.available) : productAvailable(product);
  const description = typeof product.description === 'string' ? product.description : '';
  const excerpt = typeof product.excerpt === 'string' ? product.excerpt : '';
  const optionName = product.options?.[0]?.name || 'Size';
  const collectionHandle = product.collection_handles?.[0];
  const collection = catalog?.collections?.find((item) => item.handle === collectionHandle);
  const onSale = Boolean(variant?.compare_at_price && variant.compare_at_price > variant.price);
  const related = relatedProducts(catalog, product);

  function addToCart(event) {
    event.preventDefault();
    if (!variant || !available) return;
    addLocalCartItem({ product, variant, quantity: qty });
    setAdded(true);
    window.dispatchEvent(new CustomEvent('gtz-open-cart'));
  }

  return (
    <StoreShell>
      <div className="page-container">
        <div id="main" role="main">
          <section className="section section--product-single">
            <div className="product-single product-single--media-left product-single--has-breadcrumbs product-single--clean">
              <div className="container container--large">
                <nav className="breadcrumb breadcrumb--product-single" aria-label="breadcrumbs">
                  <ul className="breadcrumb__items o-list-bare o-list-inline">
                    <li className="breadcrumb__item o-list-inline__item">
                      <Link to="/" className="breadcrumb__link u-small">
                        Home
                      </Link>
                    </li>
                    {collectionHandle ? (
                      <li className="breadcrumb__item o-list-inline__item">
                        <Link to={`/collections/${collectionHandle}`} className="breadcrumb__link u-small">
                          {collection?.title || product.product_type || 'Shop'}
                        </Link>
                      </li>
                    ) : null}
                    <li className="breadcrumb__item o-list-inline__item">
                      <span className="breadcrumb__link u-small breadcrumb__link--current">{product.title}</span>
                    </li>
                  </ul>
                </nav>

                <div className="product-single__content">
                  <div className="product-single__media">
                    <div className="product-gallery">
                      {/* Main Large Image */}
                      <div className="product-gallery__main">
                        {image && !imageError ? (
                          <img
                            className="product-gallery__main-image"
                            src={image}
                            alt={images[imageIndex]?.alt || product.title}
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="product-gallery__placeholder">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail Strip */}
                      {images.length > 1 ? (
                        <div className="product-gallery__thumbnails">
                          <div className="product-gallery__thumbnails-scroll">
                            {images.map((item, index) => (
                              <button
                                key={item.src + index}
                                type="button"
                                className={`product-gallery__thumb${index === imageIndex ? ' is-active' : ''}`}
                                onClick={() => setImageIndex(index)}
                                aria-label={`View image ${index + 1}`}
                              >
                                <img src={item.src} alt={item.alt || product.title} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Product Description */}
                      {(excerpt || description) && (
                        <div className="product-description">
                          <div className="product-description__header">
                            <h2 className="product-description__title">Product Description</h2>
                          </div>
                          <div className="product-description__body">
                            {excerpt && <p className="product-description__excerpt">{excerpt}</p>}
                            {description && (
                              /<[a-z][\s\S]*>/i.test(description) ? (
                                <div className="product-description__content" dangerouslySetInnerHTML={{ __html: safeDescriptionHtml(description) }} />
                              ) : (
                                <div className="product-description__content">
                                  {formatDescription(description)}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="product-single__primary-blocks">
                    <div className="product-single__box">
                      {product.vendor ? (
                        <div className="product-single__box__block product-single__box__block--m-6 product-single__box__block--vendor">
                          <p className="product-single__vendor product-single__vendor--body">{product.vendor}</p>
                        </div>
                      ) : null}

                      <div className="product-single__box__block product-single__box__block--m-0 product-single__box__block--title">
                        <h1 className="product-single__title">{product.title}</h1>
                      </div>

                      <div className="product-single__box__block product-single__box__block--m-12 product-single__box__block--price">
                        <div className="price">
                          <div className="price__text">
                            <span className="u-hidden-visually">Regular price</span>
                            <span className={`price__number${onSale ? ' price__number--sale' : ''}`}>
                              <span className="money">{formatMoney(variant?.price || 0)}</span>
                            </span>
                            {onSale ? (
                              <span className="price__compare">
                                <span className="money">{formatMoney(variant.compare_at_price)}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {product.psychoactivity || product.strain || (product.effects || []).length ? (
                        <div className="product-single__box__block">
                          <div className="product-metafields__item-wrapper">
                            {product.psychoactivity ? (
                              <div className="product-metafields__item">
                                <h4 className="product-metafields__meta-title">Psychoactivity</h4>
                                <span className={`product-metafields__psycho-level ${psychoClass(product.psychoactivity)}`}>
                                  {product.psychoactivity}
                                </span>
                              </div>
                            ) : null}
                            {product.strain ? (
                              <div className="product-metafields__item is-strain">
                                <h4 className="product-metafields__meta-title">Strain Type</h4>
                                <span className={`product-metafields__strain is-${product.strain}`}>{product.strain}</span>
                              </div>
                            ) : null}
                          </div>
                          {(product.effects || []).length ? (
                            <div className="product-metafields__item-wrapper is-effects">
                              {(product.effects || []).map((effect) => (
                                <span className="product-metafields__effect" key={effect}>
                                  {effect}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      <form className="product-form" onSubmit={addToCart}>
                        {product.variants?.length > 1 ? (
                          <div className="product-single__box__block product-single__box__block--variant_picker">
                            <fieldset className="product-form__swatch">
                              <div className="product-form__swatch__title">
                                <legend className="f-family--body f-caps--false f-space--0">{optionName}</legend>
                              </div>
                              {product.variants.map((item) => (
                                <div className="product-form__swatch__item product-form__swatch__item--button" key={item.id}>
                                  <input
                                    className="product-form__swatch__input u-hidden-visually"
                                    type="radio"
                                    id={`variant-${item.id}`}
                                    name="variant"
                                    value={item.id}
                                    checked={String(variantId) === String(item.id)}
                                    onChange={() => setVariantId(item.id)}
                                    disabled={!item.available}
                                  />
                                  <label
                                    className={`product-form__swatch__label${item.available ? '' : ' is-disabled'}`}
                                    htmlFor={`variant-${item.id}`}
                                  >
                                    {item.title}
                                  </label>
                                </div>
                              ))}
                            </fieldset>
                          </div>
                        ) : null}

                        <div className="product-single__box__block product-single__box__block--quantity_selector">
                          <div className="product-form__qty">
                            <label className="quantity-selector f-family--body f-caps--false f-space--0" htmlFor="gtz-qty">
                              Quantity
                            </label>
                            <div className="product-form__qty-input">
                              <div className="quantity-input">
                                <button type="button" minus="" aria-label="Reduce item quantity by one" onClick={() => setQty((value) => Math.max(1, value - 1))}>
                                  <span aria-hidden="true">−</span>
                                </button>
                                <input
                                  id="gtz-qty"
                                  type="number"
                                  min="1"
                                  step="1"
                                  name="quantity"
                                  autoComplete="off"
                                  value={qty}
                                  onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                                />
                                <button type="button" plus="" aria-label="Increase item quantity by one" onClick={() => setQty((value) => value + 1)}>
                                  <span aria-hidden="true">+</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="product-single__box__block product-single__box__block--buttons">
                          <div className={`product-form__add js-product-buttons${available ? '' : ' is-disabled'}`}>
                            <button className="c-btn c-btn--full c-btn--primary product-form__add-btn" type="submit" disabled={!available}>
                              <span className="product-form__add-btn__text">
                                <span className="js-product-add-text">{available ? (added ? 'Added to cart' : 'Add to cart') : 'Sold out'}</span>
                              </span>
                            </button>
                          </div>
                          {variant?.sku ? <p className="product-single__sku u-small">SKU: {variant.sku}</p> : null}
                        </div>
                      </form>

                      <Accordion title="Shipping Information">
                        <p>
                          We ship nationwide. Standard shipping is 3-5 business days and free on orders over{' '}
                          {formatMoney(FREE_SHIPPING_THRESHOLD)}. Express and overnight are available at checkout.
                        </p>
                      </Accordion>
                      <Accordion title="Frequently Asked Questions">
                        <div className="pdp-faqs__wrapper">
                          <h3 className="pdp-faqs__category-title">General questions</h3>
                          <p className="pdp-faqs__question">Do I need a medical card?</p>
                          <p className="pdp-faqs__answer">No. You must be 21 or older to purchase.</p>
                          <p className="pdp-faqs__question">How can I verify this product?</p>
                          <p className="pdp-faqs__answer">
                            {product.lab_report_url ? (
                              <>
                                A certificate of analysis is available.{' '}
                                <a href={product.lab_report_url} target="_blank" rel="noreferrer">
                                  View the lab report
                                </a>
                                .
                              </>
                            ) : (
                              'Look for a certificate of analysis in the product photos, or contact us if you need batch testing details.'
                            )}
                          </p>
                        </div>
                      </Accordion>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {related.length ? (
            <section className="section section--product-recommendations">
              <div className="container">
                <div className="section__title section__title--center">
                  <h2 className="section__title-text">You may also like</h2>
                </div>
                <div className="o-layout o-layout--small">{related.map((item) => <ProductCard product={item} key={item.id} />)}</div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </StoreShell>
  );
}
