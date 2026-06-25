/**
 * Unit tests for unified form step planning & post-service page breaks.
 * Run: node tests/unified-form-steps.test.mjs
 */

// --- Static helpers (mirror unified-form-steps.js) ---
const isPageBreak = (item) => item?.type === 'page_break' || item?.type === 'page-break';

const hasPageBreakBefore = (node) => {
  const value = node?.pageBreakBeforeOptions;
  return value === true || value === 1 || value === '1' || value === 'true';
};

const isQueueableFormField = (field) => {
  const skip = ['page_break', 'page-break', 'section_break', 'html'];
  return !!(field?.id && field.type && !skip.includes(field.type));
};

function parseFormLayout(fields) {
  const preServiceFields = [];
  const postServiceFields = [];
  let serviceField = null;
  let seenService = false;
  const skipTypes = ['section_break'];

  for (const field of fields || []) {
    if (isPageBreak(field)) {
      if (!seenService && preServiceFields.length) {
        const last = preServiceFields[preServiceFields.length - 1];
        if (last?.type !== 'page_break') {
          preServiceFields.push({ type: 'page_break', source: 'form' });
        }
      } else if (seenService && postServiceFields.length) {
        postServiceFields[postServiceFields.length - 1].pageBreakAfter = true;
      }
      continue;
    }

    if (skipTypes.includes(field.type)) continue;

    if (field.type === 'service' || field.type === 'service_options') {
      seenService = true;
      serviceField = field;
      continue;
    }

    if (!seenService) {
      preServiceFields.push({ type: 'field', fieldId: field.id, field });
    } else if (isQueueableFormField(field)) {
      postServiceFields.push({
        type: 'field',
        fieldId: field.id,
        field,
        pageBreakAfter: false,
      });
    }
  }

  return { preServiceFields, serviceField, postServiceFields };
}

function collectNextPostServiceFieldGroup(postServiceFields, postServiceIndex) {
  const remaining = postServiceFields.slice(postServiceIndex);
  if (!remaining.length) return [];

  const group = [remaining[0]];
  if (!remaining[0].pageBreakAfter) {
    for (let i = 1; i < remaining.length; i++) {
      group.push(remaining[i]);
      if (remaining[i].pageBreakAfter) break;
    }
  }
  return group;
}

function stepEndsWithPostServicePageBreak(step, postServiceFields, isPostServiceFieldId) {
  if (!step) return false;

  const fieldTokens = step.tokens.filter(
    (t) => t.type === 'field' && isPostServiceFieldId(t.fieldId)
  );
  if (!fieldTokens.length) return false;

  const lastFieldId = fieldTokens[fieldTokens.length - 1].fieldId;
  const lastMeta = postServiceFields.find((f) => f.fieldId === lastFieldId);
  if (lastMeta?.pageBreakAfter) return true;

  for (let i = 0; i < fieldTokens.length - 1; i++) {
    const meta = postServiceFields.find((f) => f.fieldId === fieldTokens[i].fieldId);
    if (meta?.pageBreakAfter) return true;
  }

  return false;
}

// --- Test data (from live form) ---
const FORM_FIELDS = [
  { id: 'field_2', type: 'name', label: 'Full Name' },
  { id: 'field_3', type: 'page_break', label: 'Page Break' },
  {
    id: 'field_1',
    type: 'service',
    label: 'Service Selection',
    enhancedServiceStructure: [
      {
        type: 'category',
        name: 'car 1',
        pageBreakBeforeOptions: true,
        children: [
          {
            type: 'category',
            name: 'model 1',
            pageBreakBeforeOptions: true,
            children: [
              { type: 'category', name: 'type 1', pageBreakBeforeOptions: true, children: [] },
              { type: 'category', name: 'type 2', children: [] },
            ],
          },
        ],
      },
    ],
  },
  { id: 'field_4', type: 'company', label: 'Company Name' },
  { id: 'field_8', type: 'page_break', label: 'Page Break' },
  { id: 'field_9', type: 'address', label: 'Address' },
  { id: 'field_10', type: 'city', label: 'City' },
];

const TYPE1 = { type: 'category', name: 'type 1', pageBreakBeforeOptions: true, children: [] };
const TYPE2 = { type: 'category', name: 'type 2', children: [] };

// --- Assertions ---
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log('\n=== parseFormLayout page breaks ===');
const layout = parseFormLayout(FORM_FIELDS);
assert(layout.postServiceFields.length === 3, '3 post-service fields');
assert(layout.postServiceFields[0].fieldId === 'field_4', 'first post-service is company');
assert(layout.postServiceFields[0].pageBreakAfter === true, 'company has pageBreakAfter');
assert(layout.postServiceFields[1].fieldId === 'field_9', 'second is address');
assert(layout.postServiceFields[1].pageBreakAfter === false, 'address has no pageBreakAfter');
assert(layout.postServiceFields[2].fieldId === 'field_10', 'third is city');

console.log('\n=== collectNextPostServiceFieldGroup ===');
const g0 = collectNextPostServiceFieldGroup(layout.postServiceFields, 0);
assert(g0.length === 1 && g0[0].fieldId === 'field_4', 'group 0 is company only');

const g1 = collectNextPostServiceFieldGroup(layout.postServiceFields, 1);
assert(g1.length === 2, 'group 1 has address + city');
assert(g1[0].fieldId === 'field_9' && g1[1].fieldId === 'field_10', 'group 1 is address and city');

console.log('\n=== service last-selection page break ===');
assert(hasPageBreakBefore(TYPE1) === true, 'type1 has pageBreakBeforeOptions');
assert(hasPageBreakBefore(TYPE2) === false, 'type2 has no pageBreakBeforeOptions');

console.log('\n=== stepEndsWithPostServicePageBreak ===');
const isPost = (id) => layout.postServiceFields.some((f) => f.fieldId === id);

const companyOnlyStep = { tokens: [{ type: 'field', fieldId: 'field_4' }] };
assert(
  stepEndsWithPostServicePageBreak(companyOnlyStep, layout.postServiceFields, isPost),
  'company-only step can advance'
);

const bloatedStep = {
  tokens: [
    { type: 'field', fieldId: 'field_4' },
    { type: 'field', fieldId: 'field_9' },
    { type: 'field', fieldId: 'field_10' },
  ],
};
assert(
  stepEndsWithPostServicePageBreak(bloatedStep, layout.postServiceFields, isPost),
  'bloated step detects company pageBreakAfter (recovery)'
);

const addressCityStep = {
  tokens: [{ type: 'field', fieldId: 'field_9' }, { type: 'field', fieldId: 'field_10' }],
};
assert(
  !stepEndsWithPostServicePageBreak(addressCityStep, layout.postServiceFields, isPost),
  'address+city step is last group (no summary after)'
);

console.log('\n=== form_summary after page break ===');
const FORM_WITH_SUMMARY = [
  ...FORM_FIELDS,
  { id: 'field_11', type: 'page_break', label: 'Page Break' },
  { id: 'field_12', type: 'form_summary', label: 'Quote Summary' },
];
const summaryLayout = parseFormLayout(FORM_WITH_SUMMARY);
assert(summaryLayout.postServiceFields.length === 4, '4 post-service fields including summary');
assert(
  summaryLayout.postServiceFields[2].fieldId === 'field_10' &&
    summaryLayout.postServiceFields[2].pageBreakAfter === true,
  'city has pageBreakAfter before summary'
);
assert(summaryLayout.postServiceFields[3].fieldId === 'field_12', 'form_summary is last in queue');

const addressCityBeforeSummary = {
  tokens: [{ type: 'field', fieldId: 'field_9' }, { type: 'field', fieldId: 'field_10' }],
};
const isPostSummary = (id) => summaryLayout.postServiceFields.some((f) => f.fieldId === id);
assert(
  stepEndsWithPostServicePageBreak(addressCityBeforeSummary, summaryLayout.postServiceFields, isPostSummary),
  'address+city step can advance to form_summary when city has pageBreakAfter'
);

const nextAfterCity = collectNextPostServiceFieldGroup(summaryLayout.postServiceFields, 3);
assert(
  nextAfterCity.length === 1 && nextAfterCity[0].fieldId === 'field_12',
  'next group after city is form_summary'
);

console.log('\n=== DOM-only fields (no page_break markers) ===');
const DOM_ONLY = FORM_FIELDS.filter((f) => f.type !== 'page_break');
const domLayout = parseFormLayout(DOM_ONLY);
assert(domLayout.postServiceFields[0]?.pageBreakAfter !== true, 'DOM-only parse misses company pageBreakAfter');

const fullLayout = parseFormLayout(FORM_FIELDS);
assert(fullLayout.postServiceFields[0]?.pageBreakAfter === true, 'full JSON has company pageBreakAfter');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
