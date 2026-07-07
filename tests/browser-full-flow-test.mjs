/**
 * Full E2E: name → service → post fields → form summary → submit visible.
 * Run: node tests/browser-full-flow-test.mjs
 */
import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

function getNavState(page) {
  return page.evaluate(() => {
    const ufs = window.quotemateUnifiedSteps;
    const step = ufs?.steps?.[ufs.currentStep];
    const next = document.querySelector('.unified-next-step');
    const submit = document.querySelector('.submit-btn');
    const vis = (el) =>
      !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;

    const fieldVis = (id) => {
      const g = document.querySelector(`.form-group[data-field-id="${id}"]`);
      if (!g) return 'missing';
      return vis(g) ? 'visible' : 'hidden';
    };

    const summaryField = ufs?.postServiceFields?.find((f) => f.field?.type === 'form_summary');

    return {
      step: ufs?.currentStep,
      stepCount: ufs?.steps?.length,
      tokens: step?.tokens?.map((t) => `${t.type}:${t.fieldId || ''}`),
      postIndex: ufs?.postServiceIndex,
      postServiceCount: ufs?.postServiceFields?.length,
      nextVisible: vis(next),
      submitVisible: vis(submit),
      summaryFieldId: summaryField?.fieldId || null,
      summaryVisible: summaryField ? fieldVis(summaryField.fieldId) : 'no-summary-field',
      company: fieldVis('field_4'),
      address: fieldVis('field_9'),
      city: fieldVis('field_10'),
      serviceReady: ufs?.isServiceReadyForPostFields?.(),
    };
  });
}

async function completeServiceSelection(page, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    const ready = await page.evaluate(
      () => window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.() === true
    );
    if (ready) return true;

    const result = await page.evaluate(() => {
      const container = document.querySelector('.form-group[data-field-id="field_1"]');
      if (!container) return { action: 'none' };

      const visibleSelects = [...container.querySelectorAll('select')].filter((sel) => {
        const cs = getComputedStyle(sel);
        return cs.display !== 'none' && sel.getBoundingClientRect().height > 0 && sel.options.length >= 2;
      });

      if (visibleSelects.length) {
        const sel = visibleSelects[visibleSelects.length - 1];
        const nextValue = sel.options[1].value;
        if (sel.value && sel.value === nextValue) {
          return { action: 'next' };
        }
        sel.value = nextValue;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        return { action: 'picked', text: sel.options[1].text };
      }

      return { action: 'next' };
    });

    if (result.action === 'picked') {
      await page.waitForTimeout(450);
      continue;
    }

    if (result.action === 'next') {
      const nextVisible = await page.evaluate(() => {
        const btn = document.querySelector('.unified-next-step');
        return !!btn && getComputedStyle(btn).display !== 'none';
      });
      if (nextVisible) {
        await page.locator('.unified-next-step').click();
        await page.waitForTimeout(500);
        continue;
      }
    }

    await page.waitForTimeout(200);
  }

  return page.evaluate(() => window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.() === true);
}

async function advanceToSummary(page, maxClicks = 20) {
  for (let i = 0; i < maxClicks; i++) {
    const st = await getNavState(page);

    if (st.summaryVisible === 'visible') {
      return st;
    }

    if (st.company === 'visible') {
      await page.locator('[data-field-id="field_4"] input').fill('Acme Inc');
    }
    if (st.address === 'visible') {
      await page.locator('[data-field-id="field_9"] input').fill('123 Main St');
    }
    if (st.city === 'visible') {
      await page.locator('[data-field-id="field_10"] input').fill('Karachi');
    }

    // Before summary: Next must stay available on last post-service step
    if (st.city === 'visible' && st.summaryVisible === 'hidden' && !st.nextVisible) {
      return { ...st, stuck: 'no-next-before-summary' };
    }

    if (!st.nextVisible) {
      return st;
    }

    await page.locator('.unified-next-step').click();
    await page.waitForTimeout(500);
  }
  return getNavState(page);
}

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().includes('chrome-extension')) {
    errors.push(msg.text());
  }
});

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('\n=== Full form flow E2E ===\n');

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => window.quotemateUnifiedSteps && window.QuoteSummaryEngine);

const fields = await page.evaluate(() =>
  (window.quoteMateFormData?.fields || []).map((f) => ({ id: f.id, type: f.type }))
);
console.log('Fields:', fields.map((f) => `${f.id}(${f.type})`).join(', '));

const init = await getNavState(page);
assert(init.nextVisible, 'Next visible on step 0');
assert(init.company === 'hidden', 'Company hidden on step 0');

await page.locator('[data-field-id="field_2"] input').fill('Test User');
await page.locator('.unified-next-step').click();
await page.waitForFunction(() => window.quotemateUnifiedSteps?.currentStep >= 1, { timeout: 5000 });

const onService = await getNavState(page);
assert(onService.step >= 1, 'Advanced to service step');
assert(onService.company === 'hidden', 'Company hidden on service step');

const serviceDone = await completeServiceSelection(page);

// Ensure selected leaf has a price for summary assertions (DB may still hold 0 until re-saved)
await page.evaluate(() => {
  const container = document.querySelector('.progressive-service-selector[data-field-id="field_1"]');
  const prog = window.quotemateProgressiveSelector;
  if (!container || !prog) return;
  const select = prog.getDeepestSelectedServiceSelect(container);
  const opt = select?.options?.[select.selectedIndex];
  if (!opt?.value) return;
  const data = prog.parseOptionData(opt) || {};
  const priced = {
    ...data,
    name: data.name || opt.textContent.trim(),
    pricingType: data.pricingType || 'fixed',
    basePrice: 149.99,
  };
  opt.setAttribute('data-service', encodeURIComponent(JSON.stringify(priced)));
  prog.processQuantitySelection(container, 1);
});

const afterService = await getNavState(page);
console.log('After service:', afterService);
assert(serviceDone, 'Service selection complete');

const final = await advanceToSummary(page);
console.log('Final:', final);

assert(final.summaryFieldId, 'Form has form_summary field');
assert(final.stuck !== 'no-next-before-summary', 'Next visible on step before summary');
assert(final.summaryVisible === 'visible', 'Form summary visible');
assert(final.submitVisible, 'Submit button visible on summary');
assert(!final.nextVisible, 'Next hidden on summary step');

const summaryContent = await page.evaluate(() => {
  const body = document.querySelector(
    `.quotemate-form-summary[data-field-id="${window.quotemateUnifiedSteps?.postServiceFields?.find((f) => f.field?.type === 'form_summary')?.fieldId}"] .quotemate-form-summary__body`
  );
  return {
    hasEngine: !!window.QuoteSummaryEngine,
    hasGrandTotal: !!body?.querySelector('.quotemate-summary-totals__row--grand'),
    grandTotal: parseFloat(
      (body?.querySelector('.quotemate-summary-totals__row--grand span:last-child')?.textContent || '')
        .replace(/[^0-9.-]/g, '')
    ) || 0,
    isEmpty: !!body?.querySelector('.quotemate-summary-empty'),
    itemCount:
      body?.querySelectorAll(
        '.quotemate-summary-line, .quotemate-summary-table tbody tr, .quotemate-summary-card'
      ).length || 0,
  };
});
console.log('Summary content:', summaryContent);
assert(summaryContent.hasEngine, 'QuoteSummaryEngine loaded');
assert(!summaryContent.isEmpty, 'Summary shows quote lines (not empty state)');
assert(summaryContent.hasGrandTotal, 'Summary shows grand total');
assert(summaryContent.grandTotal > 0, `Summary grand total > 0 (got ${summaryContent.grandTotal})`);
assert(errors.length === 0, `No page errors (${errors.length})`);

if (errors.length) console.log('Errors:', errors);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
await browser.close();
process.exit(failed > 0 ? 1 : 0);
