/**
 * User flow: first options → prev → second options → SUMMARY → prev to start → Next
 */
import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

async function clickNextIfVisible(page) {
  const visible = await page.evaluate(() => {
    const btn = document.querySelector('.unified-next-step');
    return !!btn && getComputedStyle(btn).display !== 'none';
  });
  if (visible) {
    await page.locator('.unified-next-step').click();
    await page.waitForTimeout(450);
    return true;
  }
  return false;
}

async function selectDeepestOption(page, optionIndex) {
  return page.evaluate((optIdx) => {
    const container = document.querySelector('[data-field-id="field_1"]');
    if (!container) return null;
    const selects = [...container.querySelectorAll('select')].filter((sel) => {
      const cs = getComputedStyle(sel);
      return cs.display !== 'none' && sel.getBoundingClientRect().height > 0 && sel.options.length > 1;
    });
    if (!selects.length) return null;
    const sel = selects[selects.length - 1];
    const idx = Math.min(optIdx + 1, sel.options.length - 1);
    const target = sel.options[idx];
    if (!target?.value) return null;
    if (sel.value === target.value) return { same: true, text: target.text };
    sel.value = target.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { picked: true, text: target.text?.trim() };
  }, optionIndex);
}

async function walkServicePath(page, optionIndex, maxIter = 60) {
  for (let i = 0; i < maxIter; i++) {
    const ready = await page.evaluate(
      () => window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.() === true
    );
    if (ready) return 'ready';

    const pick = await selectDeepestOption(page, optionIndex);
    if (pick?.picked) {
      await page.waitForTimeout(400);
      continue;
    }
    if (pick?.same) {
      await clickNextIfVisible(page);
      continue;
    }
    await clickNextIfVisible(page);
    await page.waitForTimeout(200);
  }
  return 'timeout';
}

async function fillPostFieldsAndAdvance(page, max = 30) {
  for (let i = 0; i < max; i++) {
    const st = await page.evaluate(() => {
      const ufs = window.quotemateUnifiedSteps;
      const summaryId = ufs?.postServiceFields?.find((f) => f.field?.type === 'form_summary')?.fieldId;
      const summaryG = summaryId && document.querySelector(`[data-field-id="${summaryId}"]`);
      return {
        summary: summaryG && getComputedStyle(summaryG).display !== 'none',
        step: ufs?.currentStep,
        company: (() => {
          const g = document.querySelector('[data-field-id="field_4"]');
          return g && getComputedStyle(g).display !== 'none';
        })(),
      };
    });
    if (st.summary) return true;

    if (st.company) {
      await page.locator('[data-field-id="field_4"] input').fill('Acme');
    }
    const addr = page.locator('[data-field-id="field_9"] input');
    if (await addr.isVisible()) await addr.fill('123 St');
    const city = page.locator('[data-field-id="field_10"] input');
    if (await city.isVisible()) await city.fill('Karachi');

    await clickNextIfVisible(page);
  }
  return page.evaluate(() => {
    const id = window.quotemateUnifiedSteps?.postServiceFields?.find(
      (f) => f.field?.type === 'form_summary'
    )?.fieldId;
    const g = id && document.querySelector(`[data-field-id="${id}"]`);
    return g && getComputedStyle(g).display !== 'none';
  });
}

async function prevToStart(page) {
  for (let i = 0; i < 50; i++) {
    const step = await page.evaluate(() => window.quotemateUnifiedSteps?.currentStep ?? -1);
    if (step <= 0) return step;
    const prev = page.locator('.unified-prev-step');
    if (!(await prev.isVisible())) break;
    await prev.click();
    await page.waitForTimeout(400);
  }
  return page.evaluate(() => window.quotemateUnifiedSteps?.currentStep ?? -1);
}

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();
const alerts = [];
page.on('dialog', async (d) => {
  alerts.push(d.message());
  await d.dismiss();
});

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => window.quotemateUnifiedSteps);

await page.locator('[data-field-id="field_2"] input').fill('User');
await clickNextIfVisible(page);

console.log('1) First options in all dropdowns...');
await walkServicePath(page, 0);
console.log('   service ready:', await page.evaluate(() => window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.()));

console.log('2) Previous once (back from service path)...');
await page.locator('.unified-prev-step').click();
await page.waitForTimeout(500);

// If landed on name step, advance to service before re-selecting
const onName = await page.evaluate(() => {
  const g = document.querySelector('[data-field-id="field_2"]');
  return g && getComputedStyle(g).display !== 'none';
});
if (onName) {
  await page.locator('.unified-next-step').click();
  await page.waitForTimeout(400);
}

console.log('3) Second options → summary...');
await walkServicePath(page, 1);
await clickNextIfVisible(page);
const summaryOk = await fillPostFieldsAndAdvance(page);
console.log('   summary reached:', summaryOk);

console.log('4) Previous to start...');
const start = await prevToStart(page);
const atStart = await page.evaluate(() => ({
  step: window.quotemateUnifiedSteps?.currentStep,
  stepCount: window.quotemateUnifiedSteps?.steps?.length,
  indicators: document.querySelectorAll('.unified-step-progress .step-indicator').length,
  progress: document.querySelector('.unified-step-progress .progress-fill')?.style?.width,
  nameVis: (() => {
    const g = document.querySelector('[data-field-id="field_2"]');
    return g && getComputedStyle(g).display !== 'none';
  })(),
  serviceVis: (() => {
    const g = document.querySelector('[data-field-id="field_1"]');
    return g && getComputedStyle(g).display !== 'none';
  })(),
  postIndex: window.quotemateUnifiedSteps?.postServiceIndex,
  serviceReady: window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.(),
}));
console.log('   at start:', atStart);

console.log('5) Click Next...');
alerts.length = 0;
await page.locator('.unified-next-step').click();
await page.waitForTimeout(600);

const after = await page.evaluate(() => ({
  step: window.quotemateUnifiedSteps?.currentStep,
  stepCount: window.quotemateUnifiedSteps?.steps?.length,
  nameVis: (() => {
    const g = document.querySelector('[data-field-id="field_2"]');
    return g && getComputedStyle(g).display !== 'none';
  })(),
  serviceVis: (() => {
    const g = document.querySelector('[data-field-id="field_1"]');
    return g && getComputedStyle(g).display !== 'none';
  })(),
  indicators: document.querySelectorAll('.unified-step-progress .step-indicator').length,
  serviceReady: window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.(),
  containerComplete: document.querySelector('.progressive-service-selector')?.classList.contains('complete'),
}));
console.log('   after Next:', after, 'alerts:', alerts);

let failed = 0;
const ok = (c, m) => {
  console.log(c ? `✓ ${m}` : `✗ ${m}`);
  if (!c) failed++;
};

ok(start === 0, 'At step 0');
ok(atStart.indicators === atStart.stepCount, `Indicators match steps (${atStart.indicators}/${atStart.stepCount})`);
ok(after.step === 1, `Advanced to step 1 (got ${after.step})`);
ok(after.serviceVis, 'Service visible after Next from start');
ok(!after.serviceReady, 'Service selection reset (not stale-ready)');
ok(!alerts.some((a) => a.includes('Please select a service option')), 'No false service validation alert');

await browser.close();
process.exit(failed > 0 ? 1 : 0);
