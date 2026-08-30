import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { slugify } from '../../lib/catalog/model.js';
import { deleteCollection, listCollections, listProducts, saveCollection, subscribeCatalog } from '../../lib/catalog/store.js';
import { ConfirmDialog, EmptyState, Icon, ICONS, Thumb, useNotify } from './ui.jsx';

const EMPTY_DRAFT = { title: '', handle: '', description: '', image: '', sort_order: 100, published: true };

export default function CollectionsHome() {
  const notify = useNotify();
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stop = subscribeCatalog((catalog) => {
      if (!catalog) return;
      setCollections(catalog.collections || []);
      setProducts(catalog.products || []);
    });
    Promise.all([listCollections(), listProducts()]).then(([nextCollections, nextProducts]) => {
      setCollections(nextCollections);
      setProducts(nextProducts);
      setReady(true);
    });
    return stop;
  }, []);

  // Membership is stored on each product, so count from there rather than trusting
  // a denormalised list that a local edit may have left behind.
  const countsByHandle = useMemo(() => {
    const counts = new Map();
    for (const product of products) {
      for (const handle of product.collection_handles || []) {
        counts.set(handle, (counts.get(handle) || 0) + 1);
      }
    }
    return counts;
  }, [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? collections.filter((item) => `${item.title} ${item.handle}`.toLowerCase().includes(needle))
      : collections;
    return [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.title.localeCompare(b.title));
  }, [collections, query]);

  async function persist(collection, partial, message) {
    setBusy(true);
    try {
      await saveCollection({ ...collection, ...partial });
      if (message) notify?.(message);
    } catch (error) {
      notify?.(error.message || 'Could not save collection', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function addCollection(event) {
    event.preventDefault();
    const handle = slugify(draft.handle || draft.title);
    if (!handle) {
      notify?.('Give the collection a title first', 'error');
      return;
    }
    if (collections.some((item) => item.handle === handle)) {
      notify?.(`A collection already uses /${handle}`, 'error');
      return;
    }
    await persist(
      {
        id: handle,
        handle,
        title: draft.title || handle,
        description: draft.description || '',
        image: draft.image || '',
        body_html: '',
        sort_order: Number(draft.sort_order) || collections.length + 1,
        published: draft.published !== false,
        product_handles: [],
      },
      {},
      `Created ${draft.title || handle}`
    );
    setDraft(EMPTY_DRAFT);
  }

  async function confirmDelete() {
    const collection = pendingDelete;
    setPendingDelete(null);
    if (!collection) return;
    setBusy(true);
    try {
      await deleteCollection(collection.id);
      notify?.(`Deleted ${collection.title}`);
    } catch (error) {
      notify?.(error.message || 'Could not delete collection', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveEditing(event) {
    event.preventDefault();
    const original = collections.find((item) => item.id === editing.id);
    if (!original) return;
    await persist(original, {
      title: editing.title.trim() || original.title,
      description: editing.description,
      image: editing.image,
      sort_order: Number(editing.sort_order) || 100,
      published: editing.published,
    }, `Saved ${editing.title}`);
    setEditing(null);
  }

  return (
    <>
      <div className="gtz-admin__top">
        <div>
          <h1>Collections</h1>
          <p className="gtz-admin__muted">
            Group products the way they appear in the shop. Membership is assigned on each product.
          </p>
        </div>
      </div>

      <div className="gtz-admin__stats">
        <div className="gtz-stat">
          <span>Collections</span>
          <strong>{collections.length}</strong>
        </div>
        <div className="gtz-stat">
          <span>Published</span>
          <strong>{collections.filter((item) => item.published !== false).length}</strong>
        </div>
        <div className="gtz-stat">
          <span>Empty</span>
          <strong>{collections.filter((item) => !countsByHandle.get(item.handle)).length}</strong>
        </div>
      </div>

      <form className="gtz-admin-card" onSubmit={addCollection}>
        <h2>Create collection</h2>
        <div className="gtz-admin__form-grid">
          <label className="gtz-field">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value, handle: slugify(event.target.value) })}
              placeholder="Summer flower"
            />
          </label>
          <label className="gtz-field">
            <span>Handle</span>
            <div className="gtz-slug">
              <span>/collections/</span>
              <input value={draft.handle} onChange={(event) => setDraft({ ...draft, handle: slugify(event.target.value) })} />
            </div>
          </label>
          <label className="gtz-field is-full">
            <span>Description</span>
            <input
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              placeholder="Shown at the top of the collection page"
            />
          </label>
        </div>
        <div className="gtz-admin__actions" style={{ marginTop: '0.85rem' }}>
          <button className="gtz-btn" type="submit" disabled={busy}>
            <Icon path={ICONS.add} size={15} />
            Add collection
          </button>
        </div>
      </form>

      <div className="gtz-admin__toolbar" style={{ marginTop: '1rem' }}>
        <label className="gtz-field">
          <span>Search</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or handle" />
        </label>
      </div>

      <div className="gtz-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Handle</th>
              <th>Products</th>
              <th>Order</th>
              <th>Live</th>
              <th className="gtz-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!ready ? (
              <tr>
                <td colSpan={6} className="gtz-loading">
                  Loading collections…
                </td>
              </tr>
            ) : null}
            {ready && !visible.length ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="No collections" body="Create one above to start grouping products." />
                </td>
              </tr>
            ) : null}
            {visible.map((collection) => {
              const count = countsByHandle.get(collection.handle) || 0;
              return (
                <tr key={collection.id}>
                  <td>
                    <div className="gtz-admin__product">
                      <Thumb src={collection.image} alt="" />
                      <div>
                        <strong>{collection.title}</strong>
                        <div className="gtz-admin__handle">{collection.description || 'No description'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="gtz-admin__handle">/{collection.handle}</td>
                  <td>
                    {count ? (
                      <Link to={`/admin/products?collection=${collection.handle}`}>{count} products</Link>
                    ) : (
                      <span className="gtz-stock-out">Empty</span>
                    )}
                  </td>
                  <td>{collection.sort_order ?? 100}</td>
                  <td>
                    <label className="gtz-stock">
                      <span className="gtz-switch">
                        <input
                          type="checkbox"
                          checked={collection.published !== false}
                          disabled={busy}
                          onChange={(event) =>
                            persist(
                              collection,
                              { published: event.target.checked },
                              event.target.checked ? `${collection.title} is live` : `${collection.title} hidden`
                            )
                          }
                        />
                        <span />
                      </span>
                      {collection.published !== false ? 'Published' : 'Hidden'}
                    </label>
                  </td>
                  <td className="gtz-col-actions">
                    <a
                      className="gtz-icon-btn"
                      href={`/collections/${collection.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View on the storefront"
                    >
                      <Icon path={ICONS.external} size={15} />
                    </a>
                    <button
                      type="button"
                      className="gtz-icon-btn"
                      title="Edit"
                      onClick={() =>
                        setEditing({
                          id: collection.id,
                          title: collection.title,
                          description: collection.description || '',
                          image: collection.image || '',
                          sort_order: collection.sort_order ?? 100,
                          published: collection.published !== false,
                        })
                      }
                    >
                      <Icon path={ICONS.settings} size={15} />
                    </button>
                    <button
                      type="button"
                      className="gtz-icon-btn is-danger"
                      title="Delete"
                      onClick={() => setPendingDelete(collection)}
                    >
                      <Icon path={ICONS.trash} size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="gtz-modal">
          <button type="button" className="gtz-modal__scrim" onClick={() => setEditing(null)} aria-label="Cancel" />
          <form className="gtz-modal__panel gtz-modal__panel--wide" onSubmit={saveEditing}>
            <h2>Edit collection</h2>
            <div className="gtz-admin__form-grid">
              <label className="gtz-field is-full">
                <span>Title</span>
                <input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
              </label>
              <label className="gtz-field is-full">
                <span>Description</span>
                <textarea
                  value={editing.description}
                  onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                  style={{ minHeight: '90px' }}
                />
              </label>
              <label className="gtz-field is-full">
                <span>Banner image URL</span>
                <input value={editing.image} onChange={(event) => setEditing({ ...editing, image: event.target.value })} />
              </label>
              <label className="gtz-field">
                <span>Sort order</span>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(event) => setEditing({ ...editing, sort_order: event.target.value })}
                />
              </label>
              <label className="gtz-stock" style={{ alignSelf: 'end', paddingBottom: '0.6rem' }}>
                <span className="gtz-switch">
                  <input
                    type="checkbox"
                    checked={editing.published}
                    onChange={(event) => setEditing({ ...editing, published: event.target.checked })}
                  />
                  <span />
                </span>
                Published
              </label>
            </div>
            <div className="gtz-modal__actions">
              <button type="button" className="gtz-btn gtz-btn--ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="gtz-btn" disabled={busy}>
                Save collection
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.title || 'this collection'}?`}
        body="Products stay in the catalog, but they lose this grouping and the collection page stops working."
        confirmLabel="Delete collection"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
