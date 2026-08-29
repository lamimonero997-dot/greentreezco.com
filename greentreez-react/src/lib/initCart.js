// Initialize theme cart store to prevent errors from theme scripts
export async function initThemeCart() {
  if (window.theme?.cart?.store) return; // Already initialized

  window.theme = window.theme || {};
  window.theme.cart = window.theme.cart || {};

  // Skip loading external libraries - they contain ES module syntax that fails
  // Just use the fallback cart directly
  createFallbackCart();
}

function createFallbackCart() {
  // Create a minimal cart store that won't crash the theme scripts
  const emptyCart = {
    items: [],
    item_count: 0,
    total_price: 0,
    attributes: {},
  };

  const subscribers = new Set();
  let state = {
    products: emptyCart,
    lineItemsBeingUpdated: [],
    latestAddedProduct: null,
    giftWrapping: {
      productId: null,
      wrapIndividually: false,
      statusBeingUpdated: false,
      messageBeingUpdated: false,
    },
    syncGiftWrapping: () => {}, // Add missing function
  };

  window.theme.cart.store = {
    getState: () => ({
      ...state,
      syncGiftWrapping: () => {}, // Add missing function to state
    }),
    setState: (updater) => {
      state = typeof updater === 'function' ? updater(state) : updater;
      subscribers.forEach((fn) => fn(state));
    },
    subscribe: (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };

  window.theme.cart.functions = {
    createStore: (creator) => {
      const _store = creator(
        (updater) => window.theme.cart.store.setState(updater),
        () => window.theme.cart.store.getState()
      );
      return window.theme.cart.store;
    },
    produce: (fn) => (state) => {
      const draft = JSON.parse(JSON.stringify(state));
      fn(draft);
      return draft;
    },
  };
}
