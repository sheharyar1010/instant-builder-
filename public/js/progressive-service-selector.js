/**
 * Progressive Service Selector for QuoteMate Frontend
 * Creates a step-by-step service selection experience
 */

class ProgressiveServiceSelector {
  constructor() {
    this.currentStep = 1;
    this.selectedCategory = null;
    this.selectedService = null;
    this.serviceData = null;
    this.DEFAULT_MAX_DROPDOWNS_DESKTOP = 3;
    this.TABLET_MAX_DROPDOWNS = 2;
    this.MOBILE_MAX_DROPDOWNS = 1;
    this._cascadeResizeTimer = null;
    this.init();
  }

  init() {
    this.initializeProgressiveSelectors();
    this.attachEventListeners();
    this.attachCascadeResizeListener();
    this.initUnifiedSteps();
  }

  attachCascadeResizeListener() {
    if (this._cascadeResizeBound) return;
    this._cascadeResizeBound = () => {
      clearTimeout(this._cascadeResizeTimer);
      this._cascadeResizeTimer = setTimeout(() => {
        document.querySelectorAll('.progressive-service-selector').forEach((container) => {
          this.applyCascadeLayoutVars(container);
          const hostStep = container.querySelector('.step-container.step-1');
          if (hostStep?.querySelector('.inline-cascade-pages')) {
            this.rebalanceInlineCascadePages(hostStep);
          }
        });
      }, 150);
    };
    window.addEventListener('resize', this._cascadeResizeBound);
  }

  initUnifiedSteps() {
    if (window.quotemateUnifiedSteps || !window.UnifiedFormSteps) return;

    const buildFields = () => {
      const raw =
        window.quoteMateFormData?.fields ||
        Array.from(document.querySelectorAll('.form-group[data-field-id]')).map((group) => {
          try {
            const container = group.querySelector('[data-field-data]');
            if (container?.dataset.fieldData) {
              return JSON.parse(container.dataset.fieldData);
            }
          } catch (e) {
            /* ignore */
          }
          return { id: group.dataset.fieldId, type: group.dataset.fieldType };
        });

      return UnifiedFormSteps.getLayoutFields(
        (raw || []).map((field) => UnifiedFormSteps.enrichServiceField(field))
      );
    };

    const tryInit = () => {
      if (window.quotemateUnifiedSteps) {
        window.quotemateUnifiedSteps.fields = buildFields();
        window.quotemateUnifiedSteps.ensurePostServiceFields();
        window.quotemateUnifiedSteps.updateNavigationButtons();
        return true;
      }

      if (!window.quoteMateFormData?.fields?.length) {
        const hasDomFields = document.querySelectorAll('.form-group[data-field-id]').length > 0;
        if (!hasDomFields) return false;
      }

      const fields = buildFields();
      const plan = UnifiedFormSteps.buildStepPlan(fields);
      const serviceField = fields.find((f) => f.type === 'service' || f.type === 'service_options');
      const hasStructure =
        serviceField?.enhancedServiceStructure?.length || serviceField?.serviceStructure?.length;
      const hasServiceStep = plan.steps.some((step) =>
        step.tokens.some((token) => token.type === 'service_categories')
      );

      if (serviceField && hasStructure && !hasServiceStep) {
        return false;
      }

      if (plan.steps.length <= 1 && !plan.postServiceFields?.length) {
        return true;
      }

      window.quotemateUnifiedSteps = new UnifiedFormSteps(this);
      return true;
    };

    if (tryInit()) return;

    const retry = () => {
      if (!tryInit()) return;
      document.removeEventListener('quotemate-form-data-ready', retry);
    };

    document.addEventListener('quotemate-form-data-ready', retry);
    setTimeout(retry, 50);
    setTimeout(retry, 200);
    setTimeout(retry, 500);
  }

  isHostMultiStep(container) {
    const hostForm = container?.closest('form');
    return !!hostForm && hostForm.classList.contains('multi-step-form');
  }

  initializeProgressiveSelectors() {
    const serviceFields = document.querySelectorAll('.service-field-container[data-field-id]');

    serviceFields.forEach((field) => {
      const fieldId = field.dataset.fieldId;
      const fieldData = this.getFieldData(fieldId);

      // Check if fieldData exists before accessing properties
      if (!fieldData) {
        console.warn(`[QuoteMate] No field data found for field: ${fieldId}`);
        return;
      }

      const serviceStructure = fieldData.enhancedServiceStructure || fieldData.serviceStructure;
      if (serviceStructure && serviceStructure.length > 0) {

        this.convertToProgressiveSelector(field, fieldData);
      } else {

      }
    });

    document.querySelectorAll('.progressive-service-selector').forEach((container) => {
      this.applyCascadeLayoutVars(container);
      this.applyFieldSizeToContainer(container);
    });
  }

  convertToProgressiveSelector(fieldElement, fieldData) {
    const fieldId = fieldElement.dataset.fieldId;

    // Create progressive selector container
    const progressiveContainer = this.createProgressiveContainer(fieldId, fieldData);

    // Replace the original select with progressive container
    const originalSelect = fieldElement.querySelector('select');
    if (originalSelect) {
      // Store original select attributes
      const name = originalSelect.getAttribute('name');
      const required = originalSelect.hasAttribute('required');

      // Transfer attributes to hidden inputs
      const hiddenInputs = progressiveContainer.querySelectorAll('input[type="hidden"]');
      hiddenInputs.forEach(input => {
        if (input.classList.contains('final-service-value')) {
          if (name) input.setAttribute('name', name);
          if (required) input.setAttribute('required', 'required');
        }
      });

      originalSelect.parentNode.replaceChild(progressiveContainer, originalSelect);
    }
  }

  createProgressiveContainer(fieldId, fieldData) {
    const container = document.createElement('div');
    container.className = 'progressive-service-selector';
    container.dataset.fieldId = fieldId;

    // Create dynamic steps based on service structure
    const serviceStructure = fieldData.enhancedServiceStructure || fieldData.serviceStructure;
    const steps = this.createDynamicSteps(serviceStructure, fieldData);
    const segments = this.chunkStructureByPageBreak(serviceStructure);

    container.innerHTML = `
      <div class="progressive-steps">
        ${steps}
      </div>

      <div class="progressive-selector-navigation" style="display:none;">
        <button type="button" class="btn btn-secondary progressive-nav-prev">Previous</button>
        <span class="progressive-nav-indicator"></span>
        <button type="button" class="btn btn-primary progressive-nav-next">Continue</button>
      </div>

      <!-- Dynamic hidden inputs container -->
      <div class="dynamic-hidden-inputs">
        <!-- Hidden inputs will be created dynamically as user progresses -->
      </div>

      <!-- Main service value input -->
      <input type="hidden" class="final-service-value" name="${fieldId}" value="">
      <input type="hidden" class="final-quantity-value" value="1">
      <input type="hidden" class="final-price-value" value="">
      <input type="hidden" class="base-price-value" value="">
      <input type="hidden" class="pricing-type-value" value="">
      <input type="hidden" class="selected-path-value" value="">
    `;

    container.dataset.serviceSegments = JSON.stringify(segments);

    const firstPage = container.querySelector('.inline-cascade-page[data-page-index="0"]');
    if (firstPage && !firstPage.dataset.pageTitle) {
      firstPage.dataset.pageTitle = this.getCascadeDefaultFirstTitle(fieldData);
    }

    this.applyCascadeLayoutVars(container);
    this.applyFieldSizeToContainer(container);
    this.updateInternalNavigation(container);
    return container;
  }

  getMaxDropdownsPerPageDesktop(container) {
    const fieldId = container?.dataset?.fieldId;
    const fieldData = fieldId ? this.getFieldData(fieldId) : null;
    const configured = parseInt(fieldData?.maxDropdownsPerPageDesktop, 10);
    if (configured >= 1 && configured <= 12) return configured;
    return this.DEFAULT_MAX_DROPDOWNS_DESKTOP;
  }

  getMaxDropdownsPerPage(container) {
    const width = window.innerWidth || document.documentElement.clientWidth || 1024;
    if (width < 768) return this.MOBILE_MAX_DROPDOWNS;
    if (width < 1024) return this.TABLET_MAX_DROPDOWNS;
    return this.getMaxDropdownsPerPageDesktop(container);
  }

  getCascadeDefaultFirstTitle(fieldData) {
    const raw = (fieldData?.serviceStructureLabel || fieldData?.label || 'Service').trim() || 'Service';
    return this.formatDisplayText(raw);
  }

  getNodePageBreakTitle(node) {
    return this.formatDisplayText((node?.pageBreakTitle || '').trim());
  }

  getCascadeNavigationSteps(container) {
    const hostStep = container?.querySelector('.step-container.step-1');
    if (!hostStep) return [];

    const pages = this.getInlinePagesForStep(hostStep);
    if (!pages.length) return [];

    const fieldData = this.getFieldData(container.dataset.fieldId);
    const defaultFirst = this.getCascadeDefaultFirstTitle(fieldData);
    const steps = [];

    pages.forEach((page, idx) => {
      if (idx === 0 || page.dataset.pageBreakStart === '1') {
        const rawTitle = idx === 0
          ? (page.dataset.pageTitle || defaultFirst)
          : (page.dataset.pageTitle || `Step ${steps.length + 1}`);
        const title = this.formatDisplayText(rawTitle);
        steps.push({ pageIndex: idx, label: title });
      }
    });

    return steps;
  }

  getCascadeNavigationActiveIndex(container) {
    const { pageIndex } = this.getActivePageInfo(container);
    const steps = this.getCascadeNavigationSteps(container);
    let active = 0;

    for (let i = 0; i < steps.length; i++) {
      if (steps[i].pageIndex <= pageIndex) {
        active = i;
      }
    }

    return active;
  }

  showPageByNavigationIndex(container, navIndex) {
    const steps = this.getCascadeNavigationSteps(container);
    const target = steps[navIndex];
    if (!target) return false;

    const hostStep = container.querySelector('.step-container.step-1');
    const pages = this.getInlinePagesForStep(hostStep);
    const page = pages[target.pageIndex];
    if (!page) return false;

    const changed = this.showPage(page, pages);
    if (changed) {
      this.notifyFormNavigationAfterInternalPageChange(container);
    }
    return changed;
  }

  buildCascadeProgressHtml(labels, activeIndex) {
    const displayCount = Math.max(labels.length, 1);
    return `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${((activeIndex + 1) / displayCount) * 100}%"></div>
      </div>
      <div class="step-indicators">
        ${labels.map((label, i) => {
          const classes = ['step-indicator'];
          if (i === activeIndex) classes.push('active');
          if (i < activeIndex) classes.push('completed');
          return `
          <div class="${classes.join(' ')}" data-step="${i}">
            <div class="step-number">${i + 1}</div>
            <div class="step-label">${this.escapeHtml(this.formatDisplayText(label))}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  ensureStandaloneCascadeProgress(container) {
    const form = container?.closest('form');
    if (!form || form.classList.contains('unified-multi-step-form')) return;

    const navSteps = this.getCascadeNavigationSteps(container);
    const existing = form.querySelector('.service-cascade-step-progress');

    if (navSteps.length <= 1) {
      existing?.remove();
      return;
    }

    const activeIndex = this.getCascadeNavigationActiveIndex(container);
    const labels = navSteps.map((step) => step.label);
    let progress = existing;

    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'step-progress service-cascade-step-progress';
      const formContent = form.querySelector('.form-content') || form;
      form.insertBefore(progress, formContent);
    }

    progress.innerHTML = this.buildCascadeProgressHtml(labels, activeIndex);

    progress.querySelectorAll('.step-indicator').forEach((indicator, i) => {
      indicator.addEventListener('click', () => {
        if (i <= activeIndex) {
          this.showPageByNavigationIndex(container, i);
        }
      });
    });
  }

  syncCascadeStepProgress(container) {
    const unified = window.quotemateUnifiedSteps;
    if (unified?.form?.classList.contains('unified-multi-step-form')) {
      unified.syncCascadeProgressFromService?.(container);
      return;
    }

    this.ensureStandaloneCascadeProgress(container);
  }

  syncRowGridColumns(row) {
    if (!row) return;
    const count = row.children.length;
    if (count > 0) {
      row.style.setProperty('--qm-row-columns', String(count));
      if (count === 1) {
        row.dataset.singleItemRow = '1';
      } else {
        delete row.dataset.singleItemRow;
      }
    }
  }

  applyCascadeLayoutVars(container) {
    if (!container) return;
    const max = this.getMaxDropdownsPerPage(container);
    container.style.setProperty('--qm-cascade-columns', String(max));
    container.querySelectorAll('.inline-cascade-row').forEach((row) => {
      row.style.setProperty('--qm-cascade-columns', String(max));
      this.syncRowGridColumns(row);
    });
  }

  collectCascadeSegments(hostStep) {
    const pages = this.getInlinePagesForStep(hostStep);
    const segments = [];
    let current = [];

    pages.forEach((page, idx) => {
      if (idx > 0 && page.dataset.pageBreakStart === '1') {
        if (current.length) segments.push(current);
        current = [];
      }

      const row = page.querySelector('.inline-cascade-row');
      if (!row) return;

      const cat = row.querySelector('.inline-cascade-slot--category');
      if (cat) current.push(cat);
      row.querySelectorAll('.inline-cascade-level').forEach((el) => current.push(el));
    });

    if (current.length) segments.push(current);
    return segments;
  }

  rebuildCascadeFromSegments(hostStep, segments) {
    const container = hostStep.closest('.progressive-service-selector');
    const maxPerPage = container ? this.getMaxDropdownsPerPage(container) : this.DEFAULT_MAX_DROPDOWNS_DESKTOP;
    const activePage = this.getActiveInlinePageForStep(hostStep);
    const activeMarker =
      activePage?.querySelector('.inline-cascade-level[data-cascade-level], .inline-cascade-slot--category');

    const oldPages = this.getInlinePagesForStep(hostStep);
    const segmentTitles = [];
    oldPages.forEach((page, idx) => {
      if (idx === 0 || page.dataset.pageBreakStart === '1') {
        segmentTitles.push(page.dataset.pageTitle || '');
      }
    });

    this.getInlinePagesForStep(hostStep).forEach((page) => page.remove());

    const builtPages = [];

    segments.forEach((columns, segIdx) => {
      let page = null;
      let row = null;
      let countOnPage = 0;

      columns.forEach((col) => {
        if (!page || countOnPage >= maxPerPage) {
          page = this.createInlinePage(hostStep, builtPages.length);
          if (segIdx > 0 && countOnPage === 0) {
            page.dataset.pageBreakStart = '1';
          }
          const title = segmentTitles[segIdx] || '';
          if (title) {
            page.dataset.pageTitle = title;
          } else if (segIdx === 0 && builtPages.length === 0) {
            const container = hostStep.closest('.progressive-service-selector');
            const fieldData = container ? this.getFieldData(container.dataset.fieldId) : null;
            page.dataset.pageTitle = this.getCascadeDefaultFirstTitle(fieldData);
          }
          builtPages.push(page);
          row = page.querySelector('.inline-cascade-row');
          countOnPage = 0;
        }
        row.appendChild(col);
        countOnPage += 1;
      });
    });

    this.pruneEmptyInlinePages(hostStep);

    const pagesAfter = this.getInlinePagesForStep(hostStep);
    if (!pagesAfter.length) return;

    let targetPage = pagesAfter[0];
    if (activeMarker) {
      for (const page of pagesAfter) {
        if (page.contains(activeMarker)) {
          targetPage = page;
          break;
        }
      }
    }

    this.showPage(targetPage, pagesAfter);
    if (container) {
      this.notifyFormNavigationAfterInternalPageChange(container);
      this.applyCascadeLayoutVars(container);
    }
  }

  rebalanceInlineCascadePages(hostStep) {
    if (!hostStep) return;
    const container = hostStep.closest('.progressive-service-selector');
    if (!container) return;

    const maxPerPage = this.getMaxDropdownsPerPage(container);
    const pages = this.getInlinePagesForStep(hostStep);
    if (!pages.length) return;

    const segments = this.collectCascadeSegments(hostStep);
    if (!segments.length) {
      this.applyCascadeLayoutVars(container);
      return;
    }

    const needsRebalance = pages.some((page) => this.countColumnsOnInlinePage(page) > maxPerPage);
    if (!needsRebalance) {
      this.applyCascadeLayoutVars(container);
      return;
    }

    this.rebuildCascadeFromSegments(hostStep, segments);
  }

  attachEventListeners() {
    // Category selection
    document.addEventListener('change', (e) => {
      if (e.target.matches('.category-select')) {
        this.handleCategorySelection(e);
      }
    });

    // Service selection
    document.addEventListener('change', (e) => {
      if (e.target.matches('.service-select')) {
        this.handleServiceSelection(e);
      }
    });

    // Quantity change
    const onQuantityFieldUpdate = (e) => {
      if (e.target.matches('.quantity-input') || e.target.matches('.custom-quantity-input')) {
        this.handleQuantityChange(e);
      }
    };
    document.addEventListener('input', onQuantityFieldUpdate);
    document.addEventListener('change', onQuantityFieldUpdate);
    document.addEventListener('blur', onQuantityFieldUpdate, true);

    // Quantity option cards click
    document.addEventListener('click', (e) => {
      if (e.target.closest('.quantity-option:not(.custom-quantity)')) {
        this.handleQuantityOptionClick(e);
      }
    });

    // Internal step / page navigation
    document.addEventListener('click', (e) => {
      const container = e.target.closest('.progressive-service-selector');
      if (!container) return;

      if (e.target.closest('.progressive-nav-next')) {
        e.preventDefault();
        this.navigateInternalNext(container);
        return;
      }

      if (e.target.closest('.progressive-nav-prev')) {
        e.preventDefault();
        this.navigateInternalPrev(container);
        return;
      }

      if (e.target.closest('[data-action="next-category-page"]')) {
        e.preventDefault();
        this.navigateActivePage(container, 1);
        return;
      }

      if (e.target.closest('[data-action="prev-category-page"]')) {
        e.preventDefault();
        this.navigateActivePage(container, -1);
        return;
      }

      if (e.target.closest('.progressive-page-next')) {
        e.preventDefault();
        this.navigateActivePage(container, 1);
        return;
      }

      if (e.target.closest('.progressive-page-prev')) {
        e.preventDefault();
        this.navigateActivePage(container, -1);
      }
    });

    // Listen for custom events from the main form navigation
    document.addEventListener('quotemate-next-step-check', (e) => {
      this.handleNextStepCheck(e);
    });

    document.addEventListener('quotemate-prev-step-check', (e) => {
      this.handlePrevStepCheck(e);
    });
  }

  handleNextStepCheck(e) {
    const currentFormStep = document.querySelector('.form-step:not([style*="display: none"])');
    if (!currentFormStep) return;

    const progressiveSelector = currentFormStep.querySelector('.progressive-service-selector');
    if (!progressiveSelector) return;

    const { pages, pageIndex } = this.getActivePageInfo(progressiveSelector);
    if (pages.length > 1 && pageIndex < pages.length - 1) {
      e.preventDefault();
      e.stopImmediatePropagation();

      if (!this.canAdvanceFromActiveStep(progressiveSelector)) {
        return;
      }

      this.navigateActivePage(progressiveSelector, 1);
      if (e.detail?.callback) e.detail.callback(true);
      return;
    }

    // Check if there are internal pages to navigate
    // Query ALL active pages at any level
    const activePages = Array.from(progressiveSelector.querySelectorAll('.step-2-page.active-page, .category-page.active-page, .step-page.active-page'));

    if (!activePages.length) {
      const activeStep = progressiveSelector.querySelector('.step-container.active');
      if (!activeStep) return;

      const activeStepNumber = parseInt((activeStep.className.match(/\bstep-(\d+)\b/) || [])[1] || '0', 10);
      const hasPending = !!progressiveSelector.dataset.pendingInternalStep;
      const hasNextStep = this.findNextPopulatedStep(progressiveSelector, activeStepNumber) !== null;

      if (hasPending || hasNextStep) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.navigateInternalNext(progressiveSelector);
      }
      return;
    }

    // Sort active pages by depth (we want to navigate the deepest active level first)
    // We can infer depth from the parent step container class or data-attribute, 
    // or by checking the data-step-number on the select element within the page
    activePages.sort((a, b) => {
      const selectA = a.querySelector('select');
      const selectB = b.querySelector('select');
      const stepA = selectA ? parseInt(selectA.dataset.stepNumber) || 0 : 0;
      const stepB = selectB ? parseInt(selectB.dataset.stepNumber) || 0 : 0;
      return stepB - stepA; // Descending order (deepest first)
    });

    const activePage = activePages[0]; // The deepest active page

    // Find the container holding the pages
    const pagesContainer = activePage.parentElement;
    const allPages = Array.from(pagesContainer.children);
    const currentIndex = allPages.indexOf(activePage);

    if (currentIndex < allPages.length - 1) {
      // Prevent main form navigation
      e.preventDefault();
      // Stop immediate propagation to ensure no other handlers see this event
      e.stopImmediatePropagation();

      const nextPage = allPages[currentIndex + 1];
      this.showPage(nextPage, allPages);
      this.notifyFormNavigationAfterInternalPageChange(progressiveSelector);

      if (e.detail?.callback) {
        e.detail.callback(true);
      }
      return;
    }

    // No more pages in current step; move to next internal step container if present.
    const activeStep = progressiveSelector.querySelector('.step-container.active');
    if (!activeStep) return;

    const activeStepNumber = parseInt((activeStep.className.match(/\bstep-(\d+)\b/) || [])[1] || '0', 10);
    const hasPending = !!progressiveSelector.dataset.pendingInternalStep;
    const hasNextStep = this.findNextPopulatedStep(progressiveSelector, activeStepNumber) !== null;

    if (hasPending || hasNextStep) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.navigateInternalNext(progressiveSelector);
    }
  }

  handlePrevStepCheck(e) {
    const currentFormStep = document.querySelector('.form-step:not([style*="display: none"])');
    if (!currentFormStep) return;

    const progressiveSelector = currentFormStep.querySelector('.progressive-service-selector');
    if (!progressiveSelector) return;

    const { pages, pageIndex } = this.getActivePageInfo(progressiveSelector);
    if (pages.length > 1 && pageIndex > 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.navigateActivePage(progressiveSelector, -1);
      if (e.detail?.callback) e.detail.callback(true);
      return;
    }

    const activePages = Array.from(progressiveSelector.querySelectorAll('.step-2-page.active-page, .category-page.active-page, .step-page.active-page'));

    if (!activePages.length) {
      const activeStep = progressiveSelector.querySelector('.step-container.active');
      if (!activeStep) return;

      const activeStepNumber = parseInt((activeStep.className.match(/\bstep-(\d+)\b/) || [])[1] || '0', 10);
      const hasPrevStep = this.findPreviousPopulatedStep(progressiveSelector, activeStepNumber) < activeStepNumber;

      if (hasPrevStep) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.navigateInternalPrev(progressiveSelector);
      }
      return;
    }

    activePages.sort((a, b) => {
      const selectA = a.querySelector('select');
      const selectB = b.querySelector('select');
      const stepA = selectA ? parseInt(selectA.dataset.stepNumber) || 0 : 0;
      const stepB = selectB ? parseInt(selectB.dataset.stepNumber) || 0 : 0;
      return stepB - stepA;
    });

    const activePage = activePages[0];
    const pagesContainer = activePage.parentElement;
    const allPages = Array.from(pagesContainer.children);
    const currentIndex = allPages.indexOf(activePage);

    if (currentIndex > 0) {
      e.preventDefault();
      e.stopImmediatePropagation();

      const prevPage = allPages[currentIndex - 1];
      this.showPage(prevPage, allPages);
      this.notifyFormNavigationAfterInternalPageChange(progressiveSelector);
      return;
    }

    const activeStep = progressiveSelector.querySelector('.step-container.active');
    if (!activeStep) return;

    const activeStepNumber = parseInt((activeStep.className.match(/\bstep-(\d+)\b/) || [])[1] || '0', 10);
    const hasPrevStep = this.findPreviousPopulatedStep(progressiveSelector, activeStepNumber) < activeStepNumber;

    if (hasPrevStep) {
      e.preventDefault();
      e.stopImmediatePropagation();
      this.navigateInternalPrev(progressiveSelector);
    }
  }

  handleCategorySelection(e) {
    const categorySelect = e.target;
    const selectedValue = categorySelect.value;
    const container = categorySelect.closest('.progressive-service-selector');
    const fieldId = container.dataset.fieldId;
    const fieldData = this.getFieldData(fieldId);

    if (!selectedValue || !fieldData) {
      delete container.dataset.lastSelectedCategory;
      this.clearInlineCascade(container, 1, 2);
      this.clearSeparateStepsFrom(container, 2);
      this.hideStepsAfter(container, 1);
      this.updateProgressClasses(container, 1);
      this.clearUnifiedPendingState(container);
      window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
      window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
        window.quotemateUnifiedSteps?.currentStep ?? 0
      );
      this.notifyUnifiedStepsChanged(container);
      this.updateInternalNavigation(container);
      return;
    }

    // Prefer full category object from option data (avoids name/sanitize mismatches)
    const selectedOption = categorySelect.options[categorySelect.selectedIndex];
    let selectedCategory = null;
    selectedCategory = this.parseOptionData(selectedOption);

    if (!selectedCategory) {
      const serviceStructure = fieldData.enhancedServiceStructure || fieldData.serviceStructure;
      const categories = serviceStructure.filter(item => item.type !== 'page_break');
      selectedCategory = categories.find(cat =>
        this.sanitizeValue(cat.name) === selectedValue
      );
    }

    const hasChildDropdown = this.shouldRenderChildDropdown(selectedCategory);
    const isPerCategory = this.isPerPricingType(selectedCategory?.pricingType);

    if (!selectedCategory || (!hasChildDropdown && !isPerCategory)) {
      this.clearInlineCascade(container, 1, 2);
      this.clearSeparateStepsFrom(container, 2);
      this.hideStepsAfter(container, 1);
      this.updateProgressClasses(container, 1);
      this.clearUnifiedPendingState(container);
      window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
      window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
        window.quotemateUnifiedSteps?.currentStep ?? 0
      );
      if (selectedCategory) {
        container.dataset.lastSelectedCategory = selectedValue;
        this.completeLeafSelection(container, selectedCategory, {
          hostStepNumber: 1,
          levelNumber: 2,
        });
      }
      this.notifyUnifiedStepsChanged(container);
      this.updateInternalNavigation(container);
      return;
    }

    const previousCategory = container.dataset.lastSelectedCategory || '';
    if (previousCategory && previousCategory !== selectedValue) {
      this.clearServiceCompletionState(container);
    }
    container.dataset.lastSelectedCategory = selectedValue;

    // Create hidden input for category selection
    this.createDynamicHiddenInput(container, fieldId, 'category', selectedCategory.name, selectedCategory);

    if (isPerCategory) {
      this.clearInlineCascade(container, 1, 2);
      this.clearSeparateStepsFrom(container, 2);
      window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
      window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
        window.quotemateUnifiedSteps?.currentStep ?? 0
      );
      this.clearUnifiedPendingState(container);
      this.completeLeafSelection(container, selectedCategory, {
        hostStepNumber: 1,
        levelNumber: 2,
      });
      this.hideStepsAfter(container, 1);
      return;
    }

    const childItems = this.getSelectableItems(selectedCategory.children);
    const step2Label = (selectedCategory.optionsLabel || 'option').trim();

    this.clearInlineCascade(container, 1, 2);
    this.clearSeparateStepsFrom(container, 2);
    window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
    window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
      window.quotemateUnifiedSteps?.currentStep ?? 0
    );

    if (this.hasPageBreakBefore(selectedCategory)) {
      this.clearUnifiedPendingState(container);
      const inlinePageBefore = this.getActivePageInfo(container).pageIndex;
      this.renderInlineLevel(container, 1, 2, childItems, step2Label, {
        forceNewPage: true,
        pageTitle: this.getNodePageBreakTitle(selectedCategory),
      });
      this.keepInlinePageAtIndex(container, 1, inlinePageBefore);
      this.showStep(container, 1);
      this.updateProgressClasses(container, 1);
    } else if (this.isUnifiedMode(container)) {
      this.clearUnifiedPendingState(container);
      this.renderInlineLevel(container, 1, 2, childItems, step2Label);
      this.showStep(container, 1);
      this.updateProgressClasses(container, 1);
    } else {
      delete container.dataset.pendingInternalStep;
      this.renderInlineLevel(container, 1, 2, childItems, step2Label);
      this.showStep(container, 1);
      this.updateProgressClasses(container, 1);
    }

    this.hideStepsAfter(container, 1);
    this.notifyUnifiedStepsChanged(container);
    this.updateInternalNavigation(container);
  }

  handleServiceSelection(e) {
    const serviceSelect = e.target;
    // Handle case where options might be empty or invalid
    if (!serviceSelect.options[serviceSelect.selectedIndex]) return;

    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const container = serviceSelect.closest('.progressive-service-selector');
    const isInlineSelect = !!serviceSelect.closest('.inline-cascade-level');
    const activeStepNumber = this.getActiveStepNumber(container);

    const currentStep = this.getServiceSelectCascadeLevel(serviceSelect);
    const nextStep = currentStep + 1;

    if (!selectedOption.value) {
      if (isInlineSelect) {
        const hostStep = serviceSelect.closest('.step-container');
        this.clearInlineCascadeFrom(hostStep, currentStep + 1);
      }
      this.clearSeparateStepsFrom(container, currentStep + 1);
      this.hideStepsAfter(container, isInlineSelect ? activeStepNumber : currentStep);
      this.updateProgressClasses(container, isInlineSelect ? activeStepNumber : currentStep);
      this.clearUnifiedPendingState(container);
      window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
      window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
        window.quotemateUnifiedSteps?.currentStep ?? 0
      );
      this.notifyUnifiedStepsChanged(container);
      this.updateInternalNavigation(container);
      return;
    }

    const serviceData = this.parseOptionData(selectedOption);
    if (!serviceData) {
      console.error('Error parsing service data for option:', selectedOption?.text);
      return;
    }

    try {
      const fieldId = container.dataset.fieldId;
      // Create hidden input for service selection
      const inputName = currentStep === 2 ? 'service' : `subservice_${currentStep}`;
      this.createDynamicHiddenInput(container, fieldId, inputName, serviceData.name, serviceData);

      if (this.shouldRenderChildDropdown(serviceData)) {
        const childItems = this.getSelectableItems(serviceData.children);
        const nextLabel = (serviceData.optionsLabel || 'option').trim();

        this.clearSeparateStepsFrom(container, nextStep);
        if (isInlineSelect) {
          const hostStep = serviceSelect.closest('.step-container');
          this.clearInlineCascadeFrom(hostStep, nextStep);
        } else {
          this.clearInlineCascade(container, activeStepNumber, nextStep);
        }
        window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
        window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
          window.quotemateUnifiedSteps?.currentStep ?? 0
        );

        if (this.hasPageBreakBefore(serviceData)) {
          this.clearUnifiedPendingState(container);
          const hostStep = activeStepNumber;
          const inlinePageBefore = this.getActivePageInfo(container).pageIndex;
          this.renderInlineLevel(container, hostStep, nextStep, childItems, nextLabel, {
            forceNewPage: true,
            pageTitle: this.getNodePageBreakTitle(serviceData),
          });
          this.keepInlinePageAtIndex(container, hostStep, inlinePageBefore);
          this.showStep(container, hostStep);
          this.updateProgressClasses(container, hostStep);
        } else if (this.isUnifiedMode(container)) {
          this.clearUnifiedPendingState(container);
          const hostStep = activeStepNumber;
          this.renderInlineLevel(container, hostStep, nextStep, childItems, nextLabel);
          this.showStep(container, hostStep);
          this.updateProgressClasses(container, hostStep);
        } else {
          delete container.dataset.pendingInternalStep;
          const hostStep = activeStepNumber;
          this.renderInlineLevel(container, hostStep, nextStep, childItems, nextLabel);
          this.showStep(container, hostStep);
          this.updateProgressClasses(container, hostStep);
        }

        this.hideStepsAfter(container, this.hasPageBreakBefore(serviceData) ? activeStepNumber : activeStepNumber);
        this.notifyUnifiedStepsChanged(container);
        this.updateInternalNavigation(container);
      } else {
        this.completeLeafSelection(container, serviceData, {
          hostStepNumber: activeStepNumber,
          levelNumber: nextStep,
          isInlineSelect,
          serviceSelect,
        });
      }
    } catch (error) {
      console.error('Error handling service selection:', error);
    }
  }

  formatDisplayText(text) {
    if (window.QuoteMateTextFormat?.formatDisplayName) {
      return window.QuoteMateTextFormat.formatDisplayName(text);
    }
    return text ?? '';
  }

  formatChoosePlaceholder(labelText, fallbackKind = 'option') {
    if (window.QuoteMateTextFormat?.formatChoosePlaceholder) {
      return window.QuoteMateTextFormat.formatChoosePlaceholder(labelText, fallbackKind);
    }
    const label = String(labelText || '').trim();
    if (!label) return fallbackKind === 'category' ? 'Choose Category' : 'Choose Option';
    return `Choose ${label}`;
  }

  resolveFieldSize(fieldData) {
    const size = String(fieldData?.fieldSize || 'medium').toLowerCase();
    return ['small', 'medium', 'large'].includes(size) ? size : 'medium';
  }

  getConfiguredDropdownsPerRow(fieldData) {
    if (
      !fieldData ||
      fieldData.maxDropdownsPerPageDesktop === undefined ||
      fieldData.maxDropdownsPerPageDesktop === null ||
      fieldData.maxDropdownsPerPageDesktop === ''
    ) {
      return null;
    }
    const parsed = parseInt(fieldData.maxDropdownsPerPageDesktop, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
      return null;
    }
    return parsed;
  }

  formatCascadeSelectWidthPercent(percent) {
    const rounded = Math.round(percent * 1000) / 1000;
    return `${rounded}%`;
  }

  resolveFieldSizeWidthPercent(fieldData) {
    const sizeWidths = {
      small: 33.333,
      medium: 50,
      large: 100,
    };
    return this.formatCascadeSelectWidthPercent(sizeWidths[this.resolveFieldSize(fieldData)] || 50);
  }

  applyFieldSizeToContainer(container) {
    if (!container) return;
    const fieldData = this.getFieldData(container.dataset?.fieldId);
    if (!fieldData) return;

    const size = this.resolveFieldSize(fieldData);
    const sizeClass = `quotemate-form-field--size-${size}`;
    const configuredPerRow = this.getConfiguredDropdownsPerRow(fieldData);
    const fieldSizeWidth = this.resolveFieldSizeWidthPercent(fieldData);

    container.dataset.fieldSize = size;
    container.style.setProperty('--qm-cascade-select-width', fieldSizeWidth);

    if (configuredPerRow !== null) {
      container.dataset.dropdownsPerRow = String(configuredPerRow);
    } else {
      delete container.dataset.dropdownsPerRow;
    }

    container.querySelectorAll('.inline-cascade-row').forEach((row) => {
      this.syncRowGridColumns(row);
    });

    container.querySelectorAll('.inline-cascade-slot, .inline-cascade-level').forEach((el) => {
      el.classList.remove(
        'quotemate-form-field--size-small',
        'quotemate-form-field--size-medium',
        'quotemate-form-field--size-large'
      );
      el.classList.add(sizeClass);
    });
  }

  getCategoryPlaceholder(fieldId) {
    const fieldData = this.getFieldData(fieldId);
    const label =
      (fieldData?.serviceStructureLabel || fieldData?.label || '').trim();
    return this.formatChoosePlaceholder(label || 'Category', 'category');
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  buildLevelSelectHtml(stepNumber, items, labelText, selectClass = 'service-select') {
    const placeholder = this.formatChoosePlaceholder(labelText, 'service');
    return `
      <select class="step-select ${selectClass}" data-step="service" data-step-number="${stepNumber}" data-options-label="${this.escapeHtml(this.formatDisplayText(labelText || ''))}">
        <option value="">${this.escapeHtml(placeholder)}</option>
        ${items.map(item => `
          <option value="${this.sanitizeValue(item.name)}" data-service="${this.encodeOptionData(item)}">
            ${this.escapeHtml(this.formatDisplayText(item.name))}
          </option>
        `).join('')}
      </select>
    `;
  }

  updateSelectPlaceholder(select, labelText) {
    if (!select) return;
    const placeholder = this.formatChoosePlaceholder(labelText);
    let firstOption = select.querySelector('option[value=""]');
    if (!firstOption) {
      firstOption = document.createElement('option');
      firstOption.value = '';
      select.insertBefore(firstOption, select.firstChild);
    }
    firstOption.textContent = placeholder;
    if (labelText) {
      select.dataset.optionsLabel = labelText;
    }
  }

  getInlinePagesForStep(hostStep) {
    const pagesContainer = hostStep?.querySelector('.inline-cascade-pages');
    if (!pagesContainer) return [];
    return Array.from(pagesContainer.children).filter((el) => el.matches('.inline-cascade-page'));
  }

  getActiveInlinePageForStep(hostStep) {
    const pages = this.getInlinePagesForStep(hostStep);
    return pages.find((page) => page.classList.contains('active-page')) || pages[0] || null;
  }

  countColumnsOnInlinePage(page) {
    const row = page?.querySelector('.inline-cascade-row');
    if (!row) return 0;
    let count = 0;
    if (row.querySelector('.inline-cascade-slot--category')) count += 1;
    count += row.querySelectorAll('.inline-cascade-level').length;
    return count;
  }

  createInlinePage(hostStep, pageIndex) {
    const pagesContainer = this.ensureInlinePagesLayout(hostStep);
    const page = document.createElement('div');
    page.className = 'inline-cascade-page';
    page.dataset.pageIndex = String(pageIndex);
    page.innerHTML = '<div class="inline-cascade-row"></div>';
    pagesContainer.appendChild(page);
    return page;
  }

  showInlinePage(nextPage, allPages) {
    this.showPage(nextPage, allPages);
  }

  ensureCategoryInInlineLayout(hostStep) {
    if (!hostStep || hostStep.querySelector('.inline-cascade-slot--category')) return;

    const categorySelect = hostStep.querySelector(':scope > .category-select');
    if (!categorySelect) return;

    const firstPage = this.getInlinePagesForStep(hostStep)[0] || this.createInlinePage(hostStep, 0);
    if (!firstPage.classList.contains('active-page') && !this.getActiveInlinePageForStep(hostStep)) {
      firstPage.classList.add('active-page');
    }

    let row = firstPage.querySelector('.inline-cascade-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'inline-cascade-row';
      firstPage.appendChild(row);
    }

    const catSlot = document.createElement('div');
    catSlot.className = 'inline-cascade-slot inline-cascade-slot--category';
    const label = categorySelect.previousElementSibling;
    if (label?.classList.contains('step-label')) {
      catSlot.appendChild(label);
    }
    catSlot.appendChild(categorySelect);
    row.insertBefore(catSlot, row.firstChild);
    this.syncRowGridColumns(row);
    const sizeContainer = hostStep?.closest('.progressive-service-selector');
    if (sizeContainer) {
      this.applyFieldSizeToContainer(sizeContainer);
    }
  }

  migrateLegacyInlineLevels(hostStep) {
    const oldLevels = hostStep.querySelector('.inline-cascade-levels');
    if (!oldLevels || hostStep.querySelector('.inline-cascade-pages')) return;

    const pagesContainer = document.createElement('div');
    pagesContainer.className = 'inline-cascade-pages';

    const page = document.createElement('div');
    page.className = 'inline-cascade-page active-page';
    page.dataset.pageIndex = '0';

    const row = document.createElement('div');
    row.className = 'inline-cascade-row';

    oldLevels.querySelectorAll('.inline-cascade-level').forEach((level) => {
      row.appendChild(level);
    });
    oldLevels.remove();

    page.appendChild(row);
    pagesContainer.appendChild(page);
    hostStep.appendChild(pagesContainer);
  }

  ensureInlinePagesLayout(hostStep) {
    if (!hostStep) return null;

    if (!hostStep.querySelector('.inline-cascade-pages')) {
      this.migrateLegacyInlineLevels(hostStep);
    }

    let pagesContainer = hostStep.querySelector('.inline-cascade-pages');
    if (!pagesContainer) {
      pagesContainer = document.createElement('div');
      pagesContainer.className = 'inline-cascade-pages';

      const page = document.createElement('div');
      page.className = 'inline-cascade-page active-page';
      page.dataset.pageIndex = '0';
      page.innerHTML = '<div class="inline-cascade-row"></div>';
      pagesContainer.appendChild(page);
      hostStep.appendChild(pagesContainer);
    }

    this.ensureCategoryInInlineLayout(hostStep);
    return pagesContainer;
  }

  pruneEmptyInlinePages(hostStep) {
    const pages = this.getInlinePagesForStep(hostStep);
    pages.forEach((page, idx) => {
      if (idx === 0) return;
      if (!page.querySelector('.inline-cascade-level')) {
        page.remove();
      }
    });

    this.getInlinePagesForStep(hostStep).forEach((page, idx) => {
      page.dataset.pageIndex = String(idx);
    });

    const pagesAfter = this.getInlinePagesForStep(hostStep);
    if (!pagesAfter.length) return;

    const active = this.getActiveInlinePageForStep(hostStep);
    if (!active || !pagesAfter.includes(active)) {
      this.showPage(pagesAfter[0], pagesAfter);
      const container = hostStep.closest('.progressive-service-selector');
      if (container) {
        this.notifyFormNavigationAfterInternalPageChange(container);
      }
    }
  }

  resolveTargetInlinePage(hostStep, options = {}) {
    const { forceNewPage = false, pageTitle = '', allowOverflow = false } = options;
    this.ensureInlinePagesLayout(hostStep);

    const container = hostStep?.closest('.progressive-service-selector');
    const maxColumns = container ? this.getMaxDropdownsPerPage(container) : this.DEFAULT_MAX_DROPDOWNS_DESKTOP;

    let pages = this.getInlinePagesForStep(hostStep);
    let activePage = this.getActiveInlinePageForStep(hostStep);

    if (!pages.length) {
      activePage = this.createInlinePage(hostStep, 0);
      activePage.classList.add('active-page');
      pages = this.getInlinePagesForStep(hostStep);
    }

    const needsNewPage =
      forceNewPage ||
      (!allowOverflow && this.countColumnsOnInlinePage(activePage) >= maxColumns);

    if (needsNewPage) {
      const newPage = this.createInlinePage(hostStep, pages.length);
      if (forceNewPage) {
        newPage.dataset.pageBreakStart = '1';
        const title = (pageTitle || '').trim();
        if (title) {
          newPage.dataset.pageTitle = this.formatDisplayText(title);
        }
      }
      if (container) this.applyCascadeLayoutVars(container);
      return { page: newPage, autoShow: false };
    }

    if (container) this.applyCascadeLayoutVars(container);
    return { page: activePage, autoShow: false };
  }

  ensureInlineContainer(stepElement) {
    this.ensureInlinePagesLayout(stepElement);
    const page = this.getActiveInlinePageForStep(stepElement) || this.getInlinePagesForStep(stepElement)[0];
    return page?.querySelector('.inline-cascade-row') || stepElement;
  }

  clearInlineCascadeFrom(context, fromLevel) {
    const hostStep =
      context?.closest?.('.step-container') ||
      (context?.classList?.contains('step-container') ? context : null);

    if (!hostStep) {
      if (context?.querySelectorAll) {
        context.querySelectorAll('.inline-cascade-level').forEach((el) => {
          const level = parseInt(el.dataset.cascadeLevel, 10) || 0;
          if (level >= fromLevel) el.remove();
        });
      }
      return;
    }

    hostStep.querySelectorAll('.inline-cascade-level').forEach((el) => {
      const level = parseInt(el.dataset.cascadeLevel, 10) || 0;
      if (level >= fromLevel) el.remove();
    });

    this.pruneEmptyInlinePages(hostStep);

    if (fromLevel <= 2) {
      const pages = this.getInlinePagesForStep(hostStep);
      if (pages.length) {
        this.showPage(pages[0], pages);
        const container = hostStep.closest('.progressive-service-selector');
        if (container) {
          this.notifyFormNavigationAfterInternalPageChange(container);
        }
      }
    }
  }

  clearInlineCascade(container, hostStepNumber, fromLevel = 2) {
    const hostStep = container.querySelector(`.step-container.step-${hostStepNumber}`);
    this.clearInlineCascadeFrom(hostStep, fromLevel);
  }

  clearSeparateStepsFrom(container, fromStep) {
    for (let i = fromStep; i <= 5; i++) {
      const step = container.querySelector(`.step-container.step-${i}`);
      if (!step) continue;
      step.innerHTML = '';
      step.style.display = 'none';
      step.classList.remove('active');
      delete step.dataset.pageBreakStep;
    }
  }

  renderInlineLevel(container, hostStepNumber, levelNumber, items, labelText, options = {}) {
    const hostStep = container.querySelector(`.step-container.step-${hostStepNumber}`);
    if (!hostStep) return;

    this.clearInlineCascadeFrom(hostStep, levelNumber);

    const { page: targetPage, autoShow } = this.resolveTargetInlinePage(hostStep, options);
    const row = targetPage.querySelector('.inline-cascade-row');
    if (!row) return;

    const levelEl = document.createElement('div');
    levelEl.className = 'inline-cascade-level';
    levelEl.dataset.cascadeLevel = String(levelNumber);
    levelEl.innerHTML = this.buildLevelSelectHtml(levelNumber, items, labelText, 'service-select');
    row.appendChild(levelEl);
    this.syncRowGridColumns(row);
    this.applyFieldSizeToContainer(container);

    if (autoShow) {
      const allPages = this.getInlinePagesForStep(hostStep);
      this.showPage(targetPage, allPages);
      this.notifyFormNavigationAfterInternalPageChange(container);
    }

    this.applyCascadeLayoutVars(container);
    this.updateInternalNavigation(container);
  }

  renderSeparateLevel(container, stepNumber, items, labelText) {
    const stepContainer = container.querySelector(`.step-container.step-${stepNumber}`);
    if (!stepContainer) return;

    stepContainer.dataset.pageBreakStep = '1';
    stepContainer.innerHTML = `
      ${this.buildLevelSelectHtml(stepNumber, items, labelText, 'service-select')}
      <div class="inline-cascade-levels"></div>
    `;
  }

  renderGenericStep(container, stepNumber, items, labelText) {
    this.renderSeparateLevel(container, stepNumber, this.getSelectableItems(items), labelText);
    this.updateInternalNavigation(container);
  }

  getSelectableItems(items) {
    return (items || []).filter(item =>
      item?.type !== 'page_break' &&
      item?.type !== 'page-break' &&
      (item?.name || item?.basePrice || item?.type)
    );
  }

  isPerPricingType(pricingType) {
    if (!pricingType || pricingType === 'fixed') return false;

    const key = String(pricingType).toLowerCase();
    if (key.startsWith('per_')) return true;

    const label = this.formatPricingType(pricingType);
    return typeof label === 'string' && label.startsWith('Per ');
  }

  shouldRenderChildDropdown(item) {
    if (!item) return false;
    if (this.isPerPricingType(item.pricingType)) return false;
    return this.getSelectableItems(item.children).length > 0;
  }

  getFieldMaxQuantity(fieldId) {
    if (!fieldId) return null;
    const fieldData = this.getFieldData(fieldId);
    const max = parseInt(fieldData?.serviceMaxQuantity, 10);
    return max >= 1 ? max : null;
  }

  resolveQuantityMax(serviceData, fieldId) {
    const limits = [];
    const fieldMax = this.getFieldMaxQuantity(fieldId);
    const itemMax = parseInt(serviceData?.maxQuantity, 10);

    if (fieldMax) limits.push(fieldMax);
    if (itemMax >= 1) limits.push(itemMax);

    return limits.length ? Math.min(...limits) : null;
  }

  clampQuantity(quantity, serviceData, fieldId) {
    let qty = Math.max(1, parseInt(quantity, 10) || 1);
    const minQty = parseInt(serviceData?.minQuantity, 10);

    if (minQty >= 1 && qty < minQty) {
      qty = minQty;
    }

    const maxQty = this.resolveQuantityMax(serviceData, fieldId);
    if (maxQty && qty > maxQty) {
      qty = maxQty;
    }

    return qty;
  }

  keepInlinePageAtIndex(container, hostStepNumber, pageIndex = 0) {
    const hostStep = container?.querySelector(`.step-container.step-${hostStepNumber}`);
    if (!hostStep) return;
    const pages = this.getInlinePagesForStep(hostStep);
    if (!pages.length) return;
    const target = pages[Math.min(Math.max(0, pageIndex), pages.length - 1)];
    this.showPage(target, pages);
    this.notifyFormNavigationAfterInternalPageChange(container);
  }

  hasPageBreakBefore(node) {
    const value = node?.pageBreakBeforeOptions;
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  encodeOptionData(item) {
    try {
      return encodeURIComponent(JSON.stringify(item));
    } catch (e) {
      return '';
    }
  }

  parseOptionData(option) {
    if (!option) return null;

    const raw =
      option.getAttribute('data-service') ||
      option.getAttribute('data-category-data') ||
      option.dataset?.service ||
      option.dataset?.categoryData;

    if (!raw) return null;

    const candidates = raw.startsWith('%') ? [decodeURIComponent(raw), raw] : [raw, decodeURIComponent(raw)];

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch (e) {
        /* try next */
      }
    }

    return null;
  }

  isServiceReadyForPostFields(container) {
    if (!container) return false;

    const finalValue = container.querySelector('.final-service-value');
    if (finalValue?.value?.trim()) return true;

    if (this.hasUnifiedPending(container)) return false;

    return this.isServicePathComplete(container);
  }

  hasInProgressCascade(container) {
    if (!container) return false;
    if (container.querySelector('.inline-cascade-level')) return true;
    const catSelect = container.querySelector('.category-select');
    return !!(catSelect?.value);
  }

  getServiceSelectCascadeLevel(serviceSelect) {
    const levelEl = serviceSelect?.closest('.inline-cascade-level');
    if (levelEl) {
      const level = parseInt(levelEl.dataset.cascadeLevel, 10);
      if (level > 0) return level;
    }
    return parseInt(serviceSelect?.dataset?.stepNumber, 10) || 2;
  }

  clearServiceCompletionState(container) {
    if (!container) return;

    container.classList.remove('complete', 'step-4-active');

    const resetHidden = (selector, value = '') => {
      const el = container.querySelector(selector);
      if (el) el.value = value;
    };

    resetHidden('.final-service-value');
    resetHidden('.final-quantity-value', '1');
    resetHidden('.final-price-value');
    resetHidden('.base-price-value');
    resetHidden('.pricing-type-value');
    resetHidden('.selected-path-value');
  }

  resetServiceFieldForReselect(fieldId) {
    const container = this.getServiceContainer(fieldId);
    if (!container) return;

    this.clearUnifiedPendingState(container);
    this.clearServiceCompletionState(container);
    delete container.dataset.lastSelectedCategory;

    const hiddenContainer = container.querySelector('.dynamic-hidden-inputs');
    if (hiddenContainer) hiddenContainer.innerHTML = '';

    this.clearSeparateStepsFrom(container, 2);
    this.clearInlineCascade(container, 1, 2);
    this.hideStepsAfter(container, 1);

    const catSelect = container.querySelector('.category-select');
    if (catSelect) catSelect.value = '';

    this.showStep(container, 1);
    this.updateProgressClasses(container, 1);
    this.updateInternalNavigation(container);
    this.notifyUnifiedStepsChanged(container);
  }

  isUnifiedMode(container) {
    return container?.dataset?.unifiedMode === '1';
  }

  clearUnifiedPendingState(container) {
    if (!container) return;
    delete container.dataset.pendingInlineReveal;
    delete container.dataset.pendingInlineData;
    delete container.dataset.pendingInternalStep;
    delete container.dataset.pendingParentJson;
  }

  preparePendingInlineLevel(container, hostStepNumber, levelNumber, items, labelText) {
    container.dataset.pendingInlineReveal = '1';
    container.dataset.pendingInlineData = JSON.stringify({
      hostStep: hostStepNumber,
      levelNumber,
      items,
      labelText,
    });
    window.quotemateUnifiedSteps?.updateNavigationButtons?.();
  }

  revealPendingInline(container) {
    if (!container || container.dataset.pendingInlineReveal !== '1') return false;

    let data = {};
    try {
      data = JSON.parse(container.dataset.pendingInlineData || '{}');
    } catch (e) {
      data = {};
    }

    if (!data.items?.length) return false;

    this.renderInlineLevel(
      container,
      data.hostStep || 1,
      data.levelNumber || 2,
      data.items,
      data.labelText || 'option'
    );
    delete container.dataset.pendingInlineReveal;
    delete container.dataset.pendingInlineData;
    this.showStep(container, data.hostStep || 1);
    this.updateProgressClasses(container, data.hostStep || 1);
    this.updateInternalNavigation(container);
    return true;
  }

  preparePendingPageBreakLevel(container, stepNumber, items, labelText, parentItem) {
    this.renderSeparateLevel(container, stepNumber, items, labelText);
    container.dataset.pendingInternalStep = String(stepNumber);
    if (parentItem) {
      container.dataset.pendingParentJson = JSON.stringify(parentItem);
    }
    this.showStep(container, stepNumber - 1);
    this.hideStepsAfter(container, stepNumber - 1);
    this.updateProgressClasses(container, stepNumber - 1);
    window.quotemateUnifiedSteps?.updateNavigationButtons?.();
  }

  getDeepestSelectedServiceSelect(container) {
    const selects = Array.from(container.querySelectorAll('select.service-select'));
    for (let i = selects.length - 1; i >= 0; i--) {
      if (selects[i].value) {
        return selects[i];
      }
    }
    return container.querySelector('select.service-select');
  }

  hasUnifiedPending(container) {
    return (
      container?.dataset?.pendingInlineReveal === '1' || !!container?.dataset?.pendingInternalStep
    );
  }

  getLastSelectedItem(container) {
    if (!container) return null;

    const catSelect = container.querySelector('.category-select');
    if (!catSelect?.value) return null;

    let lastItem = null;
    const catOption = catSelect.options[catSelect.selectedIndex];
    lastItem = this.parseOptionData(catOption);

    if (!lastItem) {
      const fieldId = container.dataset.fieldId;
      const fieldData = this.getFieldData(fieldId);
      const structure = fieldData?.enhancedServiceStructure || fieldData?.serviceStructure || [];
      lastItem = this.getSelectableItems(structure).find(
        (cat) => this.sanitizeValue(cat.name) === catSelect.value
      );
    }

    container.querySelectorAll('select.service-select').forEach((select) => {
      if (!select.value) return;
      const option = select.options[select.selectedIndex];
      const parsed = this.parseOptionData(option);
      if (parsed) {
        lastItem = parsed;
      }
    });

    return lastItem;
  }

  nodeHasPricing(node) {
    if (!node) return false;
    const base = parseFloat(node.basePrice) || 0;
    return !!(node.pricingType && (base > 0 || (node.pricingTiers && node.pricingTiers.length)));
  }

  resolvePricedSelection(container) {
    if (!container) return null;

    const levels = [];
    const catSelect = container.querySelector('.category-select');
    if (catSelect?.value) {
      const opt = catSelect.options[catSelect.selectedIndex];
      levels.push(this.parseOptionData(opt));
    }
    container.querySelectorAll('select.service-select').forEach((select) => {
      if (!select.value) return;
      const parsed = this.parseOptionData(select.options[select.selectedIndex]);
      if (parsed) levels.push(parsed);
    });

    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.nodeHasPricing(levels[i])) {
        return levels[i];
      }
    }

    const dynamicInputs = container.querySelectorAll('.dynamic-step-input[data-step-data]');
    for (let i = dynamicInputs.length - 1; i >= 0; i--) {
      try {
        const data = JSON.parse(dynamicInputs[i].dataset.stepData || '{}');
        if (this.nodeHasPricing(data)) {
          return data;
        }
      } catch (e) {
        /* ignore */
      }
    }

    const finalPrice = parseFloat(container.querySelector('.final-price-value')?.value);
    if (finalPrice > 0) {
      const last = this.getLastSelectedItem(container) || {};
      return {
        ...last,
        name: last.name || container.querySelector('.final-service-value')?.value || 'Selected service',
        pricingType: container.querySelector('.pricing-type-value')?.value || last.pricingType || 'fixed',
        basePrice: parseFloat(container.querySelector('.base-price-value')?.value) || finalPrice,
        _resolvedTotalPrice: finalPrice,
      };
    }

    return this.getLastSelectedItem(container);
  }

  isServicePathComplete(container) {
    if (!container) return true;

    const finalValue = container.querySelector('.final-service-value');
    if (finalValue?.value?.trim()) return true;

    if (this.hasUnifiedPending(container)) return false;

    const catSelect = container.querySelector('.category-select');
    if (!catSelect?.value) return false;

    const deepest = this.getDeepestSelectedServiceSelect(container);
    if (deepest?.value) {
      const option = deepest.options[deepest.selectedIndex];
      const data = this.parseOptionData(option);
      if (data) {
        if (this.getSelectableItems(data.children).length === 0) {
          return true;
        }
        return false;
      }
    }

    const lastItem = this.getLastSelectedItem(container);
    if (!lastItem) return false;

    return this.getSelectableItems(lastItem.children).length === 0;
  }

  hasCompletedQuantityStep(container) {
    const qtyLevel = container?.querySelector('.inline-cascade-level--quantity');
    if (!qtyLevel) {
      return parseInt(container?.querySelector('.final-quantity-value')?.value || '0', 10) > 0;
    }

    const input = qtyLevel.querySelector('.quantity-input');
    const value = parseInt(input?.value || container?.querySelector('.final-quantity-value')?.value || '0', 10);
    return value > 0;
  }

  markServiceSelectionComplete(container, serviceData) {
    if (!container || !serviceData) return;

    this.clearUnifiedPendingState(container);

    const finalServiceValue = container.querySelector('.final-service-value');
    const displayName =
      serviceData.name ||
      serviceData.label ||
      container.querySelector('.selected-path-value')?.value?.split(' → ').pop() ||
      'Selected service';
    if (finalServiceValue) {
      finalServiceValue.value = displayName;
      finalServiceValue.dispatchEvent(new Event('change', { bubbles: true }));
    }

    container.classList.add('complete');
  }

  notifyUnifiedStepsChanged(container) {
    const unified = window.quotemateUnifiedSteps;
    if (!unified || !this.isUnifiedMode(container)) return;
    unified.ensurePostServiceFields?.();
    unified.enforcePostServiceFieldVisibility?.();
    unified.syncCascadeProgressFromService?.(container);
    unified.updateNavigationButtons();
  }

  completeLeafSelection(container, serviceData, opts = {}) {
    const hostStepNumber = opts.hostStepNumber ?? this.getActiveStepNumber(container);
    const levelNumber = opts.levelNumber ?? hostStepNumber + 1;
    const isInlineSelect = !!opts.isInlineSelect;
    const isPerType = this.isPerPricingType(serviceData?.pricingType);

    this.markServiceSelectionComplete(container, serviceData);

    if (!this.isUnifiedMode(container)) {
      const activeStep = container.querySelector('.step-container.active');
      const useInlineLeaf = isInlineSelect || !!activeStep?.querySelector('.inline-cascade-level');

      this.clearSeparateStepsFrom(container, levelNumber);

      if (useInlineLeaf) {
        this.renderInlineQuantity(container, hostStepNumber, levelNumber, serviceData);
        this.showStep(container, hostStepNumber);
        this.updateProgressClasses(container, hostStepNumber);

        if (!isPerType) {
          this.updatePriceSummary(container, serviceData, 1);
        }
      } else {
        this.renderQuantityStep(container, levelNumber, serviceData);
        this.showStep(container, levelNumber);

        if (!isPerType) {
          this.updatePriceSummary(container, serviceData, 1);
          this.showStep(container, levelNumber + 1);
          this.updateProgressClasses(container, levelNumber + 1);
        } else {
          this.hideStepsAfter(container, levelNumber);
          this.updateProgressClasses(container, levelNumber);
        }
      }
    } else {
      this.clearSeparateStepsFrom(container, levelNumber);
      if (isInlineSelect && opts.serviceSelect) {
        this.clearInlineCascadeFrom(opts.serviceSelect.closest('.step-container'), levelNumber);
      } else {
        this.clearInlineCascade(container, hostStepNumber, levelNumber);
      }

      if (isPerType) {
        this.renderInlineQuantity(container, hostStepNumber, levelNumber, serviceData);
        this.showStep(container, hostStepNumber);
        this.updateProgressClasses(container, hostStepNumber);
      }

      this.processQuantitySelection(
        container,
        Math.max(1, serviceData.minQuantity || 1)
      );
    }

    this.updateInternalNavigation(container);
    this.notifyUnifiedStepsChanged(container);
  }

  formatDisplayMoney(amount) {
    const n = Number(amount) || 0;
    return `$${n.toFixed(2)}`;
  }

  getUnitLabelTitle(pricingType) {
    return this.formatDisplayText(this.getQuantityUnit(pricingType));
  }

  formatPerUnitSuffix(pricingType) {
    const formatted = this.formatPricingType(pricingType);
    if (typeof formatted === 'string' && formatted.startsWith('Per ')) {
      return formatted.toLowerCase();
    }
    const unit = this.getQuantityUnit(pricingType).replace(/s$/, '');
    return unit ? `per ${unit}` : 'per unit';
  }

  getPricingCalculatorScope(container) {
    return (
      container?.querySelector('.inline-cascade-level--quantity .quotemate-pricing-calculator') ||
      container?.querySelector('.quantity-section.quotemate-pricing-calculator') ||
      container
    );
  }

  buildQuantityHtml(serviceData, fieldId = null, options = {}) {
    const { inline = false } = options;
    const isPerType = this.isPerPricingType(serviceData.pricingType);
    const maxQty = this.resolveQuantityMax(serviceData, fieldId);
    const minQty = Math.max(1, parseInt(serviceData.minQuantity, 10) || 1);
    const initialQty = maxQty ? Math.min(minQty, maxQty) : minQty;

    if (isPerType) {
      const unitPrice = parseFloat(serviceData.basePrice) || 0;
      const initialTotal = unitPrice * initialQty;
      const unitTitle = this.getUnitLabelTitle(serviceData.pricingType);
      const perSuffix = this.formatPerUnitSuffix(serviceData.pricingType);
      const labelClass = inline
        ? 'field-label quantity-label quantity-label--sr-only'
        : 'field-label quantity-label';

      return `
        ${serviceData.description ? `<p class="service-desc quotemate-pricing-calculator__desc">${serviceData.description}</p>` : ''}
        <div class="quantity-section quotemate-pricing-calculator${inline ? ' quotemate-pricing-calculator--inline' : ''}">
          <label class="${labelClass}" for="qty-${fieldId || 'service'}">${unitTitle}</label>
          <div class="quotemate-pricing-row">
            <div class="quotemate-pricing-row__input-wrap">
              <input
                type="number"
                id="qty-${fieldId || 'service'}"
                class="quantity-input form-control"
                min="${minQty}"
                value="${initialQty}"
                max="${maxQty || ''}"
                inputmode="numeric"
                ${maxQty ? `data-max-quantity="${maxQty}"` : ''}>
            </div>
            <div class="quotemate-pricing-row__formula" aria-live="polite">
              <span class="quotemate-pricing-row__op" aria-hidden="true">×</span>
              <span class="quotemate-pricing-row__rate">
                <span class="unit-price-display">${this.formatDisplayMoney(unitPrice)}</span>
                <span class="quotemate-pricing-row__rate-suffix">${perSuffix}</span>
              </span>
              <span class="quotemate-pricing-row__op" aria-hidden="true">=</span>
              <span class="quotemate-pricing-row__total-wrap">
                <span class="quotemate-pricing-row__total-label">Total:</span>
                <span class="total-price-display">${this.formatDisplayMoney(initialTotal)}</span>
              </span>
            </div>
          </div>
          <div class="quantity-options-grid" style="display: none" aria-hidden="true"></div>
          ${
            serviceData.deliveryTime
              ? `<div class="delivery-estimate quotemate-pricing-calculator__delivery">
                  <span class="delivery-estimate__label">Est. delivery</span>
                  <span class="delivery-time">${serviceData.deliveryTime} days</span>
                </div>`
              : ''
          }
        </div>
      `;
    }

    return `
      <div class="service-details">
        <div class="service-description" style="display: ${serviceData.description ? 'block' : 'none'}">
          <p class="service-desc">${serviceData.description || ''}</p>
        </div>
        <div class="service-pricing-info">
          <div class="pricing-info">
            <span class="pricing-type">${this.formatPricingType(serviceData.pricingType)}</span>
            <span class="base-price">$${serviceData.basePrice}</span>
            ${serviceData.deliveryTime ? `<span class="delivery">Delivery: ${serviceData.deliveryTime} days</span>` : ''}
          </div>
        </div>
      </div>
      <div class="quantity-section" style="display:none;">
        <label class="quantity-label">Quantity</label>
        <div class="quantity-options-grid" style="display: none"></div>
        <div class="quantity-input-container" style="display: none">
          <input type="number" class="quantity-input form-control" min="${minQty}" value="${initialQty}" max="${maxQty || ''}"${maxQty ? ` data-max-quantity="${maxQty}"` : ''}>
          <span class="quantity-unit">${this.getQuantityUnit(serviceData.pricingType)}</span>
        </div>
      </div>
    `;
  }

  renderInlineQuantity(container, hostStepNumber, levelNumber, serviceData) {
    const hostStep = container.querySelector(`.step-container.step-${hostStepNumber}`);
    if (!hostStep) return;

    this.clearInlineCascadeFrom(hostStep, levelNumber);

    const { page: targetPage } = this.resolveTargetInlinePage(hostStep, { allowOverflow: true });
    const row = targetPage?.querySelector('.inline-cascade-row');
    if (!row) return;

    const levelEl = document.createElement('div');
    levelEl.className = 'inline-cascade-level inline-cascade-level--quantity';
    levelEl.dataset.cascadeLevel = String(levelNumber);
    levelEl.innerHTML = this.buildQuantityHtml(serviceData, container.dataset.fieldId, { inline: true });
    row.appendChild(levelEl);
    this.syncRowGridColumns(row);
    this.applyFieldSizeToContainer(container);

    const allPages = this.getInlinePagesForStep(hostStep);
    this.showPage(targetPage, allPages);
    this.notifyFormNavigationAfterInternalPageChange(container);
    this.configureQuantityStep(container, serviceData);
    this.applyCascadeLayoutVars(container);
  }

  renderQuantityStep(container, stepNumber, serviceData) {
    const stepContainer = container.querySelector(`.step-container.step-${stepNumber}`);
    if (!stepContainer) return;

    stepContainer.innerHTML = this.buildQuantityHtml(serviceData, container.dataset.fieldId);
    this.configureQuantityStep(container, serviceData);
  }

  handleQuantityChange(e) {
    const quantityInput = e.target;
    const container = quantityInput.closest('.progressive-service-selector');
    if (!container) return;

    let serviceData = null;
    const serviceSelect = this.getDeepestSelectedServiceSelect(container);
    const selectedOption = serviceSelect?.options?.[serviceSelect.selectedIndex];
    if (selectedOption?.value) {
      serviceData = this.parseOptionData(selectedOption);
    }
    if (!serviceData?.pricingType) {
      serviceData = this.resolvePricedSelection(container) || serviceData;
    }
    if (!serviceData) return;

    const fieldId = container.dataset.fieldId;
    let quantity = parseInt(quantityInput.value, 10) || 1;
    quantity = this.clampQuantity(quantity, serviceData, fieldId);
    if (String(quantityInput.value) !== String(quantity)) {
      quantityInput.value = String(quantity);
    }

    if (quantityInput.classList.contains('custom-quantity-input')) {
      if (quantity > 0) {
        this.processQuantitySelection(container, quantity);
      }
    } else {
      this.processQuantitySelection(container, quantity);
    }
  }

  handleQuantityOptionClick(e) {
    const quantityOption = e.target.closest('.quantity-option');
    const container = quantityOption.closest('.progressive-service-selector');
    const quantity = parseInt(quantityOption.dataset.quantity);

    // Remove active class from all options
    container.querySelectorAll('.quantity-option').forEach(opt =>
      opt.classList.remove('selected'));

    // Add active class to selected option
    quantityOption.classList.add('selected');

    // Process the selection
    this.processQuantitySelection(container, quantity);
  }

  processQuantitySelection(container, quantity) {
    let serviceData = null;
    const serviceSelect = this.getDeepestSelectedServiceSelect(container);
    const selectedOption = serviceSelect?.options?.[serviceSelect.selectedIndex];

    if (selectedOption?.value) {
      serviceData = this.parseOptionData(selectedOption);
    }

    if (!serviceData?.pricingType) {
      serviceData = this.resolvePricedSelection(container) || serviceData;
    }

    if (!serviceData) return;

    try {
      const fieldId = container.dataset.fieldId;
      quantity = this.clampQuantity(quantity, serviceData, fieldId);

      const qtyInput = container.querySelector('.quantity-input, .custom-quantity-input');
      if (qtyInput && String(qtyInput.value) !== String(quantity)) {
        qtyInput.value = String(quantity);
      }

      this.updatePriceSummary(container, serviceData, quantity);

      if (!this.isUnifiedMode(container) && !this.hasInlineLevels(container)) {
        this.showStep(container, 4);
        this.updateProgressClasses(container, 4);
      } else {
        this.updateInternalNavigation(container);
      }

      if (this.isUnifiedMode(container)) {
        window.quotemateUnifiedSteps?.updateNavigationButtons?.();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }

  displayServiceDetails(container, serviceData) {
    if (this.isPerPricingType(serviceData.pricingType)) {
      const pricingScope = this.getPricingCalculatorScope(container);
      const desc = pricingScope?.querySelector('.quotemate-pricing-calculator__desc');
      if (desc) {
        desc.textContent = serviceData.description || '';
        desc.style.display = serviceData.description ? '' : 'none';
      }
      return;
    }

    const detailsContainer = container.querySelector('.service-details');
    const descriptionDiv = container.querySelector('.service-description');
    const pricingInfoDiv = container.querySelector('.service-pricing-info');

    if (serviceData.description && descriptionDiv) {
      descriptionDiv.innerHTML = `<p class="service-desc">${serviceData.description}</p>`;
      descriptionDiv.style.display = 'block';
    }

    if (pricingInfoDiv) {
      pricingInfoDiv.innerHTML = `
        <div class="pricing-info">
          <span class="pricing-type">${this.formatPricingType(serviceData.pricingType)}</span>
          <span class="base-price">$${serviceData.basePrice}</span>
          ${serviceData.deliveryTime ? `<span class="delivery">Delivery: ${serviceData.deliveryTime} days</span>` : ''}
        </div>
      `;
    }

    if (detailsContainer) {
      detailsContainer.style.display = 'block';
    }
  }

  configureQuantityStep(container, serviceData) {
    const pricingScope = this.getPricingCalculatorScope(container);
    const quantityLabel = pricingScope.querySelector('.quantity-label');
    const quantityOptionsGrid = pricingScope.querySelector('.quantity-options-grid');
    const quantityInput = pricingScope.querySelector('.quantity-input');
    const rateSuffix = pricingScope.querySelector('.quotemate-pricing-row__rate-suffix');
    const deliveryEstimate = pricingScope.querySelector('.delivery-estimate');

    if (this.isPerPricingType(serviceData.pricingType)) {
      if (quantityLabel) {
        quantityLabel.textContent = this.getUnitLabelTitle(serviceData.pricingType);
      }
      if (rateSuffix) {
        rateSuffix.textContent = this.formatPerUnitSuffix(serviceData.pricingType);
      }
    } else if (quantityLabel) {
      quantityLabel.textContent = 'Quantity';
    }

    if (quantityOptionsGrid) {
      quantityOptionsGrid.style.display = 'none';
    }

    if (quantityInput) {
      const fieldId = container.dataset.fieldId;
      const maxQty = this.resolveQuantityMax(serviceData, fieldId);
      const minQty = Math.max(1, parseInt(serviceData.minQuantity, 10) || 1);

      quantityInput.min = minQty;
      if (maxQty) {
        quantityInput.max = maxQty;
        quantityInput.dataset.maxQuantity = String(maxQty);
      } else {
        quantityInput.removeAttribute('max');
        delete quantityInput.dataset.maxQuantity;
      }

      quantityInput.value = String(this.clampQuantity(quantityInput.value, serviceData, fieldId));
    }

    if (deliveryEstimate && serviceData.deliveryTime) {
      const deliveryTimeSpan = deliveryEstimate.querySelector('.delivery-time');
      if (deliveryTimeSpan) {
        deliveryTimeSpan.textContent = `${serviceData.deliveryTime} days`;
      }
      deliveryEstimate.style.display = '';
    } else if (deliveryEstimate) {
      deliveryEstimate.style.display = 'none';
    }
  }

  updatePriceSummary(container, serviceData, quantity) {
    const pricingInfo = this.calculatePriceWithTiers(serviceData, quantity);
    const unitPrice = pricingInfo.unitPrice;
    const totalPrice = pricingInfo.totalPrice;
    const deliveryTime = pricingInfo.deliveryTime;

    const pricingScope = this.getPricingCalculatorScope(container);
    const serviceNameDisplay = container.querySelector('.service-name-display');
    const quantityDisplay = container.querySelector('.quantity-display');
    const unitPriceDisplay = pricingScope.querySelector('.unit-price-display');
    const totalPriceDisplay = pricingScope.querySelector('.total-price-display');

    if (serviceNameDisplay) {
      serviceNameDisplay.textContent = serviceData.name;
    }

    if (quantityDisplay && unitPriceDisplay && !this.isPerPricingType(serviceData.pricingType)) {
      if (serviceData.pricingType === 'fixed') {
        quantityDisplay.textContent = '1 service';
        unitPriceDisplay.textContent = `$${unitPrice.toFixed(2)} (Fixed)`;
      } else {
        const unitLabel = this.getQuantityUnit(serviceData.pricingType);
        quantityDisplay.textContent = `${quantity} ${unitLabel}`;
        const pricingLabel = this.formatPricingType(serviceData.pricingType);
        unitPriceDisplay.textContent = `$${unitPrice.toFixed(2)} ${pricingLabel.toLowerCase()}`;
      }
    } else if (unitPriceDisplay) {
      unitPriceDisplay.textContent = this.formatDisplayMoney(unitPrice);
    }

    if (totalPriceDisplay) {
      totalPriceDisplay.textContent = this.formatDisplayMoney(totalPrice);
    }

    // Update delivery estimate if tier-specific delivery time is available
    if (deliveryTime && deliveryTime !== serviceData.deliveryTime) {
      const deliveryEstimate = pricingScope.querySelector('.delivery-estimate');
      if (deliveryEstimate) {
        const deliveryTimeSpan = deliveryEstimate.querySelector('.delivery-time');
        if (deliveryTimeSpan) {
          deliveryTimeSpan.textContent = `${deliveryTime} days`;
        }
      }
    }

    const finalServiceValue = container.querySelector('.final-service-value');
    const finalQuantityValue = container.querySelector('.final-quantity-value');
    const finalPriceValue = container.querySelector('.final-price-value');
    const pricingTypeValue = container.querySelector('.pricing-type-value');
    const basePriceValue = container.querySelector('.base-price-value');
    const finalPriceValue2 = container.querySelector('.final-price-value[name$="_final_price"]');
    const selectedPathValue = container.querySelector('.selected-path-value');

    const categorySelect = container.querySelector('.category-select');
    const serviceSelect = this.getDeepestSelectedServiceSelect(container);
    const categoryName = categorySelect?.options[categorySelect.selectedIndex]?.text || '';
    const serviceName = serviceSelect?.options[serviceSelect.selectedIndex]?.text || '';

    if (finalServiceValue) {
      finalServiceValue.value = serviceData.name;
      finalServiceValue.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (finalQuantityValue) finalQuantityValue.value = quantity;
    if (finalPriceValue) finalPriceValue.value = totalPrice;
    if (pricingTypeValue) pricingTypeValue.value = serviceData.pricingType || '';
    if (basePriceValue) basePriceValue.value = serviceData.basePrice || 0;
    if (finalPriceValue2) finalPriceValue2.value = totalPrice;
    if (selectedPathValue) selectedPathValue.value = `${categoryName} → ${serviceName}`;



    // Add visual feedback
    container.classList.add('step-4-active');
    container.classList.add('complete');

    // Trigger calculation update for quote totals
    this.triggerCalculationUpdate();
  }

  shouldHideHostFields(container) {
    const activeStepNumber = this.getActiveStepNumber(container);
    const logicalPosition = this.getLogicalStepPosition(container, activeStepNumber);
    const { pages, pageIndex } = this.getActivePageInfo(container);

    if (logicalPosition > 1) {
      return true;
    }

    return pages.length > 1 && pageIndex > 0;
  }

  updateHostFieldVisibility(container) {
    if (container.dataset.unifiedMode === '1') return;

    const formStep = container.closest('.form-step') || container.closest('form.quotemate-form');
    if (!formStep) return;

    const hideHostFields = this.shouldHideHostFields(container);

    formStep.querySelectorAll('.form-group').forEach(group => {
      if (group.contains(container)) {
        const fieldLabel = group.querySelector(':scope > .field-label');
        const fieldDesc = group.querySelector(':scope > .field-description');
        if (fieldLabel) {
          fieldLabel.style.display = 'none';
        }
        if (fieldDesc) {
          fieldDesc.style.display = 'none';
        }
        return;
      }

      if (hideHostFields) {
        group.style.display = 'none';
        group.dataset.progressiveHidden = '1';
      } else if (group.dataset.progressiveHidden === '1') {
        group.style.display = '';
        delete group.dataset.progressiveHidden;
      }
    });

    formStep.querySelectorAll('.form-section').forEach(section => {
      if (section.contains(container)) {
        const sectionTitle = section.querySelector(':scope > .section-title');
        const serviceGroups = section.querySelectorAll('.form-group .progressive-service-selector');
        const allGroups = section.querySelectorAll('.form-group');
        const onlyService = serviceGroups.length > 0 && serviceGroups.length === allGroups.length;
        if (sectionTitle) {
          sectionTitle.style.display = onlyService ? 'none' : '';
        }
        return;
      }

      if (hideHostFields) {
        section.style.display = 'none';
        section.dataset.progressiveHidden = '1';
      } else if (section.dataset.progressiveHidden === '1') {
        section.style.display = '';
        delete section.dataset.progressiveHidden;
      }
    });
  }

  showStep(container, stepNumber) {
    const stepElement = container.querySelector(`.step-container.step-${stepNumber}`);
    if (stepElement) {
      // Always show one internal step at a time (prevents stacked dropdown levels).
      const allInternalSteps = container.querySelectorAll('.progressive-steps > .step-container');
      allInternalSteps.forEach(step => {
        step.style.display = 'none';
        step.classList.remove('active');
      });

      stepElement.style.display = 'block';
      stepElement.classList.add('active');
      this.updateInternalNavigation(container);
    }
  }

  renderInlinePaginationControls(pageIndex, totalPages) {
    if (totalPages <= 1) {
      return '';
    }

    return `
      <div class="progressive-pagination-controls">
        ${pageIndex > 0 ? `
          <button type="button" class="btn btn-sm btn-secondary progressive-page-prev" data-page-index="${pageIndex}">
            Previous
          </button>
        ` : '<span class="progressive-pagination-spacer"></span>'}
        <span class="progressive-page-indicator">Page ${pageIndex + 1} of ${totalPages}</span>
        ${pageIndex < totalPages - 1 ? `
          <button type="button" class="btn btn-sm btn-primary progressive-page-next" data-page-index="${pageIndex}">
            Continue
          </button>
        ` : '<span class="progressive-pagination-spacer"></span>'}
      </div>
    `;
  }

  isStepMeaningful(stepEl) {
    if (!stepEl) return false;
    return !!(
      stepEl.querySelector('.category-select') ||
      stepEl.querySelector('.service-select') ||
      stepEl.querySelector('.inline-cascade-level') ||
      stepEl.querySelector('.quantity-section')
    );
  }

  findPreviousPopulatedStep(container, fromStep) {
    for (let step = fromStep - 1; step >= 1; step--) {
      const stepEl = container.querySelector(`.step-container.step-${step}`);
      if (this.isStepMeaningful(stepEl)) {
        return step;
      }
    }
    return 1;
  }

  findNextPopulatedStep(container, fromStep) {
    for (let step = fromStep + 1; step <= 5; step++) {
      const stepEl = container.querySelector(`.step-container.step-${step}`);
      if (this.isStepMeaningful(stepEl)) {
        return step;
      }
    }
    return null;
  }

  getPopulatedStepNumbers(container) {
    const numbers = [];
    for (let step = 1; step <= 5; step++) {
      const stepEl = container.querySelector(`.step-container.step-${step}`);
      if (this.isStepMeaningful(stepEl)) {
        numbers.push(step);
      }
    }
    return numbers;
  }

  getLogicalStepPosition(container, physicalStep) {
    const populated = this.getPopulatedStepNumbers(container);
    const index = populated.indexOf(physicalStep);
    return index >= 0 ? index + 1 : 1;
  }

  getTotalLogicalSteps(container) {
    return this.getPopulatedStepNumbers(container).length;
  }

  getActiveStepNumber(container) {
    const activeStep = container.querySelector('.step-container.active');
    if (!activeStep) return 1;
    return parseInt((activeStep.className.match(/\bstep-(\d+)\b/) || [])[1] || '1', 10);
  }

  getActivePageInfo(container) {
    const activeStep = container.querySelector('.step-container.active');
    if (!activeStep) return { pages: [], activePage: null, pageIndex: 0 };

    const inlinePagesContainer = activeStep.querySelector('.inline-cascade-pages');
    if (inlinePagesContainer) {
      const pages = this.getInlinePagesForStep(activeStep);
      if (!pages.length) return { pages: [], activePage: null, pageIndex: 0 };

      const markedActive = pages.filter((page) => page.classList.contains('active-page'));
      let activePage = markedActive[0] || null;

      if (markedActive.length > 1) {
        activePage = markedActive[0];
        this.showPage(activePage, pages);
      } else if (!activePage) {
        activePage = pages[0];
        this.showPage(activePage, pages);
      }

      return {
        pages,
        activePage,
        pageIndex: Math.max(0, pages.indexOf(activePage)),
      };
    }

    const activePage = activeStep.querySelector('.category-page.active-page, .step-2-page.active-page, .step-page.active-page');
    const pagesContainer = activePage?.parentElement;
    const pages = pagesContainer
      ? Array.from(pagesContainer.children).filter(el => el.matches('.category-page, .step-2-page, .step-page'))
      : [];

    return {
      pages,
      activePage,
      pageIndex: activePage ? pages.indexOf(activePage) : 0,
    };
  }

  showPage(nextPage, allPages) {
    if (!nextPage || !allPages?.length) return false;

    const current = allPages.find((page) => page.classList.contains('active-page'));
    if (current === nextPage) {
      allPages.forEach((page) => {
        if (page !== nextPage) {
          page.style.display = 'none';
          page.classList.remove('active-page');
        }
      });
      nextPage.style.display = '';
      nextPage.classList.add('active-page');
      return false;
    }

    allPages.forEach((page) => {
      page.style.display = 'none';
      page.classList.remove('active-page');
    });
    nextPage.style.display = '';
    nextPage.classList.add('active-page');
    return true;
  }

  notifyFormNavigationAfterInternalPageChange(container) {
    this.updateInternalNavigation(container);
    this.syncCascadeStepProgress(container);
    window.quotemateUnifiedSteps?.updateNavigationButtons?.();
  }

  navigateActivePage(container, direction) {
    const { pages, activePage, pageIndex } = this.getActivePageInfo(container);
    if (!activePage || pages.length <= 1) return false;

    const nextIndex = pageIndex + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return false;

    const changed = this.showPage(pages[nextIndex], pages);
    if (changed) {
      this.notifyFormNavigationAfterInternalPageChange(container);
    }
    return changed;
  }

  hasInlineLevels(container) {
    return !!container.querySelector('.inline-cascade-level');
  }

  canAdvanceFromActiveStep(container) {
    const activeStep = container.querySelector('.step-container.active');
    if (!activeStep) return true;

    const activeInlinePage = activeStep.querySelector('.inline-cascade-page.active-page');
    const scope = activeInlinePage || activeStep;

    const selects = scope.querySelectorAll('select.step-select');
    for (const select of selects) {
      if (select.value === '') {
        return false;
      }
    }

    const quantityLevel = scope.querySelector('.inline-cascade-level--quantity');
    if (quantityLevel) {
      const input = quantityLevel.querySelector('.quantity-input');
      const value = parseInt(input?.value || '0', 10);
      if (!value || value < 1) {
        return false;
      }
    }

    return true;
  }

  navigateInternalNext(container) {
    if (container.dataset.pendingInternalStep) {
      if (!this.canAdvanceFromActiveStep(container)) {
        return;
      }

      const stepNumber = parseInt(container.dataset.pendingInternalStep, 10);
      delete container.dataset.pendingInternalStep;
      this.showStep(container, stepNumber);
      this.updateProgressClasses(container, stepNumber);
      return;
    }

    const { pages, pageIndex } = this.getActivePageInfo(container);
    if (pages.length > 1 && pageIndex < pages.length - 1) {
      this.navigateActivePage(container, 1);
      return;
    }

    const activeStepNumber = this.getActiveStepNumber(container);
    const nextStep = this.findNextPopulatedStep(container, activeStepNumber);

    if (nextStep !== null) {
      if (!this.canAdvanceFromActiveStep(container)) {
        return;
      }

      this.showStep(container, nextStep);
      this.updateProgressClasses(container, nextStep);
    }

    this.notifyFormNavigationAfterInternalPageChange(container);
  }

  navigateInternalPrev(container) {
    const { pages, pageIndex } = this.getActivePageInfo(container);
    if (pages.length > 1 && pageIndex > 0) {
      this.navigateActivePage(container, -1);
      return;
    }

    const activeStepNumber = this.getActiveStepNumber(container);
    if (activeStepNumber <= 1) return;

    const activeStepEl = container.querySelector(`.step-container.step-${activeStepNumber}`);
    const targetStep = this.findPreviousPopulatedStep(container, activeStepNumber);

    if (activeStepEl?.dataset.pageBreakStep === '1') {
      container.dataset.pendingInternalStep = String(activeStepNumber);
    } else {
      delete container.dataset.pendingInternalStep;
    }

    this.showStep(container, targetStep);
    this.updateProgressClasses(container, targetStep);
    this.notifyFormNavigationAfterInternalPageChange(container);
  }

  setUnifiedMode(enabled) {
    document.querySelectorAll('.progressive-service-selector').forEach((container) => {
      container.dataset.unifiedMode = enabled ? '1' : '';
      const nav = container.querySelector('.progressive-selector-navigation');
      if (nav) {
        nav.style.display = enabled ? 'none' : '';
      }

      container.querySelectorAll('.final-service-value').forEach((input) => {
        if (enabled) {
          if (input.hasAttribute('required')) {
            input.dataset.unifiedRequired = '1';
            input.removeAttribute('required');
          }
        } else if (input.dataset.unifiedRequired === '1') {
          input.setAttribute('required', 'required');
          delete input.dataset.unifiedRequired;
        }
      });
    });
  }

  getServiceContainer(fieldId) {
    const group = document.querySelector(`.form-group[data-field-id="${fieldId}"]`);
    if (group) {
      const scoped = group.querySelector('.progressive-service-selector');
      if (scoped) return scoped;
    }
    return document.querySelector(`.progressive-service-selector[data-field-id="${fieldId}"]`);
  }

  ensureServiceContainerVisible(container) {
    if (!container) return;

    container.style.display = '';
    const host = container.closest('.service-field-container');
    if (host) host.style.display = '';
    const fieldInput = container.closest('.field-input');
    if (fieldInput) fieldInput.style.display = '';
    const stepsRoot = container.querySelector('.progressive-steps');
    if (stepsRoot) stepsRoot.style.display = '';
  }

  applyUnifiedServiceState(state) {
    const container = this.getServiceContainer(state.fieldId);
    if (!container) return;

    this.ensureServiceContainerVisible(container);

    if (state.mode === 'categories') {
      let categories = state.categories || [];
      if (!categories.length) {
        const fieldData = this.getFieldData(state.fieldId);
        const structure = fieldData?.enhancedServiceStructure || fieldData?.serviceStructure || [];
        categories = this.getSelectableItems(structure);
      }

      this.rebuildCategorySelect(container, categories);

      if (
        !container.dataset.pendingInternalStep &&
        container.dataset.pendingInlineReveal !== '1' &&
        !this.hasInProgressCascade(container)
      ) {
        this.clearSeparateStepsFrom(container, 2);
        this.clearInlineCascade(container, 1, 2);
      }

      this.showStep(container, 1);
      this.updateProgressClasses(container, 1);
      return;
    }

    if (state.mode === 'options') {
      const parent = state.parentItem;
      const label = (parent?.optionsLabel || 'option').trim();
      const levelNumber = state.internalStep || state.physicalStep || 2;
      const catSelect = container.querySelector('.category-select');

      if (catSelect && parent?.name) {
        const sanitized = this.sanitizeValue(parent.name);
        if ([...catSelect.options].some((opt) => opt.value === sanitized)) {
          catSelect.value = sanitized;
          this.createDynamicHiddenInput(container, container.dataset.fieldId, 'category', parent.name, parent);
        }
      }

      if (this.isPerPricingType(parent?.pricingType)) {
        const existingQty = container.querySelector(
          `.inline-cascade-level--quantity[data-cascade-level="${levelNumber}"]`
        );
        if (!existingQty) {
          this.renderInlineQuantity(container, 1, levelNumber, parent);
        }
        this.showStep(container, 1);
        this.updateProgressClasses(container, 1);
        return;
      }

      const children = this.getSelectableItems(parent?.children);
      const existingLevel = container.querySelector(
        `.inline-cascade-level[data-cascade-level="${levelNumber}"] select.service-select`
      );
      if (!existingLevel) {
        const options = this.hasPageBreakBefore(parent)
          ? { forceNewPage: true, pageTitle: this.getNodePageBreakTitle(parent) }
          : {};
        this.renderInlineLevel(container, 1, levelNumber, children, label, options);
      } else {
        this.updateSelectPlaceholder(existingLevel, label);
      }

      this.showStep(container, 1);
      this.updateProgressClasses(container, 1);
    }
  }

  validateUnifiedServiceState(state) {
    const container = this.getServiceContainer(state.fieldId);
    if (!container) return true;

    if (this.isServiceReadyForPostFields(container)) {
      return true;
    }

    if (state.mode === 'categories') {
      const select = container.querySelector('.category-select');
      if (!select?.value) return false;

      if (this.hasUnifiedPending(container)) return false;

      const step1 = container.querySelector('.step-container.step-1');
      const inlineSelects = step1?.querySelectorAll(
        '.inline-cascade-page select.service-select, .inline-cascade-levels select.service-select'
      ) || [];
      for (const inlineSelect of inlineSelects) {
        if (!inlineSelect.value) return false;
      }

      const pageInfo = this.getActivePageInfo(container);
      if (pageInfo.pages.length > 1 && pageInfo.pageIndex < pageInfo.pages.length - 1) {
        return true;
      }

      return true;
    }

    if (state.mode === 'options') {
      const physicalStep = state.internalStep || state.physicalStep || 2;
      const stepEl =
        container.querySelector('.step-container.step-1') ||
        container.querySelector(`.step-container.step-${physicalStep}`);
      const parentSelect =
        stepEl?.querySelector(`select.service-select[data-step-number="${physicalStep}"]`) ||
        stepEl?.querySelector(':scope > select.service-select');
      if (!parentSelect?.value) return false;

      if (this.hasUnifiedPending(container)) return false;

      const inlineSelects = stepEl?.querySelectorAll(
        '.inline-cascade-page select.service-select, .inline-cascade-levels select.service-select'
      ) || [];
      for (const select of inlineSelects) {
        if (!select.value) return false;
      }

      return true;
    }

    return true;
  }

  rebuildCategorySelect(container, categories) {
    let select = container.querySelector('.category-select');

    if (!select) {
      const step1 = container.querySelector('.step-container.step-1');
      const placeholder = this.formatChoosePlaceholder('Category', 'category');
      if (step1) {
        step1.innerHTML = `
          <div class="inline-cascade-pages">
            <div class="inline-cascade-page active-page" data-page-index="0">
              <div class="inline-cascade-row">
                <div class="inline-cascade-slot inline-cascade-slot--category">
                  <select class="step-select category-select form-control" data-step="category" data-step-number="1">
                    <option value="">${this.escapeHtml(placeholder)}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        `;
        select = step1.querySelector('.category-select');
      }
    }

    if (!select) return;

    const currentValue = select.value;
    const placeholder = this.getCategoryPlaceholder(container.dataset.fieldId);
    select.innerHTML = `
      <option value="">${this.escapeHtml(placeholder)}</option>
      ${categories.map((category) => `
        <option value="${this.sanitizeValue(category.name)}" data-category-name="${category.name}" data-category-data="${this.encodeOptionData(category)}">
          ${this.escapeHtml(this.formatDisplayText(category.name))}
          ${category.description ? ` - ${this.escapeHtml(this.formatDisplayText(category.description))}` : ''}
        </option>
      `).join('')}
    `;

    if (currentValue && [...select.options].some((opt) => opt.value === currentValue)) {
      select.value = currentValue;
    }

    this.syncRowGridColumns(select.closest('.inline-cascade-row'));
    const sizeContainer = select.closest('.progressive-service-selector');
    if (sizeContainer) {
      this.applyFieldSizeToContainer(sizeContainer);
    }
  }

  updateInternalNavigation(container) {
    const nav = container.querySelector('.progressive-selector-navigation');
    if (!nav) return;

    const form = container.closest('form');
    const hasFormStepUI = form && (
      form.classList.contains('multi-step-form') ||
      form.classList.contains('unified-multi-step-form') ||
      !!form.querySelector('.step-progress')
    );

    if (hasFormStepUI || container.dataset.unifiedMode === '1') {
      nav.style.display = 'none';
      if (container.dataset.unifiedMode !== '1') {
        this.updateHostFieldVisibility(container);
      }
      return;
    }

    const prevBtn = nav.querySelector('.progressive-nav-prev');
    const nextBtn = nav.querySelector('.progressive-nav-next');
    const indicator = nav.querySelector('.progressive-nav-indicator');

    const activeStepNumber = this.getActiveStepNumber(container);
    const logicalPosition = this.getLogicalStepPosition(container, activeStepNumber);
    const totalLogicalSteps = this.getTotalLogicalSteps(container);
    const { pages, pageIndex } = this.getActivePageInfo(container);
    const hasPendingStep = !!container.dataset.pendingInternalStep;
    const hasMultiplePages = pages.length > 1;
    const hasPagedSteps = totalLogicalSteps > 1;
    const cascadeSteps = this.getCascadeNavigationSteps(container);
    const hasCascadeNav = cascadeSteps.length > 1;

    const showNav = hasPendingStep || hasPagedSteps || hasMultiplePages;
    nav.style.display = showNav ? 'flex' : 'none';

    const canPrevPage = hasMultiplePages && pageIndex > 0;
    const canPrevStep = logicalPosition > 1;
    prevBtn.style.display = (canPrevPage || canPrevStep) ? 'inline-flex' : 'none';

    const canNextPage = hasMultiplePages && pageIndex < pages.length - 1;
    const nextPopulatedStep = this.findNextPopulatedStep(container, activeStepNumber);
    const canNextStep = nextPopulatedStep !== null && nextPopulatedStep > activeStepNumber;
    nextBtn.style.display = (canNextPage || canNextStep || hasPendingStep) ? 'inline-flex' : 'none';

    if (hasCascadeNav) {
      const activeCascade = this.getCascadeNavigationActiveIndex(container);
      indicator.textContent = cascadeSteps[activeCascade]?.label || '';
    } else if (hasMultiplePages) {
      indicator.textContent = `Page ${pageIndex + 1} of ${pages.length}`;
    } else if (showNav) {
      indicator.textContent = `Step ${logicalPosition} of ${totalLogicalSteps}`;
    } else {
      indicator.textContent = '';
    }

    this.updateHostFieldVisibility(container);
  }

  hideStepsAfter(container, stepNumber) {
    for (let i = stepNumber + 1; i <= 5; i++) {
      const stepElement = container.querySelector(`.step-container.step-${i}`);
      if (stepElement) {
        stepElement.style.display = 'none';
        stepElement.classList.remove('active');
      }
    }
    this.updateInternalNavigation(container);
  }

  formatPricing(service) {
    // Handle items without pricing (like categories)
    if (!service.pricingType || !service.basePrice) {
      return '';
    }

    if (service.pricingType === 'fixed') {
      return `($${service.basePrice})`;
    }
    return `($${service.basePrice} ${service.pricingType.replace('_', ' ')})`;
  }

  formatPricingType(pricingType) {
    const types = {
      'fixed': 'Fixed Price',
      'per_page': 'Per Page',
      'per_hour': 'Per Hour',
      'per_item': 'Per Item',
      'per_month': 'Per Month',
      'per_year': 'Per Year',
      'per_user': 'Per User',
      'per_feature': 'Per Feature',
      'per_backlink': 'Per Backlink',
      'per_post': 'Per Post',
      'per_campaign': 'Per Campaign',
      'per_project': 'Per Project'
    };

    // Handle custom pricing types
    if (pricingType.startsWith('custom_')) {
      const label = pricingType.replace('custom_', '').replace(/_/g, ' ');
      return this.formatDisplayText(label);
    }

    return types[pricingType] || (() => {
      const key = String(pricingType || '').toLowerCase();
      if (key.startsWith('per_')) {
        const words = key.slice(4).replace(/_/g, ' ');
        return `Per ${this.formatDisplayText(words)}`;
      }
      return this.formatDisplayText(pricingType);
    })();
  }

  getQuantityUnit(pricingType) {
    const units = {
      'per_page': 'pages',
      'per_hour': 'hours',
      'per_item': 'items',
      'per_month': 'months',
      'per_year': 'years',
      'per_user': 'users',
      'per_feature': 'features',
      'per_backlink': 'backlinks',
      'per_post': 'posts',
      'per_campaign': 'campaigns',
      'per_project': 'projects',
      'fixed': 'item'
    };
    if (units[pricingType]) return units[pricingType];

    const key = String(pricingType || '').toLowerCase();
    if (key.startsWith('per_')) {
      const stem = key.slice(4);
      if (stem) return stem.endsWith('s') ? stem : `${stem}s`;
    }

    return 'units';
  }

  calculatePriceWithTiers(serviceData, quantity) {
    // Default values
    let unitPrice = parseFloat(serviceData.basePrice) || 0;
    const isPerType = this.isPerPricingType(serviceData.pricingType);
    let totalPrice = isPerType ? unitPrice * quantity : unitPrice;
    let deliveryTime = serviceData.deliveryTime;

    // Check if pricing tiers are available
    if (serviceData.pricingTiers && serviceData.pricingTiers.length > 0) {
      // Find the applicable tier for the given quantity
      const applicableTier = this.findApplicableTier(serviceData.pricingTiers, quantity);

      if (applicableTier) {
        unitPrice = parseFloat(applicableTier.price) || 0;
        totalPrice = isPerType ? unitPrice * quantity : unitPrice;
        deliveryTime = applicableTier.deliveryTime || serviceData.deliveryTime;
      }
    }

    return {
      unitPrice,
      totalPrice,
      deliveryTime
    };
  }

  findApplicableTier(pricingTiers, quantity) {
    // Sort tiers by minQuantity to ensure proper order
    const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);

    // Find the tier that applies to the given quantity
    for (let i = sortedTiers.length - 1; i >= 0; i--) {
      const tier = sortedTiers[i];
      const minQty = parseInt(tier.minQuantity) || 1;
      const maxQty = tier.maxQuantity ? parseInt(tier.maxQuantity) : Infinity;

      if (quantity >= minQty && quantity <= maxQty) {
        return tier;
      }
    }

    // If no tier found, return the first tier as fallback
    return sortedTiers.length > 0 ? sortedTiers[0] : null;
  }

  chunkStructureByPageBreak(structure) {
    const pages = [];
    let current = [];

    for (const item of structure || []) {
      if (item?.type === 'page_break' || item?.type === 'page-break') {
        if (current.length) pages.push(current);
        current = [];
      } else {
        current.push(item);
      }
    }

    if (current.length) pages.push(current);
    return pages.length ? pages : [this.getSelectableItems(structure)];
  }

  createDynamicSteps(serviceStructure, fieldData = null) {
    const stepNumber = 1;
    const segments = this.chunkStructureByPageBreak(serviceStructure);
    const categories = this.getSelectableItems(segments[0] || serviceStructure);
    const categoryPlaceholder = this.formatChoosePlaceholder(
      fieldData?.serviceStructureLabel || fieldData?.label || 'Category',
      'category'
    );
    const firstPageTitle = this.escapeHtml(this.getCascadeDefaultFirstTitle(fieldData));

    return `
      <div class="step-container step-${stepNumber} active" data-step="${stepNumber}">
        <div class="inline-cascade-pages">
          <div class="inline-cascade-page active-page" data-page-index="0" data-page-title="${firstPageTitle}">
            <div class="inline-cascade-row">
              <div class="inline-cascade-slot inline-cascade-slot--category">
                <select class="step-select category-select" data-step="category" data-step-number="${stepNumber}">
                  <option value="">${this.escapeHtml(categoryPlaceholder)}</option>
                  ${categories.map(category =>
                    `<option value="${this.sanitizeValue(category.name)}" data-category-name="${category.name}" data-category-data="${this.encodeOptionData(category)}">
                      ${this.escapeHtml(this.formatDisplayText(category.name))}
                      ${category.description ? ` - ${this.escapeHtml(this.formatDisplayText(category.description))}` : ''}
                    </option>`
                  ).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="step-container step-2" style="display:none;"></div>
      <div class="step-container step-3" style="display:none;"></div>
      <div class="step-container step-4" style="display:none;"></div>
      <div class="step-container step-5" style="display:none;"></div>
    `;
  }

  createDynamicHiddenInput(container, fieldId, stepName, stepValue, stepData = null) {
    const hiddenContainer = container?.querySelector('.dynamic-hidden-inputs');
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = `${fieldId}_${stepName}`;
    input.value = stepValue;
    input.className = 'dynamic-step-input';
    input.dataset.stepName = stepName;

    if (stepData) {
      input.dataset.stepData = JSON.stringify(stepData);
    }

    if (hiddenContainer) {
      const existing = hiddenContainer.querySelector(`input[data-step-name="${stepName}"]`);
      if (existing) {
        existing.remove();
      }
      hiddenContainer.appendChild(input);
    }

    return input;
  }

  sanitizeValue(str) {
    return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '_') : '';
  }

  getFieldData(fieldId) {
    let fieldData = null;

    // Priority 1: Try to get from window.quoteMateFormData
    const formData = window.quoteMateFormData || window.quotemateFormData;
    if (formData?.fields) {
      fieldData = formData.fields.find(f => f.id === fieldId);
    }

    // Priority 2: Try service-field-container first (most specific)
    if (!fieldData) {
      const serviceContainer = document.querySelector(`.service-field-container[data-field-id="${fieldId}"]`);
      if (serviceContainer) {
        // Try to get field data from data-field-data attribute
        if (serviceContainer.dataset.fieldData) {
          try {
            fieldData = JSON.parse(serviceContainer.dataset.fieldData);
          } catch (e) {
            console.error(`[QuoteMate] Error parsing field data from service container:`, e);
          }
        }

        // Also try to get enhanced structure directly
        if (serviceContainer.dataset.enhancedStructure) {
          try {
            const enhancedStructure = JSON.parse(serviceContainer.dataset.enhancedStructure);
            if (enhancedStructure && enhancedStructure.length > 0) {
              if (!fieldData) {
                fieldData = { id: fieldId };
              }
              fieldData.enhancedServiceStructure = enhancedStructure;
            }
          } catch (e) {
            console.error(`[QuoteMate] Error parsing enhanced structure:`, e);
          }
        }
      }
    }

    // Priority 3: Fallback to any element with data-field-id
    if (!fieldData) {
      const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (fieldElement && fieldElement.dataset.fieldData) {
        try {
          fieldData = JSON.parse(fieldElement.dataset.fieldData);
        } catch (e) {
          console.error(`[QuoteMate] Error parsing field data from generic element:`, e);
        }
      }
    }

    // If we have fieldData but no enhancedServiceStructure, try to get it from service container
    if (fieldData && !fieldData.enhancedServiceStructure) {
      const serviceContainer = document.querySelector(`.service-field-container[data-field-id="${fieldId}"]`);
      if (serviceContainer && serviceContainer.dataset.enhancedStructure) {
        try {
          const enhancedStructure = JSON.parse(serviceContainer.dataset.enhancedStructure);
          if (enhancedStructure && enhancedStructure.length > 0) {
            fieldData.enhancedServiceStructure = enhancedStructure;
          }
        } catch (e) {
          console.error(`[QuoteMate] Error parsing enhanced structure:`, e);
        }
      }
    }

    return fieldData;
  }

  updateProgressClasses(container, currentStep) {
    // Remove all progress classes
    container.classList.remove('step-2-active', 'step-3-active', 'step-4-active', 'complete');

    // Add appropriate progress class
    if (currentStep >= 2) container.classList.add('step-2-active');
    if (currentStep >= 3) container.classList.add('step-3-active');
    if (currentStep >= 4) {
      container.classList.add('step-4-active');
      container.classList.add('complete');
    }
  }

  triggerCalculationUpdate() {
    // Trigger calculation update if quote calculation engine exists
    if (window.QuoteCalculationEngine) {
      setTimeout(() => {
        window.QuoteCalculationEngine.calculateTotals();
      }, 100);
    }

    // Dispatch custom event for other systems to listen to
    document.dispatchEvent(new CustomEvent('quotemateServiceChanged', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const progressive = new ProgressiveServiceSelector();
  window.quotemateProgressiveSelector = progressive;
});

// Also initialize if called directly
if (typeof window !== 'undefined') {
  window.ProgressiveServiceSelector = ProgressiveServiceSelector;
} 