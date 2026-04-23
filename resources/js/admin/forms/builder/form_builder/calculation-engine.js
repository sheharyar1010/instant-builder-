/**
 * QuoteMate Calculation Engine
 * Handles dynamic pricing calculations for form fields
 */

export class CalculationEngine {
  constructor(formBuilder) {
    this.formBuilder = formBuilder;
    this.calculationRules = [];
    this.init();
  }

  init() {
    this.attachEventListeners();
  }

  /**
   * Attach event listeners to form fields that affect calculations
   */
  attachEventListeners() {
    // Use event delegation for dynamic fields
    document.addEventListener('change', (e) => {
      if (this.isCalculationTriggerField(e.target)) {
        setTimeout(() => this.calculateTotals(), 100);
      }
    });

    document.addEventListener('input', (e) => {
      if (this.isCalculationTriggerField(e.target)) {
        // Debounce input events
        clearTimeout(this.calculationTimeout);
        this.calculationTimeout = setTimeout(() => this.calculateTotals(), 300);
      }
    });
  }

  /**
   * Check if a field should trigger calculation updates
   */
  isCalculationTriggerField(element) {
    if (!element || !element.closest) return false;
    
    const fieldElement = element.closest('[data-field-id]');
    if (!fieldElement) return false;

    const fieldId = fieldElement.dataset.fieldId;
    const fieldData = this.getFieldData(fieldId);
    
    if (!fieldData) return false;

    // Fields that trigger calculations
    const calculationFields = [
      'service',
      'service_options', 
      'quantity',
      'project_type',
      'select',
      'radio',
      'checkbox'
    ];

    return calculationFields.includes(fieldData.type);
  }

  /**
   * Get field data by field ID
   */
  getFieldData(fieldId) {
    if (!this.formBuilder?.formData?.fields) return null;
    return this.formBuilder.formData.fields.find(f => f.id === fieldId);
  }

  /**
   * Get current value of a field
   */
  getFieldValue(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!fieldElement) return null;

    const fieldData = this.getFieldData(fieldId);
    if (!fieldData) return null;

    switch (fieldData.type) {
      case 'service':
      case 'service_options':
        const serviceSelect = fieldElement.querySelector('select');
        return serviceSelect ? serviceSelect.value : '';

      case 'quantity':
        const quantityInput = fieldElement.querySelector('input[type="number"], input[type="text"]');
        const value = quantityInput ? quantityInput.value : '';
        return value === '' ? 0 : parseInt(value) || 0;

      case 'select':
      case 'project_type':
        const select = fieldElement.querySelector('select');
        return select ? select.value : '';

      case 'radio':
        const radioChecked = fieldElement.querySelector('input[type="radio"]:checked');
        return radioChecked ? radioChecked.value : '';

      case 'checkbox':
        const checkboxes = fieldElement.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);

      default:
        const input = fieldElement.querySelector('input, textarea, select');
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

    // Find all service fields and calculate their contributions
    const serviceFields = this.formBuilder.formData.fields.filter(f => 
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
    const quantityFields = this.formBuilder.formData.fields.filter(f => f.type === 'quantity');
    quantityFields.forEach(field => {
      const quantity = this.getFieldValue(field.id);
      if (quantity > 1) {
        // Apply quantity multiplier to the last service calculation
        const lastItem = items[items.length - 1];
        if (lastItem) {
          const additionalAmount = lastItem.price * (quantity - 1);
          subtotal += additionalAmount;
          items.push({
            fieldId: field.id,
            type: 'quantity_multiplier',
            quantity: quantity,
            basePrice: lastItem.price,
            total: additionalAmount
          });
        }
      }
    });

    // Calculate tax and discount
    const quoteTotalFields = this.formBuilder.formData.fields.filter(f => f.type === 'quote_total');
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
    const quantityFields = this.formBuilder.formData.fields.filter(f => f.type === 'quantity');
    
    if (quantityFields.length === 0) return 1;

    // If there's only one quantity field, use it
    if (quantityFields.length === 1) {
      const quantity = this.getFieldValue(quantityFields[0].id);
      return quantity || 1;
    }

    // For multiple quantity fields, try to find one that's conditionally shown for this service
    // or just use the first one that has a value
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
    const quoteTotalFields = this.formBuilder.formData.fields.filter(f => f.type === 'quote_total');
    
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

      // Update hidden input for form submission
      const hiddenInput = fieldElement.querySelector('input[type="hidden"]');
      if (hiddenInput) {
        hiddenInput.value = calculations.total.toFixed(2);
      }
    });

    // Also update simple quote total displays (frontend style)
    const simpleDisplays = document.querySelectorAll('.quote-total-value');
    simpleDisplays.forEach(display => {
      display.textContent = this.formatCurrency(calculations.total);
    });

    // Update hidden inputs for simple displays
    const hiddenInputs = document.querySelectorAll('[data-field-id*="quote"] input[type="hidden"]');
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
   * Get calculation summary for debugging
   */
  getCalculationSummary() {
    const calculations = this.performCalculations();

    return calculations;
  }

  /**
   * Manual recalculation trigger
   */
  recalculate() {
    return this.calculateTotals();
  }
} 