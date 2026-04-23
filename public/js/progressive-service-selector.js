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
  }

  initializeProgressiveSelectors() {

    const serviceFields = document.querySelectorAll('[data-field-type="service"]');

    serviceFields.forEach(field => {
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

    container.innerHTML = `
      <div class="progressive-steps">
        ${steps}
      </div>

      <!-- Dynamic hidden inputs container -->
      <div class="dynamic-hidden-inputs">
        <!-- Hidden inputs will be created dynamically as user progresses -->
      </div>

      <!-- Main service value input -->
      <input type="hidden" class="final-service-value" name="${fieldId}" value="">
    `;

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

    if (!activePages.length) return;

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

      // Notify check success
      if (e.detail && e.detail.callback) {
        e.detail.callback(true);
      }
    }
  }

  handlePrevStepCheck(e) {
    // Find active progressive selector in the current visible form step
    const currentFormStep = document.querySelector('.form-step:not([style*="display: none"])');
    if (!currentFormStep) return;

    const progressiveSelector = currentFormStep.querySelector('.progressive-service-selector');
    if (!progressiveSelector) return;

    // Check if there are internal pages to navigate
    const activePages = Array.from(progressiveSelector.querySelectorAll('.step-2-page.active-page, .category-page.active-page, .step-page.active-page'));

    if (!activePages.length) return;

    // Sort active pages by depth (deepest first)
    activePages.sort((a, b) => {
      const selectA = a.querySelector('select');
      const selectB = b.querySelector('select');
      const stepA = selectA ? parseInt(selectA.dataset.stepNumber) || 0 : 0;
      const stepB = selectB ? parseInt(selectB.dataset.stepNumber) || 0 : 0;
      return stepB - stepA;
    });

    const activePage = activePages[0];

    // Find the container holding the pages
    const pagesContainer = activePage.parentElement;
    const allPages = Array.from(pagesContainer.children);
    const currentIndex = allPages.indexOf(activePage);

    if (currentIndex > 0) {
      // Prevent main form navigation
      e.preventDefault();
      e.stopImmediatePropagation();

      // Navigate internally
      activePage.style.display = 'none';
      activePage.classList.remove('active-page');

      const prevPage = allPages[currentIndex - 1];
      prevPage.style.display = 'block';
      prevPage.classList.add('active-page');
    }
  }

  handleCategorySelection(e) {
    const categorySelect = e.target;
    const selectedValue = categorySelect.value;
    const container = categorySelect.closest('.progressive-service-selector');
    const fieldId = container.dataset.fieldId;
    const fieldData = this.getFieldData(fieldId);

    if (!selectedValue || !fieldData) {
      this.hideStepsAfter(container, 1);
      this.updateProgressClasses(container, 1);
      return;
    }

    // Find selected category
    // Filter out page breaks first
    const serviceStructure = fieldData.enhancedServiceStructure || fieldData.serviceStructure;
    const categories = serviceStructure.filter(item => item.type !== 'page_break');
    const selectedCategory = categories.find(cat =>
      this.sanitizeValue(cat.name) === selectedValue
    );

    if (!selectedCategory || !selectedCategory.children || selectedCategory.children.length === 0) {
      this.hideStepsAfter(container, 1);
      this.updateProgressClasses(container, 1);
      return;
    }

    // Create hidden input for category selection
    this.createDynamicHiddenInput(container, fieldId, 'category', selectedCategory.name, selectedCategory);

    // Chunk children by page breaks for Step 2
    const childrenPages = [];
    let currentChildPage = [];

    if (selectedCategory.children) {
      selectedCategory.children.forEach(item => {
        if (item.type === 'page_break' || item.type === 'page-break') {
          if (currentChildPage.length > 0) {
            childrenPages.push(currentChildPage);
            currentChildPage = [];
          }
        } else {
          if (item.name || item.basePrice || item.type) {
            currentChildPage.push(item);
          }
        }
      });
      if (currentChildPage.length > 0) {
        childrenPages.push(currentChildPage);
      }
    }

    // Render Step 2
    const step2Container = container.querySelector('.step-2');
    if (!step2Container) return;

    let step2HTML = `
      <label class="step-label">
        <span class="step-number">2</span>
        Select Service
      </label>
      
      <div class="step-2-pages-container">
        ${childrenPages.map((pageItems, pageIndex) => `
          <div class="step-2-page step-2-page-${pageIndex} ${pageIndex === 0 ? 'active-page' : ''}" 
               style="${pageIndex === 0 ? 'display: block;' : 'display: none;'}">
               
            ${pageItems.length > 0 ? `
              <select class="step-select service-select" data-step="service" data-step-number="2" data-page-index="${pageIndex}">
                <option value="">Choose a service...</option>
                ${pageItems
          .filter(service => service.type !== 'page_break' && service.type !== 'page-break')
          .map(service =>
            `<option value="${this.sanitizeValue(service.name)}" 
                           data-service='${JSON.stringify(service)}'>
                    ${service.name} 
                    ${this.formatPricing(service)}
                  </option>`
          ).join('')}
              </select>
            ` : `
              <div class="empty-page-placeholder">
                <p>Click details to continue.</p>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    `;

    step2Container.innerHTML = step2HTML;

    // Show step 2
    this.showStep(container, 2);
    this.hideStepsAfter(container, 2);
    this.updateProgressClasses(container, 2);
  }

  handleServiceSelection(e) {
    const serviceSelect = e.target;
    // Handle case where options might be empty or invalid
    if (!serviceSelect.options[serviceSelect.selectedIndex]) return;

    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    const container = serviceSelect.closest('.progressive-service-selector');

    // Determine current step from the select element
    const currentStep = parseInt(serviceSelect.dataset.stepNumber) || 2;
    const nextStep = currentStep + 1;

    if (!selectedOption.value) {
      this.hideStepsAfter(container, currentStep);
      this.updateProgressClasses(container, currentStep);
      return;
    }

    try {
      const serviceData = JSON.parse(selectedOption.dataset.service);
      const fieldId = container.dataset.fieldId;

      // Create hidden input for service selection
      // We append the step number to make the input name unique for nested steps
      const inputName = currentStep === 2 ? 'service' : `subservice_${currentStep}`;
      this.createDynamicHiddenInput(container, fieldId, inputName, serviceData.name, serviceData);

      // Check if this service has children (Sub-services)
      if (serviceData.children && serviceData.children.length > 0) {
        // Render next level of services
        this.renderGenericStep(container, nextStep, serviceData.children, "Select Option");
        this.showStep(container, nextStep);
        this.hideStepsAfter(container, nextStep);
        this.updateProgressClasses(container, currentStep); // Active up to current
      } else {
        // LEAF NODE: Render Quantity/Details Step
        // Use nextStep for Quantity/Details
        this.renderQuantityStep(container, nextStep, serviceData);
        this.showStep(container, nextStep);

        // If fixed price with no quantity options, we might want to auto-show summary?
        // But renderQuantityStep prepares the UI.
        // Let's rely on configureQuantityStep logic which is now part of renderQuantityStep

        if (serviceData.pricingType === 'fixed') {
          this.updatePriceSummary(container, serviceData, 1);
          // Summary is nextStep + 1
          this.showStep(container, nextStep + 1);
          this.updateProgressClasses(container, nextStep + 1);
        } else {
          this.hideStepsAfter(container, nextStep);
          this.updateProgressClasses(container, nextStep);
        }
      }

    } catch (error) {
      console.error('Error parsing service data:', error);
    }
  }

  renderGenericStep(container, stepNumber, items, labelText) {
    // Chunk items by page break
    const pages = [];
    let currentPage = [];

    items.forEach(item => {
      // Robust check for page break
      if (item.type === 'page_break' || item.type === 'page-break') {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
        }
      } else {
        if (item.name || item.basePrice || item.type) {
          currentPage.push(item);
        } else {
          console.warn('[QuoteMate] Skipped potential malformed item in Generic Step:', item);
        }
      }
    });
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    const stepContainer = container.querySelector(`.step-${stepNumber}`);
    if (!stepContainer) {
      console.warn(`Step container .step-${stepNumber} not found.`);
      return;
    }

    let html = `
        <label class="step-label">
            <span class="step-number">${stepNumber}</span>
            ${labelText}
        </label>
        <div class="step-pages-container">
            ${pages.map((pageItems, pageIndex) => `
                <div class="step-page step-page-${pageIndex} ${pageIndex === 0 ? 'active-page' : ''}"
                     style="${pageIndex === 0 ? 'display: block;' : 'display: none;'}">
                    
                    ${pageItems.length > 0 ? `
                        <select class="step-select service-select" data-step="service" data-step-number="${stepNumber}" data-page-index="${pageIndex}">
                            <option value="">Choose an option...</option>
                             ${pageItems
          .filter(item => item.type !== 'page_break' && item.type !== 'page-break')
          .map(item => `
                                <option value="${this.sanitizeValue(item.name)}" 
                                        data-service='${JSON.stringify(item)}'>
                                    ${item.name}
                                    ${this.formatPricing(item)}
                                </option>
                            `).join('')}
                        </select>
                    ` : `
                        <div class="empty-page-placeholder">
                             <p>Click next to view available options.</p>
                        </div>
                    `}
                </div>
            `).join('')}
        </div>
      `;
    stepContainer.innerHTML = html;
  }

  renderQuantityStep(container, stepNumber, serviceData) {
    const stepContainer = container.querySelector(`.step-${stepNumber}`);
    if (!stepContainer) return;

    // Construct Quantity Step HTML
    // We generate the grid options dynamically if needed
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

    const html = `
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

    stepContainer.innerHTML = html;

    // Configure it (updates logic, prices in grid, etc)
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
    const serviceSelect = container.querySelector('.service-select');
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];

    if (!selectedOption.value) return;

    try {
      const serviceData = JSON.parse(selectedOption.dataset.service);

      // Validate quantity constraints
      if (serviceData.minQuantity && quantity < serviceData.minQuantity) {
        quantity = serviceData.minQuantity;
      }

      if (serviceData.maxQuantity && quantity > serviceData.maxQuantity) {
        quantity = serviceData.maxQuantity;
      }

      // Update price summary
      this.updatePriceSummary(container, serviceData, quantity);
      this.showStep(container, 4);
      this.updateProgressClasses(container, 4);

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
    const serviceNameDisplay = container.querySelector('.service-name-display');
    const quantityDisplay = container.querySelector('.quantity-display');
    const unitPriceDisplay = container.querySelector('.unit-price-display');
    const totalPriceDisplay = container.querySelector('.total-price-display');

    // Calculate price based on pricing tiers if available
    const pricingInfo = this.calculatePriceWithTiers(serviceData, quantity);
    const unitPrice = pricingInfo.unitPrice;
    const totalPrice = pricingInfo.totalPrice;
    const deliveryTime = pricingInfo.deliveryTime;

    serviceNameDisplay.textContent = serviceData.name;

    // Show different display for different pricing types
    if (serviceData.pricingType === 'fixed') {
      quantityDisplay.textContent = '1 service';
      unitPriceDisplay.textContent = `$${unitPrice.toFixed(2)} (Fixed)`;
    } else {
      const unitLabel = this.getQuantityUnit(serviceData.pricingType);
      quantityDisplay.textContent = `${quantity} ${unitLabel}`;
      const pricingLabel = this.formatPricingType(serviceData.pricingType);
      unitPriceDisplay.textContent = `$${unitPrice.toFixed(2)} ${pricingLabel.toLowerCase()}`;
    }

    totalPriceDisplay.textContent = `$${totalPrice.toFixed(2)}`;

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

    // Update hidden inputs for form submission
    const finalServiceValue = container.querySelector('.final-service-value');
    const finalQuantityValue = container.querySelector('.final-quantity-value');
    const finalPriceValue = container.querySelector('.final-price-value');
    const pricingTypeValue = container.querySelector('.pricing-type-value');
    const basePriceValue = container.querySelector('.base-price-value');
    const finalPriceValue2 = container.querySelector('.final-price-value[name$="_final_price"]');
    const selectedPathValue = container.querySelector('.selected-path-value');

    // Get category and service names for the path
    const categorySelect = container.querySelector('.category-select');
    const serviceSelect = container.querySelector('.service-select');
    const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text || '';
    const serviceName = serviceSelect.options[serviceSelect.selectedIndex]?.text || '';

    finalServiceValue.value = serviceData.name;
    finalQuantityValue.value = quantity;
    finalPriceValue.value = totalPrice;
    pricingTypeValue.value = serviceData.pricingType || '';
    basePriceValue.value = serviceData.basePrice || 0;
    if (finalPriceValue2) finalPriceValue2.value = totalPrice;
    selectedPathValue.value = `${categoryName} → ${serviceName}`;



    // Add visual feedback
    container.classList.add('step-4-active');
    container.classList.add('complete');

    // Trigger calculation update for quote totals
    this.triggerCalculationUpdate();
  }

  showStep(container, stepNumber) {
    const stepElement = container.querySelector(`.step-${stepNumber}`);
    if (stepElement) {
      stepElement.style.display = 'block';
      stepElement.classList.add('active');
    }
  }

  hideStepsAfter(container, stepNumber) {
    for (let i = stepNumber + 1; i <= 4; i++) {
      const stepElement = container.querySelector(`.step-${i}`);
      if (stepElement) {
        stepElement.style.display = 'none';
        stepElement.classList.remove('active');
      }
    }
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

  createDynamicSteps(serviceStructure) {
    let stepsHTML = '';
    let stepNumber = 1;

    // Chunk categories by page breaks
    const categoryPages = [];
    let currentPage = [];

    serviceStructure.forEach(item => {
      // Robust check for page break
      if (item.type === 'page_break' || item.type === 'page-break') {
        if (currentPage.length > 0) {
          categoryPages.push(currentPage);
          currentPage = [];
        }
      } else {
        // Double check it's not a malformed page break
        if (item.name || item.type === 'category' || item.children) {
          currentPage.push(item);
        } else {
          console.warn('[QuoteMate] Skipped potential malformed category item:', item);
        }
      }
    });

    if (currentPage.length > 0) {
      categoryPages.push(currentPage);
    }

    // Debug logging
    console.log('[QuoteMate] Page Break Pagination:', {
      totalCategories: serviceStructure.filter(i => i.type !== 'page_break').length,
      pageBreaks: serviceStructure.filter(i => i.type === 'page_break').length,
      totalPages: categoryPages.length,
      pagesContent: categoryPages.map((page, idx) => ({
        pageIndex: idx,
      }))
    });

    // If we have pages, create pagination structure
    stepsHTML += `
      <div class="step-container step-${stepNumber} active" data-step="${stepNumber}">

        
        <div class="category-pages-container">
          ${categoryPages.map((pageItems, pageIndex) => `
            <div class="category-page category-page-${pageIndex} ${pageIndex === 0 ? 'active-page' : ''}" 
                 style="${pageIndex === 0 ? 'display: block;' : 'display: none;'}">
                 
              <select class="step-select category-select" data-step="category" data-step-number="${stepNumber}" data-page-index="${pageIndex}">
                <option value="">Choose a category...</option>
                 ${pageItems
        .filter(category => category.type !== 'page_break' && category.type !== 'page-break') // Extra safety filter
        .map(category =>
          `<option value="${this.sanitizeValue(category.name)}" data-category-name="${category.name}" data-category-data='${JSON.stringify(category)}'>
                    ${category.name}
                    ${category.description ? ` - ${category.description}` : ''}
                  </option>`
        ).join('')}
              </select>
              
              ${pageIndex < categoryPages.length - 1 ? `
                <div class="category-pagination-controls">
                  ${pageIndex > 0 ? `
                    <button type="button" class="btn btn-sm btn-secondary pagination-btn prev-btn" 
                            data-action="prev-category-page" data-page-index="${pageIndex}">
                      ← Previous
                    </button>
                  ` : '<div></div>'}
                  
                  <button type="button" class="btn btn-sm btn-primary pagination-btn next-btn" 
                          data-action="next-category-page" data-page-index="${pageIndex}">
                    Next Categories →
                  </button>
                </div>
              ` : ''}
            </div>
          `).join('')}
      </div>
      
      <!-- Placeholders for subsequent steps -->
      <div class="step-container step-2" style="display:none;"></div>
      <div class="step-container step-3" style="display:none;"></div>
      <div class="step-container step-4" style="display:none;"></div>
      <div class="step-container step-5" style="display:none;"></div>
    `;

    return stepsHTML;
  }

  createDynamicHiddenInput(fieldId, stepName, stepValue, stepData = null) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = `${fieldId}_${stepName}`;
    input.value = stepValue;
    input.className = 'dynamic-step-input';
    input.dataset.stepName = stepName;

    if (stepData) {
      input.dataset.stepData = JSON.stringify(stepData);
    }

    return input;
  }

  sanitizeValue(str) {
    return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '_') : '';
  }

  getFieldData(fieldId) {
    let fieldData = null;

    // Priority 1: Try to get from window.quotemateFormData
    if (window.quotemateFormData && window.quotemateFormData.fields) {
      fieldData = window.quotemateFormData.fields.find(f => f.id === fieldId);
      console.log(`[QuoteMate] Field data from quotemateFormData for ${fieldId}:`, fieldData);
    }

    // Priority 2: Try service-field-container first (most specific)
    if (!fieldData) {
      const serviceContainer = document.querySelector(`.service-field-container[data-field-id="${fieldId}"]`);
      if (serviceContainer) {
        // Try to get field data from data-field-data attribute
        if (serviceContainer.dataset.fieldData) {
          try {
            fieldData = JSON.parse(serviceContainer.dataset.fieldData);
            console.log(`[QuoteMate] Field data from service container for ${fieldId}:`, fieldData);
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
              console.log(`[QuoteMate] Enhanced structure from service container for ${fieldId}:`, enhancedStructure);
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
          console.log(`[QuoteMate] Field data from generic element for ${fieldId}:`, fieldData);
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
            console.log(`[QuoteMate] Added enhanced structure to field data for ${fieldId}`);
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
  new ProgressiveServiceSelector();
});

// Also initialize if called directly
if (typeof window !== 'undefined') {
  window.ProgressiveServiceSelector = ProgressiveServiceSelector;
} 