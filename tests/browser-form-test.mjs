/**
 * Browser integration test: company must stay hidden during service selection.
 * Run: node tests/browser-form-test.mjs
 */
import http from 'http';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORM_URL = 'http://localhost/quotebuilder/?page_id=10';

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function parsePhpSteps() {
  const html = await fetchHtml(FORM_URL);
  const steps = [...html.matchAll(/<div class="form-step[^"]*" data-step="(\d+)"[^>]*>/g)];
  for (let i = 0; i < steps.length; i++) {
    const start = steps[i].index;
    const end = i + 1 < steps.length ? steps[i + 1].index : html.indexOf('</form>', start);
    const chunk = html.slice(start, end);
    const ids = [...chunk.matchAll(/data-field-id="([^"]+)"/g)].map((m) => m[1]);
    console.log(`PHP step ${steps[i][1]}: ${ids.join(', ')}`);
  }
}

function isVisible(locator) {
  return locator.evaluate((el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

async function runBrowserTest() {
  console.log('\n=== PHP step layout ===');
  await parsePhpSteps();

  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
  }).catch(() => chromium.launch({ headless: true }));
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for unified steps
  await page.waitForFunction(
    () => window.quotemateUnifiedSteps && document.querySelector('.unified-multi-step-form'),
    { timeout: 10000 }
  ).catch(() => {
    console.log('WARN: quotemateUnifiedSteps not ready within 10s');
  });

  const state = await page.evaluate(() => ({
    hasUnified: !!window.quotemateUnifiedSteps,
    unifiedClass: document.querySelector('.quotemate-frontend-form')?.classList.contains('unified-multi-step-form'),
    currentStep: window.quotemateUnifiedSteps?.currentStep,
    stepsCount: window.quotemateUnifiedSteps?.steps?.length,
    postServiceIds: window.quotemateUnifiedSteps
      ? [...window.quotemateUnifiedSteps.getPostServiceFieldIdSet()]
      : [],
    companyHidden: (() => {
      const g = document.querySelector('.form-group[data-field-id="field_4"]');
      if (!g) return 'missing';
      return g.style.display === 'none' || g.dataset.unifiedHidden === '1' ? 'hidden' : 'visible';
    })(),
  }));

  console.log('\n=== After page load (step 0) ===');
  console.log(JSON.stringify(state, null, 2));

  // Click unified Next to go to service step
  const nextBtn = page.locator('.unified-next-step, .unified-form-navigation .next-step').first();
  if (await nextBtn.count()) {
    await nextBtn.click();
    await page.waitForTimeout(500);
  } else {
    // fallback legacy next
    await page.locator('.next-step').first().click();
    await page.waitForTimeout(500);
  }

  const afterNext = await page.evaluate(() => {
    const company = document.querySelector('.form-group[data-field-id="field_4"]');
    const service = document.querySelector('.form-group[data-field-id="field_1"]');
    const vis = (el) => {
      if (!el) return { exists: false };
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        exists: true,
        display: cs.display,
        unifiedHidden: el.dataset.unifiedHidden,
        hiddenByLogic: el.getAttribute('data-hidden-by-logic'),
        rect: { w: rect.width, h: rect.height },
        visible: cs.display !== 'none' && rect.height > 0,
      };
    };
    return {
      currentStep: window.quotemateUnifiedSteps?.currentStep,
      stepTokens: window.quotemateUnifiedSteps?.steps?.[window.quotemateUnifiedSteps?.currentStep]?.tokens,
      serviceReady: window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.(),
      company: vis(company),
      service: vis(service),
    };
  });

  console.log('\n=== After Next (service step) ===');
  console.log(JSON.stringify(afterNext, null, 2));

  // Partial service selection — company must stay hidden
  const catSelect = page.locator('.category-select, .step-select').first();
  if (await catSelect.count()) {
    await catSelect.selectOption({ index: 1 });
    await page.waitForTimeout(400);
  }

  const companyLoc = page.locator('.form-group[data-field-id="field_4"]');
  const afterSelect = await page.evaluate(() => {
    const company = document.querySelector('.form-group[data-field-id="field_4"]');
    const vis = (el) => {
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      return cs.display !== 'none' && el.getBoundingClientRect().height > 0;
    };
    return {
      serviceReady: window.quotemateUnifiedSteps?.isServiceReadyForPostFields?.(),
      companyVisible: vis(company),
    };
  });

  console.log('\n=== After selecting car 1 (partial service) ===');
  console.log(JSON.stringify(afterSelect, null, 2));

  if (afterSelect.companyVisible) {
    console.log('FAIL: Company visible during partial service selection');
    process.exitCode = 1;
  }

  const companyVisible = await isVisible(companyLoc);

  console.log('\n=== RESULT ===');
  if (companyVisible) {
    console.log('FAIL: Company Name is VISIBLE on service step');
    process.exitCode = 1;
  } else {
    console.log('PASS: Company Name is hidden on service step');
  }

  if (errors.length) {
    console.log('\nPage errors:', errors);
  }

  await browser.close();
}

runBrowserTest().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
