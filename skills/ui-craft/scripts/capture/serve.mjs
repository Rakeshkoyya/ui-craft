// Tiny static file server for capture.mjs: local pages are captured over http://127.0.0.1
// so ES modules, fetch(), fonts and View Transitions behave as they do on a real server.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function send(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

// Map a request path to a file inside root, or null when it would escape root.
export function resolveInside(root, rawUrl) {
  let rel;
  try {
    rel = decodeURIComponent(new URL(rawUrl, 'http://x').pathname);
  } catch {
    return null;
  }
  if (rel.includes('\0') || rel.includes('\\')) return null;
  // no parent segments; no dot-files or dot-folders (.git, .env, .ui-craft) either
  if (rel.split('/').some((seg) => seg === '..' || seg.startsWith('.'))) return null;
  const file = path.resolve(root, '.' + rel);
  const inside = file === root || file.startsWith(root + path.sep);
  return inside ? file : null;
}

async function handle(root, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  // raw-path check first: URL() would silently normalise "/../x" to "/x"
  const rawPath = (req.url || '/').split('?')[0];
  if (/(^|[/\\])(\.\.|%2e%2e)([/\\]|%2f|%5c|$)/i.test(rawPath)) return send(res, 403, 'Forbidden');
  let file = resolveInside(root, req.url || '/');
  if (!file) return send(res, 403, 'Forbidden');
  let info = await stat(file).catch(() => null);
  if (info && info.isDirectory()) {
    file = path.join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info || !info.isFile()) return send(res, 404, 'Not found');
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'content-length': info.size, 'cache-control': 'no-store' });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

// Serve rootDir on 127.0.0.1 at a random free port. Returns { origin, close() }.
export async function startStaticServer(rootDir) {
  const root = path.resolve(rootDir);
  const sockets = new Set();
  const server = createServer((req, res) => {
    handle(root, req, res).catch(() => { if (!res.headersSent) send(res, 500, 'Server error'); });
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((resolve) => {
    for (const s of sockets) s.destroy();
    server.close(() => resolve());
  });
  return { origin, close };
}
