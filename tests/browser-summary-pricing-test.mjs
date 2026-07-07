/**
 * Summary must show non-zero prices when service selection has basePrice.
 * Run: node tests/browser-summary-pricing-test.mjs
 */
import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

async function advanceToSummary(page) {
  for (let i = 0; i < 20; i++) {
    const onSummary = await page.evaluate(() => {
      const g = document.querySelector('.form-group[data-field-id="field_11"]');
      return g && getComputedStyle(g).display !== 'none' && g.getBoundingClientRect().height > 0;
    });
    if (onSummary) return true;
    const next = page.locator('.unified-next-step');
    if (await next.isVisible()) {
      await next.click();
      await page.waitForTimeout(500);
    } else break;
  }
  return false;
}

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();
await page.goto(FORM_URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.quotemateUnifiedSteps && window.QuoteSummaryEngine);

await page.locator('[data-field-id="field_2"] input').fill('Test');
await page.locator('.unified-next-step').click();
await page.waitForTimeout(500);

// Select car 2 -> model 4 with explicit priced option data
const setup = await page.evaluate(() => {
  const pricedService = {
    type: 'service',
    name: 'model 4',
    pricingType: 'fixed',
    basePrice: 149.99,
    children: [],
  };

  const cat = document.querySelector('.form-group[data-field-id="field_1"] .category-select');
  const car2 = [...cat.options].find((o) => o.textContent.includes('car 2'));
  if (!car2) return { ok: false, reason: 'car 2 missing' };
  cat.value = car2.value;
  cat.dispatchEvent(new Event('change', { bubbles: true }));

  return { ok: true };
});
if (!setup.ok) {
  console.error('Setup failed:', setup);
  process.exit(1);
}
await page.waitForTimeout(600);

await page.locator('.unified-next-step').click();
await page.waitForFunction(() => {
  const container = document.querySelector('.progressive-service-selector[data-field-id="field_1"]');
  if (!container) return false;
  return [...container.querySelectorAll('select.service-select')].some((s) => {
    const cs = getComputedStyle(s);
    return cs.display !== 'none' && s.getBoundingClientRect().height > 0 && s.options.length > 1;
  });
}, { timeout: 5000 });

const selected = await page.evaluate(() => {
  const pricedService = {
    type: 'service',
    name: 'model 4',
    pricingType: 'fixed',
    basePrice: 149.99,
    children: [],
  };
  const container = document.querySelector('.progressive-service-selector[data-field-id="field_1"]');
  const selects = [...container.querySelectorAll('select.service-select')].filter((s) => {
    const cs = getComputedStyle(s);
    return cs.display !== 'none' && s.getBoundingClientRect().height > 0;
  });
  const select = selects[selects.length - 1] || container.querySelector('select.service-select');
  if (!select || select.options.length < 2) return { ok: false, reason: 'no service select' };

  const opt = [...select.options].find((o) => o.textContent.includes('model 4')) || select.options[1];
  opt.setAttribute('data-service', encodeURIComponent(JSON.stringify(pricedService)));
  select.value = opt.value;
  select.dispatchEvent(new Event('change', { bubbles: true }));

  const prog = window.quotemateProgressiveSelector;
  prog.processQuantitySelection(container, 1);

  return {
    ok: true,
    resolved: prog.resolvePricedSelection(container),
    hiddenPrice: container.querySelector('.final-price-value')?.value,
    ready: window.quotemateUnifiedSteps.isServiceReadyForPostFields(),
  };
});
console.log('After priced selection:', selected);

await advanceToSummary(page);

const summary = await page.evaluate(() => {
  window.QuoteSummaryEngine.renderForField('field_11');
  const settings = window.QuoteSummaryEngine.normalizeSettings({ id: 'field_11', type: 'form_summary' });
  const items = window.QuoteSummaryEngine.collectAllLineItems(document.querySelector('form'), settings);
  const totals = window.QuoteSummaryEngine.calculateTotals(items, settings);
  return { items, totals };
});

console.log('Summary:', JSON.stringify(summary, null, 2));

const ok = summary.totals?.total === 149.99 && summary.items?.[0]?.lineTotal === 149.99;
console.log(ok ? 'PASS: summary shows $149.99' : 'FAIL: expected $149.99 total');
await browser.close();
process.exit(ok ? 0 : 1);
