import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();

const consoleLogs = [];
page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (e) => consoleLogs.push({ type: 'pageerror', text: e.message }));

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => window.quotemateUnifiedSteps, { timeout: 10000 });

// Fill name and go to service step
await page.locator('[data-field-id="field_2"] input').fill('Test User');
await page.locator('.unified-next-step').first().click();
await page.waitForFunction(() => window.quotemateUnifiedSteps?.currentStep === 1, { timeout: 5000 });

const before = await page.evaluate(() => ({
  step: window.quotemateUnifiedSteps?.currentStep,
  companyVisible: (() => {
    const g = document.querySelector('.form-group[data-field-id="field_4"]');
    if (!g) return false;
    const cs = getComputedStyle(g);
    return cs.display !== 'none' && g.getBoundingClientRect().height > 0;
  })(),
}));

// Click Next WITHOUT selecting service
let dialogMsg = null;
page.once('dialog', async (d) => {
  dialogMsg = d.message();
  await d.accept();
});

await page.locator('.unified-next-step').first().click();
await page.waitForTimeout(500);

const after = await page.evaluate(() => ({
  step: window.quotemateUnifiedSteps?.currentStep,
  nextVisible: (() => {
    const btn = document.querySelector('.unified-next-step');
    if (!btn) return false;
    return getComputedStyle(btn).display !== 'none';
  })(),
  companyVisible: (() => {
    const g = document.querySelector('.form-group[data-field-id="field_4"]');
    if (!g) return false;
    const cs = getComputedStyle(g);
    return cs.display !== 'none' && g.getBoundingClientRect().height > 0;
  })(),
}));

console.log('Before empty Next:', before);
console.log('Alert shown:', dialogMsg);
console.log('After empty Next:', after);
console.log(
  'Plugin console errors:',
  consoleLogs.filter((l) => l.type === 'pageerror' || (l.type === 'error' && !l.text.includes('chrome-extension')))
);
console.log(
  'Extension noise:',
  consoleLogs.filter((l) => l.text.includes('chrome-extension') || l.text.includes('contentScript'))
);

const ok =
  dialogMsg === 'Please select a service option before proceeding.' &&
  before.step === 1 &&
  after.step === 1 &&
  after.nextVisible &&
  !after.companyVisible;

console.log(ok ? 'PASS: validation blocked empty Next' : 'FAIL: should stay on step 1 with alert');
process.exitCode = ok ? 0 : 1;

await browser.close();
