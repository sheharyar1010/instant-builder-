export class FieldProperties {
  static FORM_SUMMARY_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal' },
    { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar' },
    { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar' },
    { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
    { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
    { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
    { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso' },
    { code: 'COP', symbol: 'COL$', name: 'Colombian Peso' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
    { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  ];

  static getCurrencyByCode(code) {
    return FieldProperties.FORM_SUMMARY_CURRENCIES.find((c) => c.code === code) || null;
  }

  static resolveCurrencyCode(fieldData) {
    if (fieldData?.currencyCode) {
      return fieldData.currencyCode;
    }
    const symbol = fieldData?.currencySymbol || '$';
    const match = FieldProperties.FORM_SUMMARY_CURRENCIES.find((c) => c.symbol === symbol);
    return match?.code || 'USD';
  }

  constructor(formBuilder) {
    this.formBuilder = formBuilder;
  }

  showProperties(fieldElement) {
    const propertiesContent = document.querySelector(".quotemate-form-builder__properties-content");
    const advanceContent = document.querySelector(".quotemate-form-builder__advance-properties-content");
    const fieldId = fieldElement.dataset.fieldId;
    const fieldData = this.formBuilder.formData.fields.find((f) => f.id === fieldId);
    const fieldType = fieldElement.dataset.fieldType || fieldData?.type;

    // General tab content
    const propertiesHtml = this.generatePropertiesHtml(fieldType, fieldId);
    propertiesContent.innerHTML = propertiesHtml;

    // Advance tab content (Conditional Logic + CSS Class)
    if (advanceContent) {
      advanceContent.innerHTML = this.generateAdvancePropertiesHtml(fieldType, fieldData, fieldId);
    }

    // Style tab content
    const styleContent = document.querySelector(".quotemate-form-builder__style-properties-content");
    if (styleContent) {
      styleContent.innerHTML = this.generateStylePropertiesHtml(fieldType, fieldData, fieldId);
    }
    
    // Activate field settings tab
    const fieldSettingsTab = document.querySelector('.quotemate-form-builder__tab[data-tab="field-settings"]');
    if (fieldSettingsTab) {
      // Remove active class from all tabs
      document.querySelectorAll('.quotemate-form-builder__tab').forEach(tab => {
        tab.classList.remove('active');
      });
      
      // Add active class to field settings tab
      fieldSettingsTab.classList.add('active');
      
      // Hide all tab content
      document.querySelectorAll('.quotemate-form-builder__tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Show field settings content
      const fieldSettingsContent = document.getElementById('field-settings-content');
      if (fieldSettingsContent) {
        fieldSettingsContent.classList.add('active');
      }
    }

    // Attach event listeners to the properties
    this.attachPropertyEventListeners();
  }

  generatePropertiesHtml(fieldType, fieldId) {
    const fieldData = this.formBuilder.formData.fields.find(
      (f) => f.id === fieldId
    );

    const fieldTypeLabel = this.formBuilder.getFieldLabel ? this.formBuilder.getFieldLabel(fieldType) : fieldType.replace(/_/g, " ");
    const fieldTypeTitle = `${fieldTypeLabel} (ID #${(fieldId || "").replace("field_", "")})`;

    // Base properties common to all fields
    let baseHtml = `
      <div class="quotemate-form-properties">
        <div class="quotemate-form-properties__field-type-title">${fieldTypeTitle}</div>
        <div class="quotemate-form-properties__section">
          <label class="quotemate-form-properties__label">Label <span class="quotemate-form-properties__label-icon" title="Field label shown to users">?</span></label>
          <input type="text" class="quotemate-form-field__input" value="${
            fieldData
              ? fieldData.label
              : fieldTypeLabel
          }" placeholder="${fieldTypeLabel}" data-property="label" data-field-id="${fieldId}">
        </div>
    `;

    // Only show description for non-structural fields
    if (!['page_break', 'section_break', 'divider'].includes(fieldType)) {
      baseHtml += `
        <div class="quotemate-form-properties__section">
          <label class="quotemate-form-properties__label">Description <span class="quotemate-form-properties__label-icon" title="Optional helper text">?</span></label>
          <textarea class="quotemate-form-field__input" rows="3" placeholder="Add field description" data-property="description" data-field-id="${fieldId}">${
        fieldData && fieldData.description ? fieldData.description : ""
      }</textarea>
        </div>
      `;
    }

    // Only show required toggle for input fields
    if (!['page_break', 'section_break', 'quote_total', 'form_summary', 'html', 'divider'].includes(fieldType)) {
      const isRequired = fieldData && fieldData.required;
      baseHtml += `
        <div class="quotemate-form-properties__section quotemate-form-properties__section--toggle">
          <label class="quotemate-form-properties__checkbox">
            <span class="quotemate-form-properties__checkbox-label">Required <span class="quotemate-form-properties__label-icon" title="Make this field required">?</span></span>
            <input type="checkbox" class="quotemate-form-properties__toggle-input" ${
              isRequired ? "checked" : ""
            } data-property="required" data-field-id="${fieldId}">
            <span class="quotemate-form-properties__toggle"></span>
          </label>
        </div>
      `;
    }

    // Field type specific properties
    baseHtml += this.generateTypeSpecificProperties(
      fieldType,
      fieldData,
      fieldId
    );

    baseHtml += `</div>`;
    return baseHtml;
  }

  generateAdvancePropertiesHtml(fieldType, fieldData, fieldId) {
    let advanceHtml = '<div class="quotemate-form-properties quotemate-form-properties--advance">';

    if (['page_break', 'section_break', 'divider'].includes(fieldType)) {
      advanceHtml += '<p class="quotemate-form-builder__advance-placeholder">No advanced options for this field type.</p>';
      advanceHtml += '</div>';
      return advanceHtml;
    }

    // Field-type-specific advanced settings
    advanceHtml += this.generateFieldTypeAdvanceSettings(fieldType, fieldData, fieldId);

    // Conditional Logic
    advanceHtml += this.generateConditionalLogicSection(fieldData, fieldId);

    // CSS Classes - for all non-structural fields
    advanceHtml += this.advanceSectionInput(
      'CSS Classes',
      'Custom CSS class(es) for this field',
      fieldData?.cssClass || '',
      'cssClass',
      fieldId,
      'custom-class'
    );

    // Hide Label - for fields with labels (not in field-type block: choice, file, service)
    const fieldsWithHideLabelInBlock = ['text', 'name', 'company', 'email', 'phone', 'address', 'city', 'state_province', 'zip_postal', 'project_title', 'project_location', 'project_description', 'textarea', 'quote_notes', 'quantity', 'area_size', 'start_date'];
    if (!['quote_total', 'form_summary', 'html'].includes(fieldType) && !fieldsWithHideLabelInBlock.includes(fieldType)) {
      advanceHtml += this.advanceSectionToggle(
        'Hide Label',
        'Hide the field label from display',
        fieldData?.hideLabel || false,
        'hideLabel',
        fieldId
      );
    }

    advanceHtml += '</div>';
    return advanceHtml;
  }

  advanceSectionInput(label, title, value, property, fieldId, placeholder = '') {
    return `
        <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">${label} <span class="quotemate-form-properties__label-icon" title="${title}">?</span></label>
        <input type="text" class="quotemate-form-field__input" value="${value || ''}" placeholder="${placeholder}" data-property="${property}" data-field-id="${fieldId}">
        </div>
      `;
    }

  /**
   * Color field: label + swatch (opens color picker) + hex input. Use for all color options.
   */
  advanceSectionColor(label, title, value, property, fieldId, placeholder = '#ffffff') {
    const hex = (value && /^#[0-9A-Fa-f]{3,8}$/.test(value)) ? value : (placeholder || '#ffffff');
    return `
      <div class="quotemate-form-properties__section quotemate-color-field">
        <label class="quotemate-form-properties__label">${label} <span class="quotemate-form-properties__label-icon" title="${title}">?</span></label>
        <div class="quotemate-color-field__row">
          <button type="button" class="quotemate-color-swatch" data-property="${property}" data-field-id="${fieldId}" title="Open color picker" style="background-color: ${hex}; border: 1px solid rgba(0,0,0,0.2);"></button>
          <input type="text" class="quotemate-form-field__input quotemate-color-input" value="${value || ''}" placeholder="${placeholder}" data-property="${property}" data-field-id="${fieldId}" maxlength="9">
        </div>
      </div>
    `;
  }

  advanceSectionToggle(label, title, checked, property, fieldId) {
    return `
      <div class="quotemate-form-properties__section quotemate-form-properties__section--toggle">
        <label class="quotemate-form-properties__checkbox">
          <span class="quotemate-form-properties__checkbox-label">${label} <span class="quotemate-form-properties__label-icon" title="${title}">?</span></span>
          <input type="checkbox" class="quotemate-form-properties__toggle-input" ${checked ? 'checked' : ''} data-property="${property}" data-field-id="${fieldId}">
          <span class="quotemate-form-properties__toggle"></span>
        </label>
      </div>
    `;
  }

  advanceSectionSelect(label, title, value, property, fieldId, options) {
    const opts = options.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('');
    return `
      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">${label} <span class="quotemate-form-properties__label-icon" title="${title}">?</span></label>
        <select class="quotemate-form-field__input quotemate-form-field__select" data-property="${property}" data-field-id="${fieldId}">
          ${opts}
        </select>
      </div>
    `;
  }

  /**
   * Typography section for label (and optionally input) – font family, size, weight, transform, style, decoration, line/letter/word spacing.
   */
  generateTypographySection(fieldData, fieldId, hasInputStyling, fieldType, controlLabels) {
    const fontFamilies = [
      { value: '', label: 'Default' },
      { value: 'inherit', label: 'Inherit' },
      { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
      { value: 'Georgia, serif', label: 'Georgia' },
      { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
      { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
      { value: 'system-ui, -apple-system, sans-serif', label: 'System UI' },
      { value: '"Open Sans", sans-serif', label: 'Open Sans' },
      { value: 'Roboto, sans-serif', label: 'Roboto' },
      { value: 'Lato, sans-serif', label: 'Lato' },
      { value: 'sans-serif', label: 'Sans Serif' },
      { value: 'serif', label: 'Serif' },
      { value: 'monospace', label: 'Monospace' }
    ];
    const weights = [
      { value: '', label: 'Default' },
      { value: '300', label: '300 (Light)' },
      { value: '400', label: '400 (Normal)' },
      { value: '500', label: '500 (Medium)' },
      { value: '600', label: '600 (Semi Bold)' },
      { value: '700', label: '700 (Bold)' }
    ];
    const transforms = [
      { value: '', label: 'Default' },
      { value: 'none', label: 'None' },
      { value: 'uppercase', label: 'Uppercase' },
      { value: 'lowercase', label: 'Lowercase' },
      { value: 'capitalize', label: 'Capitalize' }
    ];
    const fontStyles = [
      { value: '', label: 'Default' },
      { value: 'normal', label: 'Normal' },
      { value: 'italic', label: 'Italic' }
    ];
    const decorations = [
      { value: '', label: 'Default' },
      { value: 'none', label: 'None' },
      { value: 'underline', label: 'Underline' },
      { value: 'line-through', label: 'Line-through' }
    ];
    const familyValue = fieldData?.styleFontFamily ?? '';
    const customFamily = familyValue && !fontFamilies.some(o => o.value === familyValue);
    if (customFamily) fontFamilies.push({ value: familyValue, label: familyValue });

    // Label Typography block (collapsible)
    const labelBlockHtml = '<div class="quotemate-style-typography-block">' +
      this.advanceSectionSelect('Family', 'Font family for the label', fieldData?.styleFontFamily || '', 'styleFontFamily', fieldId, fontFamilies) +
      this.advanceSectionInput('Size', 'Font size (e.g. 14px, 1rem)', fieldData?.styleFontSize || fieldData?.styleLabelSize || '', 'styleFontSize', fieldId, '14px') +
      this.advanceSectionSelect('Weight', 'Font weight', fieldData?.styleFontWeight || '', 'styleFontWeight', fieldId, weights) +
      this.advanceSectionSelect('Transform', 'Text transform', fieldData?.styleTextTransform || '', 'styleTextTransform', fieldId, transforms) +
      this.advanceSectionSelect('Style', 'Font style', fieldData?.styleFontStyle || '', 'styleFontStyle', fieldId, fontStyles) +
      this.advanceSectionSelect('Decoration', 'Text decoration', fieldData?.styleTextDecoration || '', 'styleTextDecoration', fieldId, decorations) +
      this.advanceSectionInput('Line Height', 'Line height (e.g. 1.5, 24px)', fieldData?.styleLineHeight || '', 'styleLineHeight', fieldId, '1.5') +
      this.advanceSectionInput('Letter Spacing', 'Letter spacing (e.g. 0.5px, 0.02em)', fieldData?.styleLetterSpacing || '', 'styleLetterSpacing', fieldId, '') +
      this.advanceSectionInput('Word Spacing', 'Word spacing (e.g. 2px)', fieldData?.styleWordSpacing || '', 'styleWordSpacing', fieldId, '') +
      '</div>';
    let html = this.wrapCollapsibleCategory('Label Typography', labelBlockHtml);

    // Control Typography (Dropdown / Input / Option text) – collapsible
    if (hasInputStyling) {
      const labels = controlLabels || this.getControlStyleLabels(fieldType || 'text');
      const controlBlockHtml = '<div class="quotemate-style-typography-block quotemate-style-typography-block--input">' +
        (() => {
          const inputFamilies = [...fontFamilies];
          const inputFamilyValue = fieldData?.styleInputFontFamily ?? '';
          if (inputFamilyValue && !inputFamilies.some(o => o.value === inputFamilyValue)) inputFamilies.push({ value: inputFamilyValue, label: inputFamilyValue });
          return this.advanceSectionSelect(labels.fontFamilyLabel, labels.fontFamilyTitle, fieldData?.styleInputFontFamily || '', 'styleInputFontFamily', fieldId, inputFamilies) +
            this.advanceSectionInput(labels.fontSizeLabel, labels.fontSizeTitle, fieldData?.styleInputFontSize || '', 'styleInputFontSize', fieldId, '') +
            this.advanceSectionSelect(labels.fontWeightLabel, labels.fontWeightTitle, fieldData?.styleInputFontWeight || '', 'styleInputFontWeight', fieldId, weights);
        })() +
        '</div>';
      html += this.wrapCollapsibleCategory(labels.sectionTitle, controlBlockHtml);
    }
    return html;
  }

  generateFieldTypeAdvanceSettings(fieldType, fieldData, fieldId) {
    let html = '';

    // Text-like fields: text, name, company, email, phone, address
    const textLikeFields = ['text', 'name', 'company', 'email', 'phone', 'address', 'city', 'state_province', 'zip_postal', 'project_title', 'project_location'];
    if (textLikeFields.includes(fieldType)) {
      html += this.advanceSectionSelect('Field Size', 'Width of the input', fieldData?.fieldSize || 'medium', 'fieldSize', fieldId, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      html += this.advanceSectionInput('Placeholder Text', 'Hint text shown when field is empty', fieldData?.placeholder || '', 'placeholder', fieldId, 'Enter placeholder...');
      html += this.advanceSectionInput('Default Value', 'Pre-filled value for the field', fieldData?.defaultValue || '', 'defaultValue', fieldId, '');
      if (fieldType === 'text' || fieldType === 'phone') {
        html += this.advanceSectionInput('Input Mask', 'Format mask (e.g. (999) 999-9999 for phone)', fieldData?.inputMask || '', 'inputMask', fieldId, '');
        html += '<p class="quotemate-form-properties__hint"><a href="https://imask.js.org/guide.html" target="_blank" rel="noopener">See Examples &amp; Docs</a></p>';
      }
      html += this.advanceSectionToggle('Hide Label', 'Hide the field label from display', fieldData?.hideLabel || false, 'hideLabel', fieldId);
      html += this.advanceSectionToggle('Read-Only', 'Make field non-editable', fieldData?.readOnly || false, 'readOnly', fieldId);
      return html;
    }

    // Textarea, quote_notes, project_description
    if (fieldType === 'textarea' || fieldType === 'quote_notes' || fieldType === 'project_description') {
      html += this.advanceSectionSelect('Field Size', 'Width of the textarea', fieldData?.fieldSize || 'medium', 'fieldSize', fieldId, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      html += this.advanceSectionInput('Placeholder Text', 'Hint text shown when field is empty', fieldData?.placeholder || '', 'placeholder', fieldId, 'Enter placeholder...');
      html += this.advanceSectionInput('Default Value', 'Pre-filled value', fieldData?.defaultValue || '', 'defaultValue', fieldId, '');
      html += this.advanceSectionToggle('Hide Label', 'Hide the field label from display', fieldData?.hideLabel || false, 'hideLabel', fieldId);
      html += this.advanceSectionToggle('Read-Only', 'Make field non-editable', fieldData?.readOnly || false, 'readOnly', fieldId);
      return html;
    }

    // Select, radio, checkbox, project_type + dropdown types
    const choiceFields = ['select', 'radio', 'checkbox', 'project_type', 'project_category', 'service_type', 'completion_timeline', 'budget_range', 'unit_type', 'material_type', 'urgency_level', 'additional_options', 'addons'];
    if (choiceFields.includes(fieldType)) {
      html += this.advanceSectionSelect('Field Size', 'Width of the options', fieldData?.fieldSize || 'medium', 'fieldSize', fieldId, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      const defaultLabel = fieldType === 'select' ? 'Default Selected Option' : fieldType === 'radio' ? 'Default Selected Choice' : 'Default Checked Options (comma-separated)';
      html += this.advanceSectionInput(defaultLabel, 'Pre-selected value(s)', fieldData?.defaultValue || '', 'defaultValue', fieldId, '');
      return html;
    }

    // Start date
    if (fieldType === 'start_date') {
      html += this.advanceSectionSelect('Field Size', 'Width of the input', fieldData?.fieldSize || 'medium', 'fieldSize', fieldId, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      html += this.advanceSectionInput('Default Value', 'Pre-filled date (YYYY-MM-DD)', fieldData?.defaultValue || '', 'defaultValue', fieldId, '');
      html += this.advanceSectionToggle('Hide Label', 'Hide the field label from display', fieldData?.hideLabel || false, 'hideLabel', fieldId);
      html += this.advanceSectionToggle('Read-Only', 'Make field non-editable', fieldData?.readOnly || false, 'readOnly', fieldId);
      return html;
    }

    // Quantity
    if (fieldType === 'quantity') {
      html += this.advanceSectionSelect('Field Size', 'Width of the input', fieldData?.fieldSize || 'medium', 'fieldSize', fieldId, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      html += this.advanceSectionInput('Default Value', 'Starting value', fieldData?.defaultValue || '1', 'defaultValue', fieldId, '1');
      html += this.advanceSectionInput('Minimum Value', 'Minimum allowed value', fieldData?.minValue ?? '', 'minValue', fieldId, '');
      html += this.advanceSectionInput('Maximum Value', 'Maximum allowed value', fieldData?.maxValue ?? '', 'maxValue', fieldId, '');
      html += this.advanceSectionToggle('Hide Label', 'Hide the field label from display', fieldData?.hideLabel || false, 'hideLabel', fieldId);
      html += this.advanceSectionToggle('Read-Only', 'Make field non-editable', fieldData?.readOnly || false, 'readOnly', fieldId);
      return html;
    }

    // File, attach_files
    if (fieldType === 'file' || fieldType === 'attach_files') {
      html += this.advanceSectionInput('Accepted File Types', 'e.g. .pdf,.jpg,.png or image/*', fieldData?.acceptTypes || '', 'acceptTypes', fieldId, '.pdf,.jpg,.png');
      html += this.advanceSectionInput('Max File Size (MB)', 'Maximum upload size in megabytes', fieldData?.maxFileSize || '5', 'maxFileSize', fieldId, '5');
      return html;
    }

    // Service, service_options
    if (['service', 'service_options'].includes(fieldType)) {
      html += this.advanceSectionSelect('Field Size', 'Width of the dropdown', fieldData?.fieldSize || 'medium', 'fieldSize', fieldId, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' }
      ]);
      return html;
    }

    // quote_total, html - only conditional + CSS (handled above)
    return html;
  }

  /**
   * Wrap HTML in a collapsible category (click header to expand/collapse). Starts expanded.
   */
  wrapCollapsibleCategory(title, contentHtml) {
    const chevron = '<svg class="quotemate-style-category__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    return `
      <div class="quotemate-style-category">
        <button type="button" class="quotemate-style-category__header" aria-expanded="true">
          <span class="quotemate-style-category__title">${title}</span>
          ${chevron}
        </button>
        <div class="quotemate-style-category__content">${contentHtml}</div>
      </div>
    `;
  }

  /**
   * Build a Layout block (Margin or Padding) with unit selector, link toggle, and 4 inputs (Top, Right, Bottom, Left).
   */
  generateStyleLayoutBlock(kind, fieldData, fieldId) {
    const label = kind === 'margin' ? 'Margin' : 'Padding';
    const prefix = kind === 'margin' ? 'styleMargin' : 'stylePadding';
    const linked = fieldData?.[prefix + 'Linked'] === true || fieldData?.[prefix + 'Linked'] === 'true';
    const unit = fieldData?.[prefix + 'Unit'] || 'px';
    const sides = ['Top', 'Right', 'Bottom', 'Left'];
    const unitOptions = [
      { value: 'px', label: 'px' },
      { value: '%', label: '%' },
      { value: 'em', label: 'em' },
      { value: 'rem', label: 'rem' }
    ];
    const blockClass = `quotemate-style-layout-block quotemate-style-layout-block--${kind}`;
    const linkedClass = linked ? ' quotemate-style-layout-block--linked' : '';

    let block = `
      <div class="${blockClass}${linkedClass}" data-style-layout="${kind}">
        <div class="quotemate-style-layout-block__header">
          <label class="quotemate-form-properties__label">${label}</label>
          <div class="quotemate-style-layout-block__controls">
            <select class="quotemate-style-layout-unit" data-property="${prefix}Unit" data-field-id="${fieldId}" title="Unit">
              ${unitOptions.map(o => `<option value="${o.value}" ${unit === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
            <button type="button" class="quotemate-style-layout-link" data-style-link-toggle="${kind}" data-field-id="${fieldId}" title="${linked ? 'Unlink sides' : 'Link sides'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <input type="hidden" data-property="${prefix}Linked" data-field-id="${fieldId}" value="${linked ? 'true' : 'false'}">
          </div>
        </div>
        <div class="quotemate-style-layout-block__grid">
          ${sides.map(side => {
            const prop = prefix + side;
            const val = fieldData?.[prop] ?? '';
            const placeholder = side === 'Top' ? '0' : '';
            return `
              <div class="quotemate-style-layout-block__cell">
                <label class="quotemate-style-layout-block__cell-label">${side}</label>
                <input type="text" class="quotemate-form-field__input quotemate-style-layout-input" inputmode="decimal"
                  data-property="${prop}" data-field-id="${fieldId}" value="${val}" placeholder="${placeholder}">
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
    return block;
  }

  /**
   * Build Border radius block: unit, link toggle, 4 corners (Top Left, Top Right, Bottom Right, Bottom Left).
   */
  generateStyleBorderRadiusBlock(fieldData, fieldId) {
    const prefix = 'styleBorderRadius';
    const linked = fieldData?.[prefix + 'Linked'] === true || fieldData?.[prefix + 'Linked'] === 'true';
    const unit = fieldData?.[prefix + 'Unit'] || 'px';
    const corners = [
      { key: 'TopLeft', label: 'Top Left' },
      { key: 'TopRight', label: 'Top Right' },
      { key: 'BottomRight', label: 'Bottom Right' },
      { key: 'BottomLeft', label: 'Bottom Left' }
    ];
    const unitOptions = [
      { value: 'px', label: 'px' },
      { value: '%', label: '%' },
      { value: 'em', label: 'em' },
      { value: 'rem', label: 'rem' }
    ];
    const blockClass = 'quotemate-style-layout-block quotemate-style-layout-block--borderRadius' + (linked ? ' quotemate-style-layout-block--linked' : '');

    let block = `
      <div class="${blockClass}" data-style-layout="borderRadius">
        <div class="quotemate-style-layout-block__header">
          <label class="quotemate-form-properties__label">Border radius</label>
          <div class="quotemate-style-layout-block__controls">
            <select class="quotemate-style-layout-unit" data-property="${prefix}Unit" data-field-id="${fieldId}" title="Unit">
              ${unitOptions.map(o => `<option value="${o.value}" ${unit === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
            <button type="button" class="quotemate-style-layout-link" data-style-link-toggle="borderRadius" data-field-id="${fieldId}" title="${linked ? 'Unlink corners' : 'Link corners'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <input type="hidden" data-property="${prefix}Linked" data-field-id="${fieldId}" value="${linked ? 'true' : 'false'}">
          </div>
        </div>
        <div class="quotemate-style-layout-block__grid">
          ${corners.map(({ key, label }) => {
            const prop = prefix + key;
            const val = fieldData?.[prop] ?? fieldData?.styleBorderRadius ?? '';
            const placeholder = key === 'TopLeft' ? '0' : '';
            return `
              <div class="quotemate-style-layout-block__cell">
                <label class="quotemate-style-layout-block__cell-label">${label}</label>
                <input type="text" class="quotemate-form-field__input quotemate-style-layout-input" inputmode="decimal"
                  data-property="${prop}" data-field-id="${fieldId}" value="${val}" placeholder="${placeholder}">
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
    return block;
  }

  /**
   * Labels for the control (field) part of the Style tab, based on field type.
   * Used so "Input Typography" becomes "Dropdown Typography" for select, "Option text Typography" for radio/checkbox, etc.
   */
  getControlStyleLabels(fieldType) {
    const dropdownTypes = ['select', 'project_type', 'project_category', 'service_type', 'completion_timeline', 'budget_range', 'unit_type', 'material_type', 'urgency_level', 'service', 'service_options'];
    const optionListTypes = ['radio', 'checkbox', 'additional_options', 'addons'];
    if (dropdownTypes.includes(fieldType)) {
      return {
        sectionTitle: 'Dropdown Typography',
        textColorLabel: 'Dropdown text color',
        textColorTitle: 'Text color for the dropdown',
        backgroundLabel: 'Dropdown background',
        backgroundTitle: 'Background color for the dropdown',
        fontFamilyLabel: 'Dropdown font family',
        fontFamilyTitle: 'Font family for dropdown text',
        fontSizeLabel: 'Dropdown font size',
        fontSizeTitle: 'Font size for dropdown text (e.g. 14px)',
        fontWeightLabel: 'Dropdown font weight',
        fontWeightTitle: 'Font weight for dropdown text',
        paddingLabel: 'Dropdown padding',
        paddingTitle: 'Padding inside the dropdown (e.g. 10px)',
      };
    }
    if (optionListTypes.includes(fieldType)) {
      return {
        sectionTitle: 'Option text Typography',
        textColorLabel: 'Option text color',
        textColorTitle: 'Text color for each option label',
        backgroundLabel: 'Option background',
        backgroundTitle: 'Background for option area (if applicable)',
        fontFamilyLabel: 'Option text font family',
        fontFamilyTitle: 'Font family for option labels',
        fontSizeLabel: 'Option text font size',
        fontSizeTitle: 'Font size for option labels (e.g. 14px)',
        fontWeightLabel: 'Option text font weight',
        fontWeightTitle: 'Font weight for option labels',
        paddingLabel: 'Option padding',
        paddingTitle: 'Padding around options (e.g. 10px)',
      };
    }
    return {
      sectionTitle: 'Input Typography',
      textColorLabel: 'Input text color',
      textColorTitle: 'Text color for the input',
      backgroundLabel: 'Input background',
      backgroundTitle: 'Background color for the input',
      fontFamilyLabel: 'Input font family',
      fontFamilyTitle: 'Font family for input text',
      fontSizeLabel: 'Input font size',
      fontSizeTitle: 'Font size inside the input (e.g. 14px)',
      fontWeightLabel: 'Input font weight',
      fontWeightTitle: 'Font weight for input text',
      paddingLabel: 'Input padding',
      paddingTitle: 'Padding inside the input (e.g. 10px)',
    };
  }

  generateStylePropertiesHtml(fieldType, fieldData, fieldId) {
    // No style options for structural fields
    if (['page_break', 'section_break', 'divider', 'quote_total', 'form_summary'].includes(fieldType)) {
      return '<div class="quotemate-form-properties quotemate-form-properties--style"><p class="quotemate-form-builder__advance-placeholder">No style options for this field type.</p></div>';
    }

    const controlLabels = this.getControlStyleLabels(fieldType);

    // Panel 1: Layout (Margin + Padding)
    const layoutContent = '<div class="quotemate-form-properties__section quotemate-style-layout-section">' +
      this.generateStyleLayoutBlock('margin', fieldData, fieldId) +
      this.generateStyleLayoutBlock('padding', fieldData, fieldId) +
      '</div>';
    const layoutPanelHtml = this.wrapCollapsibleCategory('Layout', layoutContent);

    // Panel 2: Typography (Label + Control Typography)
    const typographyPanelHtml = this.generateTypographySection(fieldData, fieldId, true, fieldType, controlLabels);

    // Panel 3: Appearance (colors, borders, border radius 4-way, padding) – no Label Font Size (use Typography tab)
    const appearancePanelHtml =
      this.advanceSectionColor('Label Color', 'Hex color for label', fieldData?.styleLabelColor || '', 'styleLabelColor', fieldId, '#ffffff') +
      this.advanceSectionColor(controlLabels.textColorLabel, controlLabels.textColorTitle, fieldData?.styleInputColor || '', 'styleInputColor', fieldId, '#ffffff') +
      this.advanceSectionColor(controlLabels.backgroundLabel, controlLabels.backgroundTitle, fieldData?.styleInputBg || '', 'styleInputBg', fieldId, '#ffffff') +
      this.advanceSectionInput('Border Width', 'Border width (e.g. 1px)', fieldData?.styleBorderWidth || '', 'styleBorderWidth', fieldId, '') +
      this.advanceSectionColor('Border Color', 'Hex color for border', fieldData?.styleBorderColor || '', 'styleBorderColor', fieldId, '#ffffff') +
      '<div class="quotemate-form-properties__section">' + this.generateStyleBorderRadiusBlock(fieldData, fieldId) + '</div>' +
      this.advanceSectionInput(controlLabels.paddingLabel, controlLabels.paddingTitle, fieldData?.stylePadding || '', 'stylePadding', fieldId, '');

    const html = '<div class="quotemate-form-properties quotemate-form-properties--style">' +
      '<div class="quotemate-style-sub-tabs">' +
      '<button type="button" class="quotemate-style-sub-tab active" data-style-sub-tab="layout">Layout</button>' +
      '<button type="button" class="quotemate-style-sub-tab" data-style-sub-tab="typography">Typography</button>' +
      '<button type="button" class="quotemate-style-sub-tab" data-style-sub-tab="appearance">Appearance</button>' +
      '</div>' +
      '<div class="quotemate-style-sub-panels">' +
      '<div class="quotemate-style-sub-panel active" data-style-panel="layout">' + layoutPanelHtml + '</div>' +
      '<div class="quotemate-style-sub-panel" data-style-panel="typography">' + typographyPanelHtml + '</div>' +
      '<div class="quotemate-style-sub-panel" data-style-panel="appearance">' + appearancePanelHtml + '</div>' +
      '</div>' +
      '</div>';
    return html;
  }

  generateTypeSpecificProperties(fieldType, fieldData, fieldId) {
    let html = "";

    switch (fieldType) {
      case "select":
      case "radio":
      case "checkbox":
      case "project_type":
      case "project_category":
      case "service_type":
      case "completion_timeline":
      case "budget_range":
      case "unit_type":
      case "material_type":
      case "urgency_level":
      case "additional_options":
      case "addons":
        const options = fieldData && fieldData.options ? fieldData.options : [];
        const choiceLabel = ['project_type'].includes(fieldType) ? 'Project Type Options' : ['project_category', 'service_type', 'completion_timeline', 'budget_range'].includes(fieldType) ? 'Options' : 'Choices';
        const addLabel = ['project_type'].includes(fieldType) ? 'Project Type' : 'Choice';
        html = `
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">${choiceLabel}</label>
            <div class="quotemate-form-properties__choices">
              ${options
                .map(
                  (option, index) => `
                <div class="quotemate-form-properties__choice">
                  <input type="text" class="quotemate-form-field__input" value="${option}" data-choice-index="${index}" data-field-id="${fieldId}">
                  <button type="button" class="quotemate-form-properties__remove-choice" data-remove-choice="${index}" data-field-id="${fieldId}">×</button>
                </div>
              `
                )
                .join("")}
            </div>
            <button type="button" class="quotemate-btn quotemate-btn--secondary" data-add-choice data-field-id="${fieldId}">Add ${addLabel}</button>
          </div>
        `;
        break;

      case "service":
      case "service_options": {
        const services =
          fieldData && fieldData.services ? fieldData.services : [];
        html = `
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">Service Configuration</label>
            
            ${services.length > 0 ? `
              <div class="quotemate-form-properties__service-options">
                ${services
                  .map(
                    (service, index) => `
                  <div class="quotemate-form-properties__service-option">
                    <input type="text" class="quotemate-form-field__input" value="${service.name}" placeholder="Service name" data-service-name="${index}" data-field-id="${fieldId}">
                    <input type="number" class="quotemate-form-field__input" value="${service.price}" placeholder="Price" min="0" step="0.01" data-service-price="${index}" data-field-id="${fieldId}">
                    <button type="button" class="quotemate-form-properties__remove-choice" data-remove-service="${index}" data-field-id="${fieldId}">×</button>
                  </div>
                `
                  )
                  .join("")}
              </div>
            ` : `
              <div class="empty-services">
                <p>No services configured yet.</p>
              </div>
            `}
            
            
            <button type="button" class="configure-enhanced-services-btn" data-configure-enhanced-services data-field-id="${fieldId}">
              Configure Enhanced Services
            </button>
            
            ${services.length > 0 ? `
              <button type="button" class="quotemate-btn quotemate-btn--secondary" data-add-service data-field-id="${fieldId}" style="margin-top: 8px;">Add Simple Service</button>
            ` : ''}
          </div>
        `;
        break;
      }

      case "text":
      case "textarea":
      case "quantity":
        // Placeholder, Default Value, etc. are in Advanced tab
        break;

      case "quote_total":
        html = `
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">Total Display Settings</label>
            
            <div class="quotemate-form-properties__subsection">
              <label class="quotemate-form-properties__checkbox">
                <input type="checkbox" ${
                  fieldData && fieldData.show_tax ? "checked" : ""
                } data-property="show_tax" data-field-id="${fieldId}">
                Apply tax on quote total
              </label>
            </div>
            
            ${
              fieldData && fieldData.show_tax
                ? `
                <div class="quotemate-form-properties__subsection">
                  <label class="quotemate-form-properties__label">Tax Rate (%)</label>
                  <input type="number" class="quotemate-form-field__input" 
                         value="${fieldData.tax_rate || 0}" min="0" max="100" step="0.1"
                         placeholder="e.g. 15"
                         data-property="tax_rate" data-field-id="${fieldId}">
                  <p class="quotemate-form-properties__hint">Percentage added on top of the service subtotal.</p>
                </div>
              `
                : ""
            }
            
            <div class="quotemate-form-properties__subsection">
              <label class="quotemate-form-properties__checkbox">
                <input type="checkbox" ${
                  fieldData && fieldData.show_discount ? "checked" : ""
                } data-property="show_discount" data-field-id="${fieldId}">
                Show Discount Field
              </label>
            </div>
          </div>
        `;
        break;

      case "form_summary":
        html = this.generateFormSummaryPropertiesHtml(fieldData, fieldId);
        break;

      case "page_break":
        html = `
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">Next Page Title <span class="quotemate-form-properties__label-icon" title="Title shown for the next page">?</span></label>
              <input type="text" class="quotemate-form-field__input" 
                   value="${fieldData && fieldData.page_title ? fieldData.page_title : "Next Page"}" 
                     data-property="page_title" data-field-id="${fieldId}">
            </div>
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">Next Page Description <span class="quotemate-form-properties__label-icon" title="Optional description for the next page">?</span></label>
            <textarea class="quotemate-form-field__input" rows="3" data-property="page_description" data-field-id="${fieldId}">${fieldData && fieldData.page_description ? fieldData.page_description : ""}</textarea>
          </div>
        `;
        break;

      case "section_break":
        html = `
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">Section Title <span class="quotemate-form-properties__label-icon" title="Title for this section">?</span></label>
              <input type="text" class="quotemate-form-field__input" 
                   value="${fieldData && fieldData.section_title ? fieldData.section_title : "Section Break"}" 
                     data-property="section_title" data-field-id="${fieldId}">
          </div>
        `;
        break;

      case "html":
        html = `
          <div class="quotemate-form-properties__section">
            <label class="quotemate-form-properties__label">HTML Content</label>
            <textarea class="quotemate-form-field__input" rows="6"
                      data-property="html_content" data-field-id="${fieldId}">${
          fieldData && fieldData.html_content ? fieldData.html_content : ""
        }</textarea>
            <p class="quotemate-form-properties__hint">Enter raw HTML content to be displayed</p>
          </div>
        `;
        break;
    }

    return html;
  }

  extractServicesFromEnhancedStructure(enhancedServiceStructure) {
    const services = [];
    
    const extractServices = (items, prefix = '') => {
      items.forEach(item => {
        if (item.type === 'service') {
          services.push({
            name: item.name,
            price: item.basePrice || '0.00'
          });
        } else if (item.type === 'category' && item.children && item.children.length > 0) {
          extractServices(item.children, prefix + item.name + ' > ');
        }
      });
    };
    
    extractServices(enhancedServiceStructure);
    return services;
  }

  generateConditionalLogicSection(fieldData, fieldId) {
    // Ensure we get the conditional logic data from the actual field data in formData
    const actualFieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    

    
    const conditions = actualFieldData && actualFieldData.conditionalLogic ? actualFieldData.conditionalLogic : {
      enabled: false,
      logicType: 'show',
      operator: 'all',
      conditions: []
    };

    const hasConditions = conditions.enabled && conditions.conditions && conditions.conditions.length > 0;
    const statusText = conditions.enabled ? 'Active' : 'Inactive';
    const statusClass = conditions.enabled ? 'active' : 'inactive';
    
    return `
      <div class="quotemate-form-properties__section">
        <div class="quotemate-conditional-logic-header">
          <label class="quotemate-form-properties__label">Conditional Logic</label>
          <div class="quotemate-conditional-status">
            <span class="quotemate-conditional-status-badge quotemate-conditional-status--${statusClass}">
              ${statusText}
            </span>
            <button type="button" class="quotemate-conditional-configure-btn" data-field-id="${fieldId}">
              Configure
            </button>
          </div>
        </div>
        ${hasConditions ? `
          <div class="quotemate-conditional-logic-preview">
            <small class="quotemate-conditional-preview-text">
              ${this.generateConditionPreview(conditions)}
            </small>
          </div>
        ` : ''}
      </div>
    `;
  }

  generateConditionalRulesHtml(conditions, fieldId, availableFields) {
    if (!conditions || conditions.length === 0) {
      return '<div class="quotemate-conditional-rule-placeholder">No rules defined. Click "Add Rule" to create one.</div>';
    }

    return conditions.map((condition, index) => `
      <div class="quotemate-conditional-rule" data-rule-index="${index}">
        <div class="quotemate-conditional-rule-controls">
          <select class="quotemate-conditional-field-select" data-rule-index="${index}" data-field-id="${fieldId}" data-rule-property="field">
            <option value="">Select a field</option>
            ${availableFields.map(field => `
              <option value="${field.id}" ${condition.field === field.id ? 'selected' : ''}>${field.label}</option>
            `).join('')}
          </select>

          <select class="quotemate-conditional-operator-select" data-rule-index="${index}" data-field-id="${fieldId}" data-rule-property="operator">
            <option value="is" ${condition.operator === 'is' ? 'selected' : ''}>is</option>
            <option value="is_not" ${condition.operator === 'is_not' ? 'selected' : ''}>is not</option>
            <option value="greater_than" ${condition.operator === 'greater_than' ? 'selected' : ''}>greater than</option>
            <option value="less_than" ${condition.operator === 'less_than' ? 'selected' : ''}>less than</option>
            <option value="contains" ${condition.operator === 'contains' ? 'selected' : ''}>contains</option>
            <option value="starts_with" ${condition.operator === 'starts_with' ? 'selected' : ''}>starts with</option>
            <option value="ends_with" ${condition.operator === 'ends_with' ? 'selected' : ''}>ends with</option>
            <option value="is_empty" ${condition.operator === 'is_empty' ? 'selected' : ''}>is empty</option>
            <option value="is_not_empty" ${condition.operator === 'is_not_empty' ? 'selected' : ''}>is not empty</option>
          </select>

          <div class="quotemate-conditional-value-container" style="display: ${['is_empty', 'is_not_empty'].includes(condition.operator) ? 'none' : 'block'}">
            ${this.generateConditionalValueInput(condition, index, fieldId, availableFields)}
          </div>

          <button type="button" class="quotemate-conditional-rule-remove" data-rule-index="${index}" data-field-id="${fieldId}">×</button>
        </div>
      </div>
    `).join('');
  }

  generateConditionalValueInput(condition, ruleIndex, fieldId, availableFields) {
    const sourceField = availableFields.find(f => f.id === condition.field);
    
    if (!sourceField) {
      return `<input type="text" class="quotemate-form-field__input quotemate-conditional-value-input" 
                     placeholder="Value" value="${condition.value || ''}" 
                     data-rule-index="${ruleIndex}" data-field-id="${fieldId}" data-rule-property="value">`;
    }

    // Handle fields with options (select, radio, checkbox)
    if (['select', 'radio', 'checkbox', 'project_type'].includes(sourceField.type) && sourceField.options && sourceField.options.length > 0) {
      return `
        <select class="quotemate-form-field__input quotemate-conditional-value-select" 
                data-rule-index="${ruleIndex}" data-field-id="${fieldId}" data-rule-property="value">
          <option value="">Select value</option>
          ${sourceField.options.map(option => `
            <option value="${option}" ${condition.value === option ? 'selected' : ''}>${option}</option>
          `).join('')}
        </select>
      `;
    }

    // Handle service fields (both legacy and enhanced)
    if (['service', 'service_options'].includes(sourceField.type)) {
      let serviceOptions = [];
      
      // Handle legacy service structure
      if (sourceField.services && sourceField.services.length > 0) {
        serviceOptions = sourceField.services.map(service => ({
          name: service.name,
          price: service.price || '0.00'
        }));
      }
      
      // Handle enhanced service structure
      if (sourceField.enhancedServiceStructure && sourceField.enhancedServiceStructure.length > 0) {
        serviceOptions = this.extractServicesFromEnhancedStructure(sourceField.enhancedServiceStructure);
      }
      
      if (serviceOptions.length > 0) {
        return `
          <select class="quotemate-form-field__input quotemate-conditional-value-select" 
                  data-rule-index="${ruleIndex}" data-field-id="${fieldId}" data-rule-property="value">
            <option value="">Select service</option>
            ${serviceOptions.map(service => `
              <option value="${service.name}" ${condition.value === service.name ? 'selected' : ''}>${service.name} ($${service.price})</option>
            `).join('')}
          </select>
        `;
      }
    }

    // Handle budget/range fields
    if (sourceField.type === 'budget' && sourceField.ranges && sourceField.ranges.length > 0) {
      return `
        <select class="quotemate-form-field__input quotemate-conditional-value-select" 
                data-rule-index="${ruleIndex}" data-field-id="${fieldId}" data-rule-property="value">
          <option value="">Select budget range</option>
          ${sourceField.ranges.map(range => `
            <option value="${range}" ${condition.value === range ? 'selected' : ''}>${range}</option>
          `).join('')}
        </select>
      `;
    }

    // Handle pricing fields
    if (sourceField.type === 'pricing' && sourceField.options && sourceField.options.length > 0) {
      return `
        <select class="quotemate-form-field__input quotemate-conditional-value-select" 
                data-rule-index="${ruleIndex}" data-field-id="${fieldId}" data-rule-property="value">
          <option value="">Select pricing option</option>
          ${sourceField.options.map(option => {
            const price = sourceField.prices && sourceField.prices[option] ? sourceField.prices[option] : '0.00';
            return `<option value="${option}" ${condition.value === option ? 'selected' : ''}>${option} ($${price})</option>`;
          }).join('')}
        </select>
      `;
    }

    // For other field types, use text input
    return `<input type="text" class="quotemate-form-field__input quotemate-conditional-value-input" 
                   placeholder="Enter value" value="${condition.value || ''}" 
                   data-rule-index="${ruleIndex}" data-field-id="${fieldId}" data-rule-property="value">`;
  }

  generateConditionPreview(conditions) {
    if (!conditions.conditions || conditions.conditions.length === 0) {
      return 'No conditions set';
    }

    const logicText = conditions.logicType === 'show' ? 'Show' : 'Hide';
    const operatorText = conditions.operator === 'all' ? 'ALL' : 'ANY';
    const conditionCount = conditions.conditions.length;
    
    return `${logicText} this field if ${operatorText} of ${conditionCount} condition${conditionCount > 1 ? 's' : ''} match`;
  }

  generateConditionalLogicModal(fieldData, fieldId) {
    // Get the most up-to-date field data from the form builder
    const actualFieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    const conditions = actualFieldData && actualFieldData.conditionalLogic ? actualFieldData.conditionalLogic : {
      enabled: false,
      logicType: 'show',
      operator: 'all',
      conditions: []
    };

    const availableFields = this.getAvailableFields(fieldId);
    
    return `
      <div class="quotemate-conditional-modal-overlay" id="conditional-modal-${fieldId}">
        <div class="quotemate-conditional-modal">
          <div class="quotemate-conditional-modal-header">
            <h3>Configure Conditional Logic</h3>
            <button type="button" class="quotemate-conditional-modal-close" data-field-id="${fieldId}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="quotemate-conditional-modal-body">
            <p class="quotemate-conditional-description">
              Conditional logic allows you to change what the user sees depending on the fields they select.
            </p>
            
            <div class="quotemate-conditional-enable-section">
              <label class="quotemate-conditional-toggle">
                <input type="checkbox" ${conditions.enabled ? "checked" : ""} 
                       data-property="conditionalLogic.enabled" data-field-id="${fieldId}"
                       class="quotemate-conditional-enable-toggle">
                <span class="quotemate-conditional-toggle-slider"></span>
                <span class="quotemate-conditional-toggle-label">Enable Conditional Logic</span>
              </label>
            </div>
            
            <div class="quotemate-conditional-settings" style="display: ${conditions.enabled ? 'block' : 'none'}">
              <div class="quotemate-conditional-logic-builder">
                <div class="quotemate-conditional-logic-statement">
                  <select class="quotemate-conditional-logic-type" data-property="conditionalLogic.logicType" data-field-id="${fieldId}">
                    <option value="show" ${conditions.logicType === 'show' ? 'selected' : ''}>Show</option>
                    <option value="hide" ${conditions.logicType === 'hide' ? 'selected' : ''}>Hide</option>
                  </select>
                  <span>this field if</span>
                  <select class="quotemate-conditional-operator" data-property="conditionalLogic.operator" data-field-id="${fieldId}">
                    <option value="all" ${conditions.operator === 'all' ? 'selected' : ''}>All</option>
                    <option value="any" ${conditions.operator === 'any' ? 'selected' : ''}>Any</option>
                  </select>
                  <span>of the following match:</span>
                </div>
                
                <div class="quotemate-conditional-rules-container" data-field-id="${fieldId}">
                  ${this.generateModalConditionalRulesHtml(conditions.conditions || [], fieldId, availableFields)}
                </div>
                
                <button type="button" class="quotemate-add-condition-btn" data-field-id="${fieldId}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Condition
                </button>
              </div>
            </div>
          </div>
          
          <div class="quotemate-conditional-modal-footer">
            <button type="button" class="quotemate-btn quotemate-btn--secondary quotemate-conditional-cancel" data-field-id="${fieldId}">
              Cancel
            </button>
            <button type="button" class="quotemate-btn quotemate-btn--primary quotemate-conditional-save" data-field-id="${fieldId}">
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }

  generateModalConditionalRulesHtml(conditions, fieldId, availableFields) {
    if (!conditions || conditions.length === 0) {
      return '<div class="quotemate-conditional-no-rules">No conditions added yet.</div>';
    }

    return conditions.map((condition, index) => `
      <div class="quotemate-conditional-rule-item" data-rule-index="${index}">
        ${index > 0 ? `<div class="quotemate-conditional-rule-connector">AND</div>` : ''}
        <div class="quotemate-conditional-rule-content">
          <select class="quotemate-conditional-field-select" data-rule-index="${index}" data-field-id="${fieldId}" data-rule-property="field">
            <option value="">Select a field</option>
            ${availableFields.map(field => `
              <option value="${field.id}" ${condition.field === field.id ? 'selected' : ''}>${field.label}</option>
            `).join('')}
          </select>
          
          <select class="quotemate-conditional-operator-select" data-rule-index="${index}" data-field-id="${fieldId}" data-rule-property="operator">
            <option value="is" ${condition.operator === 'is' ? 'selected' : ''}>is</option>
            <option value="is_not" ${condition.operator === 'is_not' ? 'selected' : ''}>is not</option>
            <option value="greater_than" ${condition.operator === 'greater_than' ? 'selected' : ''}>greater than</option>
            <option value="less_than" ${condition.operator === 'less_than' ? 'selected' : ''}>less than</option>
            <option value="contains" ${condition.operator === 'contains' ? 'selected' : ''}>contains</option>
            <option value="starts_with" ${condition.operator === 'starts_with' ? 'selected' : ''}>starts with</option>
            <option value="ends_with" ${condition.operator === 'ends_with' ? 'selected' : ''}>ends with</option>
            <option value="is_empty" ${condition.operator === 'is_empty' ? 'selected' : ''}>is empty</option>
            <option value="is_not_empty" ${condition.operator === 'is_not_empty' ? 'selected' : ''}>is not empty</option>
          </select>
          
          <div class="quotemate-conditional-value-wrapper" style="display: ${['is_empty', 'is_not_empty'].includes(condition.operator) ? 'none' : 'block'}">
            ${this.generateConditionalValueInput(condition, index, fieldId, availableFields)}
          </div>
          
          <button type="button" class="quotemate-conditional-remove-rule" data-rule-index="${index}" data-field-id="${fieldId}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  getAvailableFields(currentFieldId) {
    return this.formBuilder.formData.fields
      .filter(field => field.id !== currentFieldId && !['page_break', 'section_break', 'html'].includes(field.type))
      .map(field => ({
        id: field.id,
        label: field.label,
        type: field.type,
        options: field.options || null,
        services: field.services || null,
        enhancedServiceStructure: field.enhancedServiceStructure || null,
        ranges: field.ranges || null,
        prices: field.prices || null
      }));
  }

  attachPropertyEventListeners() {
    // Property changes
    document.querySelectorAll("[data-property]").forEach((input) => {
      const eventType = (input.tagName === 'INPUT' && input.type === 'checkbox') || input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, (e) => {
        const fieldId = e.target.dataset.fieldId;
        const property = e.target.dataset.property;
        const value =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        this.formBuilder.updateFieldProperty(fieldId, property, value);
        // Keep color swatch in sync when user types hex in panel
        if (input.classList.contains('quotemate-color-input') && value && /^#[0-9A-Fa-f]{3,8}$/.test(String(value).trim())) {
          const section = input.closest('.quotemate-color-field');
          const swatch = section && section.querySelector('.quotemate-color-swatch');
          if (swatch) swatch.style.backgroundColor = String(value).trim();
        }
      });
    });

    // Choice management
    document.querySelectorAll("[data-choice-index]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const fieldId = e.target.dataset.fieldId;
        const index = parseInt(e.target.dataset.choiceIndex);
        this.formBuilder.updateFieldChoice(fieldId, index, e.target.value);
      });
    });

    document.querySelectorAll("[data-remove-choice]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        const index = parseInt(e.target.dataset.removeChoice);
        this.formBuilder.removeFieldChoice(fieldId, index);
      });
    });

    document.querySelectorAll("[data-add-choice]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        this.formBuilder.addFieldChoice(fieldId);
      });
    });

    // Service management
    document
      .querySelectorAll("[data-service-name], [data-service-price]")
      .forEach((input) => {
        input.addEventListener("change", (e) => {
          const fieldId = e.target.dataset.fieldId;
          const index = parseInt(
            e.target.dataset.serviceName || e.target.dataset.servicePrice
          );
          const serviceOption = e.target.closest(
            ".quotemate-form-properties__service-option"
          );
          const nameInput = serviceOption.querySelector("[data-service-name]");
          const priceInput = serviceOption.querySelector(
            "[data-service-price]"
          );
          this.formBuilder.updateServiceOption(
            fieldId,
            index,
            priceInput.value,
            nameInput.value
          );
        });
      });

    document.querySelectorAll("[data-remove-service]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        const index = parseInt(e.target.dataset.removeService);
        this.formBuilder.removeServiceOption(fieldId, index);
      });
    });

    document.querySelectorAll("[data-add-service]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        this.formBuilder.addServiceOption(fieldId);
      });
    });

    // Conditional Logic Event Listeners
    this.attachConditionalLogicEventListeners();
  }

  attachConditionalLogicEventListeners() {
    // Configure button clicks
    document.querySelectorAll('.quotemate-conditional-configure-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fieldId = e.target.closest('[data-field-id]').dataset.fieldId;
        this.openConditionalLogicModal(fieldId);
      });
    });
  }

  openConditionalLogicModal(fieldId) {
    // Get the most up-to-date field data from the form builder
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    const modalHtml = this.generateConditionalLogicModal(fieldData, fieldId);
    
    // Remove existing modal if any
    const existingModal = document.getElementById(`conditional-modal-${fieldId}`);
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Attach modal event listeners
    this.attachModalEventListeners(fieldId);
    
    // Show modal with animation
    const modal = document.getElementById(`conditional-modal-${fieldId}`);
    setTimeout(() => {
      modal.classList.add('quotemate-conditional-modal-show');
    }, 10);
    
    // Update rule connectors based on current operator
    this.updateRuleConnectors(fieldId);
  }

  attachModalEventListeners(fieldId) {
    const modal = document.getElementById(`conditional-modal-${fieldId}`);
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.quotemate-conditional-modal-close');
    const cancelBtn = modal.querySelector('.quotemate-conditional-cancel');
    const overlay = modal;
    
    [closeBtn, cancelBtn].forEach(btn => {
      btn.addEventListener('click', () => this.closeConditionalLogicModal(fieldId));
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeConditionalLogicModal(fieldId);
      }
    });

    // Enable/disable toggle
    const enableToggle = modal.querySelector('.quotemate-conditional-enable-toggle');
    enableToggle.addEventListener('change', (e) => {
      const settingsContainer = modal.querySelector('.quotemate-conditional-settings');
      settingsContainer.style.display = e.target.checked ? 'block' : 'none';
      
      // Update field data
      this.formBuilder.updateConditionalLogicProperty(fieldId, 'enabled', e.target.checked);
      
      // If disabling, clear conditions
      if (!e.target.checked) {
        this.formBuilder.updateConditionalLogicProperty(fieldId, 'conditions', []);
        this.refreshModalConditionalRules(fieldId);
      }
    });

    // Logic type and operator changes
    const logicTypeSelect = modal.querySelector('.quotemate-conditional-logic-type');
    const operatorSelect = modal.querySelector('.quotemate-conditional-operator');
    
    logicTypeSelect.addEventListener('change', (e) => {
      this.formBuilder.updateConditionalLogicProperty(fieldId, 'logicType', e.target.value);
    });
    
    operatorSelect.addEventListener('change', (e) => {
      this.formBuilder.updateConditionalLogicProperty(fieldId, 'operator', e.target.value);
      this.updateRuleConnectors(fieldId);
    });

    // Add condition button
    const addBtn = modal.querySelector('.quotemate-add-condition-btn');
    addBtn.addEventListener('click', () => {
      this.addConditionalRule(fieldId);
    });

    // Save button
    const saveBtn = modal.querySelector('.quotemate-conditional-save');
    saveBtn.addEventListener('click', () => {
      this.saveConditionalLogic(fieldId);
    });

    // Attach rule-specific listeners
    this.attachModalRuleEventListeners(fieldId);
  }

  closeConditionalLogicModal(fieldId) {
    const modal = document.getElementById(`conditional-modal-${fieldId}`);
    if (modal) {
      modal.classList.remove('quotemate-conditional-modal-show');
      setTimeout(() => modal.remove(), 300);
    }
  }

  saveConditionalLogic(fieldId) {
    // Update form data to ensure all changes are saved
    this.formBuilder.updateFormData();
    
    // Re-evaluate conditional logic
    this.formBuilder.evaluateConditionalLogic();
    
    // Update field properties preview to reflect new conditional logic status
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldElement) {
      this.showProperties(fieldElement);
    }
    
    this.closeConditionalLogicModal(fieldId);
    
    // Show success message
    this.formBuilder.showNotification('Conditional logic saved successfully', 'success');
  }

  updateRuleConnectors(fieldId) {
    const modal = document.getElementById(`conditional-modal-${fieldId}`);
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    const operator = fieldData.conditionalLogic?.operator || 'all';
    
    const connectors = modal.querySelectorAll('.quotemate-conditional-rule-connector');
    connectors.forEach(connector => {
      connector.textContent = operator === 'all' ? 'AND' : 'OR';
    });
  }

  attachModalRuleEventListeners(fieldId) {
    const modal = document.getElementById(`conditional-modal-${fieldId}`);
    
    // Rule field selection
    modal.querySelectorAll('.quotemate-conditional-field-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const ruleIndex = parseInt(e.target.dataset.ruleIndex);
        const property = e.target.dataset.ruleProperty;
        
        this.updateConditionalRule(fieldId, ruleIndex, property, e.target.value);
        
        // Clear the value when field changes
        this.updateConditionalRule(fieldId, ruleIndex, 'value', '');
        
        // Update value input based on selected field
        this.updateModalConditionalValueInput(fieldId, ruleIndex);
      });
    });

    // Rule operator selection
    modal.querySelectorAll('.quotemate-conditional-operator-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const ruleIndex = parseInt(e.target.dataset.ruleIndex);
        const property = e.target.dataset.ruleProperty;
        const operator = e.target.value;
        
        this.updateConditionalRule(fieldId, ruleIndex, property, operator);
        
        // Show/hide value input based on operator
        const valueWrapper = e.target.closest('.quotemate-conditional-rule-content').querySelector('.quotemate-conditional-value-wrapper');
        const shouldShowValue = !['is_empty', 'is_not_empty'].includes(operator);
        valueWrapper.style.display = shouldShowValue ? 'block' : 'none';
        
        // Clear value if not needed
        if (!shouldShowValue) {
          this.updateConditionalRule(fieldId, ruleIndex, 'value', '');
        }
      });
    });

    // Rule value changes
    modal.querySelectorAll('.quotemate-conditional-value-input, .quotemate-conditional-value-select').forEach(input => {
      const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(eventType, (e) => {
        const ruleIndex = parseInt(e.target.dataset.ruleIndex);
        const property = e.target.dataset.ruleProperty;
        
        this.updateConditionalRule(fieldId, ruleIndex, property, e.target.value);
      });
    });

    // Remove rule
    modal.querySelectorAll('.quotemate-conditional-remove-rule').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ruleIndex = parseInt(e.target.dataset.ruleIndex);
        this.removeConditionalRule(fieldId, ruleIndex);
      });
    });
  }

  addConditionalRule(fieldId) {
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    if (!fieldData.conditionalLogic) {
      fieldData.conditionalLogic = {
        enabled: true,
        logicType: 'show',
        operator: 'all',
        conditions: []
      };
    }

    // Add new empty rule
    fieldData.conditionalLogic.conditions.push({
      field: '',
      operator: 'is',
      value: ''
    });

    this.formBuilder.updateFormData();
    this.refreshModalConditionalRules(fieldId);
  }

  removeConditionalRule(fieldId, ruleIndex) {
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    if (fieldData.conditionalLogic && fieldData.conditionalLogic.conditions) {
      fieldData.conditionalLogic.conditions.splice(ruleIndex, 1);
      this.formBuilder.updateFormData();
      this.refreshModalConditionalRules(fieldId);
    }
  }

  updateConditionalRule(fieldId, ruleIndex, property, value) {
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    if (fieldData.conditionalLogic && fieldData.conditionalLogic.conditions[ruleIndex]) {
      fieldData.conditionalLogic.conditions[ruleIndex][property] = value;
      this.formBuilder.updateFormData();
      
      // Trigger conditional logic evaluation in preview/frontend
      this.formBuilder.evaluateConditionalLogic();
    }
  }

  updateModalConditionalValueInput(fieldId, ruleIndex) {
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    const condition = fieldData.conditionalLogic.conditions[ruleIndex];
    const availableFields = this.getAvailableFields(fieldId);
    
    const valueWrapper = document.querySelector(
      `#conditional-modal-${fieldId} .quotemate-conditional-rule-item[data-rule-index="${ruleIndex}"] .quotemate-conditional-value-wrapper`
    );
    
    if (valueWrapper) {
      valueWrapper.innerHTML = this.generateConditionalValueInput(condition, ruleIndex, fieldId, availableFields);
      this.attachModalRuleEventListeners(fieldId);
    }
  }

  refreshModalConditionalRules(fieldId) {
    const modal = document.getElementById(`conditional-modal-${fieldId}`);
    if (!modal) return;
    
    // Get the most up-to-date field data
    const fieldData = this.formBuilder.formData.fields.find(f => f.id === fieldId);
    const conditions = fieldData && fieldData.conditionalLogic ? fieldData.conditionalLogic.conditions || [] : [];
    const availableFields = this.getAvailableFields(fieldId);
    
    // Update rules container
    const rulesContainer = modal.querySelector('.quotemate-conditional-rules-container');
    if (rulesContainer) {
      rulesContainer.innerHTML = this.generateModalConditionalRulesHtml(conditions, fieldId, availableFields);
      
      // Re-attach rule event listeners
      this.attachModalRuleEventListeners(fieldId);
      
      // Update rule connectors
      this.updateRuleConnectors(fieldId);
    }
  }

  generateFormSummaryPropertiesHtml(fieldData, fieldId) {
    const d = (key, fallback = '') =>
      fieldData && fieldData[key] !== undefined && fieldData[key] !== null
        ? fieldData[key]
        : fallback;
    const isOn = (key) => {
      const val = d(key, false);
      return val === true || val === 1 || val === '1' || val === 'true';
    };
    const checked = (key) => (isOn(key) ? 'checked' : '');
    const sel = (key, value) => (d(key, '') === value ? 'selected' : '');
    const currencyCode = FieldProperties.resolveCurrencyCode(fieldData);
    const currencySymbol = FieldProperties.getCurrencyByCode(currencyCode)?.symbol || d('currencySymbol', '$');
    const discountIsFixed = d('discountType', 'percent') === 'fixed';

    const currencyOptions = FieldProperties.FORM_SUMMARY_CURRENCIES.map(
      (currency) =>
        `<option value="${currency.code}" ${currencyCode === currency.code ? 'selected' : ''}>${currency.code} (${currency.symbol}) — ${currency.name}</option>`
    ).join('');

    return `
      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Summary Title</label>
        <input type="text" class="quotemate-form-field__input" value="${d('summaryTitle', 'Quote Summary')}"
          data-property="summaryTitle" data-field-id="${fieldId}">
      </div>

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Currency</label>
        <select class="quotemate-form-field__input" data-property="currencyCode" data-field-id="${fieldId}">
          ${currencyOptions}
        </select>
        <p class="quotemate-form-properties__hint">Display symbol: <strong>${currencySymbol}</strong></p>
      </div>

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Layout Style</label>
        <select class="quotemate-form-field__input" data-property="layoutStyle" data-field-id="${fieldId}">
          <option value="detailed" ${sel('layoutStyle', 'detailed')}>Detailed table</option>
          <option value="compact" ${sel('layoutStyle', 'compact')}>Compact list</option>
          <option value="card" ${sel('layoutStyle', 'card')}>Card layout</option>
        </select>
      </div>

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Service Lines Display</label>
        <select class="quotemate-form-field__input" data-property="serviceDisplayMode" data-field-id="${fieldId}">
          <option value="final_only" ${sel('serviceDisplayMode', 'final_only')}>Final selection only</option>
          <option value="all_levels" ${sel('serviceDisplayMode', 'all_levels')}>All levels with prices</option>
        </select>
      </div>

      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showSubtotal')} data-property="showSubtotal" data-field-id="${fieldId}">
          Show subtotal
        </label>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showGrandTotal')} data-property="showGrandTotal" data-field-id="${fieldId}">
          Show grand total
        </label>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showQuantity')} data-property="showQuantity" data-field-id="${fieldId}">
          Show quantity
        </label>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showPricingType')} data-property="showPricingType" data-field-id="${fieldId}">
          Show pricing type
        </label>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showPath')} data-property="showPath" data-field-id="${fieldId}">
          Show selection path
        </label>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showDeliveryTime')} data-property="showDeliveryTime" data-field-id="${fieldId}">
          Show delivery time
        </label>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showSavingsHighlight')} data-property="showSavingsHighlight" data-field-id="${fieldId}">
          Highlight savings
        </label>
      </div>

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Tax</label>
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showTax')} data-property="showTax" data-field-id="${fieldId}">
          Apply tax on quote total
        </label>
      </div>
      ${isOn('showTax') ? `
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__label">Tax Rate (%)</label>
        <input type="number" class="quotemate-form-field__input" min="0" max="100" step="0.1"
          value="${d('taxRate', 0)}" data-property="taxRate" data-field-id="${fieldId}"
          placeholder="e.g. 15">
        <p class="quotemate-form-properties__hint">Percentage applied to the quote base (subtotal after discount).</p>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__label">Tax Calculation</label>
        <select class="quotemate-form-field__input" data-property="taxMode" data-field-id="${fieldId}">
          <option value="exclusive" ${sel('taxMode', 'exclusive')}>Exclusive — add tax on top of subtotal</option>
          <option value="inclusive" ${sel('taxMode', 'inclusive')}>Inclusive — tax already included in line prices</option>
        </select>
      </div>` : ''}

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showDiscount')} data-property="showDiscount" data-field-id="${fieldId}">
          Show discount
        </label>
      </div>
      ${isOn('showDiscount') ? `
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__label">Discount Type</label>
        <select class="quotemate-form-field__input" data-property="discountType" data-field-id="${fieldId}">
          <option value="percent" ${sel('discountType', 'percent')}>Percentage (%)</option>
          <option value="fixed" ${sel('discountType', 'fixed')}>Fixed amount</option>
        </select>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__label">Discount Value ${discountIsFixed ? `(${currencySymbol})` : '(%)'}</label>
        <input type="number" class="quotemate-form-field__input" min="0" step="0.01"
          value="${d('discountValue', 0)}" data-property="discountValue" data-field-id="${fieldId}"
          placeholder="${discountIsFixed ? 'e.g. 50' : 'e.g. 10'}">
      </div>` : ''}

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Submit Button Text</label>
        <input type="text" class="quotemate-form-field__input" value="${d('submitButtonText', 'Submit Quote Request')}"
          data-property="submitButtonText" data-field-id="${fieldId}">
      </div>

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Empty State Message</label>
        <textarea class="quotemate-form-field__input" rows="2" data-property="emptyStateMessage" data-field-id="${fieldId}">${d('emptyStateMessage', 'Complete the steps above to see your quote summary.')}</textarea>
      </div>

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showTermsCheckbox')} data-property="showTermsCheckbox" data-field-id="${fieldId}">
          Show terms checkbox
        </label>
      </div>
      ${isOn('showTermsCheckbox') ? `
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__label">Terms Text</label>
        <textarea class="quotemate-form-field__input" rows="2" data-property="termsText" data-field-id="${fieldId}">${d('termsText', 'I agree to the terms and conditions.')}</textarea>
      </div>
      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('termsRequired')} data-property="termsRequired" data-field-id="${fieldId}">
          Terms required before submit
        </label>
      </div>` : ''}

      <div class="quotemate-form-properties__section">
        <label class="quotemate-form-properties__label">Disclaimer Footer Text</label>
        <textarea class="quotemate-form-field__input" rows="3" data-property="disclaimerText" data-field-id="${fieldId}">${d('disclaimerText', '')}</textarea>
      </div>

      <div class="quotemate-form-properties__subsection">
        <label class="quotemate-form-properties__checkbox">
          <input type="checkbox" ${checked('showPrintButton')} data-property="showPrintButton" data-field-id="${fieldId}">
          Show print / PDF button
        </label>
      </div>
    `;
  }
}