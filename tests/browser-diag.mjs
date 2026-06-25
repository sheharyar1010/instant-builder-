import http from 'http';
import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();

const logs = [];
page.on('pageerror', (e) => logs.push({ type: 'pageerror', text: e.message, stack: e.stack }));
page.on('console', (msg) => {
  if (msg.type() === 'error') logs.push({ type: 'console', text: msg.text() });
});

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const html = await page.content();
import fs from 'fs';
fs.writeFileSync('tests/page-from-browser.html', html);

const diag = await page.evaluate(() => ({
  UnifiedFormSteps: typeof window.UnifiedFormSteps,
  quotemateUnifiedSteps: typeof window.quotemateUnifiedSteps,
  quotemateProgressiveSelector: typeof window.quotemateProgressiveSelector,
  quoteMateFormData: !!window.quoteMateFormData?.fields?.length,
  formFieldsCount: window.quoteMateFormData?.fields?.length,
  multiStepBound: document.querySelector('.multi-step-form')?.dataset?.multiStepBound,
  unifiedClass: document.querySelector('.quotemate-frontend-form')?.className,
  scripts: [...document.querySelectorAll('script[src]')]
    .map((s) => s.src)
    .filter((s) => s.includes('instant-builder') || s.includes('quotemate')),
}));

console.log('DIAG:', JSON.stringify(diag, null, 2));
console.log('ERRORS:', JSON.stringify(logs, null, 2));

await browser.close();
