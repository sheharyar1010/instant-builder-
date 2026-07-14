/**
 * Shared design CSS variable builder — mirrors PHP DesignHelper for admin preview.
 */
import { getFieldStyleVars } from '../../../../shared/field-style-vars.js';

export { getFieldStyleVars };

const FONT_FAMILIES = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  times: '"Times New Roman", Times, serif',
};

const WIDTH_MAP = {
  full: '100%',
  container: '1248px',
  narrow: '600px',
};

const LIGHT_HEADER_THEMES = ['sidebar', 'numbered', 'modern', 'minimal'];

export const THEME_PRESETS = {
  classic: {
    themeId: 'classic',
    headerStyle: 'gradient',
    headerColor: '#667eea',
    headerColorEnd: '#764ba2',
    buttonStyle: 'gradient',
    buttonColor: '#667eea',
    buttonColorEnd: '#764ba2',
    formBgColor: '#ffffff',
    labelColor: '#495057',
    borderColor: '#ced4da',
    focusColor: '#667eea',
    formBorderColor: '#e5e7eb',
    formBorderWidth: 0,
    formBorderRadius: 12,
  },
  sidebar: {
    themeId: 'sidebar',
    headerStyle: 'solid',
    headerColor: '#ffffff',
    headerColorEnd: '#ffffff',
    buttonStyle: 'solid',
    buttonColor: '#e53935',
    buttonColorEnd: '#c62828',
    formBgColor: '#f5f5f5',
    labelColor: '#333333',
    borderColor: '#dee2e6',
    focusColor: '#e53935',
    formBorderColor: '#e5e7eb',
    formBorderWidth: 0,
    formBorderRadius: 12,
  },
  numbered: {
    themeId: 'numbered',
    headerStyle: 'solid',
    headerColor: '#ffffff',
    headerColorEnd: '#ffffff',
    buttonStyle: 'solid',
    buttonColor: '#ff6b35',
    buttonColorEnd: '#e55a2b',
    formBgColor: '#ffffff',
    labelColor: '#1a1a1a',
    borderColor: '#d1d5db',
    focusColor: '#ff6b35',
    formBorderColor: '#e5e7eb',
    formBorderWidth: 0,
    formBorderRadius: 8,
  },
  modern: {
    themeId: 'modern',
    headerStyle: 'solid',
    headerColor: '#ffffff',
    headerColorEnd: '#ffffff',
    buttonStyle: 'solid',
    buttonColor: '#2563eb',
    buttonColorEnd: '#1d4ed8',
    formBgColor: '#f8fafc',
    labelColor: '#1e293b',
    borderColor: '#cbd5e1',
    focusColor: '#2563eb',
    formBorderColor: '#e2e8f0',
    formBorderWidth: 0,
    formBorderRadius: 12,
  },
  minimal: {
    themeId: 'minimal',
    headerStyle: 'solid',
    headerColor: '#ffffff',
    headerColorEnd: '#ffffff',
    buttonStyle: 'solid',
    buttonColor: '#f5c518',
    buttonColorEnd: '#e6b800',
    formBgColor: '#fafafa',
    labelColor: '#1a1a1a',
    borderColor: '#d4d4d4',
    focusColor: '#f5c518',
    formBorderColor: '#e5e5e5',
    formBorderWidth: 1,
    formBorderRadius: 8,
  },
};

export const DESIGN_DEFAULTS = {
  themeId: 'classic',
  ...THEME_PRESETS.classic,
  fontFamily: 'system',
  fontSize: 16,
  formWidth: 'container',
  fieldSpacing: 1.5,
  secondaryBtnBg: '#faf8f4',
  secondaryBtnHover: '#f0ebe3',
  secondaryBtnText: '#1a1a1a',
  secondaryBtnBorder: '#e8e4dc',
};

export function darkenHex(hex, amount = 0.22) {
  let value = (hex || '#000000').replace('#', '');
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  const factor = Math.max(0, Math.min(1, 1 - amount));
  const r = Math.round(parseInt(value.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(value.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(value.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgba(hex, alpha = 0.25) {
  let value = (hex || '#000000').replace('#', '');
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildBackground(style, color, colorEnd) {
  if (style === 'solid') {
    return color;
  }
  return `linear-gradient(135deg, ${color} 0%, ${colorEnd} 100%)`;
}

export function buildProgressFill(style, color, colorEnd) {
  if (style === 'solid') {
    return color;
  }
  return `linear-gradient(90deg, ${color} 0%, ${colorEnd} 100%)`;
}

function resolveHeaderText(design) {
  if (design.headerText) {
    return design.headerText;
  }
  if (LIGHT_HEADER_THEMES.includes(design.themeId || '')) {
    return '#1a1a1a';
  }
  return '#ffffff';
}

export function resolveDesign(design = {}) {
  const themeId = design.themeId || DESIGN_DEFAULTS.themeId;
  const themePreset = THEME_PRESETS[themeId] || THEME_PRESETS.classic;
  const d = { ...DESIGN_DEFAULTS, ...themePreset, ...design, themeId };
  const headerEnd = d.headerColorEnd || darkenHex(d.headerColor);
  const buttonEnd = d.buttonColorEnd || darkenHex(d.buttonColor);

  return {
    ...d,
    headerColorEnd: headerEnd,
    buttonColorEnd: buttonEnd,
    headerBg: buildBackground(d.headerStyle, d.headerColor, headerEnd),
    buttonBg: buildBackground(d.buttonStyle, d.buttonColor, buttonEnd),
    progressFillBg: buildProgressFill(d.buttonStyle, d.buttonColor, buttonEnd),
    fontFamilyStack: FONT_FAMILIES[d.fontFamily] || FONT_FAMILIES.system,
    formMaxWidth: WIDTH_MAP[d.formWidth] || WIDTH_MAP.container,
    headerText: resolveHeaderText(d),
  };
}

export function buildDesignCssVars(design = {}) {
  const d = resolveDesign(design);

  return {
    '--qm-form-bg': d.formBgColor,
    '--qm-header-bg': d.headerBg,
    '--qm-header-color': d.headerColor,
    '--qm-header-color-end': d.headerColorEnd,
    '--qm-header-text': d.headerText,
    '--qm-label-color': d.labelColor,
    '--qm-button-bg': d.buttonBg,
    '--qm-button-color': d.buttonColor,
    '--qm-button-color-end': d.buttonColorEnd,
    '--qm-button-text': '#ffffff',
    '--qm-border-color': d.borderColor,
    '--qm-form-border-color': d.formBorderColor,
    '--qm-form-border-width': `${d.formBorderWidth}px`,
    '--qm-form-border-radius': `${d.formBorderRadius}px`,
    '--qm-focus-color': d.focusColor,
    '--qm-accent-color': d.buttonColor,
    '--qm-progress-track': '#e9ecef',
    '--qm-progress-fill-bg': d.progressFillBg,
    '--qm-text-color': '#333333',
    '--qm-text-muted': '#6c757d',
    '--qm-secondary-btn-bg': d.secondaryBtnBg ?? '#faf8f4',
    '--qm-secondary-btn-hover': d.secondaryBtnHover ?? '#f0ebe3',
    '--qm-secondary-btn-text': d.secondaryBtnText ?? '#1a1a1a',
    '--qm-secondary-btn-border': d.secondaryBtnBorder ?? '#e8e4dc',
    '--qm-card-bg': '#ffffff',
    '--qm-font-family': d.fontFamilyStack,
    '--qm-font-size': `${d.fontSize}px`,
    '--qm-field-spacing': `${d.fieldSpacing}rem`,
    '--qm-form-max-width': d.formMaxWidth,
    '--qm-focus-ring': hexToRgba(d.focusColor, 0.25),
    '--qm-accent-shadow': hexToRgba(d.buttonColor, 0.3),
    '--qm-accent-shadow-hover': hexToRgba(d.buttonColor, 0.4),
    '--qm-step-shadow': hexToRgba(d.buttonColor, 0.4),
  };
}

export function applyDesignCssVars(target, design = {}) {
  if (!target) return;
  const vars = buildDesignCssVars(design);
  Object.entries(vars).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}

export const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

export function resolveHeadingLevel(level) {
  return HEADING_LEVELS.includes(level) ? level : 'h2';
}

export const HEADING_ALIGNMENTS = ['left', 'center', 'right'];

export function resolveHeadingAlign(align) {
  const value = String(align || 'center').toLowerCase();
  return HEADING_ALIGNMENTS.includes(value) ? value : 'center';
}

export function getHeadingAlignClass(align) {
  return `quotemate-form-heading--align-${resolveHeadingAlign(align)} quotemate-form-field__heading--align-${resolveHeadingAlign(align)}`;
}

export function resolvePageBreakAlign(align) {
  return resolveHeadingAlign(align);
}

export function getPageBreakAlignClass(align) {
  return `quotemate-form-field__page-break--align-${resolvePageBreakAlign(align)}`;
}

export function resolvePageBreakButtonBackground(fieldData = {}) {
  const custom = fieldData?.page_break_button_color;
  if (custom && /^#[0-9A-Fa-f]{3,8}$/i.test(String(custom).trim())) {
    return String(custom).trim();
  }
  const design = resolveDesign(getBuilderDesignFromPage());
  return design.buttonBg;
}

export function getDefaultPageBreakButtonColor() {
  return resolveDesign(getBuilderDesignFromPage()).buttonColor;
}

export function getDefaultPageBreakPrevButtonColor() {
  return resolveDesign(getBuilderDesignFromPage()).secondaryBtnBg ?? '#faf8f4';
}

export function resolvePageBreakPrevButtonBackground(fieldData = {}) {
  const custom = fieldData?.page_break_prev_button_color;
  if (custom && /^#[0-9A-Fa-f]{3,8}$/i.test(String(custom).trim())) {
    return String(custom).trim();
  }
  return getDefaultPageBreakPrevButtonColor();
}

/** Mirrors FormHelper + form-view.php inline prev-button styles for builder canvas preview. */
export function buildPageBreakPrevButtonInlineStyle(fieldData = {}) {
  const design = resolveDesign(getBuilderDesignFromPage());
  const parts = [];
  const spacing = getPageBreakButtonSpacingStyle(fieldData, 'prev');
  if (spacing) {
    parts.push(spacing);
  }
  parts.push(`background:${resolvePageBreakPrevButtonBackground(fieldData)}`);
  parts.push(`color:${design.secondaryBtnText ?? '#1a1a1a'}`);
  if (design.secondaryBtnBorder) {
    parts.push(`border:1px solid ${design.secondaryBtnBorder}`);
  }
  return parts.join(';');
}

function escapePageBreakText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPageBreakButtonSpacingStyle(fieldData = {}, variant = 'next') {
  const marginPrefix = variant === 'prev' ? 'stylePrevMargin' : 'styleMargin';
  const paddingPrefix = variant === 'prev' ? 'stylePrevPadding' : 'stylePadding';
  const toCss = (val, unit) => {
    if (val === '' || val == null) return '';
    const num = String(val).replace(/[^\d.-]/g, '');
    return num !== '' ? `${num}${unit || 'px'}` : '';
  };
  const styles = [];
  const marginUnit = fieldData?.[`${marginPrefix}Unit`] || 'px';
  const paddingUnit = fieldData?.[`${paddingPrefix}Unit`] || 'px';
  ['Top', 'Right', 'Bottom', 'Left'].forEach((side) => {
    const marginVal = toCss(fieldData?.[`${marginPrefix}${side}`], marginUnit);
    if (marginVal) styles.push(`margin-${side.toLowerCase()}:${marginVal}`);
    const paddingVal = toCss(fieldData?.[`${paddingPrefix}${side}`], paddingUnit);
    if (paddingVal) styles.push(`padding-${side.toLowerCase()}:${paddingVal}`);
  });
  return styles.join(';');
}

export function shouldShowPageBreakPrevious(fieldData = {}) {
  const value = fieldData?.show_previous_button;
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }
  return true;
}

function buildPageBreakButtonHtml(text, bg, extraClass = '', spacingStyle = '') {
  const styleAttr = [bg ? `background:${bg}` : '', spacingStyle].filter(Boolean).join(';');
  return `<button type="button" class="quotemate-form-field__page-break-btn ${extraClass}" disabled${styleAttr ? ` style="${styleAttr}"` : ''}>${text}</button>`;
}

function buildPageBreakPrevButtonHtml(text, fieldData = {}) {
  const styleAttr = buildPageBreakPrevButtonInlineStyle(fieldData);
  return `<button type="button" class="btn btn-secondary prev-step" disabled${styleAttr ? ` style="${styleAttr}"` : ''}>${text}</button>`;
}

/** Admin canvas preview HTML for a page break (non-clickable theme-styled button(s)). */
export function buildPageBreakPreviewHtml(fieldData = {}, options = {}) {
  const canHavePrevious = options.showPrevious === true;
  const showPrevious = canHavePrevious && shouldShowPageBreakPrevious(fieldData);
  const nextBg = resolvePageBreakButtonBackground(fieldData);
  const nextText = escapePageBreakText(fieldData.page_title || 'Next Page');
  const nextSpacing = getPageBreakButtonSpacingStyle(fieldData, 'next');
  const nextAlignClass = getPageBreakAlignClass(fieldData.page_break_align);
  const desc = fieldData.page_description
    ? `<p class="quotemate-form-field__page-break-desc">${escapePageBreakText(fieldData.page_description)}</p>`
    : '';

  if (!canHavePrevious) {
    return `
    <div class="quotemate-form-field__page-break ${nextAlignClass}">
      ${buildPageBreakButtonHtml(nextText, nextBg, 'quotemate-form-field__page-break-btn--next', nextSpacing)}
      ${desc}
    </div>
  `.trim();
  }

  const prevText = escapePageBreakText(fieldData.page_prev_title || 'Previous');
  const prevAlignClass = getPageBreakAlignClass(fieldData.page_break_prev_align);
  const prevDesc = fieldData.page_prev_description
    ? `<p class="quotemate-form-field__page-break-desc quotemate-form-field__page-break-desc--prev">${escapePageBreakText(fieldData.page_prev_description)}</p>`
    : '';
  const actionsClass = showPrevious
    ? 'quotemate-form-field__page-break-actions'
    : 'quotemate-form-field__page-break-actions quotemate-form-field__page-break-actions--next-only';
  const groupAlignClass = getPageBreakAlignClass(fieldData.page_break_align);

  return `
    <div class="quotemate-form-field__page-break quotemate-form-field__page-break--dual ${groupAlignClass}">
      ${desc}
      ${prevDesc}
      <div class="${actionsClass}">
        <div class="quotemate-form-field__page-break-slot quotemate-form-field__page-break-slot--next ${nextAlignClass}">
          ${buildPageBreakButtonHtml(nextText, nextBg, 'quotemate-form-field__page-break-btn--next', nextSpacing)}
        </div>
        ${showPrevious ? `
        <div class="quotemate-form-field__page-break-slot quotemate-form-field__page-break-slot--prev ${prevAlignClass}">
          ${buildPageBreakPrevButtonHtml(prevText, fieldData)}
        </div>` : ''}
      </div>
    </div>
  `.trim();
}

const PAGE_BREAK_BUTTON_TEXT_PROPS = new Set(['page_title', 'page_prev_title']);

/** Whether a page_break property controls Previous / Next button label text. */
export function isPageBreakButtonTextProperty(property) {
  return PAGE_BREAK_BUTTON_TEXT_PROPS.has(property);
}

/**
 * Live-update page break button labels on the admin canvas without rebuilding the preview.
 * Returns false when the target button is not in the DOM yet (caller should refresh preview HTML).
 */
export function syncPageBreakButtonTextInCanvas(fieldElement, property, value, fieldData = {}) {
  if (!fieldElement || !isPageBreakButtonTextProperty(property)) {
    return false;
  }

  let selector;
  let fallback;
  if (property === 'page_title') {
    selector = '.quotemate-form-field__page-break-btn--next';
    fallback = fieldData?.page_title || 'Next Page';
  } else {
    selector = '.quotemate-form-field__page-break-slot--prev .prev-step';
    fallback = fieldData?.page_prev_title || 'Previous';
  }

  const button = fieldElement.querySelector(selector);
  if (!button) {
    return false;
  }

  button.textContent = value != null && String(value).length > 0 ? String(value) : String(fallback);
  return true;
}

const STEP_LABEL_FIRST = 'Getting Started';
const STEP_LABEL_LAST = 'Final Quote';
const STEP_LABEL_SKIP_TYPES = new Set([
  'page_break',
  'page-break',
  'section_break',
  'html',
  'divider',
  'heading',
  'paragraph',
  'form_summary',
]);
const BUILDER_SERVICE_FIELD_TYPES = new Set(['service', 'service_options']);

function getFormSummaryField(fields = []) {
  const summaries = (fields || []).filter((field) => field?.type === 'form_summary');
  return summaries.length ? summaries[summaries.length - 1] : null;
}

export function hasBuilderFormSummaryField(fields = []) {
  return !!getFormSummaryField(fields);
}

function isBuilderServiceField(field) {
  return BUILDER_SERVICE_FIELD_TYPES.has(field?.type);
}

function groupFieldsIntoPages(fields) {
  const pages = [];
  let current = [];

  for (const field of fields || []) {
    if (field?.type === 'page_break' || field?.type === 'page-break') {
      if (current.length) {
        pages.push(current);
        current = [];
      }
      continue;
    }
    current.push(field);
  }

  if (current.length || !pages.length) {
    pages.push(current);
  }

  return pages;
}

function getPageBreaksInOrder(fields = []) {
  return (fields || []).filter((field) => field?.type === 'page_break' || field?.type === 'page-break');
}

/**
 * Admin builder preview steps for a single page (after a page break).
 * A Service Selector always contributes exactly ONE root step. A Page Break always
 * owns its own step positioned in canvas order: the leading (non-service) content
 * before the first Service Selector forms the page-break step (which may be empty
 * when the break sits directly before a Service Selector). Post-service fields on the
 * same page never steal the page-break title, so ordering follows the canvas exactly.
 */
function getAdminPreviewLabelsForMiddlePage(pageFields, pageIndex, precedingPageBreak) {
  const customTitle = String(precedingPageBreak?.step_title || '').trim();
  const steps = [];

  const visibleFields = (pageFields || []).filter(
    (field) => !STEP_LABEL_SKIP_TYPES.has(field?.type)
  );

  const firstServiceIndex = visibleFields.findIndex((field) => isBuilderServiceField(field));
  const hasService = firstServiceIndex !== -1;
  const leadingFields = hasService
    ? visibleFields.slice(0, firstServiceIndex)
    : visibleFields;
  const serviceFields = visibleFields.filter((field) => isBuilderServiceField(field));

  // The page break's own page (leading content). When a break sits directly before a
  // Service Selector this page is empty, but it must still appear before the service.
  if (leadingFields.length > 0 || hasService) {
    const firstLeading = leadingFields[0];
    steps.push({
      label: customTitle || (firstLeading?.label || '').trim() || `Step ${pageIndex + 1}`,
      fieldId: firstLeading?.id || null,
      sourcePageIndex: pageIndex,
    });
  }

  serviceFields.forEach((field) => {
    steps.push({
      label: (field.label || '').trim() || 'Service Selection',
      fieldId: field.id,
      sourcePageIndex: pageIndex,
    });
  });

  if (!steps.length) {
    steps.push({
      label: customTitle || `Step ${pageIndex + 1}`,
      fieldId: null,
      sourcePageIndex: pageIndex,
    });
  }

  return steps;
}

function buildAdminPreviewSteps(fields = []) {
  // ADMIN BUILDER CANVAS ONLY — do not use for frontend runtime navigation.
  const pages = groupFieldsIntoPages(fields);
  const pageCount = Math.max(1, pages.length);
  const pageBreaks = getPageBreaksInOrder(fields);
  const steps = [];

  pages.forEach((pageFields, pageIndex) => {
    if (pageIndex === 0) {
      steps.push({ label: STEP_LABEL_FIRST, fieldId: null, sourcePageIndex: 0 });
      return;
    }

    const pageFieldsForSteps = pageIndex === pageCount - 1
      ? pageFields.filter((field) => field?.type !== 'form_summary')
      : pageFields;

    steps.push(
      ...getAdminPreviewLabelsForMiddlePage(
        pageFieldsForSteps,
        pageIndex,
        pageBreaks[pageIndex - 1]
      )
    );
  });

  const summaryField = getFormSummaryField(fields);
  if (summaryField) {
    const stepTitle = String(summaryField.stepTitle || STEP_LABEL_LAST).trim() || STEP_LABEL_LAST;
    steps.push({
      label: stepTitle,
      fieldId: summaryField.id,
      sourcePageIndex: null,
      stepKind: 'summary',
    });
  }

  return steps;
}

export function countBuilderFormSteps(fields = []) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return 1;
  }
  return Math.max(1, buildAdminPreviewSteps(fields).length);
}

export function getFormStepLabels(fields = []) {
  return buildAdminPreviewSteps(fields).map((step) => step.label);
}

/**
 * Step index whose nav title is driven by this field's label (mirrors getFormStepLabels).
 * Returns -1 when the field does not control a step title.
 */
export function getStepIndexForFieldLabelSource(fieldId, fields = []) {
  if (!fieldId) {
    return -1;
  }

  return buildAdminPreviewSteps(fields).findIndex((step) => step.fieldId === fieldId);
}

/** Update a single step nav label in the DOM without rebuilding indicators. */
export function updateBuilderStepLabelAtIndex(stepIndex, labelText, fieldId = null) {
  const indicators = document.getElementById('builder-step-indicators');
  if (!indicators) {
    return;
  }

  let indicator = null;
  if (fieldId) {
    indicator = indicators.querySelector(`.step-indicator[data-field-id="${fieldId}"]`);
  }
  if (!indicator && stepIndex >= 0) {
    indicator = indicators.querySelector(`.step-indicator[data-step="${stepIndex}"]`);
  }

  const labelEl = indicator?.querySelector('.step-label');
  if (!labelEl) {
    return;
  }

  const resolvedIndex = stepIndex >= 0 ? stepIndex : parseInt(indicator?.dataset?.step ?? '-1', 10);
  const trimmed = String(labelText || '').trim();
  labelEl.textContent = trimmed || `Step ${resolvedIndex + 1}`;
}

/** Sync one step nav title when a field label changes while typing in Field Settings. */
export function syncBuilderStepLabelForField(fieldId, fields = [], labelKey = 'label') {
  const steps = buildAdminPreviewSteps(fields);
  const stepIndex = steps.findIndex((step) => step.fieldId === fieldId);
  if (stepIndex < 0) {
    return;
  }

  const field = (fields || []).find((item) => item?.id === fieldId);
  const labelValue = field?.[labelKey] ?? '';
  updateBuilderStepLabelAtIndex(stepIndex, labelValue, fieldId);
}

/** Sync the first step label created by a page break's Step Title setting. */
export function syncBuilderStepLabelForPageBreak(pageBreakFieldId, fields = []) {
  const pageBreaks = getPageBreaksInOrder(fields);
  const pageBreakIndex = pageBreaks.findIndex((field) => field?.id === pageBreakFieldId);
  if (pageBreakIndex < 0) {
    return;
  }

  const targetPageIndex = pageBreakIndex + 1;
  const pages = groupFieldsIntoPages(fields);
  if (targetPageIndex <= 0 || targetPageIndex >= pages.length) {
    return;
  }

  const pageCount = pages.length;
  const pageFields = targetPageIndex === pageCount - 1
    ? (pages[targetPageIndex] || []).filter((field) => field?.type !== 'form_summary')
    : (pages[targetPageIndex] || []);

  const pageSteps = getAdminPreviewLabelsForMiddlePage(
    pageFields,
    targetPageIndex,
    pageBreaks[pageBreakIndex]
  );
  if (!pageSteps.length) {
    return;
  }

  const steps = buildAdminPreviewSteps(fields);
  const stepIndex = steps.findIndex((step) => step.sourcePageIndex === targetPageIndex);
  if (stepIndex < 0) {
    return;
  }

  updateBuilderStepLabelAtIndex(stepIndex, pageSteps[0].label, pageSteps[0].fieldId);
}

export function resolveSummarySubmitButtonBackground(fieldData = {}) {
  const custom = fieldData?.summary_submit_button_color;
  if (custom && /^#[0-9A-Fa-f]{3,8}$/i.test(String(custom).trim())) {
    return String(custom).trim();
  }
  return resolvePageBreakButtonBackground(fieldData);
}

export function resolveSummaryPrevButtonBackground(fieldData = {}) {
  const custom = fieldData?.summary_prev_button_color;
  if (custom && /^#[0-9A-Fa-f]{3,8}$/i.test(String(custom).trim())) {
    return String(custom).trim();
  }
  return resolvePageBreakPrevButtonBackground(fieldData);
}

function buildSummarySubmitButtonHtml(text, fieldData = {}) {
  const bg = resolveSummarySubmitButtonBackground(fieldData);
  const spacing = getPageBreakButtonSpacingStyle(fieldData, 'next');
  return buildPageBreakButtonHtml(text, bg, 'quotemate-form-field__page-break-btn--next quotemate-form-summary-preview__submit-btn', spacing);
}

function buildSummaryPrevButtonHtml(text, fieldData = {}) {
  const design = resolveDesign(getBuilderDesignFromPage());
  const parts = [];
  const spacing = getPageBreakButtonSpacingStyle(fieldData, 'prev');
  if (spacing) {
    parts.push(spacing);
  }
  parts.push(`background:${resolveSummaryPrevButtonBackground(fieldData)}`);
  parts.push(`color:${design.secondaryBtnText ?? '#1a1a1a'}`);
  if (design.secondaryBtnBorder) {
    parts.push(`border:1px solid ${design.secondaryBtnBorder}`);
  }
  const styleAttr = parts.join(';');
  return `<button type="button" class="btn btn-secondary prev-step quotemate-form-summary-preview__prev-btn" disabled${styleAttr ? ` style="${styleAttr}"` : ''}>${text}</button>`;
}

const FORM_SUMMARY_BUTTON_TEXT_PROPS = new Set(['summary_prev_title', 'submitButtonText']);

/** Whether a form_summary property controls Previous / Submit button label text. */
export function isFormSummaryButtonTextProperty(property) {
  return FORM_SUMMARY_BUTTON_TEXT_PROPS.has(property);
}

/**
 * Live-update Summary nav button labels on the admin canvas without rebuilding the preview.
 * Returns false when the target button is not in the DOM yet (caller should refresh nav HTML).
 */
export function syncFormSummaryButtonTextInCanvas(fieldElement, property, value, fieldData = {}) {
  if (!fieldElement || !isFormSummaryButtonTextProperty(property)) {
    return false;
  }

  let selector;
  let fallback;
  if (property === 'summary_prev_title') {
    selector = '.quotemate-form-summary-preview__prev-btn';
    fallback = fieldData?.summary_prev_title || 'Previous';
  } else {
    selector = '.quotemate-form-summary-preview__submit-btn';
    fallback = fieldData?.submitButtonText || 'Submit Quote Request';
  }

  const button = fieldElement.querySelector(selector);
  if (!button) {
    return false;
  }

  button.textContent = value != null && String(value).length > 0 ? String(value) : String(fallback);
  return true;
}

/** Admin canvas preview for Summary field Previous / Submit navigation buttons. */
export function buildFormSummaryNavPreviewHtml(fieldData = {}) {
  const order = fieldData?.summaryButtonOrder === 'submit_prev' ? 'submit_prev' : 'prev_submit';
  const prevText = escapePageBreakText(fieldData?.summary_prev_title || 'Previous');
  const submitText = escapePageBreakText(fieldData?.submitButtonText || 'Submit Quote Request');
  const prevBtn = buildSummaryPrevButtonHtml(prevText, fieldData);
  const submitBtn = buildSummarySubmitButtonHtml(submitText, fieldData);
  const submitAlignClass = getPageBreakAlignClass(fieldData?.summary_submit_align || 'center');
  const prevAlignClass = getPageBreakAlignClass(fieldData?.summary_prev_align || 'center');
  const groupAlignClass = getPageBreakAlignClass(fieldData?.summary_submit_align || 'center');

  const submitSlot = `
    <div class="quotemate-form-field__page-break-slot quotemate-form-field__page-break-slot--next ${submitAlignClass}">
      ${submitBtn}
    </div>`;
  const prevSlot = `
    <div class="quotemate-form-field__page-break-slot quotemate-form-field__page-break-slot--prev ${prevAlignClass}">
      ${prevBtn}
    </div>`;
  const slots = order === 'submit_prev' ? [submitSlot, prevSlot] : [prevSlot, submitSlot];

  return `
    <div class="quotemate-form-field__page-break quotemate-form-field__page-break--dual quotemate-form-summary-preview__nav ${groupAlignClass}">
      <div class="quotemate-form-field__page-break-actions">
        ${slots.join('')}
      </div>
    </div>
  `.trim();
}

export function getBuilderDesignFromPage() {
  if (window.formSettingsManager?.settings?.design) {
    return { ...DESIGN_DEFAULTS, ...window.formSettingsManager.settings.design };
  }

  const rawSettings = window.quotemateFormBuilder?.formData?.settings;
  if (rawSettings) {
    try {
      const parsed = typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings;
      if (parsed?.design && typeof parsed.design === 'object') {
        return { ...DESIGN_DEFAULTS, ...parsed.design };
      }
    } catch (error) {
      console.warn('Failed to parse builder design settings:', error);
    }
  }

  return { ...DESIGN_DEFAULTS };
}

export function syncBuilderStepProgress(fields = [], activeStep = 0, design = null) {
  const wrapper = document.querySelector('.quotemate-form-builder__form-preview');
  const progress = document.getElementById('builder-step-progress');
  const indicators = document.getElementById('builder-step-indicators');
  const previewForm = wrapper?.querySelector('.quotemate-form-builder__preview-form');

  if (!wrapper || !progress || !indicators) {
    return;
  }

  const resolvedDesign = design || getBuilderDesignFromPage();
  const themeId = resolvedDesign.themeId || wrapper.dataset.qmTheme || 'classic';
  const previewSteps = buildAdminPreviewSteps(fields);
  const stepCount = Math.max(1, previewSteps.length);
  const isMulti = stepCount > 1;

  wrapper.dataset.qmMultistep = isMulti ? 'true' : 'false';
  wrapper.dataset.qmTheme = themeId;
  progress.hidden = !isMulti;

  if (previewForm) {
    previewForm.classList.toggle('multi-step-form', isMulti);
    previewForm.classList.toggle('single-step-form', !isMulti);
    previewForm.style.display = themeId === 'sidebar' && isMulti ? '' : 'block';
  }

  if (!isMulti) {
    indicators.innerHTML = '';
    const fill = progress.querySelector('.progress-fill');
    if (fill) {
      fill.style.width = '0%';
    }
    return;
  }

  const safeActive = Math.max(0, Math.min(activeStep, stepCount - 1));
  indicators.innerHTML = previewSteps.map((step, index) => {
    const isActive = index === safeActive;
    const isCompleted = index < safeActive;
    const classes = ['step-indicator'];
    if (isActive) classes.push('active');
    if (isCompleted) classes.push('completed');
    const label = escapePageBreakText(step.label || `Step ${index + 1}`);
    const fieldIdAttr = step.fieldId
      ? ` data-field-id="${escapePageBreakText(step.fieldId)}"`
      : '';
    return `
      <div class="${classes.join(' ')}" data-step="${index}"${fieldIdAttr}>
        <div class="step-number">${index + 1}</div>
        <div class="step-label">${label}</div>
      </div>
    `;
  }).join('');

  const fill = progress.querySelector('.progress-fill');
  if (fill) {
    fill.style.width = `${((safeActive + 1) / stepCount) * 100}%`;
  }
}

export function fieldHasCustomMargin(fieldData) {
  if (!fieldData) return false;
  return ['Top', 'Right', 'Bottom', 'Left'].some((side) => {
    const val = fieldData[`styleMargin${side}`];
    return val !== undefined && val !== null && String(val).trim() !== '';
  });
}

export function applyDesignToBuilderFields(preview, design = {}) {
  if (!preview) return;

  const vars = buildDesignCssVars(design);
  const fields = window.formBuilder?.formData?.fields ?? [];

  preview.querySelectorAll('.field-label, .quotemate-form-field__label').forEach((label) => {
    const group = label.closest('.form-group, .quotemate-form-field');
    if (!group || group.style.getPropertyValue('--qm-label-color')) {
      return;
    }
    label.style.color = vars['--qm-label-color'];
  });

  preview.querySelectorAll('.form-group, .quotemate-form-field').forEach((group) => {
    const fieldId = group.getAttribute('data-field-id');
    const fieldData = fieldId ? fields.find((f) => f.id === fieldId) : null;
    const styleAttr = group.getAttribute('style') || '';
    const hasInlineMargin = /margin\s*:/i.test(styleAttr)
      || group.style.marginTop
      || group.style.marginBottom
      || group.style.marginLeft
      || group.style.marginRight;

    if (fieldHasCustomMargin(fieldData) || hasInlineMargin) {
      return;
    }

    if (!group.style.getPropertyValue('--qm-field-spacing')) {
      group.style.marginBottom = vars['--qm-field-spacing'];
    }
  });

  preview.querySelectorAll('.field-input .form-control, .field-input input, .field-input textarea, .field-input select').forEach((input) => {
    const group = input.closest('.form-group, .quotemate-form-field');
    if (group?.style.getPropertyValue('--qm-border-color')) {
      return;
    }
    input.style.borderColor = vars['--qm-border-color'];
  });
}

export function syncBuilderLivePreview(design = null, fields = null) {
  const resolvedDesign = design || getBuilderDesignFromPage();
  const fieldList = fields ?? window.formBuilder?.formData?.fields ?? [];
  applyDesignToBuilderCanvas(resolvedDesign);
  syncBuilderStepProgress(fieldList, 0, resolvedDesign);
  if (window.formBuilder?.refreshFieldInCanvas) {
    fieldList.forEach((field) => {
      if (field?.type === 'page_break') {
        window.formBuilder.refreshFieldInCanvas(field.id);
      }
    });
  }
}

function syncThemeClass(element, themeId) {
  if (!element) return;
  Array.from(element.classList).forEach((className) => {
    if (className.startsWith('quotemate-theme-')) {
      element.classList.remove(className);
    }
  });
  element.classList.add(`quotemate-theme-${themeId}`);
  if (!element.classList.contains('quotemate-form-wrapper')) {
    element.classList.add('quotemate-form-wrapper');
  }
}

export function applyDesignToBuilderCanvas(design = {}) {
  const preview = document.querySelector('.quotemate-form-builder__form-preview');
  const canvas = document.querySelector('.quotemate-form-builder__canvas');
  const vars = buildDesignCssVars(design);
  const resolved = resolveDesign(design);
  const themeId = resolved.themeId || 'classic';

  applyDesignCssVars(preview, design);

  if (preview) {
    preview.dataset.qmTheme = themeId;
    preview.dataset.qmHeaderStyle = resolved.headerStyle;
    preview.dataset.qmButtonStyle = resolved.buttonStyle;
    preview.style.backgroundColor = themeId === 'minimal' ? (vars['--qm-form-bg'] || '') : 'transparent';
    preview.style.borderWidth = themeId === 'minimal' ? (vars['--qm-form-border-width'] || '1px') : '0';
    preview.style.borderStyle = 'solid';
    preview.style.borderColor = themeId === 'minimal' ? (vars['--qm-form-border-color'] || '#e5e5e5') : 'transparent';
    preview.style.borderRadius = themeId === 'minimal' ? (vars['--qm-form-border-radius'] || '8px') : '0';
    preview.style.boxShadow = 'none';
    preview.style.maxWidth = resolved.formMaxWidth;
    syncThemeClass(preview, themeId);

    const header = preview.querySelector('.form-header, .quotemate-form-builder__form-header');
    if (header) {
      header.style.background = resolved.headerBg;
      header.style.color = resolved.headerText;
    }

    const title = preview.querySelector('.form-title, .quotemate-form-builder__form-title');
    if (title) {
      title.style.color = resolved.headerText;
    }

    const description = preview.querySelector('.form-description, .quotemate-form-builder__form-description');
    if (description) {
      description.style.color = resolved.headerText === '#ffffff'
        ? 'rgba(255, 255, 255, 0.9)'
        : '#64748b';
    }

    const submitBtn = preview.querySelector('.quotemate-form-builder__submit-btn');
    if (submitBtn) {
      submitBtn.style.background = resolved.buttonBg;
      submitBtn.style.color = vars['--qm-button-text'] || '#ffffff';
      submitBtn.style.boxShadow = `0 4px 12px ${vars['--qm-accent-shadow'] || 'rgba(0,0,0,0.15)'}`;
    }

    applyDesignToBuilderFields(preview, design);

    const previewForm = preview.querySelector('.quotemate-form-builder__preview-form');
    if (previewForm) {
      const isMulti = preview.dataset.qmMultistep === 'true';
      previewForm.style.display = themeId === 'sidebar' && isMulti ? '' : 'block';
    }
  }

  if (canvas) {
    canvas.style.maxWidth = resolved.formMaxWidth;
    canvas.style.backgroundColor = 'transparent';
    canvas.style.padding = '40px';
    canvas.style.borderRadius = '12px';
  }
}

export function getThemePreset(themeId) {
  return THEME_PRESETS[themeId] || THEME_PRESETS.classic;
}
