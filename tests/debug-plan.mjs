import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.join(__dirname, 'form3-fields.json'), 'utf8').replace(/^\uFEFF/, '');
const fields = JSON.parse(raw);

// load unified-form-steps by eval - instead duplicate key check via importing
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Inline minimal build from test + read actual file for buildStepPlan
const vm = await import('vm');
const code = fs.readFileSync(path.join(__dirname, '../public/js/unified-form-steps.js'), 'utf8');
const sandbox = { window: {}, document: { querySelector: () => null, querySelectorAll: () => [] } };
vm.runInNewContext(code, sandbox);
const UFS = sandbox.window.UnifiedFormSteps;

const plan = UFS.buildStepPlan(fields);
console.log('steps:', plan.steps.length);
console.log('postService:', plan.postServiceFields.map(f => f.fieldId));
plan.steps.forEach((s, i) => {
  console.log(`step ${i}:`, s.tokens.map(t => `${t.type}${t.fieldId ? ':' + t.fieldId : ''}`).join(', '));
});

const hasServiceStep = plan.steps.some((step) =>
  step.tokens.some((token) => token.type === 'service_categories')
);
console.log('hasServiceStep:', hasServiceStep);
console.log('would skip unified:', plan.steps.length <= 1 && !plan.postServiceFields?.length);
