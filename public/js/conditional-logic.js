/**
 * QuoteMate Conditional Logic Engine
 * Handles show/hide logic for form fields based on user interactions
 */

class QuoteMateConditionalLogic {
  constructor(formData) {
    this.formData = formData;
    this.fieldsWithLogic = this.getFieldsWithConditionalLogic();
    this.init();
  }

  init() {
    // Attach event listeners to all form fields
    this.attachEventListeners();
    
    // Initial evaluation
    this.evaluateAllConditions();
  }

  getFieldsWithConditionalLogic() {
    if (!this.formData || !this.formData.fields) {
      return [];
    }

    return this.formData.fields.filter(field => 
      field.conditionalLogic && 
      field.conditionalLogic.enabled && 
      field.conditionalLogic.conditions &&
      field.conditionalLogic.conditions.length > 0
    );
  }

  attachEventListeners() {
    // Get all form inputs that could trigger conditional logic
    const form = document.querySelector('.quotemate-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const eventType = this.getEventType(input);
      
      input.addEventListener(eventType, () => {
        // Debounce to prevent excessive evaluations
        clearTimeout(this.evaluationTimeout);
        this.evaluationTimeout = setTimeout(() => {
          this.evaluateAllConditions();
        }, 100);
      });
    });
  }

  getEventType(input) {
    switch (input.type) {
      case 'checkbox':
      case 'radio':
        return 'change';
      case 'select-one':
      case 'select-multiple':
        return 'change';
      default:
        return 'input';
    }
  }

  evaluateAllConditions() {
    this.fieldsWithLogic.forEach(field => {
      const shouldShow = this.evaluateFieldConditions(field);
      const shouldDisplay = field.conditionalLogic.logicType === 'show' ? shouldShow : !shouldShow;
      
      this.toggleFieldVisibility(field.id, shouldDisplay);
    });
  }

  evaluateFieldConditions(field) {
    const conditions = field.conditionalLogic.conditions;
    const operator = field.conditionalLogic.operator; // 'all' (AND) or 'any' (OR)

    const results = conditions.map(condition => this.evaluateCondition(condition));

    if (operator === 'all') {
      // AND logic - all conditions must be true
      return results.every(result => result === true);
    } else {
      // OR logic - at least one condition must be true
      return results.some(result => result === true);
    }
  }

  evaluateCondition(condition) {
    if (!condition.field || !condition.operator) {
      return false;
    }

    const currentValue = this.getFieldValue(condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'is':
        return this.compareValues(currentValue, conditionValue, 'equals');
      case 'is_not':
        return !this.compareValues(currentValue, conditionValue, 'equals');
      case 'greater_than':
        return this.compareValues(currentValue, conditionValue, 'greater');
      case 'less_than':
        return this.compareValues(currentValue, conditionValue, 'less');
      case 'contains':
        return this.compareValues(currentValue, conditionValue, 'contains');
      case 'starts_with':
        return this.compareValues(currentValue, conditionValue, 'starts');
      case 'ends_with':
        return this.compareValues(currentValue, conditionValue, 'ends');
      case 'is_empty':
        return this.isEmpty(currentValue);
      case 'is_not_empty':
        return !this.isEmpty(currentValue);
      default:
        return false;
    }
  }

  getFieldValue(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!fieldElement) return '';

    // Get the field type from the field data to handle specific field types
    const fieldData = this.formData?.fields?.find(f => f.id === fieldId);
    const fieldType = fieldData?.type;

    // Handle different field types specifically
    switch (fieldType) {
      case 'service':
      case 'service_options':
        // Service fields use select dropdowns
        const serviceSelect = fieldElement.querySelector('select');
        return serviceSelect ? serviceSelect.value : '';

      case 'quantity':
        // Quantity fields use number inputs
        const quantityInput = fieldElement.querySelector('input[type="number"], input[type="text"]');
        return quantityInput ? quantityInput.value : '';

      case 'quote_total':
        // Quote total fields are usually display-only, but may have hidden inputs
        const totalInput = fieldElement.querySelector('input[type="hidden"], input[type="text"], .quote-total-value');
        if (totalInput) {
          return totalInput.value || totalInput.textContent || totalInput.innerText || '';
        }
        return '';

      case 'select':
      case 'project_type':
      case 'budget':
        // Standard select dropdowns
        const select = fieldElement.querySelector('select');
        return select ? select.value : '';

      case 'radio':
        // Radio button groups
        const radioChecked = fieldElement.querySelector('input[type="radio"]:checked');
        return radioChecked ? radioChecked.value : '';

      case 'checkbox':
        // Checkbox groups
        const checkboxes = fieldElement.querySelectorAll('input[type="checkbox"]:checked');
        return checkboxes.length > 0 ? Array.from(checkboxes).map(cb => cb.value).join(',') : '';

      case 'text':
      case 'name':
      case 'company':
      case 'email':
      case 'phone':
      case 'address':
      case 'textarea':
      case 'description':
      default:
        // Text-based inputs
        const input = fieldElement.querySelector('input[type="text"], input[type="email"], input[type="number"], input[type="tel"], textarea');
        return input ? input.value : '';
    }
  }

  compareValues(currentValue, conditionValue, type) {
    // Convert values to strings for comparison
    const current = String(currentValue).toLowerCase();
    const condition = String(conditionValue).toLowerCase();

    switch (type) {
      case 'equals':
        return current === condition;
      case 'greater':
        const currentNum = parseFloat(currentValue);
        const conditionNum = parseFloat(conditionValue);
        return !isNaN(currentNum) && !isNaN(conditionNum) && currentNum > conditionNum;
      case 'less':
        const currentNum2 = parseFloat(currentValue);
        const conditionNum2 = parseFloat(conditionValue);
        return !isNaN(currentNum2) && !isNaN(conditionNum2) && currentNum2 < conditionNum2;
      case 'contains':
        return current.includes(condition);
      case 'starts':
        return current.startsWith(condition);
      case 'ends':
        return current.endsWith(condition);
      default:
        return false;
    }
  }

  isEmpty(value) {
    return !value || String(value).trim() === '';
  }

  toggleFieldVisibility(fieldId, shouldShow) {
    const fieldWrapper = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!fieldWrapper) return;

    if (shouldShow) {
      fieldWrapper.style.display = '';
      fieldWrapper.removeAttribute('data-hidden-by-logic');
      this.enableFieldValidation(fieldWrapper);
    } else {
      fieldWrapper.style.display = 'none';
      fieldWrapper.setAttribute('data-hidden-by-logic', 'true');
      this.disableFieldValidation(fieldWrapper);
    }

    // Trigger custom event for other scripts to listen to
    const event = new CustomEvent('quotemateConditionalLogic', {
      detail: { fieldId, visible: shouldShow }
    });
    document.dispatchEvent(event);
  }

  enableFieldValidation(fieldWrapper) {
    const inputs = fieldWrapper.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.hasAttribute('data-original-required')) {
        input.required = true;
        input.removeAttribute('data-original-required');
      }
    });
  }

  disableFieldValidation(fieldWrapper) {
    const inputs = fieldWrapper.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.required) {
        input.setAttribute('data-original-required', 'true');
        input.required = false;
      }
      // Clear any validation errors
      input.setCustomValidity('');
    });
  }

  // Public method to manually trigger evaluation
  refresh() {
    this.evaluateAllConditions();
  }

  // Public method to update form data (useful for dynamic forms)
  updateFormData(newFormData) {
    this.formData = newFormData;
    this.fieldsWithLogic = this.getFieldsWithConditionalLogic();
    this.evaluateAllConditions();
  }
}

// Auto-initialize if form data is available in the global scope
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.quoteMateFormData !== 'undefined') {
    window.quoteMateConditionalLogic = new QuoteMateConditionalLogic(window.quoteMateFormData);
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuoteMateConditionalLogic;
}

// AMD support
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return QuoteMateConditionalLogic;
  });
} 