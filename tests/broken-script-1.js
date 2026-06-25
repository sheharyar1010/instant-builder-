document.addEventListener("DOMContentLoaded", function () {
    const formWrapper = document.getElementById('quotemate-form-3');
    const form = formWrapper.querySelector('.quotemate-form');
    const steps = formWrapper.querySelectorAll(".form-step");
    const stepIndicators = formWrapper.querySelectorAll(".step-indicator");
    const progressFill = formWrapper.querySelector(".progress-fill");
    const messagesDiv = formWrapper.querySelector('.form-messages');

    let currentStep = 0;
    const totalSteps = steps.length;
    const hasMultipleSteps = true;

    function showStep(index) {
        if (form.classList.contains('unified-multi-step-form')) {
            return;
        }
        steps.forEach((step, i) => step.style.display = i === index ? '' : 'none');
        stepIndicators.forEach((indicator, i) => indicator.classList.toggle("active", i === index));
        
        // Update progress bar
        if (progressFill) {
            const progressPercentage = ((index + 1) / totalSteps) * 100;
            progressFill.style.width = progressPercentage + '%';
        }
        
        currentStep = index;
    }

    function showMessage(message, type) {
        if (!messagesDiv) {
            alert(message); // Fallback to alert
            return;
        }
        
        try {
            messagesDiv.textContent = message;
            messagesDiv.className = `form-messages ${type}`;
            messagesDiv.style.display = 'block';
            messagesDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            alert(message); // Fallback to alert
        }
    }

    function hideMessage() {
        messagesDiv.style.display = 'none';
    }

    // Step navigation
    formWrapper.querySelectorAll(".next-step").forEach(btn =>
        btn.addEventListener("click", () => {
            if (validateCurrentStep()) {
                hideMessage();
                showStep(currentStep + 1);
            }
        })
    );

    formWrapper.querySelectorAll(".prev-step").forEach(btn =>
        btn.addEventListener("click", () => {
            hideMessage();
            showStep(currentStep - 1);
        })
    );

    // Step indicator clicks (only for multi-step forms)
    if (stepIndicators.length > 0) {
        stepIndicators.forEach((indicator, i) => indicator.addEventListener("click", () => {
            hideMessage();
            showStep(i);
        }));
    }

    function validateCurrentStep() {
        const currentStepDiv = steps[currentStep];
        const requiredFields = currentStepDiv.querySelectorAll('[required]');
        
        for (let field of requiredFields) {
            if (!field.value.trim()) {
                field.focus();
                showMessage('Please fill in all required fields before proceeding.', 'error');
                return false;
            }
        }
        return true;
    }

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateCurrentStep()) {
            return;
        }

        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';

        const formData = new FormData(form);

        fetch('http://localhost/quotebuilder/wp-admin/admin-ajax.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success === true) {
                const message = data.data && data.data.message ? data.data.message : 'Your quote request has been submitted successfully!';
                showMessage(message, 'success');
                
                // Reset form to initial state
                form.reset();
                
                // Reset step navigation if multi-step
                if (hasMultipleSteps) {
                    currentStep = 0;
                    showStep(0);
                    updateStepProgress();
                }
                
                // Reset service selectors
                resetServiceSelectors();
                
                // Reset quote total
                const totalField = form.querySelector('[data-field-type="quote_total"] .total-value');
                if (totalField) {
                    totalField.textContent = '$0.00';
                }
                
                // Reset all hidden inputs
                resetHiddenInputs();
                
            } else {
                const errorMessage = data.data && data.data.message ? data.data.message : 'There was an error submitting your request. Please try again.';
                showMessage(errorMessage, 'error');
            }
        })
        .catch(error => {
            showMessage('There was an error submitting your request. Please try again.', 'error');
        })
        .finally(() => {
            // Re-enable submit button
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        });
    });

    setTimeout(() => {
        if (!form.classList.contains('unified-multi-step-form')) {
            showStep(currentStep);
        }
    }, 0);

    // Initialize Progressive Service Selectors
    initializeProgressiveServiceSelectors();
});

// Reset functions
function resetServiceSelectors() {
    // Reset progressive service selectors
    const serviceSelectors = document.querySelectorAll('.progressive-service-selector');
    serviceSelectors.forEach(selector => {
        // Reset all dropdowns
        const dropdowns = selector.querySelectorAll('.progressive-select');
        dropdowns.forEach(dropdown => {
            dropdown.value = '';
            dropdown.disabled = false;
        });
        
        // Remove all dropdown levels except the first
        const levels = selector.querySelectorAll('.progressive-dropdown-level');
        levels.forEach((level, index) => {
            if (index > 0) {
                level.remove();
            }
        });
        
        // Reset the first dropdown
        const firstDropdown = selector.querySelector('.progressive-dropdown-level:first-child .progressive-select');
        if (firstDropdown) {
            firstDropdown.value = '';
            firstDropdown.disabled = false;
        }
        
        // Hide pricing display
        const pricingDisplay = selector.querySelector('.service-pricing-display');
        if (pricingDisplay) {
            pricingDisplay.style.display = 'none';
        }
        
        // Remove completed classes
        selector.querySelectorAll('.progressive-dropdown-level').forEach(level => {
            level.classList.remove('completed');
        });
    });
    
    // Reset regular service selects
    const serviceSelects = document.querySelectorAll('select[name*="field_"][name$="_service"]');
    serviceSelects.forEach(select => {
        select.value = '';
        select.disabled = false;
    });
}

function resetHiddenInputs() {
    // Reset all dynamic hidden inputs
    const dynamicInputs = document.querySelectorAll('.dynamic-step-input, input[name*="_pricing_type"], input[name*="_base_price"], input[name*="_final_price"], input[name*="_selected_path"]');
    dynamicInputs.forEach(input => {
        input.value = '';
    });
    
    // Reset main service value inputs
    const serviceInputs = document.querySelectorAll('input[name*="field_"][name$="_service"]');
    serviceInputs.forEach(input => {
        input.value = '';
    });
}

function updateStepProgress() {
    if (!hasMultipleSteps) return;
    
    const progressFill = document.querySelector('.progress-fill');
    const stepIndicators = document.querySelectorAll('.step-indicator');
    
    if (progressFill) {
        const progressPercentage = ((currentStep + 1) / steps.length) * 100;
        progressFill.style.width = progressPercentage + '%';
    }
    
    stepIndicators.forEach((indicator, index) => {
        indicator.classList.remove('active', 'completed');
        if (index === currentStep) {
            indicator.classList.add('active');
        } else if (index < currentStep) {
            indicator.classList.add('completed');
        }
    });
}

// Progressive Service Selector Logic
function initializeProgressiveServiceSelectors() {
    const serviceContainers = document.querySelectorAll('.progressive-service-selector');
    
    serviceContainers.forEach(container => {
        // New progressive-service-selector.js already built .progressive-steps UI
        if (container.querySelector('.progressive-steps')) {
            return;
        }

        const fieldId = container.dataset.fieldId;
        const serviceContainer = container.closest('.service-field-container');
        const enhancedStructureData = serviceContainer.dataset.enhancedStructure;
        
        if (enhancedStructureData) {
            try {
                const enhancedStructure = JSON.parse(enhancedStructureData);
                if (enhancedStructure && enhancedStructure.length > 0) {
                  
                    initializeProgressiveSelector(container, enhancedStructure, fieldId);
                }
            } catch (e) {
              
            }
        }
    });
}

    // Enhanced quantity field handling with tier-based pricing
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.querySelector('#quotemate-form-<br />
<b>Warning</b>:  Undefined variable $form_id in <b>C:\xampp\htdocs\quotebuilder\wp-content\plugins\instant-builder-\src\Frontend\Views\Templates\form-view.php</b> on line <b>1424</b><br />
');
        if (!form) return;

        // Handle service field changes to show/hide quantity field
        const serviceFields = form.querySelectorAll('select[name="field_9"]');
       
        serviceFields.forEach(serviceField => {
         
            serviceField.addEventListener('change', function() {
                const selectedService = this.value;
                const quantityField = form.querySelector(`[name="field_9_quantity"]`);
          
                
                if (quantityField && selectedService) {
                    // Get service data to check if it has maxQuantity
                    const serviceData = getServiceData('field_9', selectedService);
                   
                    if (serviceData && serviceData.maxQuantity && serviceData.maxQuantity > 0) {
                        // Show quantity field and update options
                        const autoQuantityField = quantityField.closest('.auto-quantity-field');
                   
                        if (autoQuantityField) {
                            autoQuantityField.style.display = 'block';
                            updateQuantityOptions(quantityField, serviceData);
                           
                        } else {
                           
                        }
                    } else {
                        // Hide quantity field if service doesn't need quantity
                        const autoQuantityField = quantityField.closest('.auto-quantity-field');
                        if (autoQuantityField) {
                            autoQuantityField.style.display = 'none';
                        }
                       
                    }
                } else {
                    // Hide quantity field if no service selected
                    if (quantityField) {
                        const autoQuantityField = quantityField.closest('.auto-quantity-field');
                        if (autoQuantityField) {
                            autoQuantityField.style.display = 'none';
                        }
                       
                    }
                }
            });
        });

        // Handle quantity selects with dynamic pricing
        const quantitySelects = form.querySelectorAll('.quantity-select');
        quantitySelects.forEach(select => {
            select.addEventListener('change', function() {
                const quantity = parseInt(this.value) || 0;
                const relatedServiceId = this.dataset.relatedService;
                const priceDisplay = this.parentNode.querySelector('.quantity-price-display');
                
                if (quantity > 0 && relatedServiceId) {
                    // Find the related service field
                    const serviceField = form.querySelector(`[name="${relatedServiceId}"]`);
                    if (serviceField && serviceField.value) {
                        // Get service data from the selected option
                        const serviceData = getServiceData(relatedServiceId, serviceField.value);
                        if (serviceData) {
                            updateQuantityPriceDisplay(priceDisplay, serviceData, quantity);
                        }
                    }
                } else {
                    // Hide price display if no quantity selected
                    if (priceDisplay) {
                        priceDisplay.style.display = 'none';
                    }
                }
            });
        });

        // Function to update quantity options based on service data
        function updateQuantityOptions(quantityField, serviceData) {
            const maxQuantity = serviceData.maxQuantity || 1;
            const pricingType = serviceData.pricingType || 'per_item';
            
            // Get unit label
            const unitLabel = getUnitLabel(pricingType);
            
            // Clear existing options
            quantityField.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `Select number of ${unitLabel}`;
            quantityField.appendChild(defaultOption);
            
            // Add quantity options
            for (let i = 1; i <= maxQuantity; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i} ${i === 1 ? unitLabel.slice(0, -1) : unitLabel}`;
                quantityField.appendChild(option);
            }
            
            // Update the label
            const label = quantityField.parentNode.parentNode.querySelector('.field-label');
            if (label) {
                label.innerHTML = `Number of ${unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}<span class="required">*</span>`;
            }
        }

        // Function to get unit label from pricing type
        function getUnitLabel(pricingType) {
            const units = {
                'per_page': 'pages',
                'per_hour': 'hours',
                'per_month': 'months',
                'per_year': 'years',
                'per_user': 'users',
                'per_feature': 'features',
                'per_backlink': 'backlinks',
                'per_post': 'posts',
                'per_campaign': 'campaigns',
                'per_project': 'projects',
                'per_item': 'items',
                'fixed': 'service'
            };
            return units[pricingType] || 'items';
        }

        // Function to get service data from selected option
        function getServiceData(serviceFieldId, selectedService) {
            const serviceField = form.querySelector(`[name="${serviceFieldId}"]`);
           
            if (serviceField) {
                const selectedOption = serviceField.querySelector(`option[value="${selectedService}"]`);
              
                if (selectedOption && selectedOption.dataset.service) {
                    try {
                        const serviceData = JSON.parse(selectedOption.dataset.service);
                        
                        return serviceData;
                    } catch (e) {
                   
                    }
                } else {
                   
                    // Log all options to debug
                    const allOptions = serviceField.querySelectorAll('option');
                   
                    allOptions.forEach((option, index) => {
                       
                    });
                }
            } else {
               
            }
            return null;
        }

        // Function to update price display with tier-based pricing
        function updateQuantityPriceDisplay(priceDisplay, serviceData, quantity) {
            if (!priceDisplay || !serviceData) return;

            // Calculate price based on tiers
            let unitPrice = parseFloat(serviceData.basePrice) || 0;
            let totalPrice = unitPrice * quantity;
            let deliveryTime = serviceData.deliveryTime;

            // Check for pricing tiers
            if (serviceData.pricingTiers && serviceData.pricingTiers.length > 0) {
                const applicableTier = findApplicableTier(serviceData.pricingTiers, quantity);
                if (applicableTier) {
                    unitPrice = parseFloat(applicableTier.price) || 0;
                    totalPrice = serviceData.pricingType === 'fixed' ? unitPrice : unitPrice * quantity;
                    deliveryTime = applicableTier.deliveryTime || serviceData.deliveryTime;
                }
            }

            // Update display
            const unitPriceElement = priceDisplay.querySelector('.unit-price');
            const quantityElement = priceDisplay.querySelector('.quantity-value');
            const totalPriceElement = priceDisplay.querySelector('.total-price');

            if (unitPriceElement) unitPriceElement.textContent = `$${unitPrice.toFixed(2)}`;
            if (quantityElement) quantityElement.textContent = quantity;
            if (totalPriceElement) totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;

            // Show the price display
            priceDisplay.style.display = 'block';

            // Update any quote total fields
            updateQuoteTotals();
        }

        // Function to find applicable pricing tier
        function findApplicableTier(pricingTiers, quantity) {
            const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);
            
            for (let i = sortedTiers.length - 1; i >= 0; i--) {
                const tier = sortedTiers[i];
                const minQty = parseInt(tier.minQuantity) || 1;
                const maxQty = tier.maxQuantity ? parseInt(tier.maxQuantity) : Infinity;
                
                if (quantity >= minQty && quantity <= maxQty) {
                    return tier;
                }
            }
            
            return sortedTiers.length > 0 ? sortedTiers[0] : null;
        }

        // Function to update quote totals
        function updateQuoteTotals() {
            const quoteTotalDisplays = form.querySelectorAll('.quote-total-display');
            quoteTotalDisplays.forEach(display => {
                let total = 0;
                
                // Calculate total from all quantity fields
                const quantitySelects = form.querySelectorAll('.quantity-select');
                quantitySelects.forEach(select => {
                    const quantity = parseInt(select.value) || 0;
                    const priceDisplay = select.parentNode.querySelector('.quantity-price-display');
                    if (priceDisplay && priceDisplay.style.display !== 'none') {
                        const totalPriceElement = priceDisplay.querySelector('.total-price');
                        if (totalPriceElement) {
                            const price = parseFloat(totalPriceElement.textContent.replace('$', '')) || 0;
                            total += price;
                        }
                    }
                });

                // Update the quote total display
                const totalValueElement = display.querySelector('.total-value');
                const hiddenInput = display.querySelector('input[type="hidden"]');
                
                if (totalValueElement) totalValueElement.textContent = `$${total.toFixed(2)}`;
                if (hiddenInput) hiddenInput.value = total;
            });
        }
    });

    function initializeProgressiveSelector(container, serviceStructure, fieldId) {
    const selectorContainer = container.querySelector('.progressive-selector-container');
    const pricingDisplay = container.querySelector('.service-pricing-display');
    const hiddenInput = container.querySelector(`input[name="${fieldId}"]`);
    const pricingTypeInput = container.querySelector(`input[name="${fieldId}_pricing_type"]`);
    const basePriceInput = container.querySelector(`input[name="${fieldId}_base_price"]`);
    const selectedPathInput = container.querySelector(`input[name="${fieldId}_selected_path"]`);
    
    let currentLevel = 0;
    let selectedPath = [];
    let currentData = serviceStructure;
    
    // Create the first dropdown level
    createDropdownLevel(selectorContainer, currentData, 0, []);
    
    function createDropdownLevel(parentContainer, data, level, path) {
        // Remove any dropdowns beyond this level
        const existingLevels = parentContainer.querySelectorAll('.progressive-dropdown-level');
        existingLevels.forEach((levelEl, index) => {
            if (index > level) {
                levelEl.remove();
            }
        });
        
        // Clear pricing display if we're going backwards
        if (level < selectedPath.length) {
            hidePricingDisplay();
            selectedPath = selectedPath.slice(0, level);
            updateHiddenInputs('', '', '', '');
        }
        
        if (!data || data.length === 0) {
            return;
        }
        
        const levelContainer = document.createElement('div');
        levelContainer.className = 'progressive-dropdown-level';
        levelContainer.dataset.level = level;
        
        const levelLabel = createLevelLabel(level, path);
        const dropdown = createDropdown(data, level, path);
        
        levelContainer.appendChild(levelLabel);
        levelContainer.appendChild(dropdown);
        
        parentContainer.appendChild(levelContainer);
        
        // Add event listener for this dropdown
        dropdown.addEventListener('change', function() {
            handleDropdownChange(this, data, level, path);
        });
    }
    
    function createQuantityLevel(parentContainer, service, level, path) {
        // Remove any existing quantity levels
        const existingQuantityLevels = parentContainer.querySelectorAll('.quantity-dropdown-level');
        existingQuantityLevels.forEach(levelEl => levelEl.remove());
        
        const levelContainer = document.createElement('div');
        levelContainer.className = 'progressive-dropdown-level quantity-dropdown-level';
        levelContainer.dataset.level = level;
        
        // Create label based on pricing type
        const pricingType = service.pricingType || 'per_item';
        const unitLabel = getUnitLabel(pricingType);
        
        const levelLabel = document.createElement('div');
        levelLabel.className = 'level-label';
        levelLabel.textContent = `Choose Number of ${unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}:`;
        
        // Create quantity dropdown
        const dropdown = document.createElement('select');
        dropdown.className = 'progressive-select quantity-select';
        dropdown.dataset.level = level;
        dropdown.dataset.serviceData = JSON.stringify(service);
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Select number of ${unitLabel}`;
        dropdown.appendChild(defaultOption);
        
        // Add quantity options
        const maxQuantity = service.maxQuantity || 1;
        for (let i = 1; i <= maxQuantity; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} ${i === 1 ? unitLabel.slice(0, -1) : unitLabel}`;
            dropdown.appendChild(option);
        }
        
        levelContainer.appendChild(levelLabel);
        levelContainer.appendChild(dropdown);
        
        parentContainer.appendChild(levelContainer);
        
        // Add event listener for quantity selection
        dropdown.addEventListener('change', function() {
            handleQuantityChange(this, service, path);
        });
    }
    
    function getUnitLabel(pricingType) {
        const units = {
            'per_page': 'pages',
            'per_hour': 'hours',
            'per_month': 'months',
            'per_year': 'years',
            'per_user': 'users',
            'per_feature': 'features',
            'per_backlink': 'backlinks',
            'per_post': 'posts',
            'per_campaign': 'campaigns',
            'per_project': 'projects',
            'per_item': 'items',
            'fixed': 'service'
        };
        return units[pricingType] || 'items';
    }
    

    
    function createLevelLabel(level, path) {
        const label = document.createElement('div');
        label.className = 'level-label';
        
        const levelNames = ['Category', 'Subcategory', 'Service Type', 'Service', 'Option'];
        const levelName = levelNames[level] || `Level ${level + 1}`;
        
        label.textContent = `Choose ${levelName}:`;
        return label;
    }
    
    function createDropdown(data, level, path) {
        const select = document.createElement('select');
        select.className = 'progressive-select';
        select.dataset.level = level;
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select an option...';
        select.appendChild(defaultOption);
        
        // Add options from data
        data.forEach((item, index) => {
            // Skip page breaks
            if (item.type === 'page_break' || item.type === 'page-break') {
                return;
            }

            const option = document.createElement('option');
            option.value = index;
            option.textContent = item.name || 'Unnamed Item';
            option.dataset.itemData = JSON.stringify(item);
            select.appendChild(option);
        });
        
        return select;
    }
    
    function handleDropdownChange(dropdown, data, level, path) {
        const selectedIndex = dropdown.value;
        
       
        // Reset all child levels and pricing display when parent changes
        const allLevels = selectorContainer.querySelectorAll('.progressive-dropdown-level');
        allLevels.forEach((levelEl, index) => {
            if (index > level) {
                levelEl.remove();
            }
        });
        
        // Hide pricing display when any parent changes
        hidePricingDisplay();
        
        if (selectedIndex === '') {
            // Clear everything after this level and reset path
            selectedPath = selectedPath.slice(0, level);
            updateHiddenInputs('', '', '', '');
            
            // Remove completed class from current level
            const levelContainer = dropdown.closest('.progressive-dropdown-level');
            levelContainer.classList.remove('completed');
            return;
        }
        
        const selectedItem = data[parseInt(selectedIndex)];
        const newPath = [...path, selectedItem.name];
       
        // Update selected path
        selectedPath = newPath;
        
        // Mark this level as completed
        const levelContainer = dropdown.closest('.progressive-dropdown-level');
        levelContainer.classList.add('completed');
        
        if (selectedItem.type === 'service') {
            // Check if this service has maxQuantity - if so, show quantity selection
            if (selectedItem.maxQuantity && selectedItem.maxQuantity > 0) {
               
                createQuantityLevel(selectorContainer, selectedItem, level + 1, newPath);
            } else {
               
                showPricingDisplay(selectedItem, newPath);
                updateHiddenInputs(selectedItem.name, selectedItem.pricingType, selectedItem.basePrice, newPath.join(' → '));
            }
        } else if (selectedItem.type === 'category' && selectedItem.children && selectedItem.children.length > 0) {
           
            createDropdownLevel(selectorContainer, selectedItem.children, level + 1, newPath);
        } else {
            
        }
    }
    
    function showPricingDisplay(service, path) {
        // Update the quote total field instead of showing separate pricing display
        updateQuoteTotal(service, path);
    }
    
    function hidePricingDisplay() {
        // Clear the quote total field
        updateQuoteTotal(null, []);
    }
    
    function handleQuantityChange(dropdown, service, path) {
        const quantity = parseInt(dropdown.value) || 0;
      
        if (quantity > 0) {
            // Calculate price based on quantity and pricing tiers
            const calculatedPrice = calculateServicePrice(service, quantity);
            
            // Show pricing display with quantity
            showPricingDisplayWithQuantity(service, path, quantity, calculatedPrice);
            
            // Update hidden inputs
            updateHiddenInputs(service.name, service.pricingType, calculatedPrice.totalPrice, path.join(' → '));
            
            // Mark this level as completed
            const levelContainer = dropdown.closest('.progressive-dropdown-level');
            levelContainer.classList.add('completed');
        } else {
            // Hide pricing display if no quantity selected
            hidePricingDisplay();
            updateHiddenInputs('', '', '', '');
            
            // Remove completed class from current level
            const levelContainer = dropdown.closest('.progressive-dropdown-level');
            levelContainer.classList.remove('completed');
        }
    }
    
    function calculateServicePrice(service, quantity) {
        let unitPrice = parseFloat(service.basePrice) || 0;
        let totalPrice = unitPrice * quantity;
        let deliveryTime = service.deliveryTime || 0;
        let isTierDeal = false;
        let applicableTier = null;
        
        // Check for pricing tiers (deal pricing)
        if (service.pricingTiers && service.pricingTiers.length > 0) {
            applicableTier = findApplicableTier(service.pricingTiers, quantity);
            if (applicableTier) {
                // Tier price is a deal price for the entire quantity
                totalPrice = parseFloat(applicableTier.price) || 0;
                unitPrice = totalPrice / quantity; // Calculate effective unit price for display
                deliveryTime = applicableTier.deliveryTime || service.deliveryTime;
                isTierDeal = true;
               
            } else {
               
            }
        }
        
        return {
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            quantity: quantity,
            deliveryTime: deliveryTime,
            isTierDeal: isTierDeal,
            applicableTier: applicableTier
        };
    }
    
    function findApplicableTier(pricingTiers, quantity) {
        const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);
        
        for (let i = 0; i < sortedTiers.length; i++) {
            const tier = sortedTiers[i];
            const minQty = parseInt(tier.minQuantity) || 1;
            const maxQty = tier.maxQuantity ? parseInt(tier.maxQuantity) : Infinity;
            
           
            if (quantity >= minQty && quantity <= maxQty) {
              
                return tier;
            }
        }
     
        return null;
    }
    
    function showPricingDisplayWithQuantity(service, path, quantity, calculatedPrice) {
        const totalDisplays = document.querySelectorAll('.quote-total-display');
        
        totalDisplays.forEach(totalDisplay => {
            const serviceSummary = totalDisplay.querySelector('.service-summary');
            const serviceName = totalDisplay.querySelector('.service-name');
            const servicePrice = totalDisplay.querySelector('.service-price');
            const totalValue = totalDisplay.querySelector('.total-value');
            const hiddenInput = totalDisplay.querySelector('input[type="hidden"]');
            
            if (service) {
                // Show service information with quantity
                serviceSummary.style.display = 'block';
                serviceName.textContent = `${service.name} (${quantity} ${getUnitLabel(service.pricingType)})`;
                
                const pricingType = service.pricingType ? service.pricingType.replace('_', ' ') : 'fixed';
                
                if (calculatedPrice.isTierDeal && calculatedPrice.applicableTier) {
                    // Show deal pricing
                    const basePrice = parseFloat(service.basePrice) || 0;
                    const regularPrice = basePrice * quantity;
                    const savings = regularPrice - calculatedPrice.totalPrice;
                    const tier = calculatedPrice.applicableTier;
                    const tierRange = tier.maxQuantity ? `${tier.minQuantity}-${tier.maxQuantity}` : `${tier.minQuantity}+`;
                    
                    servicePrice.innerHTML = `
                        <span style="text-decoration: line-through; color: #6c757d;">Regular: $${regularPrice.toFixed(2)}</span><br>
                        <span style="color: #28a745; font-weight: bold;">Deal Price: $${calculatedPrice.totalPrice.toFixed(2)}</span>
                        <span style="color: #007cba; font-size: 0.9em;"> (${tierRange} ${getUnitLabel(service.pricingType)} deal)</span>
                        ${savings > 0 ? `<br><span style="color: #28a745; font-size: 0.9em;">Save $${savings.toFixed(2)}</span>` : ''}
                    `;
                } else {
                    // Show regular pricing
                    servicePrice.textContent = `$${calculatedPrice.unitPrice.toFixed(2)} per ${pricingType} × ${quantity} = $${calculatedPrice.totalPrice.toFixed(2)}`;
                }
                
                // Update total
                totalValue.textContent = `$${calculatedPrice.totalPrice.toFixed(2)}`;
                if (hiddenInput) hiddenInput.value = calculatedPrice.totalPrice;
            }
        });
    }
    
    function updateQuoteTotal(service, path) {
        const totalDisplays = document.querySelectorAll('.quote-total-display');
        
        totalDisplays.forEach(totalDisplay => {
            const serviceSummary = totalDisplay.querySelector('.service-summary');
            const serviceName = totalDisplay.querySelector('.service-name');
            const servicePrice = totalDisplay.querySelector('.service-price');
            const totalValue = totalDisplay.querySelector('.total-value');
            const hiddenInput = totalDisplay.querySelector('input[type="hidden"]');
            
            if (service) {
                // Show service information
                serviceSummary.style.display = 'block';
                serviceName.textContent = service.name || 'Unknown Service';
                
                const pricingType = service.pricingType ? service.pricingType.replace('_', ' ') : 'fixed';
                const basePrice = service.basePrice || 0;
                servicePrice.textContent = `$${basePrice.toFixed(2)} (${pricingType})`;
                
                // Update total
                totalValue.textContent = `$${basePrice.toFixed(2)}`;
                if (hiddenInput) hiddenInput.value = basePrice;
            } else {
                // Hide service information and reset total
                serviceSummary.style.display = 'none';
                totalValue.textContent = '$0.00';
                if (hiddenInput) hiddenInput.value = '0';
            }
        });
    }
    
    function updateHiddenInputs(serviceName, pricingType, basePrice, selectedPath) {
        if (hiddenInput) hiddenInput.value = serviceName;
        if (pricingTypeInput) pricingTypeInput.value = pricingType || '';
        if (basePriceInput) basePriceInput.value = basePrice || '';
        if (selectedPathInput) selectedPathInput.value = selectedPath || '';
        
        // Trigger change event for form validation and calculation engines
        if (hiddenInput) {
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

// Initialize conditional logic and calculation engines
function initializeQuoteMateEngines() {
    // Prepare form data for both conditional logic and calculations
    window.quoteMateFormData = {
        fields: [{"id":"field_2","type":"name","label":"Full Name","required":false,"description":"","placeholder":"","cssClass":"","defaultValue":"","fieldSize":"medium","styleLabelColor":"","styleInputColor":"","styleInputBg":"","styleBorderWidth":"","styleBorderColor":"","stylePadding":"","styleBorderRadiusTopLeft":"","styleBorderRadiusTopRight":"","styleBorderRadiusBottomRight":"","styleBorderRadiusBottomLeft":"","styleBorderRadiusUnit":"px","styleMarginTop":"","styleMarginRight":"","styleMarginBottom":"","styleMarginLeft":"","styleMarginUnit":"px","stylePaddingTop":"","stylePaddingRight":"","stylePaddingBottom":"","stylePaddingLeft":"","stylePaddingUnit":"px","styleFontFamily":"","styleFontSize":"","styleFontWeight":"","styleTextTransform":"","styleFontStyle":"","styleTextDecoration":"","styleLineHeight":"","styleLetterSpacing":"","styleWordSpacing":"","styleInputFontFamily":"","styleInputFontSize":"","styleInputFontWeight":"","rowIndex":"0","columnIndex":"0","hideLabel":false,"readOnly":false,"styleMarginLinked":false,"stylePaddingLinked":false,"styleBorderRadiusLinked":false},{"id":"field_3","type":"page_break","label":"Page Break","required":false,"page_title":"Next Page","page_description":"","rowIndex":"0","columnIndex":"0"},{"id":"field_1","type":"service","label":"Service Selection","required":false,"description":"","cssClass":"","fieldSize":"medium","styleLabelColor":"","styleInputColor":"","styleInputBg":"","styleBorderWidth":"","styleBorderColor":"","stylePadding":"","styleBorderRadiusTopLeft":"","styleBorderRadiusTopRight":"","styleBorderRadiusBottomRight":"","styleBorderRadiusBottomLeft":"","styleBorderRadiusUnit":"px","styleMarginTop":"","styleMarginRight":"","styleMarginBottom":"","styleMarginLeft":"","styleMarginUnit":"px","stylePaddingTop":"","stylePaddingRight":"","stylePaddingBottom":"","stylePaddingLeft":"","stylePaddingUnit":"px","styleFontFamily":"","styleFontSize":"","styleFontWeight":"","styleTextTransform":"","styleFontStyle":"","styleTextDecoration":"","styleLineHeight":"","styleLetterSpacing":"","styleWordSpacing":"","styleInputFontFamily":"","styleInputFontSize":"","styleInputFontWeight":"","rowIndex":"0","columnIndex":"0","hideLabel":false,"styleMarginLinked":false,"stylePaddingLinked":false,"styleBorderRadiusLinked":false,"services":[],"serviceStructureLabel":"cars","enhancedServiceStructure":[{"type":"category","name":"car 1","optionsLabel":"models","pageBreakBeforeOptions":true,"children":[{"type":"category","name":"model 1","optionsLabel":"type","pageBreakBeforeOptions":true,"children":[{"type":"category","name":"type 1","optionsLabel":"","pageBreakBeforeOptions":true,"children":[]},{"type":"category","name":"type 2","children":[]}]},{"type":"category","name":"model 2","optionsLabel":"type","pageBreakBeforeOptions":true,"children":[{"type":"category","name":"model3","children":[{"type":"service","name":"","pricingType":"fixed","basePrice":0,"children":[]}]}]}]},{"type":"category","name":"car 2","optionsLabel":"models","pageBreakBeforeOptions":false,"children":[{"type":"service","name":"model 4","pricingType":"fixed","basePrice":0,"children":[]}]},{"type":"category","name":"car 3","children":[]}]},{"id":"field_4","type":"company","label":"Company Name","required":false,"rowIndex":"1","columnIndex":"0"},{"id":"field_8","type":"page_break","label":"Page Break","required":false,"rowIndex":"1","columnIndex":"0"},{"id":"field_9","type":"address","label":"Address","required":false,"rowIndex":"2","columnIndex":"0"},{"id":"field_10","type":"city","label":"City","required":false,"rowIndex":"2","columnIndex":"0"}]    };

    document.dispatchEvent(new CustomEvent('quotemate-form-data-ready'));

    if (window.quotemateProgressiveSelector && !window.quotemateUnifiedSteps) {
        window.quotemateProgressiveSelector.initUnifiedSteps();
    }

    let initialized = false;

    // Initialize conditional logic
    if (typeof QuoteMateConditionalLogic !== 'undefined') {
        window.quoteMateConditionalLogic = new QuoteMateConditionalLogic(window.quoteMateFormData);
       
        initialized = true;
    }

    // Initialize calculation engine
    if (typeof QuoteMateCalculation !== 'undefined') {
        window.quoteMateCalculation = new QuoteMateCalculation(window.quoteMateFormData);
       
        initialized = true;
    }

    return initialized;
}

// Try to initialize immediately
if (!initializeQuoteMateEngines()) {
    // If not available, wait for script to load
    document.addEventListener('DOMContentLoaded', function() {
        // Try again after a short delay
        setTimeout(initializeQuoteMateEngines, 100);
    });
}

// Also try when window loads (fallback)
window.addEventListener('load', function() {
    if (!window.quoteMateConditionalLogic || !window.quoteMateCalculation) {
        initializeQuoteMateEngines();
    }
});