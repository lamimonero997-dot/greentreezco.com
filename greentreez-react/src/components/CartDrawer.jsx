import { useEffect, useMemo, useState } from 'react';
import { localCartCount, localCartTotal, readLocalCart, updateLocalCartItem } from '../lib/catalog/cart.js';
import { formatMoney } from '../lib/catalog/model.js';

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState(() => readLocalCart());

  useEffect(() => {
    const sync = (event) => setCart(event.detail || readLocalCart());
    const openCart = () => setOpen(true);
    window.addEventListener('gtz-cart-change', sync);
    window.addEventListener('gtz-open-cart', openCart);
    return () => {
      window.removeEventListener('gtz-cart-change', sync);
      window.removeEventListener('gtz-open-cart', openCart);
    };
  }, []);

  // Recalculate from React state. The previous empty dependency arrays kept the
  // initial (empty) cart total on screen after customers added an item.
  const count = useMemo(() => localCartCount(), [cart]);
  const total = useMemo(() => localCartTotal(), [cart]);

  if (!count && !open) return null;

  return (
    <>
      <button type="button" className="gtz-cart-fab" onClick={() => setOpen(true)} aria-label="Open cart">
        Cart {count}
      </button>
      {open ? (
        <div className="gtz-cart-drawer">
          <button type="button" className="gtz-cart-drawer__scrim" onClick={() => setOpen(false)} aria-label="Close cart" />
          <aside className="gtz-cart-drawer__panel">
            <header>
              <h2>Cart</h2>
              <button type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </header>
            {!cart.items.length ? (
              <p className="gtz-cart-drawer__empty">Your cart is empty.</p>
            ) : (
              <ul>
                {cart.items.map((item) => (
                  <li key={item.variant_id}>
                    {item.image ? <img src={item.image} alt="" /> : null}
                    <div>
                      <a href={item.url}>{item.title}</a>
                      <small>{item.variant_title}</small>
                      <div className="gtz-cart-drawer__row">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(event) => updateLocalCartItem(item.variant_id, Number(event.target.value) || 0)}
                        />
                        <span>{formatMoney(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <footer>
              <p>Subtotal {formatMoney(total)}</p>
              <p className="gtz-cart-drawer__note">Taxes and shipping are calculated at checkout.</p>
              <a className="gtz-cart-drawer__checkout" href="/cart">
                Continue to secure checkout
              </a>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
