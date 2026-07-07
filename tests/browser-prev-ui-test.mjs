/**
 * Previous → start: progress bar, step indicators, Next must work.
 */
import { chromium } from 'playwright';

const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

function getUiState(page) {
  return page.evaluate(() => {
    const ufs = window.quotemateUnifiedSteps;
    const fill = document.querySelector('.unified-step-progress .progress-fill');
    const indicators = [...document.querySelectorAll('.unified-step-progress .step-indicator')].map(
      (el, i) => ({
        i,
        active: el.classList.contains('active'),
        completed: el.classList.contains('completed'),
        label: el.querySelector('.step-label')?.textContent?.trim(),
        display: getComputedStyle(el).display,
      })
    );
    return {
      currentStep: ufs?.currentStep,
      stepCount: ufs?.steps?.length,
      progressWidth: fill?.style?.width || getComputedStyle(fill).width,
      indicatorCount: indicators.length,
      indicators,
      nextVisible: (() => {
        const b = document.querySelector('.unified-next-step');
        return !!b && getComputedStyle(b).display !== 'none';
      })(),
      nameVisible: (() => {
        const g = document.querySelector('[data-field-id="field_2"]');
        return g && getComputedStyle(g).display !== 'none';
      })(),
      serviceVisible: (() => {
        const g = document.querySelector('[data-field-id="field_1"]');
        return g && getComputedStyle(g).display !== 'none';
      })(),
    };
  });
}

async function completeFullFlow(page) {
  await page.locator('[data-field-id="field_2"] input').fill('Full Flow User');
  await page.locator('.unified-next-step').click();
  await page.waitForTimeout(400);

  for (let i = 0; i < 50; i++) {
    const st = await page.evaluate(() => ({
      summary: (() => {
        const id = window.quotemateUnifiedSteps?.postServiceFields?.find(
          (f) => f.field?.type === 'form_summary'
        )?.fieldId;
        const g = id && document.querySelector(`[data-field-id="${id}"]`);
        return g && getComputedStyle(g).display !== 'none';
      })(),
      step: window.quotemateUnifiedSteps?.currentStep,
    }));
    if (st.summary) return true;

    await page.evaluate(() => {
      const container = document.querySelector('[data-field-id="field_1"]');
      const selects = container
        ? [...container.querySelectorAll('select')].filter((s) => {
            const cs = getComputedStyle(s);
            return cs.display !== 'none' && s.options.length >= 2;
          })
        : [];
      if (selects.length) {
        const sel = selects[selects.length - 1];
        if (!sel.value) {
          sel.value = sel.options[1].value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
      const g4 = document.querySelector('[data-field-id="field_4"] input');
      if (g4 && getComputedStyle(g4.closest('.form-group')).display !== 'none') g4.value = 'Co';
      const g9 = document.querySelector('[data-field-id="field_9"] input');
      if (g9 && getComputedStyle(g9.closest('.form-group')).display !== 'none') g9.value = 'Addr';
      const g10 = document.querySelector('[data-field-id="field_10"] input');
      if (g10 && getComputedStyle(g10.closest('.form-group')).display !== 'none') g10.value = 'City';
    });

    const next = page.locator('.unified-next-step');
    if (await next.isVisible()) {
      await next.click();
      await page.waitForTimeout(450);
    } else {
      await page.waitForTimeout(200);
    }
  }
  return false;
}

const browser = await chromium.launch({ headless: true, channel: 'msedge' }).catch(() =>
  chromium.launch({ headless: true })
);
const page = await browser.newPage();

await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForFunction(() => window.quotemateUnifiedSteps);

const full = await completeFullFlow(page);
console.log('Full flow reached summary:', full);

for (let i = 0; i < 30; i++) {
  const st = await getUiState(page);
  if (st.currentStep <= 0) break;
  const prev = page.locator('.unified-prev-step');
  if (!(await prev.isVisible())) break;
  await prev.click();
  await page.waitForTimeout(350);
}

const atStart = await getUiState(page);
console.log('\nAt start after prev:', JSON.stringify(atStart, null, 2));

const expectedProgress = ((atStart.currentStep + 1) / Math.max(atStart.stepCount, 1)) * 100;
const actualProgress = parseFloat(atStart.progressWidth);
console.log('Expected progress %:', expectedProgress, 'Actual:', actualProgress);

let failed = 0;
const assert = (c, m) => {
  console.log(c ? `✓ ${m}` : `✗ ${m}`);
  if (!c) failed++;
};

assert(atStart.currentStep === 0, `currentStep is 0 (got ${atStart.currentStep})`);
assert(atStart.nameVisible, 'Name field visible at start');
assert(
  Math.abs(actualProgress - expectedProgress) < 2,
  `Progress bar matches step (${actualProgress}% vs expected ${expectedProgress}%)`
);
assert(
  atStart.indicatorCount === atStart.stepCount,
  `Indicator count matches steps (${atStart.indicatorCount} vs ${atStart.stepCount})`
);

await page.locator('[data-field-id="field_2"] input').fill('Restart User');
const beforeNext = await getUiState(page);
await page.locator('.unified-next-step').click();
await page.waitForTimeout(500);
const afterNext = await getUiState(page);
console.log('\nAfter Next from start:', JSON.stringify(afterNext, null, 2));

assert(afterNext.currentStep > beforeNext.currentStep, 'Next advances from step 0');
assert(afterNext.serviceVisible, 'Service step visible after Next');

// Re-select service after prev-to-start journey
const secondServiceOk = await (async () => {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.())) {
      return true;
    }
    await page.evaluate(() => {
      const container = document.querySelector('[data-field-id="field_1"]');
      const selects = container
        ? [...container.querySelectorAll('select')].filter((s) => {
            const cs = getComputedStyle(s);
            return cs.display !== 'none' && s.options.length >= 2;
          })
        : [];
      if (selects.length) {
        const sel = selects[selects.length - 1];
        if (!sel.value || sel.value !== sel.options[1].value) {
          sel.value = sel.options[1].value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    });
    const next = page.locator('.unified-next-step');
    if (await next.isVisible()) {
      await next.click();
      await page.waitForTimeout(400);
    } else {
      await page.waitForTimeout(200);
    }
  }
  return page.evaluate(() => window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.());
})();

assert(secondServiceOk, 'Service completes on second pass from start');

let alertMsg = null;
page.on('dialog', async (d) => {
  alertMsg = d.message();
  await d.dismiss();
});
await page.locator('.unified-next-step').click();
await page.waitForTimeout(500);
assert(!alertMsg?.includes('Please select a service option'), 'Next works after re-select');

const afterServiceNext = await getUiState(page);
assert(
  afterServiceNext.companyVisible || afterServiceNext.currentStep > afterNext.currentStep,
  'Advances past service on second pass'
);

await browser.close();
process.exit(failed > 0 ? 1 : 0);
