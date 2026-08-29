# Green Treez Company

React storefront for Green Treez. Pages, theme styles, and media live in `public/`; the app shell is in `src/`.

```bash
npm install
npm run dev
```

Open http://localhost:5173

```
src/
  App.jsx
  main.jsx
  styles.css
  components/     NotFound
  hooks/          client-side link + search navigation
  lib/            theme boot, page loader, sanitizer
  pages/          StorePage
public/
  cdn/            theme CSS/JS, fonts, product media
  pages/          one JSON fragment per route
```

Cart, search suggestions, and quick-shop talk to the live store during `npm run dev`. Checkout still uses the live store.
