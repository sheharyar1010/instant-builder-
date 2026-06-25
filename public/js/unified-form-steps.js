/**
 * Unified Form Steps
 * Merges form page_break fields and configurator (service selector) steps into one flow.
 *
 * Rules:
 * - Service option page breaks: only for the SELECTED option (pageBreakBeforeOptions).
 * - Service → next form field: new page only if last selected option has pageBreakBeforeOptions.
 * - Form field → next fields: new page only if a form page_break follows that field in the builder.
 */

class UnifiedFormSteps {
  constructor(progressiveSelector) {
    this.progressive = progressiveSelector;
    this.form = document.querySelector('.quotemate-frontend-form');
    if (!this.form) return;

    this.fields = this.getFormFields();
    const plan = UnifiedFormSteps.buildStepPlan(this.fields);
    this.steps = plan.steps;
    this.postServiceFields = plan.postServiceFields;
    this.serviceFieldId = plan.serviceFieldId;
    this.postServiceIndex = 0;
    this.currentStep = 0;

    if (!this.postServiceFields.length && this.serviceFieldId) {
      const fromDom = UnifiedFormSteps.collectPostServiceFieldsFromDom(
        this.serviceFieldId,
        this.fields
      );
      this.postServiceFields = fromDom.length
        ? UnifiedFormSteps.applyPageBreakFlagsFromFields(fromDom, this.fields)
        : UnifiedFormSteps.parseFormLayout(this.fields).postServiceFields;
    }

    this.ensurePostServiceFields();

    if (this.steps.length <= 1 && !this.postServiceFields.length) return;

    this.progressive?.setUnifiedMode(true);
    this.form.classList.add('unified-multi-step-form');
    this.flattenFormSteps();
    this.hidePostServiceFieldsExcept(new Set());
    this.buildProgressUI();
    this.bindNavigation();
    this.bindSubmitValidation();
    this.showStep(0);

    window.quotemateUnifiedSteps = this;

    const reapplyStep = () => this.showStep(this.currentStep);
    setTimeout(reapplyStep, 0);
    setTimeout(reapplyStep, 50);

    document.addEventListener('quotemateConditionalLogic', () => {
      this.enforcePostServiceFieldVisibility();
    });
  }

  getFormFields() {
    let fields = null;

    if (window.quoteMateFormData?.fields) {
      fields = window.quoteMateFormData.fields;
    } else {
      fields = Array.from(this.form.querySelectorAll('.form-group[data-field-id]')).map((group) => {
        try {
          const container = group.querySelector('[data-field-data]');
          if (container?.dataset.fieldData) {
            return JSON.parse(container.dataset.fieldData);
          }
        } catch (e) {
          /* ignore */
        }
        return {
          id: group.dataset.fieldId,
          type: group.dataset.fieldType,
        };
      });
    }

    return UnifiedFormSteps.getLayoutFields(
      (fields || []).map((field) => UnifiedFormSteps.enrichServiceField(field))
    );
  }

  /** Prefer quoteMateFormData (includes page_break markers); DOM fallback omits them. */
  static getLayoutFields(fallbackFields) {
    const raw = window.quoteMateFormData?.fields;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((field) => UnifiedFormSteps.enrichServiceField(field));
    }
    return fallbackFields || [];
  }

  static enrichServiceField(field) {
    if (!field || (field.type !== 'service' && field.type !== 'service_options')) {
      return field;
    }

    const hasStructure =
      (field.enhancedServiceStructure && field.enhancedServiceStructure.length > 0) ||
      (field.serviceStructure && field.serviceStructure.length > 0);

    if (hasStructure) return field;

    const host = document.querySelector(`.service-field-container[data-field-id="${field.id}"]`);
    if (!host?.dataset.fieldData) return field;

    try {
      const parsed = JSON.parse(host.dataset.fieldData);
      return { ...field, ...parsed };
    } catch (e) {
      return field;
    }
  }

  static isPageBreak(item) {
    return item?.type === 'page_break' || item?.type === 'page-break';
  }

  static hasPageBreakBefore(node) {
    const value = node?.pageBreakBeforeOptions;
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  static getSelectableItems(items) {
    return (items || []).filter(
      (item) =>
        !UnifiedFormSteps.isPageBreak(item) &&
        (item?.name || item?.basePrice || item?.type)
    );
  }

  static chunkByPageBreak(items) {
    const pages = [];
    let current = [];

    for (const item of items || []) {
      if (UnifiedFormSteps.isPageBreak(item)) {
        if (current.length) pages.push(current);
        current = [];
      } else {
        current.push(item);
      }
    }

    if (current.length) pages.push(current);
    return pages.length ? pages : [[]];
  }

  static linearizeServiceStructure(structure, fieldId) {
    const tokens = [];
    const segments = UnifiedFormSteps.chunkByPageBreak(structure);

    segments.forEach((segment, segIndex) => {
      if (segIndex > 0) {
        tokens.push({ type: 'page_break', source: 'service', fieldId });
      }

      const categories = UnifiedFormSteps.getSelectableItems(segment);
      if (!categories.length) return;

      tokens.push({ type: 'service_categories', fieldId, categories });
    });

    return tokens;
  }

  static isQueueableFormField(field) {
    const skip = ['page_break', 'page-break', 'section_break', 'html'];
    return !!(field?.id && field.type && !skip.includes(field.type));
  }

  /** DOM-order fallback when JSON field list does not include post-service fields. */
  static collectPostServiceFieldsFromDom(serviceFieldId, allFields) {
    const form = document.querySelector('.quotemate-frontend-form');
    if (!form) return [];

    const groups = Array.from(form.querySelectorAll('.form-group[data-field-id]'));
    const fieldById = new Map((allFields || []).map((field) => [field.id, field]));

    let serviceIndex = groups.findIndex((group) => group.dataset.fieldId === serviceFieldId);
    if (serviceIndex < 0) {
      serviceIndex = groups.findIndex(
        (group) =>
          group.querySelector('.progressive-service-selector, .service-field-container') &&
          (group.dataset.fieldType === 'service' || group.dataset.fieldType === 'service_options')
      );
    }
    if (serviceIndex < 0) return [];

    const postServiceFields = [];

    for (let i = serviceIndex + 1; i < groups.length; i++) {
      const group = groups[i];
      const fieldId = group.dataset.fieldId;
      const fieldType = group.dataset.fieldType;
      const field = fieldById.get(fieldId) || { id: fieldId, type: fieldType };

      if (UnifiedFormSteps.isPageBreak(field)) {
        if (postServiceFields.length) {
          postServiceFields[postServiceFields.length - 1].pageBreakAfter = true;
        }
        continue;
      }

      if (!UnifiedFormSteps.isQueueableFormField(field)) continue;

      postServiceFields.push({
        type: 'field',
        fieldId: field.id,
        field,
        pageBreakAfter: false,
      });
    }

    return postServiceFields;
  }

  /** Split form into pre-service tokens and post-service field queue (with pageBreakAfter flags). */
  static parseFormLayout(fields) {
    const preServiceFields = [];
    const postServiceFields = [];
    let serviceField = null;
    let seenService = false;
    const skipTypes = ['section_break'];

    for (let i = 0; i < (fields || []).length; i++) {
      const field = fields[i];

      if (UnifiedFormSteps.isPageBreak(field)) {
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
      } else if (UnifiedFormSteps.isQueueableFormField(field)) {
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

  static linearizePreServiceFields(preServiceFields) {
    const tokens = [];

    for (const item of preServiceFields) {
      if (item.type === 'page_break') {
        tokens.push({ type: 'page_break', source: 'form' });
      } else {
        tokens.push({ type: 'field', fieldId: item.fieldId });
      }
    }

    return tokens;
  }

  static linearizeFormFields(fields) {
    const { preServiceFields, serviceField, postServiceFields } = UnifiedFormSteps.parseFormLayout(fields);
    const tokens = UnifiedFormSteps.linearizePreServiceFields(preServiceFields);

    if (serviceField) {
      const structure = serviceField.enhancedServiceStructure || serviceField.serviceStructure || [];
      const hasPriorContent = tokens.some((t) => t.type === 'field');
      const lastToken = tokens[tokens.length - 1];
      const needsImplicitBreak = hasPriorContent && lastToken?.type !== 'page_break';

      if (needsImplicitBreak) {
        tokens.push({ type: 'page_break', source: 'implicit_before_service', fieldId: serviceField.id });
      }

      if (structure.length > 0) {
        tokens.push(...UnifiedFormSteps.linearizeServiceStructure(structure, serviceField.id));
      } else {
        tokens.push({ type: 'field', fieldId: serviceField.id });
      }
    }

    return { tokens, postServiceFields, serviceFieldId: serviceField?.id || null };
  }

  static buildStepsFromTokens(tokens) {
    const breakCount = tokens.filter((t) => t.type === 'page_break').length;
    if (breakCount === 0) {
      return tokens.length ? [{ index: 0, tokens: tokens.slice() }] : [];
    }

    const steps = [];
    let current = [];

    for (const token of tokens) {
      if (token.type === 'page_break') {
        steps.push({ tokens: current.slice() });
        current = [];
      } else {
        current.push(token);
      }
    }

    steps.push({ tokens: current });

    return steps
      .filter((step) => step.tokens.length > 0)
      .map((step, index) => ({ index, tokens: step.tokens }));
  }

  static buildStepPlan(fields) {
    const { tokens, postServiceFields, serviceFieldId } = UnifiedFormSteps.linearizeFormFields(fields);
    return {
      steps: UnifiedFormSteps.buildStepsFromTokens(tokens),
      postServiceFields,
      serviceFieldId,
    };
  }

  static countConfiguratorSteps(fields) {
    return UnifiedFormSteps.buildStepPlan(fields).steps.length;
  }

  isPostServiceFieldId(fieldId) {
    return this.getPostServiceFieldIdSet().has(fieldId);
  }

  getPostServiceFieldIdSet() {
    const layoutFields = UnifiedFormSteps.getLayoutFields(this.fields);
    const { postServiceFields } = UnifiedFormSteps.parseFormLayout(layoutFields);
    return new Set(postServiceFields.map((field) => field.fieldId));
  }

  hidePostServiceFieldsExcept(allowedFieldIds) {
    const allowed =
      allowedFieldIds instanceof Set ? allowedFieldIds : new Set(allowedFieldIds || []);
    const postServiceIds = this.getPostServiceFieldIdSet();

    postServiceIds.forEach((fieldId) => {
      const group = this.form.querySelector(`.form-group[data-field-id="${fieldId}"]`);
      if (!group) return;

      group.classList.add('unified-post-service-field');

      if (allowed.has(fieldId)) return;

      group.style.display = 'none';
      group.dataset.unifiedHidden = '1';
      group.setAttribute('data-hidden-by-logic', 'true');
    });
  }

  enforcePostServiceFieldVisibility() {
    const postServiceIds = this.getPostServiceFieldIdSet();
    if (!postServiceIds.size) return;

    if (!this.isServiceReadyForPostFields()) {
      this.hidePostServiceFieldsExcept(new Set());
      return;
    }

    const step = this.steps[this.currentStep];
    if (!step) return;

    const { fieldIds } = this.getFieldGroupsForStep(step);
    this.hidePostServiceFieldsExcept(fieldIds);
  }

  ensurePostServiceFields() {
    if (!this.serviceFieldId) {
      const serviceGroup = this.form?.querySelector(
        '.form-group .progressive-service-selector, .form-group .service-field-container'
      );
      const hostGroup = serviceGroup?.closest('.form-group[data-field-id]');
      if (hostGroup?.dataset.fieldId) {
        this.serviceFieldId = hostGroup.dataset.fieldId;
      }
    }

    if (!this.serviceFieldId) return 0;

    const fromJson = UnifiedFormSteps.parseFormLayout(
      UnifiedFormSteps.getLayoutFields(this.fields)
    ).postServiceFields;
    const fromDom = UnifiedFormSteps.collectPostServiceFieldsFromDom(
      this.serviceFieldId,
      this.fields
    );

    if (fromJson.length) {
      this.postServiceFields = fromJson;
    } else if (fromDom.length) {
      this.postServiceFields = UnifiedFormSteps.applyPageBreakFlagsFromFields(
        fromDom,
        this.fields
      );
    }

    this.syncPostServiceIndex();
    return this.postServiceFields.length;
  }

  /** DOM collection misses page_break markers (not rendered); apply flags from field JSON order. */
  static applyPageBreakFlagsFromFields(postServiceFields, allFields) {
    const { postServiceFields: fromJson } = UnifiedFormSteps.parseFormLayout(allFields || []);
    const breakAfterById = new Map(
      fromJson.map((field) => [field.fieldId, !!field.pageBreakAfter])
    );

    return postServiceFields.map((field) => ({
      ...field,
      pageBreakAfter: breakAfterById.has(field.fieldId)
        ? breakAfterById.get(field.fieldId)
        : field.pageBreakAfter,
    }));
  }

  revealPostServiceFieldGroup(group) {
    if (!group) return;

    const fieldId = group.dataset.fieldId;
    if (this.isPostServiceFieldId(fieldId) && !this.isServiceReadyForPostFields()) {
      group.style.display = 'none';
      group.dataset.unifiedHidden = '1';
      group.setAttribute('data-hidden-by-logic', 'true');
      return;
    }

    group.style.display = '';
    delete group.dataset.unifiedHidden;
    group.removeAttribute('data-hidden-by-logic');

    group.querySelectorAll('input, select, textarea').forEach((input) => {
      if (input.type === 'hidden') return;
      input.disabled = false;
    });
  }

  refreshConditionalLogic() {
    window.quoteMateConditionalLogic?.evaluateAllConditions?.();
    this.enforcePostServiceFieldVisibility();
  }

  flattenFormSteps() {
    this.form.querySelectorAll('.form-step').forEach((step) => {
      step.classList.add('unified-flattened-step');
      step.querySelectorAll('.form-navigation').forEach((nav) => {
        nav.style.display = 'none';
      });
    });

    this.form.querySelectorAll('.form-step .form-navigation:not(.unified-form-navigation)').forEach((nav) => {
      nav.style.display = 'none';
    });

    this.form.querySelectorAll('.step-progress:not(.unified-step-progress)').forEach((el) => {
      el.style.display = 'none';
    });
  }

  hideLegacyFormNavigation() {
    this.form.querySelectorAll('.form-step .form-navigation:not(.unified-form-navigation)').forEach((nav) => {
      nav.style.display = 'none';
    });
    this.form.querySelectorAll('.form-step .next-step, .form-step .prev-step').forEach((btn) => {
      btn.style.display = 'none';
    });
    this.form.querySelectorAll('.form-step .submit-btn').forEach((btn) => {
      if (btn !== this.submitBtn) {
        btn.style.display = 'none';
      }
    });
  }

  buildProgressUI() {
    const existing = this.form.querySelector('.unified-step-progress');
    if (existing) existing.remove();

    const progress = document.createElement('div');
    progress.className = 'step-progress unified-step-progress';
    progress.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${100 / Math.max(this.steps.length, 1)}%"></div>
      </div>
      <div class="step-indicators">
        ${this.steps
          .map(
            (_, i) => `
          <div class="step-indicator ${i === 0 ? 'active' : ''}" data-step="${i}">
            <div class="step-number">${i + 1}</div>
            <div class="step-label">Step ${i + 1}</div>
          </div>`
          )
          .join('')}
      </div>
    `;
    this.form.insertBefore(progress, this.form.querySelector('.form-content'));

    let nav = this.form.querySelector('.unified-form-navigation');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'form-navigation unified-form-navigation';
      nav.innerHTML = `
        <button type="button" class="btn btn-secondary unified-prev-step" style="display:none;">← Previous</button>
        <button type="button" class="btn btn-primary unified-next-step">Next →</button>
      `;
      this.form.appendChild(nav);
      this.prevBtn = nav.querySelector('.unified-prev-step');
      this.nextBtn = nav.querySelector('.unified-next-step');
      this.prevBtn?.addEventListener('click', () => this.prevStep());
      this.nextBtn?.addEventListener('click', () => this.nextStep());

      const submitButtons = this.form.querySelectorAll('.submit-btn');
      this.submitBtn = submitButtons[0] || null;
      submitButtons.forEach((btn, index) => {
        if (index > 0) btn.style.display = 'none';
      });
      if (this.submitBtn && !nav.contains(this.submitBtn)) {
        this.submitBtn.style.display = 'none';
        nav.appendChild(this.submitBtn);
      }
    }

    this.progressFill = progress.querySelector('.progress-fill');
    this.stepIndicators = progress.querySelectorAll('.step-indicator');
    this.prevBtn = this.prevBtn || nav.querySelector('.unified-prev-step');
    this.nextBtn = this.nextBtn || nav.querySelector('.unified-next-step');
    this.submitBtn = this.submitBtn || this.form.querySelector('.submit-btn');
  }

  syncProgressBar() {
    if (!this.progressFill) return;
    const width = ((this.currentStep + 1) / Math.max(this.steps.length, 1)) * 100;
    this.progressFill.style.width = `${width}%`;
  }

  rebuildProgressUI() {
    this.buildProgressUI();
    this.stepIndicators?.forEach((indicator, i) => {
      indicator.addEventListener('click', () => {
        if (i < this.currentStep) this.showStep(i);
      });
    });
    this.syncProgressBar();
    this.updateNavigationButtons();
  }

  bindNavigation() {
    this.form.addEventListener(
      'click',
      (e) => {
        if (!this.form.classList.contains('unified-multi-step-form')) return;

        if (e.target.closest('.next-step, .unified-next-step')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.nextStep();
          return;
        }

        if (e.target.closest('.prev-step, .unified-prev-step')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.prevStep();
        }
      },
      true
    );

    this.stepIndicators?.forEach((indicator, i) => {
      indicator.addEventListener('click', () => {
        if (i < this.currentStep) this.showStep(i);
      });
    });
  }

  getFieldGroupsForStep(step) {
    const fieldIds = new Set();
    const serviceStates = [];

    for (const token of step.tokens) {
      if (token.type === 'field') {
        fieldIds.add(token.fieldId);
      }
      if (token.type === 'service_categories' || token.type === 'service_node') {
        fieldIds.add(token.fieldId);
        serviceStates.push({
          fieldId: token.fieldId,
          mode: 'categories',
          categories: token.categories || [token.item],
        });
      }
      if (token.type === 'service_options_level') {
        fieldIds.add(token.fieldId);
        serviceStates.push({
          fieldId: token.fieldId,
          mode: 'options',
          parentItem: token.parentItem,
          internalStep: token.internalStep,
        });
      }
    }

    return { fieldIds, serviceStates: this.mergeServiceStates(serviceStates) };
  }

  mergeServiceStates(states) {
    const byField = new Map();

    for (const state of states) {
      if (!byField.has(state.fieldId)) {
        byField.set(state.fieldId, state);
        continue;
      }

      const existing = byField.get(state.fieldId);
      if (state.mode === 'categories') {
        existing.mode = 'categories';
        const merged = [...(existing.categories || []), ...(state.categories || [])];
        const seen = new Set();
        existing.categories = merged.filter((item) => {
          const key = item?.name || '';
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } else if (state.mode === 'options') {
        existing.mode = 'options';
        existing.parentItem = state.parentItem;
        existing.internalStep = state.internalStep;
      }
    }

    return Array.from(byField.values());
  }

  stepHasOnlyConfiguratorOptions(step) {
    return (
      step.tokens.some((t) => t.type === 'service_options_level') &&
      !step.tokens.some(
        (t) => t.type === 'field' || t.type === 'service_categories' || t.type === 'service_node'
      )
    );
  }

  currentStepIncludesService() {
    const step = this.steps[this.currentStep];
    return !!step?.tokens?.some(
      (t) => t.type === 'service_categories' || t.type === 'service_options_level'
    );
  }

  getShownPostServiceFieldIds() {
    const ids = new Set();
    this.steps.forEach((step) => {
      step.tokens.forEach((token) => {
        if (token.type === 'field' && this.isPostServiceFieldId(token.fieldId)) {
          ids.add(token.fieldId);
        }
      });
    });
    return ids;
  }

  syncPostServiceIndex() {
    const shown = this.getShownPostServiceFieldIds();
    let index = 0;
    while (
      index < this.postServiceFields.length &&
      shown.has(this.postServiceFields[index].fieldId)
    ) {
      index++;
    }
    this.postServiceIndex = index;
  }

  collectNextPostServiceFieldGroup() {
    const remaining = this.postServiceFields.slice(this.postServiceIndex);
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

  resetPostServiceFieldsFrom(stepIndex) {
    this.steps.forEach((step, i) => {
      if (i < stepIndex) return;
      step.tokens = step.tokens.filter(
        (token) => token.type !== 'field' || !this.isPostServiceFieldId(token.fieldId)
      );
    });

    this.steps = this.steps.filter((step, i) => {
      if (i <= stepIndex) return true;
      if (!step.dynamic) return true;
      return step.tokens.length > 0;
    });

    this.steps.forEach((step, i) => {
      step.index = i;
    });

    this.syncPostServiceIndex();
    if (this.currentStep >= this.steps.length) {
      this.currentStep = Math.max(0, this.steps.length - 1);
    }
    this.rebuildProgressUI();
    this.showStep(this.currentStep);
  }

  insertDynamicFormFieldsStep(fieldMetas) {
    const newStep = {
      index: this.currentStep + 1,
      dynamic: true,
      tokens: fieldMetas.map((meta) => ({ type: 'field', fieldId: meta.fieldId })),
    };

    this.steps.splice(this.currentStep + 1, 0, newStep);
    this.steps.forEach((step, i) => {
      step.index = i;
    });

    this.postServiceIndex += fieldMetas.length;
    this.rebuildProgressUI();
    this.showStep(this.currentStep + 1);
  }

  appendFieldsToCurrentStep(fieldMetas) {
    const step = this.steps[this.currentStep];
    fieldMetas.forEach((meta) => {
      if (!step.tokens.some((t) => t.type === 'field' && t.fieldId === meta.fieldId)) {
        step.tokens.push({ type: 'field', fieldId: meta.fieldId });
      }
    });
    step.dynamic = true;
    this.postServiceIndex += fieldMetas.length;
    this.showStep(this.currentStep);
  }

  splitOversizedPostServiceStep() {
    const step = this.steps[this.currentStep];
    if (!step) return false;

    const postTokens = step.tokens.filter(
      (token) => token.type === 'field' && this.isPostServiceFieldId(token.fieldId)
    );
    if (postTokens.length <= 1) return false;

    let splitAt = -1;
    for (let i = 0; i < postTokens.length - 1; i++) {
      const meta = this.postServiceFields.find((f) => f.fieldId === postTokens[i].fieldId);
      if (meta?.pageBreakAfter) {
        splitAt = i;
        break;
      }
    }
    if (splitAt < 0) return false;

    const keepIds = new Set(
      postTokens.slice(0, splitAt + 1).map((token) => token.fieldId)
    );

    step.tokens = step.tokens.filter(
      (token) =>
        token.type !== 'field' ||
        !this.isPostServiceFieldId(token.fieldId) ||
        keepIds.has(token.fieldId)
    );

    this.syncPostServiceIndex();
    const group = this.collectNextPostServiceFieldGroup();
    if (!group.length) return false;

    this.insertDynamicFormFieldsStep(group);
    return true;
  }

  handlePostServiceFieldTransition() {
    this.ensurePostServiceFields();
    if (!this.postServiceFields.length) return false;

    const step = this.steps[this.currentStep];
    const currentStepHasPostService = step?.tokens?.some(
      (token) => token.type === 'field' && this.isPostServiceFieldId(token.fieldId)
    );

    if (currentStepHasPostService) {
      if (this.splitOversizedPostServiceStep()) {
        this.refreshConditionalLogic();
        return true;
      }
      if (this.postServiceIndex >= this.postServiceFields.length) return false;

      const group = this.collectNextPostServiceFieldGroup();
      if (!group.length) return false;
      if (!this.stepEndsWithPostServicePageBreak() && !this.hasMorePostServiceFieldsPending()) {
        return false;
      }

      this.insertDynamicFormFieldsStep(group);
      this.refreshConditionalLogic();
      return true;
    }

    if (this.postServiceIndex >= this.postServiceFields.length) return false;

    const group = this.collectNextPostServiceFieldGroup();
    if (!group.length) return false;

    if (!this.currentStepIncludesService()) {
      if (this.stepEndsWithPostServicePageBreak()) {
        this.insertDynamicFormFieldsStep(group);
        this.refreshConditionalLogic();
        return true;
      }
      return false;
    }

    if (this.hasPendingServiceNavigationOnCurrentStep()) return false;

    const serviceContainer = this.getServiceContainer();
    if (serviceContainer && !this.progressive?.isServiceReadyForPostFields(serviceContainer)) {
      return false;
    }

    const lastItem = serviceContainer
      ? this.progressive.getLastSelectedItem(serviceContainer)
      : null;
    const splitAfterService = !!(lastItem && UnifiedFormSteps.hasPageBreakBefore(lastItem));

    if (splitAfterService) {
      this.insertDynamicFormFieldsStep(group);
    } else {
      this.appendFieldsToCurrentStep(group);
    }
    this.refreshConditionalLogic();
    return true;
  }

  showStep(index) {
    if (index < 0 || index >= this.steps.length) return;

    this.currentStep = index;
    const step = this.steps[index];
    const { fieldIds, serviceStates } = this.getFieldGroupsForStep(step);
    const optionsOnly = this.stepHasOnlyConfiguratorOptions(step);

    this.form.querySelectorAll('.form-group').forEach((group) => {
      const fieldId = group.dataset.fieldId;
      const isServiceGroup = group.querySelector('.progressive-service-selector');
      const show = fieldIds.has(fieldId);

      if (show) {
        if (this.isPostServiceFieldId(fieldId)) {
          this.revealPostServiceFieldGroup(group);
        } else {
          group.style.display = '';
          delete group.dataset.unifiedHidden;
        }

        const label = group.querySelector(':scope > .field-label');
        const desc = group.querySelector(':scope > .field-description');
        if (isServiceGroup && optionsOnly) {
          if (label) label.style.display = 'none';
          if (desc) desc.style.display = 'none';
        } else {
          if (label) label.style.display = '';
          if (desc) desc.style.display = '';
        }
      } else {
        group.style.display = 'none';
        group.dataset.unifiedHidden = '1';
      }
    });

    this.form.querySelectorAll('.form-section').forEach((section) => {
      const hasVisibleGroup = !!section.querySelector('.form-group:not([data-unified-hidden])');
      if (hasVisibleGroup) {
        section.style.display = '';
        delete section.dataset.progressiveHidden;
      } else {
        section.style.display = 'none';
      }
    });

    this.progressive?.setUnifiedMode(true);
    this.ensureServiceFieldsForStep(fieldIds, serviceStates);
    this.syncFormStepContainers();
    this.hideLegacyFormNavigation();

    this.syncProgressBar();

    this.stepIndicators?.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === index);
      indicator.classList.toggle('completed', i < index);
    });

    this.enforcePostServiceFieldVisibility();
    this.refreshSummaryFieldsForStep(step);
    this.updateNavigationButtons();
  }

  getServiceContainer() {
    if (!this.serviceFieldId || !this.progressive) return null;
    return this.progressive.getServiceContainer(this.serviceFieldId);
  }

  getServiceContainersForCurrentStep() {
    const containers = new Set();
    const step = this.steps[this.currentStep];
    if (!step) return [];

    step.tokens.forEach((token) => {
      if (
        token.fieldId &&
        (token.type === 'service_categories' ||
          token.type === 'service_options_level' ||
          token.type === 'field')
      ) {
        const scoped = this.progressive?.getServiceContainer(token.fieldId);
        if (scoped) containers.add(scoped);
      }
    });

    const fallback = this.getServiceContainer();
    if (fallback) containers.add(fallback);

    return [...containers];
  }

  hasPendingServiceNavigationOnCurrentStep() {
    return this.getServiceContainersForCurrentStep().some(
      (container) =>
        container.dataset.pendingInlineReveal === '1' || !!container.dataset.pendingInternalStep
    );
  }

  hasMorePostServiceFieldsPending() {
    return this.postServiceIndex < this.postServiceFields.length;
  }

  isLeafServiceSelection(container) {
    if (!container || !this.progressive) return false;

    const deepest = this.progressive.getDeepestSelectedServiceSelect(container);
    if (!deepest?.value) return false;

    const data = this.progressive.parseOptionData(deepest.options[deepest.selectedIndex]);
    if (data) {
      return this.progressive.getSelectableItems(data.children).length === 0;
    }

    const lastItem = this.progressive.getLastSelectedItem(container);
    return !!lastItem && this.progressive.getSelectableItems(lastItem.children).length === 0;
  }

  isServiceReadyForPostFields() {
    const container = this.getServiceContainer();
    if (!container || !this.progressive) return false;
    return this.progressive.isServiceReadyForPostFields(container);
  }

  shouldValidateFormInput(input, group) {
    if (!input || input.type === 'hidden') return false;
    if (input.classList.contains('final-service-value')) return false;

    if (group?.dataset.unifiedHidden === '1' || group.style.display === 'none') {
      return false;
    }

    const progressive = input.closest('.progressive-service-selector');
    if (progressive && this.isServiceReadyForPostFields()) {
      return false;
    }

    const stepContainer = input.closest('.step-container');
    if (stepContainer && !stepContainer.classList.contains('active')) {
      return false;
    }

    const inlineLevel = input.closest('.inline-cascade-level');
    if (inlineLevel && inlineLevel.style.display === 'none') {
      return false;
    }

    return true;
  }

  isFormSummaryFieldId(fieldId) {
    const field = (this.fields || []).find((f) => f.id === fieldId);
    return field?.type === 'form_summary';
  }

  getActiveFormSummaryField() {
    const step = this.steps[this.currentStep];
    if (!step) return null;

    for (const token of step.tokens) {
      if (token.type !== 'field') continue;
      const field = (this.fields || []).find((f) => f.id === token.fieldId);
      if (field?.type === 'form_summary') return field;
    }
    return null;
  }

  refreshSummaryFieldsForStep(step) {
    if (!window.QuoteSummaryEngine || !step) return;

    step.tokens.forEach((token) => {
      if (token.type !== 'field') return;
      if (!this.isFormSummaryFieldId(token.fieldId)) return;
      window.QuoteSummaryEngine.renderForField(token.fieldId);
    });
  }

  applySummarySubmitButtonText(summaryField) {
    if (!this.submitBtn || !summaryField || !window.QuoteSummaryEngine) return;
    const settings = window.QuoteSummaryEngine.normalizeSettings(summaryField);
    const btnText = this.submitBtn.querySelector('.btn-text');
    if (btnText && settings.submitButtonText) {
      btnText.textContent = settings.submitButtonText;
    }
  }

  getValidationMessage() {
    if (this.currentStepIncludesService() && !this.isServiceReadyForPostFields()) {
      return 'Please select a service option before proceeding.';
    }
    return 'Please fill in all required fields before proceeding.';
  }

  canAdvanceToPostServiceFields() {
    this.ensurePostServiceFields();
    if (!this.hasMorePostServiceFieldsPending()) return false;
    if (this.hasPendingServiceNavigationOnCurrentStep()) return false;

    if (!this.currentStepIncludesService()) {
      return this.stepEndsWithPostServicePageBreak();
    }

    return this.isServiceReadyForPostFields();
  }

  updateNavigationButtons() {
    this.ensurePostServiceFields();

    const index = this.currentStep;
    const atLastIndex = index >= this.steps.length - 1;
    const hasPendingService = this.hasPendingServiceNavigationOnCurrentStep();
    const hasPendingFormFields = this.canAdvanceToPostServiceFields();
    const serviceIncomplete =
      this.currentStepIncludesService() && !this.isServiceReadyForPostFields();

    const summaryField = this.getActiveFormSummaryField();
    const pendingPostService = this.hasMorePostServiceFieldsPending();
    const showNext =
      !summaryField &&
      (!atLastIndex ||
        hasPendingService ||
        hasPendingFormFields ||
        serviceIncomplete ||
        pendingPostService);
    let showSubmit =
      !!summaryField || (atLastIndex && !showNext && !pendingPostService);

    if (this.prevBtn) {
      this.prevBtn.style.display = index > 0 ? 'inline-flex' : 'none';
    }
    if (this.nextBtn) {
      this.nextBtn.style.display = showNext ? 'inline-flex' : 'none';
    }
    if (this.submitBtn) {
      this.submitBtn.style.display = showSubmit ? 'inline-flex' : 'none';
    }

    if (summaryField) {
      this.applySummarySubmitButtonText(summaryField);
    }

    this.form.querySelectorAll('.submit-btn').forEach((btn) => {
      if (btn === this.submitBtn) {
        return;
      }
      btn.style.display = 'none';
    });

    if (showNext) {
      this.form.querySelectorAll('.form-step .submit-btn').forEach((btn) => {
        btn.style.display = 'none';
      });
    }

    this.hideLegacyFormNavigation();
  }

  stepEndsWithPostServicePageBreak() {
    const step = this.steps[this.currentStep];
    if (!step) return false;

    const fieldTokens = step.tokens.filter(
      (token) => token.type === 'field' && this.isPostServiceFieldId(token.fieldId)
    );
    if (!fieldTokens.length) return false;

    const lastFieldId = fieldTokens[fieldTokens.length - 1].fieldId;
    const lastMeta = this.postServiceFields.find((f) => f.fieldId === lastFieldId);
    if (lastMeta?.pageBreakAfter) return true;

    for (let i = 0; i < fieldTokens.length - 1; i++) {
      const meta = this.postServiceFields.find((f) => f.fieldId === fieldTokens[i].fieldId);
      if (meta?.pageBreakAfter) return true;
    }

    return false;
  }

  insertDynamicOptionStep(container, internalStep, parentItem) {
    const fieldId = container.dataset.fieldId;
    const newStep = {
      index: this.currentStep + 1,
      dynamic: true,
      tokens: [
        {
          type: 'service_options_level',
          fieldId,
          parentItem,
          internalStep,
        },
      ],
    };

    this.steps.splice(this.currentStep + 1, 0, newStep);
    this.steps.forEach((step, i) => {
      step.index = i;
    });

    this.rebuildProgressUI();
    this.showStep(this.currentStep + 1);
  }

  handlePendingServiceNavigation() {
    const containers = this.getServiceContainersForCurrentStep();

    for (const container of containers) {
      if (container.dataset.pendingInlineReveal === '1') {
        this.progressive?.revealPendingInline(container);
        this.updateNavigationButtons();
        return true;
      }

      if (!container.dataset.pendingInternalStep) continue;

      const internalStep = parseInt(container.dataset.pendingInternalStep, 10);
      let stepEl = container.querySelector(`.step-container.step-${internalStep}`);

      if (!stepEl?.dataset.pageBreakStep) {
        let parentItem = null;
        try {
          parentItem = JSON.parse(container.dataset.pendingParentJson || 'null');
        } catch (e) {
          parentItem = null;
        }

        if (parentItem) {
          const children = this.progressive.getSelectableItems(parentItem.children);
          const label = (parentItem.optionsLabel || 'Select Option').trim();
          this.progressive.renderSeparateLevel(container, internalStep, children, label);
          stepEl = container.querySelector(`.step-container.step-${internalStep}`);
        }
      }

      if (stepEl) {
        let parentItem = null;
        try {
          parentItem = JSON.parse(container.dataset.pendingParentJson || 'null');
        } catch (e) {
          parentItem = null;
        }

        delete container.dataset.pendingInternalStep;
        delete container.dataset.pendingParentJson;

        this.insertDynamicOptionStep(container, internalStep, parentItem);
        return true;
      }
    }

    return false;
  }

  removeDynamicStepsFrom(index) {
    const before = this.steps.length;
    this.steps = this.steps.filter((step, i) => i <= index || !step.dynamic);
    if (this.steps.length !== before) {
      this.steps.forEach((step, i) => {
        step.index = i;
      });
      if (this.currentStep >= this.steps.length) {
        this.currentStep = this.steps.length - 1;
      }
      this.syncPostServiceIndex();
      this.rebuildProgressUI();
      this.showStep(this.currentStep);
    }
  }

  isServiceFieldGroup(group) {
    if (!group) return false;
    const type = group.dataset.fieldType;
    return (
      type === 'service' ||
      type === 'service_options' ||
      !!group.querySelector('.service-field-container, .progressive-service-selector')
    );
  }

  syncFormStepContainers() {
    const visibleFormSteps = new Set();

    this.form.querySelectorAll('.form-group').forEach((group) => {
      if (group.dataset.unifiedHidden === '1') return;
      if (group.style.display === 'none') return;

      const formStep = group.closest('.form-step');
      if (formStep) visibleFormSteps.add(formStep);
    });

    this.form.querySelectorAll('.form-step').forEach((formStep) => {
      const show = visibleFormSteps.has(formStep);
      formStep.style.display = show ? '' : 'none';
      if (show) {
        formStep.classList.add('unified-flattened-step');
      }
    });
  }

  ensureServiceFieldsForStep(fieldIds, serviceStates) {
    if (!this.progressive) return;

    const stateByField = new Map(serviceStates.map((state) => [state.fieldId, state]));
    const step = this.steps[this.currentStep];
    const hasPostServiceOnStep = step?.tokens?.some(
      (token) => token.type === 'field' && this.isPostServiceFieldId(token.fieldId)
    );

    fieldIds.forEach((fieldId) => {
      const group = this.form.querySelector(`.form-group[data-field-id="${fieldId}"]`);
      if (!group || group.dataset.unifiedHidden === '1') return;
      if (!this.isServiceFieldGroup(group)) return;

      delete group.dataset.progressiveHidden;
      group.style.display = '';

      const fieldInput = group.querySelector('.field-input');
      if (fieldInput) fieldInput.style.display = '';

      let container = this.progressive.getServiceContainer(fieldId);

      if (!container) {
        const host = group.querySelector(`.service-field-container[data-field-id="${fieldId}"]`);
        const fieldData = this.progressive.getFieldData(fieldId);
        const structure = fieldData?.enhancedServiceStructure || fieldData?.serviceStructure || [];

        if (host && structure.length > 0) {
          this.progressive.convertToProgressiveSelector(host, fieldData);
          container = this.progressive.getServiceContainer(fieldId);
        }
      }

      if (!container) return;

      this.progressive.ensureServiceContainerVisible(container);

      const preserveSelection =
        hasPostServiceOnStep || this.progressive.isServiceReadyForPostFields(container);

      const state = stateByField.get(fieldId);
      if (state && !preserveSelection) {
        this.progressive.applyUnifiedServiceState(state);
      } else if (!state) {
        this.progressive.showStep(container, 1);
      }

      const activeInternal =
        container.querySelector('.step-container.active') ||
        container.querySelector('.step-container.step-1');

      if (activeInternal) {
        activeInternal.style.display = 'block';
        activeInternal.classList.add('active');

        const select = activeInternal.querySelector('select.step-select, select.category-select');
        if (select) {
          select.style.display = '';
          select.disabled = false;
        }
      }
    });
  }

  bindSubmitValidation() {
    this.form.addEventListener('submit', (e) => {
      if (!this.form.classList.contains('unified-multi-step-form')) return;

      let valid = true;
      this.form.querySelectorAll('.final-service-value[data-unified-required]').forEach((input) => {
        if (!input.value.trim()) valid = false;
      });

      if (valid && window.QuoteSummaryEngine && !window.QuoteSummaryEngine.validateTerms()) {
        e.preventDefault();
        alert('Please accept the terms and conditions before submitting.');
        return;
      }

      if (!valid) {
        e.preventDefault();
        alert('Please complete the service selection before submitting.');
      }
    });
  }

  validateCurrentStep() {
    const step = this.steps[this.currentStep];
    const { fieldIds, serviceStates } = this.getFieldGroupsForStep(step);
    let valid = true;
    let firstInvalid = null;

    fieldIds.forEach((fieldId) => {
      if (this.isFormSummaryFieldId(fieldId)) return;

      const group = this.form.querySelector(`.form-group[data-field-id="${fieldId}"]`);
      if (!group || group.dataset.unifiedHidden === '1') return;
      if (group.style.display === 'none') return;

      group.querySelectorAll('[required]').forEach((input) => {
        if (!this.shouldValidateFormInput(input, group)) return;
        if (input.type === 'hidden' && input.closest('.progressive-service-selector')) return;

        if (input.type === 'radio') {
          const checked = group.querySelector(`input[name="${input.name}"]:checked`);
          if (!checked) {
            valid = false;
            if (!firstInvalid) firstInvalid = input;
          }
          return;
        }

        if (input.type === 'checkbox') {
          return;
        }

        if (!input.value.trim()) {
          valid = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });
    });

    for (const state of serviceStates) {
      const group = this.form.querySelector(`.form-group[data-field-id="${state.fieldId}"]`);
      if (!group || group.dataset.unifiedHidden === '1' || group.style.display === 'none') continue;

      const container = group.querySelector('.progressive-service-selector');
      if (container && this.progressive?.isServiceReadyForPostFields(container)) {
        continue;
      }

      if (
        container &&
        (container.dataset.pendingInlineReveal === '1' || container.dataset.pendingInternalStep)
      ) {
        if (state.mode === 'categories') {
          const select = container.querySelector('.category-select');
          if (!select?.value) {
            valid = false;
            if (!firstInvalid) firstInvalid = select;
          }
        } else if (state.mode === 'options') {
          const physicalStep = state.internalStep || state.physicalStep || 2;
          const stepEl = container.querySelector(`.step-container.step-${physicalStep}`);
          const select = stepEl?.querySelector(':scope > select.service-select');
          if (!select?.value) {
            valid = false;
            if (!firstInvalid) firstInvalid = select;
          }
        }
        continue;
      }

      if (!this.progressive?.validateUnifiedServiceState(state)) {
        valid = false;
        if (!firstInvalid) {
          firstInvalid = container?.querySelector('.category-select, select.step-select');
        }
      }
    }

    if (!valid && firstInvalid) {
      firstInvalid.focus();
    }

    return valid;
  }

  nextStep() {
    if (this.hasPendingServiceNavigationOnCurrentStep()) {
      if (!this.validateCurrentStep()) {
        alert(this.getValidationMessage());
        return;
      }
      if (this.handlePendingServiceNavigation()) {
        return;
      }
    }

    const readyForPostService =
      this.isServiceReadyForPostFields() && this.ensurePostServiceFields() > 0;

    if (readyForPostService && this.handlePostServiceFieldTransition()) {
      return;
    }

    if (!this.validateCurrentStep()) {
      alert(this.getValidationMessage());
      return;
    }

    if (this.handlePendingServiceNavigation()) {
      return;
    }

    if (this.handlePostServiceFieldTransition()) {
      return;
    }

    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  }

  prevStep() {
    if (this.currentStep <= 0) return;

    const current = this.steps[this.currentStep];
    if (current?.dynamic) {
      const optionToken = current.tokens.find((t) => t.type === 'service_options_level');
      if (optionToken) {
        const container = this.progressive?.getServiceContainer(optionToken.fieldId);
        if (container) {
          container.dataset.pendingInternalStep = String(optionToken.internalStep || 2);
          container.dataset.pendingParentJson = JSON.stringify(optionToken.parentItem || null);
          this.progressive.showStep(container, Math.max(1, (optionToken.internalStep || 2) - 1));
        }
      }

      const removedFieldIds = current.tokens
        .filter((t) => t.type === 'field')
        .map((t) => t.fieldId);
      this.postServiceIndex = Math.max(
        0,
        this.postServiceIndex - removedFieldIds.filter((id) => this.isPostServiceFieldId(id)).length
      );

      this.steps.splice(this.currentStep, 1);
      this.steps.forEach((step, i) => {
        step.index = i;
      });
      this.rebuildProgressUI();
    }

    this.showStep(this.currentStep - 1);
  }
}

window.UnifiedFormSteps = UnifiedFormSteps;
