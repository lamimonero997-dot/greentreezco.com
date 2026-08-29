class CartLink extends HTMLElement {
  constructor() {
    super();

    this.itemsCount = this.querySelector('items-count');
  }

  connectedCallback() {
    this.unsubscribe = window.theme.cart.store.subscribe((state) => {
      this.itemsCount.innerHTML = state.products.item_count;
    });
  }

  disconnectedCallback() {
    this.unsubscribe();
  }
}
customElements.define('cart-link', CartLink);
