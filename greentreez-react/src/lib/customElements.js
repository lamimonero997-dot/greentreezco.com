export function patchCustomElements() {
  const originalDefine = customElements.define.bind(customElements);
  customElements.define = (name, ctor, options) => {
    if (customElements.get(name)) return;

    for (const hook of ['connectedCallback', 'disconnectedCallback', 'attributeChangedCallback']) {
      const original = ctor.prototype[hook];
      if (typeof original !== 'function') continue;
      ctor.prototype[hook] = function patchedHook(...args) {
        try {
          if (hook === 'connectedCallback' && this.isConnected) customElements.upgrade(this);
          return original.apply(this, args);
        } catch (error) {
          console.warn(`[theme] <${name}> ${hook} failed:`, error);
        }
      };
    }

    originalDefine(name, ctor, options);
  };
}
