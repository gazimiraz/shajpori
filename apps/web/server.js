const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3000;

// Web app (same directory as this file)
const webApp = next({ dev: false, dir: __dirname });
const webHandle = webApp.getRequestHandler();

// Admin app — lazy loaded on first /admin request
let adminHandle = null;
let adminPreparing = null;

function getAdminHandle() {
  if (adminHandle) return Promise.resolve(adminHandle);
  if (!adminPreparing) {
    const adminApp = next({ dev: false, dir: path.join(__dirname, '../admin') });
    adminHandle = adminApp.getRequestHandler();
    adminPreparing = adminApp.prepare();
  }
  return adminPreparing.then(() => adminHandle);
}

webApp.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname || '';

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      getAdminHandle()
        .then(handle => handle(req, res, parsedUrl))
        .catch(err => {
          console.error('Admin error:', err);
          res.statusCode = 500;
          res.end('Admin unavailable');
        });
    } else {
      webHandle(req, res, parsedUrl);
    }
  }).listen(port, () => {
    console.log(`> Ready on port ${port}`);
  });
});
