// Renders /resume/classic/ from the built site (dist/) to public/resume.pdf with headless Chromium.
// Usage: npm run resume:pdf   (builds first), then `npm run build` again to ship the new PDF.
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { copyFileSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'public', 'resume.pdf');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };

const chrome = [process.env.CHROMIUM, 'chromium', 'google-chrome', 'chrome'].filter(Boolean).find((c) => spawnSync(c, ['--version']).status === 0);
if (!chrome) throw new Error('No Chromium found. Set CHROMIUM=/path/to/chromium.');
if (!existsSync(dist)) throw new Error('dist/ is missing. Run `npm run build` first.');

const server = createServer((req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (p.endsWith('/')) p += 'index.html';
  const file = join(dist, p);
  if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/resume/classic/`;

mkdirSync(dirname(out), { recursive: true });
// async spawn: the in-process server must keep serving while Chromium loads the page
const code = await new Promise((done) => spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'resume-pdf-'))}`, '--no-pdf-header-footer', '--virtual-time-budget=3000', `--print-to-pdf=${out}`, url], { stdio: 'ignore' }).on('exit', done));
server.close();
if (code !== 0 || !existsSync(out)) throw new Error('PDF generation failed');
copyFileSync(out, join(dist, 'resume.pdf'));
console.log(`wrote ${out}`);
