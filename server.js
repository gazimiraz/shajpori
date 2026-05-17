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
    const host = (req.headers.host || '').split(':')[0];

    if (host === 'admin.gazimiraz.com' || host.startsWith('admin.')) {
      adminHandle(req, res, parsedUrl);
    } else {
      webHandle(req, res, parsedUrl);
    }
  }).listen(port, () => {
    console.log(`> Web:   gazimiraz.com -> port ${port}`);
    console.log(`> Admin: admin.gazimiraz.com -> port ${port}`);
  });
});
