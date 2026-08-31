import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { catalogSource, listProducts, loadCatalog } from '../../lib/catalog/store.js';
import {
  authMode,
  checkIsAdmin,
  getSession,
  hasLocalSession,
  onAuthChange,
  sendPasswordReset,
  signIn,
  signInLocal,
  signOut,
} from '../../lib/adminAuth.js';
import { listOrders, subscribeOrders } from '../../lib/catalog/orders.js';
import { useSiteSettings } from '../../lib/settings.js';
import { Icon, ICONS, ToastStack, useToasts } from './ui.jsx';
import './admin.css';

const LOGO_SRC = '/cdn/shop/files/Green_Treez_Logo_Online_49d74201-94de-44f4-984a-9f299aedc9ad.png';

/** Email + password against Supabase Auth; membership of public.admins decides access. */
function SupabaseLogin({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await signIn(email, password);
      if (!(await checkIsAdmin())) {
        await signOut();
        setError('That account is not an admin for this shop.');
        return;
      }
      // The catalog may have been cached before sign-in, when RLS hid drafts.
      await loadCatalog(true);
      onSignedIn();
    } catch (signInError) {
      setError(signInError.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    try {
      await sendPasswordReset(email);
      setNotice('Check your inbox for a reset link.');
      setError('');
    } catch (resetError) {
      setError(resetError.message || 'Could not send a reset email.');
    }
  }

  return (
    <div className="gtz-admin-login">
      <form onSubmit={submit}>
        <Link className="gtz-admin__logo" to="/admin">
          <img src={LOGO_SRC} alt="Green Treez" />
          <span>Admin</span>
        </Link>
        <h1>Sign in to manage the shop</h1>
        <p className="gtz-admin__muted">
          Products, inventory, orders, collections, and storefront settings. Changes publish to the live shop.
        </p>
        <label className="gtz-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError('');
            }}
            autoFocus
          />
        </label>
        <label className="gtz-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
          />
        </label>
        {error ? <p className="gtz-error">{error}</p> : null}
        {notice ? <p className="gtz-admin__banner is-ok">{notice}</p> : null}
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" className="gtz-linkish gtz-admin__reset" onClick={reset}>
          Forgot your password?
        </button>
      </form>
    </div>
  );
}

/** Fallback for local development, where the catalog lives only in this browser. */
function PasswordLogin({ onOk }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!signInLocal(password)) {
      setError('That password does not match.');
      return;
    }
    onOk();
  }

  return (
    <div className="gtz-admin-login">
      <form onSubmit={submit}>
        <Link className="gtz-admin__logo" to="/admin">
          <img src={LOGO_SRC} alt="Green Treez" />
          <span>Admin</span>
        </Link>
        <h1>Sign in to manage the shop</h1>
        <p className="gtz-admin__muted">
          This browser is running without Supabase, so the catalog is local to it and a password is enough.
        </p>
        <label className="gtz-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
            autoFocus
          />
        </label>
        {error ? <p className="gtz-error">{error}</p> : null}
        <button type="submit">Continue</button>
        <p className="gtz-admin__muted">Set your own password with VITE_ADMIN_PASSWORD.</p>
      </form>
    </div>
  );
}

/** Ctrl/Cmd+K jump-to-product, so a big catalog stays one keystroke away. */
function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (open) listProducts().then(setProducts);
    else setQuery('');
  }, [open]);

  const pages = useMemo(
    () => [
      { id: 'page-dashboard', label: 'Dashboard', to: '/admin' },
      { id: 'page-products', label: 'Products', to: '/admin/products' },
      { id: 'page-new', label: 'Add product', to: '/admin/products/new' },
      { id: 'page-orders', label: 'Orders', to: '/admin/orders' },
      { id: 'page-inventory', label: 'Inventory', to: '/admin/inventory' },
      { id: 'page-collections', label: 'Collections', to: '/admin/collections' },
      { id: 'page-settings', label: 'Settings', to: '/admin/settings' },
    ],
    []
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matchedPages = pages.filter((page) => !needle || page.label.toLowerCase().includes(needle));
    const matchedProducts = needle
      ? products
          .filter((product) => `${product.title} ${product.handle}`.toLowerCase().includes(needle))
          .slice(0, 8)
          .map((product) => ({ id: product.id, label: product.title, hint: product.handle, to: `/admin/products/${product.id}` }))
      : [];
    return [...matchedPages, ...matchedProducts];
  }, [pages, products, query]);

  useEffect(() => setCursor(0), [query]);

  if (!open) return null;

  function go(item) {
    onClose();
    navigate(item.to);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') onClose();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((value) => Math.min(value + 1, results.length - 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((value) => Math.max(value - 1, 0));
    }
    if (event.key === 'Enter' && results[cursor]) {
      event.preventDefault();
      go(results[cursor]);
    }
  }

  return (
    <div className="gtz-modal gtz-modal--palette">
      <button type="button" className="gtz-modal__scrim" onClick={onClose} aria-label="Close search" />
      <div className="gtz-palette" role="dialog" aria-modal="true" aria-label="Search the admin">
        <div className="gtz-palette__input">
          <Icon path={ICONS.search} size={17} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or product…"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="gtz-palette__list">
          {results.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={index === cursor ? 'is-active' : ''}
                onMouseEnter={() => setCursor(index)}
                onClick={() => go(item)}
              >
                <span>{item.label}</span>
                {item.hint ? <small>{item.hint}</small> : null}
              </button>
            </li>
          ))}
          {!results.length ? <li className="gtz-palette__empty">Nothing matches “{query}”.</li> : null}
        </ul>
      </div>
    </div>
  );
}

function Layout({ onLogout, newOrders, children }) {
  const remote = catalogSource() === 'supabase';
  const settings = useSiteSettings();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const links = [
    { to: '/admin', end: true, icon: ICONS.dashboard, label: 'Dashboard' },
    { to: '/admin/products', icon: ICONS.products, label: 'Products' },
    { to: '/admin/orders', icon: ICONS.orders, label: 'Orders', badge: newOrders },
    { to: '/admin/inventory', icon: ICONS.inventory, label: 'Inventory' },
    { to: '/admin/collections', icon: ICONS.collections, label: 'Collections' },
    { to: '/admin/settings', icon: ICONS.settings, label: 'Settings' },
  ];

  return (
    <div className={`gtz-admin${navOpen ? ' is-nav-open' : ''}`}>
      <aside className="gtz-admin__side">
        <Link className="gtz-admin__logo" to="/admin" onClick={() => setNavOpen(false)}>
          <img src={LOGO_SRC} alt="Green Treez" />
          <span>Admin</span>
        </Link>

        <button type="button" className="gtz-admin__search" onClick={() => setPaletteOpen(true)}>
          <Icon path={ICONS.search} size={15} />
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>

        <div className="gtz-admin__nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setNavOpen(false)}>
              <Icon path={link.icon} />
              {link.label}
              {link.badge ? <em className="gtz-nav-badge">{link.badge}</em> : null}
            </NavLink>
          ))}
          <NavLink to="/admin/products/new" onClick={() => setNavOpen(false)}>
            <Icon path={ICONS.add} />
            Add product
          </NavLink>
        </div>

        <div className="gtz-admin__side-foot">
          <p className={`gtz-admin__pill${remote ? ' is-ok' : ''}`}>{remote ? 'Supabase connected' : 'Local workspace'}</p>
          <p className="gtz-admin__side-store">{settings.storeName}</p>
          <a href="/" target="_blank" rel="noreferrer">
            <Icon path={ICONS.shop} />
            View shop
          </a>
          <button type="button" onClick={onLogout}>
            <Icon path={ICONS.signout} />
            Sign out
          </button>
        </div>
      </aside>

      <button type="button" className="gtz-admin__navtoggle" onClick={() => setNavOpen((value) => !value)}>
        <Icon path={navOpen ? ICONS.close : ICONS.products} size={18} />
        Menu
      </button>
      {navOpen ? <button type="button" className="gtz-admin__navscrim" onClick={() => setNavOpen(false)} aria-label="Close menu" /> : null}

      <main className="gtz-admin__main">{children}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default function AdminApp() {
  // 'checking' until we know whether there is a valid session, so a reload never
  // flashes the login form at an already-signed-in admin.
  const [gate, setGate] = useState('checking');
  const [newOrders, setNewOrders] = useState(0);
  const { toasts, push, dismiss } = useToasts();
  const remote = authMode() === 'supabase';

  const notify = useCallback((message, tone) => push(message, tone), [push]);

  useEffect(() => {
    document.body.className = 'gtz-admin-page';
    document.title = 'Admin · Green Treez';
    return () => {
      document.body.className = '';
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveGate() {
      if (!remote) {
        if (!cancelled) setGate(hasLocalSession() ? 'ready' : 'signed-out');
        return;
      }
      const session = await getSession();
      if (cancelled) return;
      if (!session) {
        setGate('signed-out');
        return;
      }
      const admin = await checkIsAdmin();
      if (cancelled) return;
      setGate(admin ? 'ready' : 'signed-out');
    }

    resolveGate();
    // A token refresh failure or a sign-out in another tab must close this one.
    const stop = onAuthChange((event) => {
      if (event === 'SIGNED_OUT') setGate('signed-out');
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [remote]);

  useEffect(() => {
    if (gate !== 'ready') return undefined;
    const refresh = () =>
      listOrders().then((orders) => setNewOrders(orders.filter((order) => order.status === 'new').length));
    refresh();
    return subscribeOrders(refresh);
  }, [gate]);

  async function logout() {
    await signOut();
    setGate('signed-out');
  }

  if (gate === 'checking') {
    return (
      <div className="gtz-admin-login">
        <p className="gtz-loading">Checking your session…</p>
      </div>
    );
  }

  if (gate === 'signed-out') {
    return remote ? (
      <SupabaseLogin onSignedIn={() => setGate('ready')} />
    ) : (
      <PasswordLogin onOk={() => setGate('ready')} />
    );
  }

  return (
    <>
      <Layout newOrders={newOrders} onLogout={logout}>
        <Outlet context={{ notify }} />
      </Layout>
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
