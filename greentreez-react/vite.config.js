import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const STORE = 'https://greentreezcompany.com';

function localProductHtml(url) {
  const match = url.match(/\/products\/([^/?#]+)/);
  if (!match) return null;
  const handle = decodeURIComponent(match[1]).replace(/\.js$/, '');
  const slug = `products__${handle}`;
  const file = path.join(projectDir, 'public', 'pages', `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).html || null;
  } catch {
    return null;
  }
}

function emptyCartJson() {
  return JSON.stringify({
    note: null,
    attributes: {},
    original_total_price: 0,
    total_price: 0,
    total_discount: 0,
    total_weight: 0,
    item_count: 0,
    items: [],
    requires_shipping: false,
    currency: 'USD',
    items_subtotal_price: 0,
    cart_level_discount_applications: [],
    checkout_charge_amount: 0,
  });
}

function storeApiPlugin() {
  return {
    name: 'store-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        const pathname = decodeURIComponent(url.split('?')[0]);
        const isCdnMiss =
          url.startsWith('/cdn/') && !fs.existsSync(path.join(projectDir, 'public', pathname));

        const isStoreApi =
          /^\/cart(\/(add|change|update|clear))?\.js/.test(url) ||
          url.startsWith('/cart/add') ||
          url.startsWith('/cart/change') ||
          url.startsWith('/cart/update') ||
          url.startsWith('/search/suggest') ||
          url.startsWith('/recommendations/') ||
          /\/products\/[^/?]+\.js/.test(url) ||
          /\/collections\/[^/?]+\.js/.test(url) ||
          url.includes('section_id=') ||
          url.includes('sections=') ||
          /[?&]view=/.test(url);

        if (!isCdnMiss && !isStoreApi) return next();

        if (/[?&]view=quick-shop/.test(url) || url.includes('section_id=') || url.includes('sections=')) {
          res.statusCode = 200;
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.end('<div></div>');
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks);

          const headers = {
            'user-agent': req.headers['user-agent'] || 'Mozilla/5.0',
            accept: req.headers.accept || '*/*',
          };
          if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
          if (req.headers['x-requested-with']) headers['x-requested-with'] = req.headers['x-requested-with'];
          if (req.headers.cookie) headers.cookie = req.headers.cookie;

          const upstream = await fetch(STORE + url, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
            redirect: 'manual',
            signal: AbortSignal.timeout(isCdnMiss ? 2500 : 8000),
          });

          res.statusCode = upstream.status;
          for (const [key, value] of upstream.headers.entries()) {
            if (['content-encoding', 'transfer-encoding', 'content-length', 'set-cookie'].includes(key)) continue;
            res.setHeader(key, value);
          }

          const setCookies =
            typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
          if (setCookies.length) {
            res.setHeader(
              'set-cookie',
              setCookies.map((cookie) =>
                cookie
                  .replace(/;\s*Domain=[^;]*/gi, '')
                  .replace(/;\s*Secure/gi, '')
                  .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
              )
            );
          }

          const buf = Buffer.from(await upstream.arrayBuffer());
          res.setHeader('content-length', buf.length);
          res.end(buf);
        } catch (error) {
          console.warn('[store-api]', url, error.message);
          if (isCdnMiss) {
            res.statusCode = 404;
            res.end();
            return;
          }

          const html = localProductHtml(url);
          if (html) {
            res.statusCode = 200;
            res.setHeader('content-type', 'text/html; charset=utf-8');
            res.end(html);
            return;
          }

          if (/\/cart/.test(url) || /\/products\/[^/?]+\.js/.test(url) || /\/search\/suggest/.test(url)) {
            const json = emptyCartJson();
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end(json);
            return;
          }

          res.statusCode = 200;
          res.setHeader('content-type', 'text/html; charset=utf-8');
          res.end('<div></div>');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), storeApiPlugin()],
});
