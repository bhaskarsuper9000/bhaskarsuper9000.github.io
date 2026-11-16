// Fails the build if the built pages contain things that must never be published (see CLAUDE.md, hard rules).
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const banned = [
  [/\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/, 'phone-like number'],
  [/date of birth|\bDOB\b/i, 'date of birth'],
  [/\b[CG]PA\b|roll (no|number)/i, 'grade or roll number'],
  [/gen ?AI models/i, 'removed Gatik line'],
];

async function* pages(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* pages(p);
    else if (/\.(html|xml|txt)$/.test(e.name)) yield p;
  }
}

let bad = 0;
for await (const file of pages('dist')) {
  const text = (await readFile(file, 'utf8')).replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  for (const [re, what] of banned) {
    const m = text.match(re);
    if (m) { bad++; console.error(`${file}: ${what}: "${m[0]}"`); }
  }
}
if (bad) process.exit(1);
console.log('private-data check passed');
