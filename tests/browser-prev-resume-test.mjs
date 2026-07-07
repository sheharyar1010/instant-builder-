/**
 * Previous → start → re-select service → Next must succeed (no stale validation).
 * Run: node tests/browser-prev-resume-test.mjs
 */
import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

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
        return { action: 'picked' };
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

async function clickPrevUntilStart(page, maxClicks = 25) {
  for (let i = 0; i < maxClicks; i++) {
    const step = await page.evaluate(() => window.quotemateUnifiedSteps?.currentStep ?? -1);
    if (step <= 0) return step;

    const prevVisible = await page.evaluate(() => {
      const btn = document.querySelector('.unified-prev-step');
      return !!btn && getComputedStyle(btn).display !== 'none';
    });
    if (!prevVisible) break;

    await page.locator('.unified-prev-step').click();
    await page.waitForTimeout(400);
  }

  return page.evaluate(() => window.quotemateUnifiedSteps?.currentStep ?? -1);
}

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();

let alertMessage = null;
page.on('dialog', async (dialog) => {
  alertMessage = dialog.message();
  await dialog.dismiss();
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

console.log('\n=== Previous → re-select service flow ===\n');

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => window.quotemateUnifiedSteps);

await page.locator('[data-field-id="field_2"] input').fill('First Pass User');
await page.locator('.unified-next-step').click();
await page.waitForTimeout(400);

const firstServiceOk = await completeServiceSelection(page);
assert(firstServiceOk, 'First service selection completes');

await page.locator('.unified-next-step').click();
await page.waitForTimeout(500);

const afterFirstNext = await page.evaluate(() => ({
  step: window.quotemateUnifiedSteps?.currentStep,
  serviceReady: window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.(),
}));
assert(afterFirstNext.serviceReady, 'Service ready after first pass');

const startStep = await clickPrevUntilStart(page);
assert(startStep === 0, `Returned to step 0 (got ${startStep})`);

await page.locator('[data-field-id="field_2"] input').fill('Second Pass User');
await page.locator('.unified-next-step').click();
await page.waitForTimeout(400);

const secondServiceOk = await completeServiceSelection(page);
assert(secondServiceOk, 'Second service selection completes after rewind');

alertMessage = null;
await page.locator('.unified-next-step').click();
await page.waitForTimeout(600);

assert(
  !alertMessage || !alertMessage.includes('Please select a service option'),
  `Next after re-select does not block on service validation (alert: ${alertMessage || 'none'})`
);

const afterSecondNext = await page.evaluate(() => ({
  step: window.quotemateUnifiedSteps?.currentStep,
  stepCount: window.quotemateUnifiedSteps?.steps?.length,
  serviceReady: window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.(),
  postIndex: window.quotemateUnifiedSteps?.postServiceIndex,
  companyVisible: (() => {
    const g = document.querySelector('[data-field-id="field_4"]');
    return g && getComputedStyle(g).display !== 'none' && g.dataset.unifiedHidden !== '1';
  })(),
  tokens: window.quotemateUnifiedSteps?.steps?.[
    window.quotemateUnifiedSteps?.currentStep
  ]?.tokens?.map((t) => t.type + (t.fieldId ? ':' + t.fieldId : '')),
}));
console.log('After second Next:', afterSecondNext);
assert(
  afterSecondNext.serviceReady && (afterSecondNext.companyVisible || afterSecondNext.step > 1 || afterSecondNext.postIndex > 0),
  'Service stays complete and flow advances after re-select'
);

await browser.close();

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
