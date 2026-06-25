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
    this.init();
  }

  init() {
    this.initializeProgressiveSelectors();
    this.attachEventListeners();
    this.initUnifiedSteps();
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
    const steps = this.createDynamicSteps(serviceStructure);
    const segments = this.chunkStructureByPageBreak(serviceStructure);

    container.innerHTML = `
      <div class="progressive-steps">
        ${steps}
      </div>

      <div class="progressive-selector-navigation" style="display:none;">
        <button type="button" class="btn btn-secondary progressive-nav-prev">← Previous</button>
        <span class="progressive-nav-indicator"></span>
        <button type="button" class="btn btn-primary progressive-nav-next">Next →</button>
      </div>

      <!-- Dynamic hidden inputs container -->
      <div class="dynamic-hidden-inputs">
        <!-- Hidden inputs will be created dynamically as user progresses -->
      </div>

      <!-- Main service value input -->
      <input type="hidden" class="final-service-value" name="${fieldId}" value="">
    `;

    container.dataset.serviceSegments = JSON.stringify(segments);

    this.updateInternalNavigation(container);
    return container;
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
    document.addEventListener('input', (e) => {
      if (e.target.matches('.quantity-input') || e.target.matches('.custom-quantity-input')) {
        this.handleQuantityChange(e);
      }
    });

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
    // Find active progressive selector in the current visible form step
    const currentFormStep = document.querySelector('.form-step:not([style*="display: none"])');
    if (!currentFormStep) return;

    const progressiveSelector = currentFormStep.querySelector('.progressive-service-selector');
    if (!progressiveSelector) return;

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

      // Navigate internally
      activePage.style.display = 'none';
      activePage.classList.remove('active-page');

      const nextPage = allPages[currentIndex + 1];
      nextPage.style.display = 'block';
      nextPage.classList.add('active-page');

      this.updateInternalNavigation(progressiveSelector);

      // Notify check success
      if (e.detail && e.detail.callback) {
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

      activePage.style.display = 'none';
      activePage.classList.remove('active-page');

      const prevPage = allPages[currentIndex - 1];
      prevPage.style.display = 'block';
      prevPage.classList.add('active-page');
      this.updateInternalNavigation(progressiveSelector);
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

    const hasRealChildren = this.getSelectableItems(selectedCategory?.children).length > 0;

    if (!selectedCategory || !hasRealChildren) {
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

    // Create hidden input for category selection
    this.createDynamicHiddenInput(container, fieldId, 'category', selectedCategory.name, selectedCategory);

    const childItems = this.getSelectableItems(selectedCategory.children);
    const step2Label = (selectedCategory.optionsLabel || 'Select Service').trim();

    this.clearInlineCascade(container, 1, 2);
    this.clearSeparateStepsFrom(container, 2);
    window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
    window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
      window.quotemateUnifiedSteps?.currentStep ?? 0
    );

    if (this.hasPageBreakBefore(selectedCategory)) {
      if (this.isUnifiedMode(container)) {
        this.preparePendingPageBreakLevel(container, 2, childItems, step2Label, selectedCategory);
      } else {
        this.renderSeparateLevel(container, 2, childItems, step2Label);
        container.dataset.pendingInternalStep = '2';
        this.showStep(container, 1);
        this.updateProgressClasses(container, 1);
      }
    } else if (this.isUnifiedMode(container)) {
      this.clearUnifiedPendingState(container);
      this.preparePendingInlineLevel(container, 1, 2, childItems, step2Label);
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
    const isInlineSelect = !!serviceSelect.closest('.inline-cascade-levels');
    const activeStepNumber = this.getActiveStepNumber(container);

    // Determine current step from the select element
    const currentStep = parseInt(serviceSelect.dataset.stepNumber, 10) || 2;
    const nextStep = currentStep + 1;

    if (!selectedOption.value) {
      if (isInlineSelect) {
        const inlineContainer = serviceSelect.closest('.inline-cascade-levels');
        this.clearInlineCascadeFrom(inlineContainer, currentStep + 1);
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
      const childItems = this.getSelectableItems(serviceData.children);

      // Create hidden input for service selection
      const inputName = currentStep === 2 ? 'service' : `subservice_${currentStep}`;
      this.createDynamicHiddenInput(container, fieldId, inputName, serviceData.name, serviceData);

      if (childItems.length > 0) {
        const nextLabel = (serviceData.optionsLabel || 'Select Option').trim();

        this.clearSeparateStepsFrom(container, nextStep);
        if (isInlineSelect) {
          this.clearInlineCascadeFrom(serviceSelect.closest('.inline-cascade-levels'), nextStep);
        } else {
          this.clearInlineCascade(container, activeStepNumber, nextStep);
        }
        window.quotemateUnifiedSteps?.removeDynamicStepsFrom?.(window.quotemateUnifiedSteps.currentStep);
        window.quotemateUnifiedSteps?.resetPostServiceFieldsFrom?.(
          window.quotemateUnifiedSteps?.currentStep ?? 0
        );

        if (this.hasPageBreakBefore(serviceData)) {
          if (this.isUnifiedMode(container)) {
            this.preparePendingPageBreakLevel(container, nextStep, childItems, nextLabel, serviceData);
          } else {
            this.renderSeparateLevel(container, nextStep, childItems, nextLabel);
            container.dataset.pendingInternalStep = String(nextStep);
            this.showStep(container, activeStepNumber);
            this.updateProgressClasses(container, activeStepNumber);
          }
        } else if (this.isUnifiedMode(container)) {
          this.clearUnifiedPendingState(container);
          const hostStep = isInlineSelect ? activeStepNumber : activeStepNumber;
          this.preparePendingInlineLevel(container, hostStep, nextStep, childItems, nextLabel);
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
        this.markServiceSelectionComplete(container, serviceData);

        if (!this.isUnifiedMode(container)) {
          const activeStep = container.querySelector('.step-container.active');
          const useInlineLeaf = isInlineSelect || !!activeStep?.querySelector('.inline-cascade-level');

          this.clearSeparateStepsFrom(container, nextStep);

          if (useInlineLeaf) {
            this.renderInlineQuantity(container, activeStepNumber, nextStep, serviceData);
            this.showStep(container, activeStepNumber);
            this.updateProgressClasses(container, activeStepNumber);

            if (serviceData.pricingType === 'fixed') {
              this.updatePriceSummary(container, serviceData, 1);
            }
          } else {
            this.renderQuantityStep(container, nextStep, serviceData);
            this.showStep(container, nextStep);

            if (serviceData.pricingType === 'fixed') {
              this.updatePriceSummary(container, serviceData, 1);
              this.showStep(container, nextStep + 1);
              this.updateProgressClasses(container, nextStep + 1);
            } else {
              this.hideStepsAfter(container, nextStep);
              this.updateProgressClasses(container, nextStep);
            }
          }
        } else {
          this.processQuantitySelection(
            container,
            Math.max(1, serviceData.minQuantity || 1)
          );
        }

        this.updateInternalNavigation(container);
        this.notifyUnifiedStepsChanged(container);
      }
    } catch (error) {
      console.error('Error handling service selection:', error);
    }
  }

  buildLevelSelectHtml(stepNumber, items, labelText, selectClass = 'service-select') {
    return `
      <label class="step-label">
        <span class="step-number">${stepNumber}</span>
        ${labelText}
      </label>
      <select class="step-select ${selectClass}" data-step="service" data-step-number="${stepNumber}">
        <option value="">Choose an option...</option>
        ${items.map(item => `
          <option value="${this.sanitizeValue(item.name)}" data-service="${this.encodeOptionData(item)}">
            ${item.name}
            ${this.formatPricing(item)}
          </option>
        `).join('')}
      </select>
    `;
  }

  ensureInlineContainer(stepElement) {
    let inlineContainer = stepElement.querySelector('.inline-cascade-levels');
    if (!inlineContainer) {
      inlineContainer = document.createElement('div');
      inlineContainer.className = 'inline-cascade-levels';
      stepElement.appendChild(inlineContainer);
    }
    return inlineContainer;
  }

  clearInlineCascadeFrom(inlineContainer, fromLevel) {
    if (!inlineContainer) return;
    inlineContainer.querySelectorAll('.inline-cascade-level').forEach(el => {
      const level = parseInt(el.dataset.cascadeLevel, 10) || 0;
      if (level >= fromLevel) {
        el.remove();
      }
    });
  }

  clearInlineCascade(container, hostStepNumber, fromLevel = 2) {
    const hostStep = container.querySelector(`.step-container.step-${hostStepNumber}`);
    const inlineContainer = hostStep?.querySelector('.inline-cascade-levels');
    this.clearInlineCascadeFrom(inlineContainer, fromLevel);
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

  renderInlineLevel(container, hostStepNumber, levelNumber, items, labelText) {
    const hostStep = container.querySelector(`.step-container.step-${hostStepNumber}`);
    if (!hostStep) return;

    const inlineContainer = this.ensureInlineContainer(hostStep);
    this.clearInlineCascadeFrom(inlineContainer, levelNumber);

    const levelEl = document.createElement('div');
    levelEl.className = 'inline-cascade-level';
    levelEl.dataset.cascadeLevel = String(levelNumber);
    levelEl.innerHTML = this.buildLevelSelectHtml(levelNumber, items, labelText, 'service-select');
    inlineContainer.appendChild(levelEl);
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

    try {
      return JSON.parse(raw);
    } catch (e) {
      try {
        return JSON.parse(decodeURIComponent(raw));
      } catch (e2) {
        return null;
      }
    }
  }

  isServiceReadyForPostFields(container) {
    if (!container) return false;
    if (this.hasUnifiedPending(container)) return false;

    const finalValue = container.querySelector('.final-service-value');
    if (finalValue?.value?.trim()) return true;

    return this.isServicePathComplete(container);
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
      data.labelText || 'Select Option'
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

  isServicePathComplete(container) {
    if (!container) return true;
    if (this.hasUnifiedPending(container)) return false;

    const finalValue = container.querySelector('.final-service-value');
    if (finalValue?.value?.trim()) return true;

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

  markServiceSelectionComplete(container, serviceData) {
    if (!container || !serviceData?.name) return;

    this.clearUnifiedPendingState(container);

    const finalServiceValue = container.querySelector('.final-service-value');
    if (finalServiceValue) {
      finalServiceValue.value = serviceData.name;
      finalServiceValue.dispatchEvent(new Event('change', { bubbles: true }));
    }

    container.classList.add('complete');
  }

  notifyUnifiedStepsChanged(container) {
    const unified = window.quotemateUnifiedSteps;
    if (!unified || !this.isUnifiedMode(container)) return;
    unified.ensurePostServiceFields?.();
    unified.enforcePostServiceFieldVisibility?.();
    unified.syncProgressBar();
    unified.updateNavigationButtons();
  }

  buildQuantityHtml(serviceData) {
    let gridHTML = '';
    if (serviceData.pricingType === 'per_page') {
      for (let i = 1; i <= 8; i++) {
        gridHTML += `
          <div class="quantity-option" data-quantity="${i}">
            <span class="option-label">${i} ${i === 1 ? 'page' : 'pages'}</span>
            <span class="option-price">...</span>
          </div>
        `;
      }
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
      <div class="quantity-section" style="${serviceData.pricingType === 'fixed' ? 'display:none;' : ''}">
        <label class="quantity-label">Quantity</label>
        <div class="quantity-options-grid" style="display: ${serviceData.pricingType === 'per_page' ? 'grid' : 'none'}">
          ${gridHTML}
        </div>
        <div class="quantity-input-container" style="display: ${serviceData.pricingType !== 'per_page' ? 'flex' : 'none'}">
          <input type="number" class="quantity-input form-control" min="${serviceData.minQuantity || 1}" value="${Math.max(1, serviceData.minQuantity || 1)}" max="${serviceData.maxQuantity || ''}">
          <span class="quantity-unit">${this.getQuantityUnit(serviceData.pricingType)}</span>
        </div>
        <div class="delivery-estimate" style="display: ${serviceData.deliveryTime ? 'block' : 'none'}">
          Est. Delivery: <span class="delivery-time">${serviceData.deliveryTime} days</span>
        </div>
      </div>
    `;
  }

  renderInlineQuantity(container, hostStepNumber, levelNumber, serviceData) {
    const hostStep = container.querySelector(`.step-container.step-${hostStepNumber}`);
    if (!hostStep) return;

    const inlineContainer = this.ensureInlineContainer(hostStep);
    this.clearInlineCascadeFrom(inlineContainer, levelNumber);

    const levelEl = document.createElement('div');
    levelEl.className = 'inline-cascade-level inline-cascade-level--quantity';
    levelEl.dataset.cascadeLevel = String(levelNumber);
    levelEl.innerHTML = this.buildQuantityHtml(serviceData);
    inlineContainer.appendChild(levelEl);

    this.configureQuantityStep(container, serviceData);
  }

  renderQuantityStep(container, stepNumber, serviceData) {
    const stepContainer = container.querySelector(`.step-container.step-${stepNumber}`);
    if (!stepContainer) return;

    stepContainer.innerHTML = this.buildQuantityHtml(serviceData);
    this.configureQuantityStep(container, serviceData);
  }

  handleQuantityChange(e) {
    const quantityInput = e.target;
    const container = quantityInput.closest('.progressive-service-selector');

    if (quantityInput.classList.contains('custom-quantity-input')) {
      // Handle custom quantity input
      const quantity = parseInt(quantityInput.value) || 1;
      if (quantity > 0) {
        this.processQuantitySelection(container, quantity);
      }
    } else {
      // Handle regular quantity input (fallback)
      const quantity = parseInt(quantityInput.value) || 1;
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
    const serviceSelect = this.getDeepestSelectedServiceSelect(container);
    const selectedOption = serviceSelect?.options[serviceSelect.selectedIndex];

    if (!selectedOption?.value) return;

    const serviceData = this.parseOptionData(selectedOption);
    if (!serviceData) return;

    try {
      if (serviceData.minQuantity && quantity < serviceData.minQuantity) {
        quantity = serviceData.minQuantity;
      }

      if (serviceData.maxQuantity && quantity > serviceData.maxQuantity) {
        quantity = serviceData.maxQuantity;
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
    const detailsContainer = container.querySelector('.service-details');
    const descriptionDiv = container.querySelector('.service-description');
    const pricingInfoDiv = container.querySelector('.service-pricing-info');

    if (serviceData.description) {
      descriptionDiv.innerHTML = `<p class="service-desc">${serviceData.description}</p>`;
      descriptionDiv.style.display = 'block';
    }

    pricingInfoDiv.innerHTML = `
      <div class="pricing-info">
        <span class="pricing-type">${this.formatPricingType(serviceData.pricingType)}</span>
        <span class="base-price">$${serviceData.basePrice}</span>
        ${serviceData.deliveryTime ? `<span class="delivery">Delivery: ${serviceData.deliveryTime} days</span>` : ''}
      </div>
    `;

    detailsContainer.style.display = 'block';
  }

  configureQuantityStep(container, serviceData) {
    const quantityLabel = container.querySelector('.quantity-label');
    const quantityOptionsGrid = container.querySelector('.quantity-options-grid');
    const quantityInputContainer = container.querySelector('.quantity-input-container');
    const quantityInput = container.querySelector('.quantity-input');
    const quantityUnit = container.querySelector('.quantity-unit');
    const deliveryEstimate = container.querySelector('.delivery-estimate');

    // Update labels based on pricing type
    const labels = {
      'per_page': { label: 'How many pages do you need?', unit: 'pages', showGrid: true },
      'per_hour': { label: 'How many hours do you need?', unit: 'hours', showGrid: false },
      'per_item': { label: 'How many items do you need?', unit: 'items', showGrid: false },
      'per_month': { label: 'How many months do you need?', unit: 'months', showGrid: false },
      'per_year': { label: 'How many years do you need?', unit: 'years', showGrid: false },
      'per_user': { label: 'How many users do you need?', unit: 'users', showGrid: false },
      'per_feature': { label: 'How many features do you need?', unit: 'features', showGrid: false },
      'per_backlink': { label: 'How many backlinks do you need?', unit: 'backlinks', showGrid: false },
      'per_post': { label: 'How many posts do you need?', unit: 'posts', showGrid: false },
      'per_campaign': { label: 'How many campaigns do you need?', unit: 'campaigns', showGrid: false },
      'per_project': { label: 'How many projects do you need?', unit: 'projects', showGrid: false },
      'fixed': { label: 'Fixed Price Service', unit: 'service', showGrid: false }
    };

    const config = labels[serviceData.pricingType] || labels.fixed;
    quantityLabel.textContent = config.label;

    if (config.showGrid && serviceData.pricingType === 'per_page') {
      // Show quantity options grid for page-based services
      quantityOptionsGrid.style.display = 'grid';
      quantityInputContainer.style.display = 'none';

      // Update pricing for each option with tier support
      const quantityOptions = container.querySelectorAll('.quantity-option[data-quantity]');
      quantityOptions.forEach(option => {
        const qty = parseInt(option.dataset.quantity);
        const pricingInfo = this.calculatePriceWithTiers(serviceData, qty);
        const priceElement = option.querySelector('.option-price');
        if (priceElement) {
          priceElement.textContent = `$${pricingInfo.totalPrice.toFixed(2)}`;
        }

        // Update label for single vs plural
        const labelElement = option.querySelector('.option-label');
        if (labelElement && qty === 1) {
          labelElement.textContent = 'page';
        } else if (labelElement) {
          labelElement.textContent = 'pages';
        }
      });
    } else {
      // Show regular input for other service types
      quantityOptionsGrid.style.display = 'none';
      quantityInputContainer.style.display = 'flex';
      quantityUnit.textContent = config.unit;

      // Set constraints
      if (serviceData.minQuantity) {
        quantityInput.min = serviceData.minQuantity;
        quantityInput.value = Math.max(quantityInput.value, serviceData.minQuantity);
      }

      if (serviceData.maxQuantity) {
        quantityInput.max = serviceData.maxQuantity;
      }
    }

    // Show delivery estimate
    if (serviceData.deliveryTime) {
      const deliveryTimeSpan = deliveryEstimate.querySelector('.delivery-time');
      deliveryTimeSpan.textContent = `${serviceData.deliveryTime} days`;
      deliveryEstimate.style.display = 'block';
    }
  }

  updatePriceSummary(container, serviceData, quantity) {
    const pricingInfo = this.calculatePriceWithTiers(serviceData, quantity);
    const unitPrice = pricingInfo.unitPrice;
    const totalPrice = pricingInfo.totalPrice;
    const deliveryTime = pricingInfo.deliveryTime;

    const serviceNameDisplay = container.querySelector('.service-name-display');
    const quantityDisplay = container.querySelector('.quantity-display');
    const unitPriceDisplay = container.querySelector('.unit-price-display');
    const totalPriceDisplay = container.querySelector('.total-price-display');

    if (serviceNameDisplay) {
      serviceNameDisplay.textContent = serviceData.name;
    }

    if (quantityDisplay && unitPriceDisplay) {
      if (serviceData.pricingType === 'fixed') {
        quantityDisplay.textContent = '1 service';
        unitPriceDisplay.textContent = `$${unitPrice.toFixed(2)} (Fixed)`;
      } else {
        const unitLabel = this.getQuantityUnit(serviceData.pricingType);
        quantityDisplay.textContent = `${quantity} ${unitLabel}`;
        const pricingLabel = this.formatPricingType(serviceData.pricingType);
        unitPriceDisplay.textContent = `$${unitPrice.toFixed(2)} ${pricingLabel.toLowerCase()}`;
      }
    }

    if (totalPriceDisplay) {
      totalPriceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
    }

    // Update delivery estimate if tier-specific delivery time is available
    if (deliveryTime && deliveryTime !== serviceData.deliveryTime) {
      const deliveryEstimate = container.querySelector('.delivery-estimate');
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
          fieldLabel.style.display = hideHostFields ? 'none' : '';
        }
        if (fieldDesc) {
          fieldDesc.style.display = hideHostFields ? 'none' : '';
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
        if (sectionTitle) {
          sectionTitle.style.display = hideHostFields ? 'none' : '';
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
            ← Previous
          </button>
        ` : '<span class="progressive-pagination-spacer"></span>'}
        <span class="progressive-page-indicator">Page ${pageIndex + 1} of ${totalPages}</span>
        ${pageIndex < totalPages - 1 ? `
          <button type="button" class="btn btn-sm btn-primary progressive-page-next" data-page-index="${pageIndex}">
            Next →
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
    allPages.forEach(page => {
      page.style.display = 'none';
      page.classList.remove('active-page');
    });
    nextPage.style.display = 'block';
    nextPage.classList.add('active-page');
  }

  navigateActivePage(container, direction) {
    const { pages, activePage, pageIndex } = this.getActivePageInfo(container);
    if (!activePage || pages.length <= 1) return;

    const nextIndex = pageIndex + direction;
    if (nextIndex < 0 || nextIndex >= pages.length) return;

    this.showPage(pages[nextIndex], pages);
    this.updateInternalNavigation(container);
  }

  hasInlineLevels(container) {
    return !!container.querySelector('.inline-cascade-level');
  }

  canAdvanceFromActiveStep(container) {
    const activeStep = container.querySelector('.step-container.active');
    if (!activeStep) return true;

    const selects = activeStep.querySelectorAll('select.step-select');
    for (const select of selects) {
      if (select.value === '') {
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

      if (!container.dataset.pendingInternalStep && container.dataset.pendingInlineReveal !== '1') {
        this.clearSeparateStepsFrom(container, 2);
        this.clearInlineCascade(container, 1, 2);
      }

      this.showStep(container, 1);
      this.updateProgressClasses(container, 1);
      return;
    }

    if (state.mode === 'options') {
      const parent = state.parentItem;
      const children = this.getSelectableItems(parent?.children);
      const label = (parent?.optionsLabel || 'Select Option').trim();
      const physicalStep = state.internalStep || state.physicalStep || 2;
      const catSelect = container.querySelector('.category-select');

      if (catSelect && parent?.name) {
        const sanitized = this.sanitizeValue(parent.name);
        if ([...catSelect.options].some((opt) => opt.value === sanitized)) {
          catSelect.value = sanitized;
          this.createDynamicHiddenInput(container, container.dataset.fieldId, 'category', parent.name, parent);
        }
      }

      const stepEl = container.querySelector(`.step-container.step-${physicalStep}`);
      if (!stepEl?.querySelector('select.service-select')) {
        this.renderSeparateLevel(container, physicalStep, children, label);
      } else {
        const select = stepEl.querySelector('select.service-select');
        const labelEl = stepEl.querySelector('.step-label');
        if (labelEl) {
          labelEl.innerHTML = `<span class="step-number">${physicalStep}</span> ${label}`;
        }
      }

      this.showStep(container, physicalStep);
      this.updateProgressClasses(container, physicalStep);
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

      const step1 = container.querySelector('.step-container.step-1');
      const inlineSelects = step1?.querySelectorAll('.inline-cascade-levels select.service-select') || [];
      for (const inlineSelect of inlineSelects) {
        if (!inlineSelect.value) return false;
      }

      return true;
    }

    if (state.mode === 'options') {
      const physicalStep = state.internalStep || state.physicalStep || 2;
      const stepEl = container.querySelector(`.step-container.step-${physicalStep}`);
      const parentSelect = stepEl?.querySelector(':scope > select.service-select');
      if (!parentSelect?.value) return false;

      const inlineSelects = stepEl?.querySelectorAll('.inline-cascade-levels select.service-select') || [];
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
      if (step1) {
        step1.innerHTML = `
          <select class="step-select category-select form-control" data-step="category" data-step-number="1">
            <option value="">Choose a category...</option>
          </select>
          <div class="inline-cascade-levels"></div>
        `;
        select = step1.querySelector('.category-select');
      }
    }

    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = `
      <option value="">Choose a category...</option>
      ${categories.map((category) => `
        <option value="${this.sanitizeValue(category.name)}" data-category-name="${category.name}" data-category-data="${this.encodeOptionData(category)}">
          ${category.name}
          ${category.description ? ` - ${category.description}` : ''}
        </option>
      `).join('')}
    `;

    if (currentValue && [...select.options].some((opt) => opt.value === currentValue)) {
      select.value = currentValue;
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

    const showNav = hasPendingStep || hasPagedSteps || hasMultiplePages;
    nav.style.display = showNav ? 'flex' : 'none';

    const canPrevPage = hasMultiplePages && pageIndex > 0;
    const canPrevStep = logicalPosition > 1;
    prevBtn.style.display = (canPrevPage || canPrevStep) ? 'inline-flex' : 'none';

    const canNextPage = hasMultiplePages && pageIndex < pages.length - 1;
    const nextPopulatedStep = this.findNextPopulatedStep(container, activeStepNumber);
    const canNextStep = nextPopulatedStep !== null && nextPopulatedStep > activeStepNumber;
    nextBtn.style.display = (canNextPage || canNextStep || hasPendingStep) ? 'inline-flex' : 'none';

    if (hasMultiplePages) {
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
      // Extract the label from the key (remove 'custom_' prefix and convert to title case)
      const label = pricingType.replace('custom_', '').replace(/_/g, ' ');
      return label.charAt(0).toUpperCase() + label.slice(1);
    }

    return types[pricingType] || pricingType;
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
    return units[pricingType] || 'units';
  }

  calculatePriceWithTiers(serviceData, quantity) {
    // Default values
    let unitPrice = parseFloat(serviceData.basePrice) || 0;
    let totalPrice = serviceData.pricingType === 'fixed' ? unitPrice : unitPrice * quantity;
    let deliveryTime = serviceData.deliveryTime;

    // Check if pricing tiers are available
    if (serviceData.pricingTiers && serviceData.pricingTiers.length > 0) {
      // Find the applicable tier for the given quantity
      const applicableTier = this.findApplicableTier(serviceData.pricingTiers, quantity);

      if (applicableTier) {
        unitPrice = parseFloat(applicableTier.price) || 0;
        totalPrice = serviceData.pricingType === 'fixed' ? unitPrice : unitPrice * quantity;
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

  createDynamicSteps(serviceStructure) {
    const stepNumber = 1;
    const segments = this.chunkStructureByPageBreak(serviceStructure);
    const categories = this.getSelectableItems(segments[0] || serviceStructure);

    return `
      <div class="step-container step-${stepNumber} active" data-step="${stepNumber}">
        <select class="step-select category-select" data-step="category" data-step-number="${stepNumber}">
          <option value="">Choose a category...</option>
          ${categories.map(category =>
            `<option value="${this.sanitizeValue(category.name)}" data-category-name="${category.name}" data-category-data="${this.encodeOptionData(category)}">
              ${category.name}
              ${category.description ? ` - ${category.description}` : ''}
            </option>`
          ).join('')}
        </select>
        <div class="inline-cascade-levels"></div>
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