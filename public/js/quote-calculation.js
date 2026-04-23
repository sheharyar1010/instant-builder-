/**
 * QuoteMate Frontend Calculation Engine
 * Handles dynamic pricing calculations for user-facing forms
 */

class QuoteMateCalculation {
  constructor(formData) {
    this.formData = formData;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.attachEventListeners());
    } else {
      this.attachEventListeners();
    }
  }

  /**
   * Attach event listeners to form fields that affect calculations
   */
  attachEventListeners() {
    const form = document.querySelector('.quotemate-form');
    if (!form) return;

    // Attach listeners to all relevant inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const eventType = this.getEventType(input);
      
      input.addEventListener(eventType, () => {
        // Debounce calculations
        clearTimeout(this.calculationTimeout);
        this.calculationTimeout = setTimeout(() => {
          this.calculateTotals();
        }, 300);
      });
    });

    // Initial calculation
    setTimeout(() => this.calculateTotals(), 100);
  }

  /**
   * Get appropriate event type for different input types
   */
  getEventType(input) {
    switch (input.type) {
      case 'checkbox':
      case 'radio':
        return 'change';
      case 'select-one':
      case 'select-multiple':
        return 'change';
      case 'number':
        return 'input';
      default:
        return 'input';
    }
  }

  /**
   * Get field data by field ID
   */
  getFieldData(fieldId) {
    if (!this.formData || !this.formData.fields) return null;
    return this.formData.fields.find(f => f.id === fieldId);
  }

  /**
   * Get current value of a field
   */
  getFieldValue(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"], #${fieldId}`);
    if (!fieldElement) return null;

    const fieldData = this.getFieldData(fieldId);
    if (!fieldData) return null;

    switch (fieldData.type) {
      case 'service':
      case 'service_options':
        const serviceSelect = fieldElement.querySelector ? 
          fieldElement.querySelector('select') : 
          (fieldElement.tagName === 'SELECT' ? fieldElement : null);
        return serviceSelect ? serviceSelect.value : '';

      case 'quantity':
        const quantityInput = fieldElement.querySelector ? 
          fieldElement.querySelector('input[type="number"]') : 
          (fieldElement.tagName === 'INPUT' ? fieldElement : null);
        const value = quantityInput ? quantityInput.value : '';
        return value === '' ? 0 : parseInt(value) || 0;

      case 'select':
      case 'project_type':
        const select = fieldElement.querySelector ? 
          fieldElement.querySelector('select') : 
          (fieldElement.tagName === 'SELECT' ? fieldElement : null);
        return select ? select.value : '';

      case 'radio':
        const radioGroup = fieldElement.querySelector ? fieldElement : document;
        const radioChecked = radioGroup.querySelector(`input[name="${fieldId}"]:checked`);
        return radioChecked ? radioChecked.value : '';

      case 'checkbox':
        const checkboxGroup = fieldElement.querySelector ? fieldElement : document;
        const checkboxes = checkboxGroup.querySelectorAll(`input[name="${fieldId}[]"]:checked, input[name="${fieldId}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);

      default:
        const input = fieldElement.querySelector ? 
          fieldElement.querySelector('input, textarea, select') : 
          fieldElement;
        return input ? input.value : '';
    }
  }

  /**
   * Get service price by service name from field data
   */
  getServicePrice(fieldId, serviceName) {
    const fieldData = this.getFieldData(fieldId);
    if (!fieldData) return 0;

    // First check the new service structure
    if (fieldData.serviceStructure) {
      for (const category of fieldData.serviceStructure) {
        if (category.children) {
          const service = category.children.find(s => 
            s.name === serviceName || 
            s.name.toLowerCase().replace(/\s+/g, '_') === serviceName
          );
          if (service) {
            return parseFloat(service.basePrice) || 0;
          }
        }
      }
    }

    // Fallback to legacy services structure
    if (fieldData.services) {
      const service = fieldData.services.find(s => 
        s.name === serviceName || 
        s.name.toLowerCase().replace(/\s+/g, '_') === serviceName
      );
      return service ? parseFloat(service.price) || 0 : 0;
    }

    return 0;
  }

  /**
   * Calculate totals based on current form values
   */
  calculateTotals() {
    const calculations = this.performCalculations();
    this.updateQuoteTotalDisplays(calculations);
    return calculations;
  }

  /**
   * Perform the actual calculations
   */
  performCalculations() {
    let subtotal = 0;
    let items = [];

    if (!this.formData || !this.formData.fields) {
      return {
        subtotal: 0,
        tax: 0,
        taxRate: 0,
        discount: 0,
        discountPercent: 0,
        total: 0,
        items: []
      };
    }

    // Find all service fields and calculate their contributions
    const serviceFields = this.formData.fields.filter(f => 
      f.type === 'service' || f.type === 'service_options'
    );

    serviceFields.forEach(field => {
      const selectedValue = this.getFieldValue(field.id);
      if (selectedValue) {
        const price = this.getServicePrice(field.id, selectedValue);
        const quantity = this.getQuantityForService(field.id);
        const lineTotal = price * quantity;
        
        subtotal += lineTotal;
        items.push({
          fieldId: field.id,
          type: field.type,
          service: selectedValue,
          price: price,
          quantity: quantity,
          total: lineTotal
        });
      }
    });

    // Apply multipliers from quantity fields
    const quantityFields = this.formData.fields.filter(f => f.type === 'quantity');
    quantityFields.forEach(field => {
      const quantity = this.getFieldValue(field.id);
      if (quantity > 1) {
        // Apply quantity multiplier to services
        serviceFields.forEach(serviceField => {
          const selectedValue = this.getFieldValue(serviceField.id);
          if (selectedValue) {
            const price = this.getServicePrice(serviceField.id, selectedValue);
            const additionalAmount = price * (quantity - 1);
            subtotal += additionalAmount;
            items.push({
              fieldId: field.id,
              type: 'quantity_multiplier',
              service: selectedValue,
              quantity: quantity,
              basePrice: price,
              total: additionalAmount
            });
          }
        });
      }
    });

    // Calculate tax and discount
    const quoteTotalFields = this.formData.fields.filter(f => f.type === 'quote_total');
    let tax = 0;
    let discount = 0;
    let taxRate = 0;
    let discountPercent = 0;

    quoteTotalFields.forEach(field => {
      if (field.show_tax && field.tax_rate) {
        taxRate = parseFloat(field.tax_rate) || 0;
        tax = (subtotal * taxRate) / 100;
      }

      if (field.show_discount) {
        const discountInput = document.querySelector(`[data-field-id="${field.id}"] .quotemate-quote-total__discount-input input`);
        if (discountInput) {
          discountPercent = parseFloat(discountInput.value) || 0;
          discount = (subtotal * discountPercent) / 100;
        }
      }
    });

    const total = subtotal + tax - discount;

    return {
      subtotal: subtotal,
      tax: tax,
      taxRate: taxRate,
      discount: discount,
      discountPercent: discountPercent,
      total: Math.max(0, total), // Ensure total is not negative
      items: items
    };
  }

  /**
   * Get quantity for a service (look for related quantity fields)
   */
  getQuantityForService(serviceFieldId) {
    // Look for quantity fields that might be related to this service
    const quantityFields = this.formData.fields.filter(f => f.type === 'quantity');
    
    if (quantityFields.length === 0) return 1;

    // If there's only one quantity field, use it
    if (quantityFields.length === 1) {
      const quantity = this.getFieldValue(quantityFields[0].id);
      return quantity || 1;
    }

    // For multiple quantity fields, try to find one that has a value
    for (const qField of quantityFields) {
      const quantity = this.getFieldValue(qField.id);
      if (quantity > 0) {
        return quantity;
      }
    }

    return 1;
  }

  /**
   * Update all quote total displays with calculated values
   */
  updateQuoteTotalDisplays(calculations) {
    // Update complex quote total displays (admin-style)
    const quoteTotalFields = this.formData.fields ? this.formData.fields.filter(f => f.type === 'quote_total') : [];
    
    quoteTotalFields.forEach(field => {
      const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
      if (!fieldElement) return;

      // Update subtotal
      const subtotalElement = fieldElement.querySelector('.quotemate-quote-total__subtotal .quotemate-quote-total__value');
      if (subtotalElement) {
        subtotalElement.textContent = this.formatCurrency(calculations.subtotal);
      }

      // Update tax
      const taxElement = fieldElement.querySelector('.quotemate-quote-total__tax .quotemate-quote-total__value');
      if (taxElement) {
        taxElement.textContent = this.formatCurrency(calculations.tax);
      }

      // Update total
      const totalElement = fieldElement.querySelector('.quotemate-quote-total__total .quotemate-quote-total__value');
      if (totalElement) {
        totalElement.textContent = this.formatCurrency(calculations.total);
      }
    });

    // Update simple quote total displays (frontend style)
    const simpleDisplays = document.querySelectorAll('.quote-total-value');
    simpleDisplays.forEach(display => {
      display.textContent = this.formatCurrency(calculations.total);
    });

    // Update hidden inputs for form submission
    const hiddenInputs = document.querySelectorAll('input[name*="quote_total"], input[name*="quote"][type="hidden"]');
    hiddenInputs.forEach(input => {
      input.value = calculations.total.toFixed(2);
    });

    // Trigger custom event for other components
    document.dispatchEvent(new CustomEvent('quotemateCalculationUpdate', {
      detail: calculations
    }));
  }

  /**
   * Format number as currency
   */
  formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
  }

  /**
   * Manual recalculation trigger
   */
  recalculate() {
    return this.calculateTotals();
  }

  /**
   * Get calculation summary for debugging
   */
  getCalculationSummary() {
    const calculations = this.performCalculations();
   
    return calculations;
  }
}

// Auto-initialize when form data is available
if (typeof window !== 'undefined') {
  // Try to initialize immediately if form data exists
  function initializeCalculation() {
    if (window.quoteMateFormData) {
      window.quoteMateCalculation = new QuoteMateCalculation(window.quoteMateFormData);
      return true;
    }
    return false;
  }

  // Try to initialize immediately
  if (!initializeCalculation()) {
    // If not available, wait for DOM ready and try again
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeCalculation);
    } else {
      setTimeout(initializeCalculation, 100);
    }
  }

  // Also try when window loads (fallback)
  window.addEventListener('load', function() {
    if (!window.quoteMateCalculation) {
      initializeCalculation();
    }
  });
} 