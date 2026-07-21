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
    const pageMeta = UnifiedFormSteps.buildFormPageMeta(this.fields);
    this.formPageStepCount = pageMeta.pageCount;
    this.formStepLabels = pageMeta.labels;
    this.fieldIdToPage = pageMeta.fieldIdToPage;

    const plan = UnifiedFormSteps.buildStepPlan(this.fields, this.fieldIdToPage);
    this.steps = plan.steps;
    this.baseSteps = JSON.parse(JSON.stringify(plan.steps));
    this.postServiceFields = plan.postServiceFields;
    this.serviceFieldId = plan.serviceFieldId;
    this.serviceFieldIds = plan.serviceFieldIds || (plan.serviceFieldId ? [plan.serviceFieldId] : []);
    this.postServiceIndex = 0;
    this.currentStep = 0;

    const lastServiceFieldId =
      this.serviceFieldIds[this.serviceFieldIds.length - 1] || this.serviceFieldId;

    if (!this.postServiceFields.length && lastServiceFieldId) {
      const fromDom = UnifiedFormSteps.collectPostServiceFieldsFromDom(
        lastServiceFieldId,
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

  static isFormSummaryField(field) {
    return field?.type === 'form_summary';
  }

  static STEP_LABEL_FIRST = 'Getting Started';
  static STEP_LABEL_LAST = 'Final Quote';
  static STEP_LABEL_SKIP_TYPES = new Set(['page_break', 'page-break', 'section_break', 'html', 'divider']);

  static formatStepLabel(text) {
    if (window.QuoteMateTextFormat?.formatDisplayName) {
      return window.QuoteMateTextFormat.formatDisplayName(text);
    }
    return String(text ?? '').trim();
  }

  /**
   * Group fields into pages while tracking which page break opened each page.
   * Rules (canvas order is always respected):
   * - A page break closes the current page and opens a new one attributed to that break.
   * - A Service Selector / Summary always begins its OWN dedicated page.
   * - When a page break sits directly before a Service Selector (empty break-page), that
   *   empty page is preserved so the break's step appears BEFORE the service step.
   * Returns an array of { fields, pageBreak } entries.
   */
  static groupFieldsIntoPagesWithMeta(fields) {
    const pages = [];
    let currentFields = [];
    let currentBreak = null;
    let sawBreakSincePush = false;

    const startsOwnPage = (field) =>
      UnifiedFormSteps.isServiceLayoutField(field) ||
      UnifiedFormSteps.isFormSummaryField(field);

    const commit = () => {
      pages.push({ fields: currentFields, pageBreak: currentBreak });
      currentFields = [];
      currentBreak = null;
    };

    for (const field of fields || []) {
      if (UnifiedFormSteps.isPageBreak(field)) {
        if (currentFields.length) {
          commit();
        }
        currentBreak = field;
        sawBreakSincePush = true;
        continue;
      }

      if (startsOwnPage(field)) {
        if (currentFields.length) {
          commit();
        } else if (sawBreakSincePush && pages.length > 0) {
          // Page break directly precedes this service/summary → keep the break's empty page.
          commit();
        }
        currentFields.push(field);
        sawBreakSincePush = false;
        continue;
      }

      currentFields.push(field);
      sawBreakSincePush = false;
    }

    if (currentFields.length || !pages.length) {
      commit();
    }

    return pages;
  }

  static groupFieldsIntoPages(fields) {
    return UnifiedFormSteps.groupFieldsIntoPagesWithMeta(fields).map((page) => page.fields);
  }

  static getFirstFieldLabelForPage(pageFields) {
    for (const field of pageFields || []) {
      if (UnifiedFormSteps.STEP_LABEL_SKIP_TYPES.has(field?.type)) {
        continue;
      }

      const label = (field?.label || '').trim();
      if (label) {
        return label;
      }
    }

    return null;
  }

  static getPageBreaksInOrder(fields) {
    return (fields || []).filter((field) => UnifiedFormSteps.isPageBreak(field));
  }

  /**
   * Title resolution for every navigation step: custom Step Title (if not empty)
   * -> field Label -> existing fallback.
   *   - Middle steps: page break `step_title` -> first field label -> `Step N`.
   *   - Final/summary step: form_summary `stepTitle` -> `Final Quote`.
   *   - First step: `Getting Started` (no custom title source), matching the admin builder.
   */
  static buildStepLabelsFromPages(pagesMeta = []) {
    const pageCount = Math.max(1, pagesMeta.length);

    return pagesMeta.map((page, index) => {
      const pageFields = page?.fields || [];

      if (index === 0) {
        return UnifiedFormSteps.STEP_LABEL_FIRST;
      }

      // Title is resolved from the page break that OPENED this page (not a positional
      // guess), so empty/synthetic pages never shift titles onto the wrong step.
      const customTitle = String(page?.pageBreak?.step_title || '').trim();

      if (index === pageCount - 1) {
        const summaryField = pageFields.find((field) => field?.type === 'form_summary');
        if (summaryField) {
          const summaryTitle = String(summaryField.stepTitle || '').trim();
          return summaryTitle || UnifiedFormSteps.STEP_LABEL_LAST;
        }
        if (customTitle) {
          return customTitle;
        }
        return (
          UnifiedFormSteps.formatStepLabel(
            UnifiedFormSteps.getFirstFieldLabelForPage(pageFields)
          ) || UnifiedFormSteps.STEP_LABEL_LAST
        );
      }

      if (customTitle) {
        return customTitle;
      }
      return UnifiedFormSteps.formatStepLabel(
        UnifiedFormSteps.getFirstFieldLabelForPage(pageFields)
      ) || `Step ${index + 1}`;
    });
  }

  static buildFormPageMeta(fields) {
    const pagesMeta = UnifiedFormSteps.groupFieldsIntoPagesWithMeta(fields);
    const labels = UnifiedFormSteps.buildStepLabelsFromPages(pagesMeta);
    const fieldIdToPage = new Map();

    pagesMeta.forEach((page, pageIndex) => {
      (page.fields || []).forEach((field) => {
        if (field?.id) {
          fieldIdToPage.set(field.id, pageIndex);
        }
      });
    });

    return {
      pageCount: Math.max(1, labels.length),
      labels,
      fieldIdToPage,
    };
  }

  static resolvePageBreakAlign(align) {
    const value = String(align || 'center').toLowerCase();
    return ['left', 'center', 'right'].includes(value) ? value : 'center';
  }

  static getPageBreakNavAlignClass(align) {
    return `quotemate-form-navigation--align-${UnifiedFormSteps.resolvePageBreakAlign(align)}`;
  }

  static getPageBreakAfterFormPage(fields, pageIndex) {
    let currentPage = 0;
    for (const field of fields || []) {
      if (!UnifiedFormSteps.isPageBreak(field)) {
        continue;
      }
      if (currentPage === pageIndex) {
        return field;
      }
      currentPage++;
    }
    return null;
  }

  static resolvePageBreakButtonBackground(pageBreak) {
    const custom = pageBreak?.page_break_button_color;
    if (custom && /^#[0-9A-Fa-f]{3,8}$/i.test(String(custom).trim())) {
      return String(custom).trim();
    }

    const wrapper = document.querySelector('.quotemate-form-wrapper');
    if (wrapper) {
      const styles = getComputedStyle(wrapper);
      const buttonBg = styles.getPropertyValue('--qm-button-bg').trim();
      if (buttonBg) {
        return buttonBg;
      }
      const buttonColor = styles.getPropertyValue('--qm-button-color').trim();
      if (buttonColor) {
        return buttonColor;
      }
    }

    return '';
  }

  static getPageBreakIndex(fields, pageBreakField) {
    if (!pageBreakField?.id) {
      return 0;
    }
    let index = 0;
    for (const field of fields || []) {
      if (!UnifiedFormSteps.isPageBreak(field)) {
        continue;
      }
      if (field.id === pageBreakField.id) {
        return index;
      }
      index++;
    }
    return 0;
  }

  static resolvePageBreakPrevButtonBackground(pageBreak) {
    const custom = pageBreak?.page_break_prev_button_color;
    if (custom && /^#[0-9A-Fa-f]{3,8}$/i.test(String(custom).trim())) {
      return String(custom).trim();
    }

    const wrapper = document.querySelector('.quotemate-form-wrapper');
    if (wrapper) {
      const styles = getComputedStyle(wrapper);
      const secondaryBg = styles.getPropertyValue('--qm-secondary-btn-bg').trim();
      if (secondaryBg) {
        return secondaryBg;
      }
    }

    return '#faf8f4';
  }

  static getPageBreakButtonSpacingStyle(pageBreak, variant = 'next') {
    const marginPrefix = variant === 'prev' ? 'stylePrevMargin' : 'styleMargin';
    const paddingPrefix = variant === 'prev' ? 'stylePrevPadding' : 'stylePadding';
    const toCss = (val, unit) => {
      if (val === '' || val == null) return '';
      const num = String(val).replace(/[^\d.-]/g, '');
      return num !== '' ? `${num}${unit || 'px'}` : '';
    };
    const styles = [];
    const marginUnit = pageBreak?.[`${marginPrefix}Unit`] || 'px';
    const paddingUnit = pageBreak?.[`${paddingPrefix}Unit`] || 'px';
    ['Top', 'Right', 'Bottom', 'Left'].forEach((side) => {
      const marginVal = toCss(pageBreak?.[`${marginPrefix}${side}`], marginUnit);
      if (marginVal) styles.push(`margin-${side.toLowerCase()}:${marginVal}`);
      const paddingVal = toCss(pageBreak?.[`${paddingPrefix}${side}`], paddingUnit);
      if (paddingVal) styles.push(`padding-${side.toLowerCase()}:${paddingVal}`);
    });
    return styles.join(';');
  }

  static mapAlignToJustify(align) {
    const value = UnifiedFormSteps.resolvePageBreakAlign(align);
    if (value === 'left') return 'start';
    if (value === 'right') return 'end';
    return 'center';
  }

  static shouldShowPageBreakPrevious(pageBreak) {
    const value = pageBreak?.show_previous_button;
    if (value === false || value === 'false' || value === 0 || value === '0') {
      return false;
    }
    return true;
  }

  applyPageBreakNavigationSettings(pageBreak, showNext, showPrev = false) {
    const nav = this.navEl || this.form?.querySelector('.unified-form-navigation');
    if (!nav) {
      return;
    }

    ['left', 'center', 'right'].forEach((align) => {
      nav.classList.remove(`quotemate-form-navigation--align-${align}`);
    });

    const activePageBreak = showNext ? pageBreak : null;
    const hasNavRow = !!activePageBreak && UnifiedFormSteps.getPageBreakIndex(this.fields, activePageBreak) > 0;
    const showPrevButton = hasNavRow && showPrev && UnifiedFormSteps.shouldShowPageBreakPrevious(activePageBreak);
    nav.classList.toggle('quotemate-form-navigation--has-page-break', !!activePageBreak);
    nav.classList.toggle('quotemate-form-navigation--dual', hasNavRow);
    nav.classList.toggle('quotemate-form-navigation--prev-hidden', hasNavRow && !showPrevButton);

    if (activePageBreak && hasNavRow) {
      const align = UnifiedFormSteps.resolvePageBreakAlign(activePageBreak.page_break_align);
      nav.classList.add(`quotemate-form-navigation--align-${align}`);
    } else if (activePageBreak && !hasNavRow) {
      const align = UnifiedFormSteps.resolvePageBreakAlign(activePageBreak.page_break_align);
      nav.classList.add(`quotemate-form-navigation--align-${align}`);
    }

    if (activePageBreak) {
      const marginUnit = activePageBreak.styleMarginUnit || 'px';
      const paddingUnit = activePageBreak.stylePaddingUnit || 'px';
      const toCss = (val, unit) => {
        if (val === '' || val == null) return '';
        const num = String(val).replace(/[^\d.-]/g, '');
        return num !== '' ? `${num}${unit || 'px'}` : '';
      };
      const spacingMap = [
        ['styleMarginTop', 'marginTop', marginUnit],
        ['styleMarginRight', 'marginRight', marginUnit],
        ['styleMarginBottom', 'marginBottom', marginUnit],
        ['styleMarginLeft', 'marginLeft', marginUnit],
        ['stylePaddingTop', 'paddingTop', paddingUnit],
        ['stylePaddingRight', 'paddingRight', paddingUnit],
        ['stylePaddingBottom', 'paddingBottom', paddingUnit],
        ['stylePaddingLeft', 'paddingLeft', paddingUnit],
      ];
      spacingMap.forEach(([sourceKey, cssKey, unit]) => {
        const value = toCss(activePageBreak[sourceKey], unit);
        nav.style[cssKey] = value || '';
      });
    } else {
      [
        'marginTop',
        'marginRight',
        'marginBottom',
        'marginLeft',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
      ].forEach((key) => nav.style.removeProperty(key));
    }

    const descNodes = nav.querySelectorAll('.quotemate-form-field__page-break-desc');
    descNodes.forEach((node) => node.remove());

    if (activePageBreak?.page_description) {
      const desc = document.createElement('p');
      desc.className = 'quotemate-form-field__page-break-desc';
      desc.textContent = activePageBreak.page_description;
      nav.insertBefore(desc, nav.firstChild);
    }
    if (hasNavRow && activePageBreak?.page_prev_description) {
      const prevDesc = document.createElement('p');
      prevDesc.className = 'quotemate-form-field__page-break-desc quotemate-form-field__page-break-desc--prev';
      prevDesc.textContent = activePageBreak.page_prev_description;
      nav.insertBefore(prevDesc, nav.firstChild);
    }

    const applyButtonSpacing = (button, variant) => {
      if (!button) return;
      const spacing = UnifiedFormSteps.getPageBreakButtonSpacingStyle(activePageBreak, variant);
      ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach((key) => {
        button.style[key] = '';
      });
      if (!spacing) return;
      spacing.split(';').filter(Boolean).forEach((rule) => {
        const [prop, val] = rule.split(':');
        if (!prop || val == null) return;
        const camel = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        button.style[camel] = val.trim();
      });
    };

    if (this.nextBtn) {
      if (activePageBreak) {
        const label = String(activePageBreak.page_title || '').trim() || 'Continue';
        const btnText = this.nextBtn.querySelector('.btn-text');
        if (btnText) {
          btnText.textContent = label;
        } else {
          this.nextBtn.textContent = label;
        }
        const bg = UnifiedFormSteps.resolvePageBreakButtonBackground(activePageBreak);
        if (bg) {
          this.nextBtn.style.background = bg;
        } else {
          this.nextBtn.style.removeProperty('background');
        }
        applyButtonSpacing(this.nextBtn, 'next');
      } else {
        const btnText = this.nextBtn.querySelector('.btn-text');
        if (btnText) {
          btnText.textContent = 'Continue';
        } else {
          this.nextBtn.textContent = 'Continue';
        }
        this.nextBtn.style.removeProperty('background');
      }
    }

    if (this.prevBtn) {
      if (activePageBreak && hasNavRow && showPrevButton) {
        const label = String(activePageBreak.page_prev_title || '').trim() || 'Previous';
        this.prevBtn.textContent = label;
        const bg = UnifiedFormSteps.resolvePageBreakPrevButtonBackground(activePageBreak);
        if (bg) {
          this.prevBtn.style.background = bg;
        } else {
          this.prevBtn.style.removeProperty('background');
        }
        applyButtonSpacing(this.prevBtn, 'prev');
      } else if (!showPrevButton) {
        this.prevBtn.textContent = 'Previous';
        this.prevBtn.style.removeProperty('background');
        ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach((key) => {
          this.prevBtn.style[key] = '';
        });
      }
    }

    this.ensureNavigationButtonOrder();
  }

  static resolveFormPageIndexForTokens(tokens, fieldIdToPage) {
    for (const token of tokens || []) {
      // An empty page (page break directly before a service) sits on the page
      // immediately before that service's page.
      if (token.type === 'empty_page' && token.fieldId && fieldIdToPage.has(token.fieldId)) {
        return Math.max(0, fieldIdToPage.get(token.fieldId) - 1);
      }
      if (token.type === 'field' && token.fieldId && fieldIdToPage.has(token.fieldId)) {
        return fieldIdToPage.get(token.fieldId);
      }

      if (
        token.fieldId &&
        (token.type === 'service_categories' ||
          token.type === 'service_options_level' ||
          token.type === 'service_options')
      ) {
        if (fieldIdToPage.has(token.fieldId)) {
          return fieldIdToPage.get(token.fieldId);
        }
      }
    }

    return 0;
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

  static isServiceLayoutField(field) {
    return !!field && (field.type === 'service' || field.type === 'service_options');
  }

  /**
   * Split form into pre-service tokens, an ordered list of ALL service fields, and the
   * post-service field queue (fields after the LAST service, with pageBreakAfter flags).
   * Supports multiple Service Selectors placed sequentially on the form.
   */
  static parseFormLayout(fields) {
    const list = fields || [];
    const preServiceFields = [];
    const postServiceFields = [];
    const serviceFields = [];
    let seenService = false;
    const skipTypes = ['section_break'];

    let lastServiceIndex = -1;
    for (let i = 0; i < list.length; i++) {
      if (UnifiedFormSteps.isServiceLayoutField(list[i])) lastServiceIndex = i;
    }

    for (let i = 0; i < list.length; i++) {
      const field = list[i];
      const afterLastService = i > lastServiceIndex;

      if (UnifiedFormSteps.isPageBreak(field)) {
        if (!seenService && preServiceFields.length) {
          const last = preServiceFields[preServiceFields.length - 1];
          if (last?.type !== 'page_break') {
            preServiceFields.push({ type: 'page_break', source: 'form' });
          }
        } else if (afterLastService && postServiceFields.length) {
          postServiceFields[postServiceFields.length - 1].pageBreakAfter = true;
        }
        continue;
      }

      if (skipTypes.includes(field.type)) continue;

      if (UnifiedFormSteps.isServiceLayoutField(field)) {
        seenService = true;
        serviceFields.push(field);
        continue;
      }

      if (!seenService) {
        // Summary always starts its own step even without a preceding page break.
        if (
          UnifiedFormSteps.isFormSummaryField(field) &&
          preServiceFields.some((item) => item.type === 'field') &&
          preServiceFields[preServiceFields.length - 1]?.type !== 'page_break'
        ) {
          preServiceFields.push({ type: 'page_break', source: 'summary' });
        }
        preServiceFields.push({ type: 'field', fieldId: field.id, field });
      } else if (afterLastService && UnifiedFormSteps.isQueueableFormField(field)) {
        // Only fields AFTER the final Service Selector are queued as post-service fields.
        // Summary always begins its own post-service group (its own dedicated page).
        if (UnifiedFormSteps.isFormSummaryField(field) && postServiceFields.length) {
          postServiceFields[postServiceFields.length - 1].pageBreakAfter = true;
        }
        postServiceFields.push({
          type: 'field',
          fieldId: field.id,
          field,
          pageBreakAfter: false,
        });
      }
    }

    return {
      preServiceFields,
      serviceField: serviceFields[0] || null,
      serviceFields,
      postServiceFields,
    };
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
    const { preServiceFields, serviceFields, postServiceFields } = UnifiedFormSteps.parseFormLayout(fields);
    const tokens = UnifiedFormSteps.linearizePreServiceFields(preServiceFields);

    // Linearize EACH Service Selector in order so every one becomes its own step(s).
    (serviceFields || []).forEach((serviceField) => {
      const structure = serviceField.enhancedServiceStructure || serviceField.serviceStructure || [];
      const hasPriorContent = tokens.some(
        (t) => t.type === 'field' || t.type === 'service_categories' || t.type === 'empty_page'
      );
      const lastToken = tokens[tokens.length - 1];

      if (lastToken?.type === 'page_break') {
        // A page break sits directly before this Service Selector. The break owns its own
        // (empty) page/step in canvas order; the service then starts on the next step.
        tokens.push({ type: 'empty_page', fieldId: serviceField.id });
        tokens.push({ type: 'page_break', source: 'implicit_before_service', fieldId: serviceField.id });
      } else if (hasPriorContent) {
        tokens.push({ type: 'page_break', source: 'implicit_before_service', fieldId: serviceField.id });
      }

      if (structure.length > 0) {
        tokens.push(...UnifiedFormSteps.linearizeServiceStructure(structure, serviceField.id));
      } else {
        tokens.push({ type: 'field', fieldId: serviceField.id });
      }
    });

    return {
      tokens,
      postServiceFields,
      serviceFieldId: serviceFields?.[0]?.id || null,
      serviceFieldIds: (serviceFields || []).map((f) => f.id),
    };
  }

  static buildStepsFromTokens(tokens, fieldIdToPage = new Map()) {
    const breakCount = tokens.filter((t) => t.type === 'page_break').length;
    if (breakCount === 0) {
      if (!tokens.length) return [];
      return [
        {
          index: 0,
          tokens: tokens.slice(),
          formPageIndex: UnifiedFormSteps.resolveFormPageIndexForTokens(tokens, fieldIdToPage),
        },
      ];
    }

    const steps = [];
    let current = [];

    const pushStep = () => {
      if (!current.length) return;
      steps.push({
        tokens: current.slice(),
        formPageIndex: UnifiedFormSteps.resolveFormPageIndexForTokens(current, fieldIdToPage),
      });
      current = [];
    };

    for (const token of tokens) {
      if (token.type === 'page_break') {
        pushStep();
      } else {
        current.push(token);
      }
    }

    pushStep();

    return steps
      .filter((step) => step.tokens.length > 0)
      .map((step, index) => ({ index, ...step }));
  }

  static buildStepPlan(fields, fieldIdToPage = null) {
    const pageMeta = fieldIdToPage ? null : UnifiedFormSteps.buildFormPageMeta(fields);
    const pageMap = fieldIdToPage || pageMeta.fieldIdToPage;
    const { tokens, postServiceFields, serviceFieldId, serviceFieldIds } = UnifiedFormSteps.linearizeFormFields(fields);
    return {
      steps: UnifiedFormSteps.buildStepsFromTokens(tokens, pageMap),
      postServiceFields,
      serviceFieldId,
      serviceFieldIds: serviceFieldIds || (serviceFieldId ? [serviceFieldId] : []),
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
        if (!this.serviceFieldIds?.length) {
          this.serviceFieldIds = [this.serviceFieldId];
        }
      }
    }

    if (!this.serviceFieldId) return 0;

    const lastServiceFieldId =
      this.getAllServiceFieldIds().slice(-1)[0] || this.serviceFieldId;

    const fromJson = UnifiedFormSteps.parseFormLayout(
      UnifiedFormSteps.getLayoutFields(this.fields)
    ).postServiceFields;
    const fromDom = UnifiedFormSteps.collectPostServiceFieldsFromDom(
      lastServiceFieldId,
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

  hideLegacyProgressUI() {
    this.form.querySelectorAll('.step-progress:not(.unified-step-progress)').forEach((el) => {
      el.style.display = 'none';
    });
  }

  restoreBaseSteps() {
    if (!this.baseSteps?.length) return;
    this.steps = JSON.parse(JSON.stringify(this.baseSteps));
    this.steps.forEach((step, i) => {
      step.index = i;
      delete step.dynamic;
    });
    this.postServiceIndex = 0;
    this.hidePostServiceFieldsExcept(new Set());
    this.rebuildProgressUI();
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

    this.hideLegacyProgressUI();
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

  getDisplayFormPageIndex() {
    const step = this.steps[this.currentStep];
    if (!step) return 0;
    if (step.formPageIndex != null) return step.formPageIndex;
    return UnifiedFormSteps.resolveFormPageIndexForTokens(step.tokens, this.fieldIdToPage);
  }

  getServiceFormPageIndex() {
    const activeId = this.getActiveServiceFieldId();
    if (!activeId) return -1;
    if (this.fieldIdToPage?.has(activeId)) {
      return this.fieldIdToPage.get(activeId);
    }
    return -1;
  }

  isOnServiceUnifiedStep() {
    const step = this.steps[this.currentStep];
    if (!step) return false;

    return step.tokens.some(
      (token) =>
        token.type === 'service_categories' ||
        token.type === 'service_options_level' ||
        (token.type === 'field' && this.isServiceFieldId(token.fieldId))
    );
  }

  getServiceCascadeProgress() {
    if (!this.progressive) return null;

    const activeId = this.getActiveServiceFieldId();
    if (!activeId) return null;

    const container = this.progressive.getServiceContainer(activeId);
    if (!container) return null;

    const navSteps = this.progressive.getCascadeDisplaySteps(container);
    if (!navSteps.length) return null;

    return {
      container,
      labels: navSteps.map((step, i) =>
        i === 0 ? this.resolveServiceRootLabel(activeId, step.label) : step.label
      ),
      activeIndex: this.progressive.getCascadeNavigationActiveIndex(container),
      navSteps,
    };
  }

  getMergedActiveIndex(cascade, servicePageIndex) {
    const formPageIndex = this.getDisplayFormPageIndex();
    const cascadeCount = cascade.labels.length;
    const extraSteps = cascadeCount - 1;

    if (formPageIndex < servicePageIndex) {
      return formPageIndex;
    }

    if (this.isOnServiceUnifiedStep()) {
      return servicePageIndex + cascade.activeIndex;
    }

    if (formPageIndex > servicePageIndex) {
      return formPageIndex + extraSteps;
    }

    return servicePageIndex + Math.max(0, cascadeCount - 1);
  }

  buildMergedProgressLabels(cascadeLabels, servicePageIndex) {
    const baseLabels = [...(this.formStepLabels || [])];
    if (servicePageIndex < 0 || !cascadeLabels.length) {
      return baseLabels;
    }

    const before = baseLabels.slice(0, servicePageIndex);
    const after = baseLabels.slice(servicePageIndex + 1);
    return [...before, ...cascadeLabels, ...after];
  }

  showServiceStepWithCascade(cascadeNavIndex) {
    const serviceStepIndex = this.getServiceStepIndex();
    if (serviceStepIndex < 0) return;

    const container = this.getServiceContainer();
    const wasOnServiceStep = this.currentStep === serviceStepIndex;

    if (!wasOnServiceStep) {
      this.showStep(serviceStepIndex);
    } else if (container) {
      this.progressive?.ensureServiceContainerVisible(container);
    }

    if (container && this.progressive) {
      this.progressive.showPageByNavigationIndex(container, cascadeNavIndex);
      this.syncCascadeProgressFromService(container);
      this.updateNavigationButtons();
    }
  }

  showStepThenCascade(stepIndex, fieldId, cascadeNavIndex) {
    if (this.currentStep !== stepIndex) {
      this.showStep(stepIndex);
    }

    const container = this.progressive?.getServiceContainer(fieldId);
    if (container && this.progressive) {
      this.progressive.showPageByNavigationIndex(container, cascadeNavIndex);
      this.syncCascadeProgressFromService(container);
      this.updateNavigationButtons();
    }
  }

  navigateToProgressIndex(displayIndex) {
    const state = this.getProgressDisplayState();
    if (displayIndex > state.activeIndex) return;

    if (state.isMultiService && Array.isArray(state.nodes)) {
      const node = state.nodes[displayIndex];
      if (!node) return;
      if (node.serviceFieldId) {
        const stepIndex = this.getStepIndexForServiceField(node.serviceFieldId);
        if (stepIndex >= 0) {
          this.showStepThenCascade(stepIndex, node.serviceFieldId, node.cascadeNavIndex || 0);
        }
      } else if (node.formPageIndex != null) {
        const targetUnified = this.findUnifiedStepIndexForFormPage(node.formPageIndex);
        if (targetUnified >= 0) this.showStep(targetUnified);
      }
      return;
    }

    if (state.cascade && state.servicePageIndex >= 0) {
      const { servicePageIndex, cascade } = state;
      const cascadeCount = cascade.labels.length;
      const extraSteps = cascadeCount - 1;

      if (displayIndex < servicePageIndex) {
        const targetUnified = this.findUnifiedStepIndexForFormPage(displayIndex);
        if (targetUnified >= 0) this.showStep(targetUnified);
        return;
      }

      if (displayIndex >= servicePageIndex && displayIndex < servicePageIndex + cascadeCount) {
        this.showServiceStepWithCascade(displayIndex - servicePageIndex);
        return;
      }

      const formPageIndex = displayIndex - extraSteps;
      const targetUnified = this.findUnifiedStepIndexForFormPage(formPageIndex);
      if (targetUnified >= 0) this.showStep(targetUnified);
      return;
    }

    if (displayIndex < this.getDisplayFormPageIndex()) {
      const targetUnified = this.findUnifiedStepIndexForFormPage(displayIndex);
      if (targetUnified >= 0) this.showStep(targetUnified);
    }
  }

  isMultiServiceMode() {
    return this.getAllServiceFieldIds().length > 1;
  }

  /**
   * Service Selector root step title: custom Step Title -> field Label -> cascade default.
   * (Service fields have no dedicated step-title input today, but `step_title` is honored
   * if present so the rule is uniform across all step types.)
   */
  resolveServiceRootLabel(fieldId, cascadeRootLabel) {
    const field = (this.fields || []).find((f) => f.id === fieldId);
    const custom = String(field?.step_title || '').trim();
    if (custom) return UnifiedFormSteps.formatStepLabel(custom);
    const label = String(field?.label || '').trim();
    if (label) return UnifiedFormSteps.formatStepLabel(label);
    return cascadeRootLabel || 'Service';
  }

  getStepIndexForServiceField(fieldId) {
    return this.steps.findIndex((step) =>
      step.tokens?.some(
        (token) =>
          (token.type === 'service_categories' ||
            token.type === 'service_options_level' ||
            token.type === 'field') &&
          token.fieldId === fieldId
      )
    );
  }

  /**
   * MULTI-SERVICE NAVIGATION MODEL.
   * Uses the form-page backbone (so every step — including not-yet-reached ones like the
   * Final Quote — is visible up front), but the page slot occupied by Service Selectors is
   * expanded so EACH selector owns its own permanent root node plus its revealed child
   * steps. Nodes are never reused across selectors; completed selectors keep their child
   * nodes visible with the existing completed styling.
   */
  buildMultiServiceNavModel() {
    const baseLabels = this.formStepLabels || [];
    const pageCount = Math.max(baseLabels.length, this.formPageStepCount || 0, 1);

    const servicesByPage = new Map();
    this.getAllServiceFieldIds().forEach((fieldId) => {
      const page = this.fieldIdToPage?.get(fieldId);
      const key = page == null ? -1 : page;
      if (!servicesByPage.has(key)) servicesByPage.set(key, []);
      servicesByPage.get(key).push(fieldId);
    });

    const nodes = [];

    const pushServiceNodes = (fieldId) => {
      const container = this.progressive?.getServiceContainer(fieldId);
      const cascadeSteps = container
        ? this.progressive.getCascadeDisplaySteps(container)
        : [];

      if (cascadeSteps.length) {
        cascadeSteps.forEach((cascadeStep, cascadeNavIndex) => {
          const label =
            cascadeNavIndex === 0
              ? this.resolveServiceRootLabel(fieldId, cascadeStep.label)
              : cascadeStep.label;
          nodes.push({ label, serviceFieldId: fieldId, cascadeNavIndex });
        });
      } else {
        nodes.push({
          label: this.resolveServiceRootLabel(fieldId, null),
          serviceFieldId: fieldId,
          cascadeNavIndex: 0,
        });
      }
    };

    if (servicesByPage.has(-1)) {
      servicesByPage.get(-1).forEach(pushServiceNodes);
    }

    for (let page = 0; page < pageCount; page++) {
      if (servicesByPage.has(page)) {
        servicesByPage.get(page).forEach(pushServiceNodes);
      } else {
        nodes.push({ label: baseLabels[page] || `Step ${page + 1}`, formPageIndex: page });
      }
    }

    return {
      nodes,
      labels: nodes.map((n) => n.label),
      activeIndex: this.resolveMultiServiceActiveIndex(nodes),
    };
  }

  resolveMultiServiceActiveIndex(nodes) {
    const step = this.steps[this.currentStep];
    let activeServiceId = null;

    if (step) {
      const serviceToken = step.tokens.find(
        (t) =>
          (t.type === 'service_categories' || t.type === 'service_options_level') &&
          this.isServiceFieldId(t.fieldId)
      );
      if (serviceToken) activeServiceId = serviceToken.fieldId;
    }

    if (activeServiceId) {
      const container = this.progressive?.getServiceContainer(activeServiceId);
      const cascadeIndex = container
        ? this.progressive.getCascadeNavigationActiveIndex(container)
        : 0;

      const exact = nodes.findIndex(
        (n) => n.serviceFieldId === activeServiceId && n.cascadeNavIndex === cascadeIndex
      );
      if (exact >= 0) return exact;

      let lastOfService = -1;
      nodes.forEach((n, i) => {
        if (n.serviceFieldId === activeServiceId) lastOfService = i;
      });
      if (lastOfService >= 0) return lastOfService;
    }

    const page = this.getDisplayFormPageIndex();
    const formMatch = nodes.findIndex((n) => !n.serviceFieldId && n.formPageIndex === page);
    if (formMatch >= 0) return formMatch;

    // Post-service fields (e.g. dropdowns) can live on a Service Selector's own page.
    // Their page has no form node, so highlight that selector's last node instead of
    // falling back to an earlier page (which caused later steps to light up "Step 4").
    const serviceIdsOnPage = this.getAllServiceFieldIds().filter(
      (id) => this.fieldIdToPage?.get(id) === page
    );
    if (serviceIdsOnPage.length) {
      const targetId = serviceIdsOnPage[serviceIdsOnPage.length - 1];
      let lastOfService = -1;
      nodes.forEach((n, i) => {
        if (n.serviceFieldId === targetId) lastOfService = i;
      });
      if (lastOfService >= 0) return lastOfService;
    }

    let best = 0;
    nodes.forEach((n, i) => {
      if (!n.serviceFieldId && n.formPageIndex != null && n.formPageIndex <= page) best = i;
    });
    return best;
  }

  getProgressDisplayState() {
    if (this.isMultiServiceMode()) {
      const model = this.buildMultiServiceNavModel();
      return {
        displayCount: Math.max(model.labels.length, 1),
        labels: model.labels,
        activeIndex: model.activeIndex,
        isCascadeMode: true,
        isMultiService: true,
        nodes: model.nodes,
        cascade: null,
        servicePageIndex: -1,
      };
    }

    const cascade = this.getServiceCascadeProgress();
    const servicePageIndex = this.getServiceFormPageIndex();
    const baseLabels = this.formStepLabels || [];

    if (cascade && servicePageIndex >= 0) {
      const labels = this.buildMergedProgressLabels(cascade.labels, servicePageIndex);
      const activeIndex = this.getMergedActiveIndex(cascade, servicePageIndex);

      return {
        displayCount: labels.length,
        labels,
        activeIndex,
        isCascadeMode: true,
        cascade,
        servicePageIndex,
      };
    }

    return {
      displayCount: this.formPageStepCount || Math.max(this.steps.length, 1),
      labels: baseLabels,
      activeIndex: this.getDisplayFormPageIndex(),
      isCascadeMode: false,
      cascade: null,
      servicePageIndex: -1,
    };
  }

  syncCascadeProgressFromService(container) {
    const state = this.getProgressDisplayState();
    const progress = this.form.querySelector('.unified-step-progress');
    const currentCount = progress?.querySelectorAll('.step-indicator').length || 0;

    if (currentCount !== state.displayCount) {
      this.rebuildProgressUI();
      return;
    }

    this.syncStepIndicatorState();
    container?.closest('form')?.querySelector('.service-cascade-step-progress')?.remove();
  }

  escapeStepLabel(text) {
    const formatted = UnifiedFormSteps.formatStepLabel(text);
    return String(formatted)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  syncStepIndicatorState() {
    const state = this.getProgressDisplayState();

    this.stepIndicators?.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === state.activeIndex);
      indicator.classList.toggle('completed', i < state.activeIndex);
    });

    if (this.progressFill) {
      this.progressFill.style.width = `${((state.activeIndex + 1) / state.displayCount) * 100}%`;
    }
  }

  buildProgressUI() {
    const existing = this.form.querySelector('.unified-step-progress');
    if (existing) existing.remove();

    const state = this.getProgressDisplayState();
    const { displayCount, labels, activeIndex } = state;

    const progress = document.createElement('div');
    progress.className = 'step-progress unified-step-progress';
    progress.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${((activeIndex + 1) / displayCount) * 100}%"></div>
      </div>
      <div class="step-indicators">
        ${Array.from({ length: displayCount }, (_, i) => {
          const classes = ['step-indicator'];
          if (i === activeIndex) classes.push('active');
          if (i < activeIndex) classes.push('completed');
          const label = this.escapeStepLabel(labels[i] || `Step ${i + 1}`);
          return `
          <div class="${classes.join(' ')}" data-step="${i}">
            <div class="step-number">${i + 1}</div>
            <div class="step-label">${label}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    this.form.insertBefore(progress, this.form.querySelector('.form-content'));

    let nav = this.form.querySelector('.unified-form-navigation');
    const formContent = this.form.querySelector('.form-content');
    if (!nav) {
      nav = document.createElement('div');
      nav.className = 'form-navigation unified-form-navigation';
      nav.innerHTML = `
        <button type="button" class="btn btn-primary unified-next-step">Continue</button>
        <button type="button" class="btn btn-secondary unified-prev-step" style="display:none;">Previous</button>
      `;
      if (formContent) {
        formContent.appendChild(nav);
      } else {
        this.form.appendChild(nav);
      }
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
        nav.insertBefore(this.submitBtn, this.prevBtn);
      }
      this.ensureNavigationButtonOrder();
    } else if (formContent && !formContent.contains(nav)) {
      formContent.appendChild(nav);
    }

    this.progressFill = progress.querySelector('.progress-fill');
    this.stepIndicators = progress.querySelectorAll('.step-indicator');
    this.navEl = nav;
    this.prevBtn = this.prevBtn || nav.querySelector('.unified-prev-step');
    this.nextBtn = this.nextBtn || nav.querySelector('.unified-next-step');
    this.submitBtn = this.submitBtn || this.form.querySelector('.submit-btn');
    this.ensureNavigationButtonOrder();
  }

  /** Next (left) + Previous (right) in one flush group — no gap between buttons */
  ensureNavigationButtonOrder() {
    const nav = this.navEl || this.form?.querySelector('.unified-form-navigation');
    if (!nav) return;

    this.prevBtn = this.prevBtn || nav.querySelector('.unified-prev-step');
    this.nextBtn = this.nextBtn || nav.querySelector('.unified-next-step');
    this.submitBtn = this.submitBtn || nav.querySelector('.submit-btn') || this.form?.querySelector('.submit-btn');

    let group = nav.querySelector('.quotemate-form-nav-button-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'quotemate-form-nav-button-group';
      nav.appendChild(group);
    }

    if (this.nextBtn) {
      group.appendChild(this.nextBtn);
    }
    if (this.submitBtn) {
      group.appendChild(this.submitBtn);
    }
    if (this.prevBtn) {
      group.appendChild(this.prevBtn);
    }
  }

  syncProgressBar() {
    if (!this.progressFill) {
      this.progressFill = this.form.querySelector('.unified-step-progress .progress-fill');
    }
    if (!this.progressFill) return;
    const state = this.getProgressDisplayState();
    this.progressFill.style.width = `${((state.activeIndex + 1) / state.displayCount) * 100}%`;
  }

  rebuildProgressUI() {
    this.buildProgressUI();
    this.stepIndicators?.forEach((indicator, i) => {
      indicator.addEventListener('click', () => {
        this.navigateToProgressIndex(i);
      });
    });
    this.syncStepIndicatorState();
    this.updateNavigationButtons();
  }

  findUnifiedStepIndexForFormPage(formPageIndex) {
    for (let i = 0; i < this.steps.length; i++) {
      const stepPage = this.steps[i].formPageIndex != null
        ? this.steps[i].formPageIndex
        : UnifiedFormSteps.resolveFormPageIndexForTokens(this.steps[i].tokens, this.fieldIdToPage);
      if (stepPage === formPageIndex) return i;
    }

    let best = 0;
    for (let i = 0; i < this.steps.length; i++) {
      const stepPage = this.steps[i].formPageIndex != null
        ? this.steps[i].formPageIndex
        : UnifiedFormSteps.resolveFormPageIndexForTokens(this.steps[i].tokens, this.fieldIdToPage);
      if (stepPage <= formPageIndex) best = i;
    }
    return best;
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
        this.navigateToProgressIndex(i);
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
    const formPageIndex = fieldMetas.length
      ? (this.fieldIdToPage.get(fieldMetas[0].fieldId) ?? this.getDisplayFormPageIndex())
      : this.getDisplayFormPageIndex();
    const newStep = {
      index: this.currentStep + 1,
      dynamic: true,
      formPageIndex,
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

    // If another Service Selector step still lies ahead, advance to it first instead of
    // revealing post-service fields. After navigating backwards with Previous, a later
    // selector's completion state persists, so isServiceReadyForPostFields() can be true
    // while the user is only at an earlier selector — without this guard the forward flow
    // would skip the later selector entirely.
    if (this.hasServiceStepAfterCurrent()) return false;

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

    if (this.hasAdvanceableInternalInlinePages()) return false;

    // Do not reveal post-service fields until EVERY Service Selector is complete.
    if (!this.isServiceReadyForPostFields()) {
      return false;
    }

    this.insertDynamicFormFieldsStep(group);
    this.refreshConditionalLogic();
    return true;
  }

  /** True when a Service Selector root step exists strictly after the current step. */
  hasServiceStepAfterCurrent() {
    for (let i = this.currentStep + 1; i < this.steps.length; i++) {
      if (this.steps[i]?.tokens?.some((token) => token.type === 'service_categories')) {
        return true;
      }
    }
    return false;
  }

  getServiceStepIndex() {
    return this.steps.findIndex((step) =>
      step.tokens?.some((token) => token.type === 'service_categories')
    );
  }

  prepareServiceCascadeForReentry() {
    const container = this.getServiceContainer();
    if (!container || !this.progressive) return;

    const navSteps = this.progressive.getCascadeNavigationSteps(container);
    if (!navSteps.length) return;

    this.progressive.clearUnifiedPendingState(container);
    this.progressive.showPageByNavigationIndex(container, 0);
  }

  shouldRewindServiceFlow(stepIndex, targetIndex = this.currentStep) {
    // With multiple Service Selectors each owns a permanent navigation node; do not
    // auto-rewind/reset the whole service flow, so completed selectors and their
    // child steps stay visible when navigating backward.
    if (this.isMultiServiceMode()) {
      return false;
    }

    const step = this.steps[stepIndex];
    if (!step?.tokens?.some((token) => token.type === 'service_categories')) {
      return false;
    }

    const postServiceOnServiceStep = step.tokens.some(
      (token) => token.type === 'field' && this.isPostServiceFieldId(token.fieldId)
    );
    if (targetIndex === stepIndex && postServiceOnServiceStep) {
      return false;
    }

    if (targetIndex === 0) {
      return (
        postServiceOnServiceStep ||
        this.postServiceIndex > 0 ||
        this.getShownPostServiceFieldIds().size > 0 ||
        this.steps.slice(stepIndex + 1).some((s) => s.dynamic)
      );
    }

    if (targetIndex <= stepIndex && this.currentStep > stepIndex) {
      return true;
    }

    if (targetIndex < stepIndex) {
      return this.steps.slice(stepIndex + 1).some(
        (s) =>
          s.dynamic &&
          s.tokens.some(
            (t) =>
              t.type === 'service_options_level' ||
              (t.type === 'field' && this.isPostServiceFieldId(t.fieldId))
          )
      );
    }

    return false;
  }

  rewindServiceFlowFrom(stepIndex) {
    this.restoreBaseSteps();

    this.getAllServiceFieldIds().forEach((id) => {
      this.progressive?.resetServiceFieldForReselect(id);
    });
  }

  ensureUnifiedProgressUI() {
    if (!this.form.querySelector('.unified-step-progress')) {
      this.buildProgressUI();
    }
    this.hideLegacyProgressUI();
    this.progressFill = this.form.querySelector('.unified-step-progress .progress-fill');
    this.stepIndicators = this.form.querySelectorAll('.unified-step-progress .step-indicator');
  }

  showStep(index) {
    if (index < 0) return;

    if (index >= this.steps.length) {
      if (index === 1 && this.baseSteps?.length > 1) {
        this.restoreBaseSteps();
      } else {
        return;
      }
    }

    const serviceStepIndex = this.getServiceStepIndex();
    const previousStep = this.currentStep;

    if (serviceStepIndex >= 0 && this.shouldRewindServiceFlow(serviceStepIndex, index)) {
      this.rewindServiceFlowFrom(serviceStepIndex);
      if (index >= this.steps.length) {
        index = Math.max(0, this.steps.length - 1);
      }
    }

    this.currentStep = index;
    const step = this.steps[index];
    const { fieldIds, serviceStates } = this.getFieldGroupsForStep(step);

    // Only top-level builder fields (data-field-id). Nested Service Selector
    // Page Content blocks also use .form-group and must not be hidden here.
    this.form.querySelectorAll('.form-group[data-field-id]').forEach((group) => {
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
        if (isServiceGroup) {
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
      const visibleGroups = section.querySelectorAll(
        '.form-group[data-field-id]:not([data-unified-hidden])'
      );
      const hasVisibleGroup = visibleGroups.length > 0;
      const onlyService =
        visibleGroups.length === 1 &&
        visibleGroups[0].querySelector('.progressive-service-selector');

      if (hasVisibleGroup) {
        section.style.display = '';
        delete section.dataset.progressiveHidden;
      } else {
        section.style.display = 'none';
      }

      const sectionTitle = section.querySelector(':scope > .section-title');
      if (sectionTitle) {
        sectionTitle.style.display = onlyService ? 'none' : '';
      }
    });

    this.progressive?.setUnifiedMode(true);
    this.ensureServiceFieldsForStep(fieldIds, serviceStates);

    if (serviceStepIndex >= 0) {
      if (index < serviceStepIndex) {
        this.prepareServiceCascadeForReentry();
      } else if (index === serviceStepIndex && previousStep < serviceStepIndex) {
        this.prepareServiceCascadeForReentry();
      }
    }

    this.syncFormStepContainers();
    this.hideLegacyFormNavigation();
    this.ensureUnifiedProgressUI();

    const state = this.getProgressDisplayState();
    const progress = this.form.querySelector('.unified-step-progress');
    const currentCount = progress?.querySelectorAll('.step-indicator').length || 0;
    if (currentCount !== state.displayCount) {
      this.rebuildProgressUI();
    } else {
      this.syncProgressBar();
      this.syncStepIndicatorState();
    }

    this.enforcePostServiceFieldVisibility();
    this.refreshSummaryFieldsForStep(step);
    this.updateNavigationButtons();
  }

  getAllServiceFieldIds() {
    if (this.serviceFieldIds?.length) return this.serviceFieldIds;
    return this.serviceFieldId ? [this.serviceFieldId] : [];
  }

  isServiceFieldId(fieldId) {
    return !!fieldId && this.getAllServiceFieldIds().includes(fieldId);
  }

  /** The Service Selector field active on the current step (falls back to the first). */
  getActiveServiceFieldId() {
    const step = this.steps[this.currentStep];
    if (step) {
      for (const token of step.tokens) {
        if (
          (token.type === 'service_categories' || token.type === 'service_options_level') &&
          this.isServiceFieldId(token.fieldId)
        ) {
          return token.fieldId;
        }
      }
      for (const token of step.tokens) {
        if (token.type === 'field' && this.isServiceFieldId(token.fieldId)) {
          return token.fieldId;
        }
      }
    }
    return this.serviceFieldId || this.getAllServiceFieldIds()[0] || null;
  }

  getServiceContainer() {
    if (!this.progressive) return null;
    const activeId = this.getActiveServiceFieldId();
    if (!activeId) return null;
    return this.progressive.getServiceContainer(activeId);
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

    if (!containers.size && this.currentStepIncludesService()) {
      const fallback = this.getServiceContainer();
      if (fallback) containers.add(fallback);
    }

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
      return !this.progressive.shouldRenderChildDropdown(data);
    }

    const lastItem = this.progressive.getLastSelectedItem(container);
    return !!lastItem && !this.progressive.shouldRenderChildDropdown(lastItem);
  }

  /** True only when EVERY Service Selector is complete (gates post-service fields / Final Quote). */
  isServiceReadyForPostFields() {
    if (!this.progressive) return false;
    const ids = this.getAllServiceFieldIds();
    if (!ids.length) return false;
    return ids.every((id) => {
      const container = this.progressive.getServiceContainer(id);
      return container && this.progressive.isServiceReadyForPostFields(container);
    });
  }

  /** True when the Service Selector(s) on the CURRENT step are complete (gates advancing to the next step). */
  isCurrentServiceReadyForAdvance() {
    const containers = this.getServiceContainersForCurrentStep();
    if (!containers.length) return true;
    return containers.every((container) =>
      this.progressive?.isServiceReadyForPostFields(container)
    );
  }

  shouldValidateFormInput(input, group) {
    if (!input || input.type === 'hidden') return false;
    if (input.classList.contains('final-service-value')) return false;

    if (group?.dataset.unifiedHidden === '1' || group.style.display === 'none') {
      return false;
    }

    const progressive = input.closest('.progressive-service-selector');
    if (progressive && this.progressive?.isServiceReadyForPostFields(progressive)) {
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

    const inlinePage = input.closest('.inline-cascade-page');
    if (inlinePage && !inlinePage.classList.contains('active-page')) {
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
    if (this.currentStepIncludesService() && !this.isCurrentServiceReadyForAdvance()) {
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

  syncNavigationLayout(index, showPrev, showNext, showSubmit) {
    const nav = this.navEl || this.form.querySelector('.unified-form-navigation');
    if (!nav) return;

    const hasPrev = showPrev && index > 0;
    nav.classList.toggle('nav-first-step', !hasPrev);
    nav.classList.toggle('nav-has-prev', hasPrev);
    nav.classList.toggle('nav-show-submit', !!showSubmit && !showNext);
  }

  updateNavigationButtons() {
    this.ensurePostServiceFields();

    const index = this.currentStep;
    const atLastIndex = index >= this.steps.length - 1;
    const hasPendingService = this.hasPendingServiceNavigationOnCurrentStep();
    const hasPendingFormFields = this.canAdvanceToPostServiceFields();
    const serviceIncomplete =
      this.currentStepIncludesService() && !this.isCurrentServiceReadyForAdvance();

    const summaryField = this.getActiveFormSummaryField();
    const pendingPostService = this.hasMorePostServiceFieldsPending();
    const hasInternalInlinePages = this.hasAdvanceableInternalInlinePages();
    const hasRetreatableInternal = this.hasRetreatableInternalInlinePages();
    const showNext =
      !summaryField &&
      (!atLastIndex ||
        hasPendingService ||
        hasPendingFormFields ||
        serviceIncomplete ||
        pendingPostService ||
        hasInternalInlinePages);
    let showSubmit =
      !!summaryField || (atLastIndex && !showNext && !pendingPostService);

    const showPrev = index > 0 || hasRetreatableInternal;

    const formPageIndex = this.getDisplayFormPageIndex();
    const pageBreak = UnifiedFormSteps.getPageBreakAfterFormPage(this.fields, formPageIndex);
    let showPrevButton = showPrev;
    if (
      pageBreak &&
      UnifiedFormSteps.getPageBreakIndex(this.fields, pageBreak) > 0 &&
      !UnifiedFormSteps.shouldShowPageBreakPrevious(pageBreak) &&
      !hasRetreatableInternal
    ) {
      showPrevButton = index > 0;
    }

    if (this.prevBtn) {
      this.prevBtn.style.display = showPrevButton ? 'inline-flex' : 'none';
    }
    if (this.nextBtn) {
      this.nextBtn.style.display = showNext ? 'inline-flex' : 'none';
    }
    if (this.submitBtn) {
      this.submitBtn.style.display = showSubmit ? 'inline-flex' : 'none';
    }

    this.ensureNavigationButtonOrder();
    this.syncNavigationLayout(index, showPrevButton, showNext, showSubmit);

    this.applyPageBreakNavigationSettings(pageBreak, showNext, showPrevButton);

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
    const currentFormPage = this.getDisplayFormPageIndex();
    const newStep = {
      index: this.currentStep + 1,
      dynamic: true,
      formPageIndex: currentFormPage,
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

  afterInternalServiceNav(container) {
    this.syncCascadeProgressFromService(container);
    this.updateNavigationButtons();
  }

  hasAdvanceableInternalInlinePages() {
    return this.getServiceContainersForCurrentStep().some((container) => {
      const navSteps = this.progressive?.getCascadeNavigationSteps(container) || [];
      const info = this.progressive?.getActivePageInfo(container);
      if (!info?.pages?.length) return false;

      if (navSteps.length > 1) {
        const activeNavIndex = this.progressive.getCascadeNavigationActiveIndex(container);
        const segmentEnd =
          activeNavIndex < navSteps.length - 1
            ? navSteps[activeNavIndex + 1].pageIndex - 1
            : info.pages.length - 1;
        return info.pageIndex < segmentEnd || activeNavIndex < navSteps.length - 1;
      }

      return info.pages.length > 1 && info.pageIndex < info.pages.length - 1;
    });
  }

  hasRetreatableInternalInlinePages() {
    return this.getServiceContainersForCurrentStep().some((container) => {
      const navSteps = this.progressive?.getCascadeNavigationSteps(container) || [];
      const info = this.progressive?.getActivePageInfo(container);
      if (!info?.pages?.length) return false;

      if (navSteps.length > 1) {
        const activeNavIndex = this.progressive.getCascadeNavigationActiveIndex(container);
        const segmentStart = navSteps[activeNavIndex]?.pageIndex ?? 0;
        return info.pageIndex > segmentStart || activeNavIndex > 0;
      }

      return info.pages.length > 1 && info.pageIndex > 0;
    });
  }

  tryServiceInternalNavigation(direction) {
    const containers = this.getServiceContainersForCurrentStep();

    for (const container of containers) {
      const navSteps = this.progressive?.getCascadeNavigationSteps(container) || [];
      const info = this.progressive?.getActivePageInfo(container);
      if (!info?.pages?.length) continue;

      const activeNavIndex = this.progressive.getCascadeNavigationActiveIndex(container);
      const pageIndex = info.pageIndex;
      const pages = info.pages;

      if (navSteps.length > 1) {
        if (direction === 1) {
          const segmentEnd =
            activeNavIndex < navSteps.length - 1
              ? navSteps[activeNavIndex + 1].pageIndex - 1
              : pages.length - 1;

          if (pageIndex < segmentEnd) {
            if (!this.progressive.canAdvanceFromActiveStep(container)) {
              return 'blocked';
            }
            if (this.progressive.navigateActivePage(container, 1)) {
              this.afterInternalServiceNav(container);
              return 'handled';
            }
          }

          if (activeNavIndex < navSteps.length - 1) {
            if (!this.progressive.canAdvanceFromActiveStep(container)) {
              return 'blocked';
            }
            if (this.progressive.showPageByNavigationIndex(container, activeNavIndex + 1)) {
              this.afterInternalServiceNav(container);
              return 'handled';
            }
          }
        } else if (direction === -1) {
          const segmentStart = navSteps[activeNavIndex]?.pageIndex ?? 0;

          if (pageIndex > segmentStart) {
            if (this.progressive.navigateActivePage(container, -1)) {
              this.afterInternalServiceNav(container);
              return 'handled';
            }
          }

          if (activeNavIndex > 0) {
            if (this.progressive.showPageByNavigationIndex(container, activeNavIndex - 1)) {
              this.afterInternalServiceNav(container);
              return 'handled';
            }
          }
        }

        continue;
      }

      if (pages.length <= 1) continue;

      if (direction === 1 && pageIndex < pages.length - 1) {
        if (!this.progressive.canAdvanceFromActiveStep(container)) {
          return 'blocked';
        }
        if (this.progressive.navigateActivePage(container, 1)) {
          this.afterInternalServiceNav(container);
          return 'handled';
        }
      } else if (direction === -1 && pageIndex > 0) {
        if (this.progressive.navigateActivePage(container, -1)) {
          this.afterInternalServiceNav(container);
          return 'handled';
        }
      }
    }

    return false;
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
          const label = (parentItem.optionsLabel || 'option').trim();
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

    this.form.querySelectorAll('.form-group[data-field-id]').forEach((group) => {
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
        hasPostServiceOnStep ||
        this.progressive.isServiceReadyForPostFields(container) ||
        this.progressive.hasInProgressCascade(container);

      const state = stateByField.get(fieldId);
      if (state && !preserveSelection) {
        this.progressive.applyUnifiedServiceState(state);
      } else if (!state) {
        const container = this.progressive.getServiceContainer(fieldId);
        const hasActiveSelection =
          container?.querySelector('.category-select')?.value ||
          container?.querySelector('.service-select')?.value ||
          container?.querySelector('.inline-cascade-level');

        if (!hasActiveSelection) {
          this.progressive.showStep(container, 1);
        }
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
    const internalResult = this.tryServiceInternalNavigation(1);
    if (internalResult === 'blocked') {
      alert(this.getValidationMessage());
      return;
    }
    if (internalResult === 'handled') {
      return;
    }

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
      this.isServiceReadyForPostFields() &&
      this.ensurePostServiceFields() > 0 &&
      !this.hasAdvanceableInternalInlinePages();

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
      return;
    }

    if (this.currentStep === 0 && this.baseSteps?.length > 1 && this.steps.length < this.baseSteps.length) {
      this.restoreBaseSteps();
      this.getAllServiceFieldIds().forEach((id) =>
        this.progressive?.resetServiceFieldForReselect(id)
      );
      this.showStep(1);
      return;
    }

    if (this.currentStepIncludesService() && !this.isCurrentServiceReadyForAdvance()) {
      alert(this.getValidationMessage());
    }
  }

  prevStep() {
    if (this.currentStepIncludesService()) {
      const step = this.steps[this.currentStep];
      const inlinePostService = step?.tokens?.filter(
        (token) => token.type === 'field' && this.isPostServiceFieldId(token.fieldId)
      );
      if (inlinePostService?.length) {
        step.tokens = step.tokens.filter(
          (token) => !(token.type === 'field' && this.isPostServiceFieldId(token.fieldId))
        );
        this.postServiceIndex = Math.max(0, this.postServiceIndex - inlinePostService.length);
        if (!step.tokens.some((token) => token.type === 'service_options_level')) {
          delete step.dynamic;
        }
        this.rebuildProgressUI();
        this.showStep(this.currentStep);
        return;
      }
    }

    const internalResult = this.tryServiceInternalNavigation(-1);
    if (internalResult === 'handled') {
      return;
    }

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
