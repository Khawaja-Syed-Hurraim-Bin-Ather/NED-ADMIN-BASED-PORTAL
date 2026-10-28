const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const rootTarget = path.resolve(root, relative);
  const publicTarget = path.resolve(root, 'public', relative);
  const absolute = fs.existsSync(rootTarget) ? rootTarget : publicTarget;
  return absolute.startsWith(root) ? absolute : null;
}

const server = http.createServer((req, res) => {
  const requestPath = req.url || '/';
  let target = safePath(requestPath);
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad request');
  }

  if (requestPath === '/dashboard' || requestPath === '/dashboard/') target = path.join(root, 'index.html');
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    if (!path.extname(target)) target = path.join(root, 'index.html');
  }

  fs.readFile(target, (error, data) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
    const extension = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' || extension === '.json' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`EduCompass preview listening on http://0.0.0.0:${port}`);
});
