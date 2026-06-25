import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push({ msg: e.message, stack: e.stack }));

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

const html = await page.content();
fs.writeFileSync(path.join(__dirname, 'page-from-browser.html'), html, 'utf8');

const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
console.log('inline scripts found:', scripts.length);

for (let i = 0; i < scripts.length; i++) {
  const content = scripts[i][1].trim();
  if (!content) continue;
  try {
    new Function(content);
    console.log(`script #${i}: OK (${content.length} chars)`);
  } catch (e) {
    console.log(`script #${i}: SYNTAX ERROR - ${e.message}`);
    const pos = Number(e.message.match(/position (\d+)/)?.[1] || 0);
    if (pos) {
      const ctx = content.slice(Math.max(0, pos - 120), pos + 120);
      console.log('near error:\n', ctx);
    }
    fs.writeFileSync(path.join(__dirname, `broken-script-${i}.js`), content, 'utf8');
  }
}

console.log('page errors:', errors);
await browser.close();
