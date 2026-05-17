const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT, 10) || 3000;

const webApp = next({ dev: false, dir: path.join(__dirname, 'apps/web') });
const adminApp = next({ dev: false, dir: path.join(__dirname, 'apps/admin') });

const webHandle = webApp.getRequestHandler();
const adminHandle = adminApp.getRequestHandler();

Promise.all([webApp.prepare(), adminApp.prepare()]).then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname || '';

    // Route /admin/* to admin app (basePath handles the prefix)
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      adminHandle(req, res, parsedUrl);
    } else {
      webHandle(req, res, parsedUrl);
    }
  }).listen(port, () => {
    console.log(`> Web:   gazimiraz.com`);
    console.log(`> Admin: gazimiraz.com/admin`);
  });
});
