import { Link } from 'react-router-dom';
import { useState } from 'react';
import { addLocalCartItem } from '../lib/catalog/cart.js';
import { formatMoney, productImage, productPrice } from '../lib/catalog/model.js';

export default function ProductCard({ product, priority = false }) {
  const href = `/products/${product.handle}`;
  const image = productImage(product);
  const [imageError, setImageError] = useState(false);
  const [added, setAdded] = useState(false);
  const variant = product.variants?.find((item) => item.available !== false) || product.variants?.[0];

  function quickAdd() {
    if (!variant) return;
    addLocalCartItem({ product, variant });
    setAdded(true);
    // Same feedback as the product page: on a phone the drawer is the only
    // thing that confirms the add and the only route to checkout.
    window.dispatchEvent(new CustomEvent('gtz-open-cart'));
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="o-layout__item u-1/2 u-1/3@tab u-1/4-grid-desk">
      <div className="product-card js-product-card product-card--fit product-card--left">
        <div className="product-card-top">
          <div className="o-ratio o-ratio--1:1">
            <div className="o-ratio__content">
              <Link to={href} className="product-card__link product-card__link--full-opacity">
                <div className="product-card__media">
                  {image && !imageError ? (
                    <img
                      className="product-card__img"
                      src={image}
                      alt={product.title}
                      width="300"
                      height="300"
                      loading={priority ? 'eager' : 'lazy'}
                      fetchPriority={priority ? 'high' : 'auto'}
                      decoding="async"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="product-card__placeholder">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div className="product-card__details">
          <Link to={href} className="product-card__link" title={product.title}>
            <div className="product-card__vendor u-medium-small">{product.vendor}</div>
            <h3 className="product-card__title f-family--heading">{product.title}</h3>
          </Link>
          <div className="product-card__price">
            <span className="money">{formatMoney(productPrice(product))}</span>
            {product.strain ? <span className={`product-card__details-strain ${product.strain}`}>{product.strain}</span> : null}
          </div>
          {variant ? (
            <button type="button" className="gtz-quick-add" onClick={quickAdd}>
              {added ? 'Added to cart' : 'Quick add'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
