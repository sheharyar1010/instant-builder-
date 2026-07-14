/**
 * Quote Summary — collects service prices and renders the Form Summary step.
 */
class QuoteSummaryEngine {
  static DEFAULTS = {
    summaryTitle: 'Quote Summary',
    showSubtotal: true,
    currencySymbol: '$',
    showQuantity: true,
    showPricingType: true,
    showPath: true,
    serviceDisplayMode: 'final_only',
    showTax: false,
    taxRate: 0,
    taxMode: 'exclusive',
    showDiscount: false,
    discountType: 'percent',
    discountValue: 0,
    showGrandTotal: true,
    submitButtonText: 'Submit Quote Request',
    emptyStateMessage: 'Complete the steps above to see your quote summary.',
    showTermsCheckbox: false,
    termsText: 'I agree to the terms and conditions.',
    termsRequired: true,
    disclaimerText: '',
    layoutStyle: 'detailed',
    showDeliveryTime: true,
    showPrintButton: true,
    showSavingsHighlight: true,
  };

  static normalizeSettings(field) {
    return { ...QuoteSummaryEngine.DEFAULTS, ...(field || {}) };
  }

  static formatDisplayText(text) {
    if (window.QuoteMateTextFormat?.formatDisplayName) {
      return window.QuoteMateTextFormat.formatDisplayName(text);
    }
    return String(text ?? '').trim();
  }

  static formatMoney(amount, symbol) {
    const n = Number(amount) || 0;
    return `${symbol || '$'}${n.toFixed(2)}`;
  }

  static formatPricingType(type, progressive) {
    if (progressive?.formatPricingType) {
      return progressive.formatPricingType(type);
    }
    if (!type) return 'Fixed Price';
    const key = String(type).toLowerCase();
    const types = {
      fixed: 'Fixed Price',
      per_page: 'Per Page',
      per_hour: 'Per Hour',
      per_item: 'Per Item',
      per_month: 'Per Month',
      per_year: 'Per Year',
      per_user: 'Per User',
      per_feature: 'Per Feature',
      per_backlink: 'Per Backlink',
      per_post: 'Per Post',
      per_campaign: 'Per Campaign',
      per_project: 'Per Project',
    };
    if (types[key]) return types[key];
    if (key.startsWith('custom_')) {
      return QuoteSummaryEngine.formatDisplayText(key.replace('custom_', '').replace(/_/g, ' '));
    }
    if (key.startsWith('per_')) {
      return `Per ${QuoteSummaryEngine.formatDisplayText(key.slice(4).replace(/_/g, ' '))}`;
    }
    return QuoteSummaryEngine.formatDisplayText(type);
  }

  static formatSummaryPricingType(pricingType, progressive) {
    if (!pricingType || String(pricingType).toLowerCase() === 'fixed') {
      return 'Fixed';
    }

    const key = String(pricingType).toLowerCase();
    if (key.startsWith('per_')) {
      return QuoteSummaryEngine.formatDisplayText(key.slice(4).replace(/_/g, ' '));
    }
    if (key.startsWith('custom_')) {
      return QuoteSummaryEngine.formatDisplayText(key.slice(7).replace(/_/g, ' '));
    }

    const formatted = QuoteSummaryEngine.formatPricingType(pricingType, progressive);
    if (formatted === 'Fixed Price') return 'Fixed';
    if (formatted.startsWith('Per ')) {
      return QuoteSummaryEngine.formatDisplayText(formatted.slice(4));
    }

    return QuoteSummaryEngine.formatDisplayText(formatted);
  }

  static formatSummaryQuantity(item, progressive) {
    if (QuoteSummaryEngine.isSummaryBasePriceRow(item)) {
      return '—';
    }
    if (!QuoteSummaryEngine.isPerPricingType(item.pricingType, progressive)) {
      return '—';
    }
    return String(item.quantity ?? '—');
  }

  static formatSummaryRowType(item, progressive) {
    if (QuoteSummaryEngine.isSummaryBasePriceRow(item)) {
      return 'Fixed';
    }
    return QuoteSummaryEngine.formatSummaryPricingType(item.pricingType, progressive);
  }

  static resolvePricingRowName(levels, serviceData) {
    if (levels.length > 0) {
      return levels[levels.length - 1].name;
    }
    return QuoteSummaryEngine.formatDisplayText(serviceData?.name || 'Selected Service');
  }

  static isSummaryBasePriceRow(item) {
    return !!item.isBasePriceRow || !!item.isChoiceFieldRow;
  }

  static shouldRenderSummaryRow(item) {
    return (Number(item.lineTotal) || 0) > 0;
  }

  static isPerPricingType(pricingType, progressive) {
    if (progressive?.isPerPricingType) {
      return progressive.isPerPricingType(pricingType);
    }
    if (!pricingType || pricingType === 'fixed') return false;
    const key = String(pricingType).toLowerCase();
    if (key.startsWith('per_')) return true;
    return QuoteSummaryEngine.formatPricingType(pricingType, progressive).startsWith('Per ');
  }

  static getUnitDisplayLabel(pricingType, progressive) {
    const unit = progressive?.getQuantityUnit?.(pricingType) || 'units';
    return QuoteSummaryEngine.formatDisplayText(unit);
  }

  static getPricePerUnitLabel(pricingType, progressive) {
    const formatted = QuoteSummaryEngine.formatPricingType(pricingType, progressive);
    return formatted.startsWith('Per ') ? `Price ${formatted}` : 'Price Per Unit';
  }

  static formatCalculationLabel(quantity, unitPrice, totalPrice) {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const unit = Number(unitPrice) || 0;
    const total = Number(totalPrice) || 0;
    const formatNum = (n) => {
      const fixed = n.toFixed(2);
      return fixed.endsWith('.00') ? String(Math.round(n)) : fixed;
    };
    return `${qty} × ${formatNum(unit)} = ${formatNum(total)}`;
  }

  static buildPerTypeMeta(pricingType, quantity, pricingInfo, progressive) {
    if (!QuoteSummaryEngine.isPerPricingType(pricingType, progressive)) {
      return { isPerType: false };
    }

    const unitPrice = Number(pricingInfo.unitPrice) || 0;
    const totalPrice = Number(pricingInfo.totalPrice) || 0;

    return {
      isPerType: true,
      unitLabel: QuoteSummaryEngine.getUnitDisplayLabel(pricingType, progressive),
      pricePerUnitLabel: QuoteSummaryEngine.getPricePerUnitLabel(pricingType, progressive),
      calculationLabel: QuoteSummaryEngine.formatCalculationLabel(quantity, unitPrice, totalPrice),
    };
  }

  static renderPerTypeBreakdown(item, sym) {
    if (!item.isPerType) return '';

    return `
      <div class="quotemate-summary-per-breakdown">
        <div class="quotemate-summary-per-breakdown__row">
          <span class="quotemate-summary-per-breakdown__label">${escapeHtml(item.unitLabel)}</span>
          <span class="quotemate-summary-per-breakdown__value">${item.quantity}</span>
        </div>
        <div class="quotemate-summary-per-breakdown__row">
          <span class="quotemate-summary-per-breakdown__label">${escapeHtml(item.pricePerUnitLabel)}</span>
          <span class="quotemate-summary-per-breakdown__value">${QuoteSummaryEngine.formatMoney(item.unitPrice, sym)}</span>
        </div>
        <div class="quotemate-summary-per-breakdown__row quotemate-summary-per-breakdown__row--total">
          <span class="quotemate-summary-per-breakdown__label">Total</span>
          <span class="quotemate-summary-per-breakdown__value">${escapeHtml(item.calculationLabel)}</span>
        </div>
      </div>`;
  }

  static getProgressive() {
    return window.quotemateProgressiveSelector || null;
  }

  static findSummaryFields(fields) {
    return (fields || []).filter((f) => f.type === 'form_summary');
  }

  static getFieldData(fieldId) {
    const fields = window.quoteMateFormData?.fields || [];
    return fields.find((f) => f.id === fieldId) || null;
  }

  static getQuantity(container, progressive) {
    const qtyInput = container.querySelector('.quantity-input, .custom-quantity-input');
    if (qtyInput?.value) {
      return Math.max(1, parseInt(qtyInput.value, 10) || 1);
    }
    const selectedCard = container.querySelector('.quantity-option.selected');
    if (selectedCard?.dataset?.quantity) {
      return parseInt(selectedCard.dataset.quantity, 10) || 1;
    }
    const hiddenQty = container.querySelector('.final-quantity-value');
    if (hiddenQty?.value) {
      return Math.max(1, parseInt(hiddenQty.value, 10) || 1);
    }
    return 1;
  }

  static getTierLabel(tier, pricingType, progressive) {
    if (!tier) return '';
    const min = tier.minQuantity ?? 1;
    const max = tier.maxQuantity;
    const unit = QuoteSummaryEngine.formatDisplayText(
      progressive?.getQuantityUnit?.(pricingType) || 'units'
    );
    if (max) {
      return `${min}–${max} ${unit}`;
    }
    return `${min}+ ${unit}`;
  }

  static collectPathLevels(container, progressive) {
    const levels = [];
    const catSelect = container.querySelector('.category-select');
    if (catSelect?.value) {
      const opt = catSelect.options[catSelect.selectedIndex];
      const data = progressive?.parseOptionData?.(opt) || null;
      levels.push({
        name: QuoteSummaryEngine.formatDisplayText(
          data?.name || opt.textContent?.trim() || catSelect.value
        ),
        data,
        depth: 0,
      });
    }

    container.querySelectorAll('select.service-select').forEach((select, idx) => {
      if (!select.value) return;
      const opt = select.options[select.selectedIndex];
      const data = progressive?.parseOptionData?.(opt) || null;
      levels.push({
        name: QuoteSummaryEngine.formatDisplayText(
          data?.name || opt.textContent?.trim() || select.value
        ),
        data,
        depth: idx + 1,
      });
    });

    return levels;
  }

  static nodeHasPricing(node) {
    if (!node) return false;
    const base = parseFloat(node.basePrice) || 0;
    return !!(node.pricingType && (base > 0 || (node.pricingTiers && node.pricingTiers.length)));
  }

  static resolvePricedServiceData(container, progressive) {
    if (progressive?.resolvePricedSelection) {
      const resolved = progressive.resolvePricedSelection(container);
      if (resolved) return resolved;
    }

    const levels = QuoteSummaryEngine.collectPathLevels(container, progressive);
    for (let i = levels.length - 1; i >= 0; i--) {
      const node = levels[i].data || {};
      if (QuoteSummaryEngine.nodeHasPricing(node)) {
        return { ...node, name: node.name || levels[i].name };
      }
    }

    const dynamicInputs = container.querySelectorAll('.dynamic-step-input[data-step-data]');
    for (let i = dynamicInputs.length - 1; i >= 0; i--) {
      try {
        const data = JSON.parse(dynamicInputs[i].dataset.stepData || '{}');
        if (QuoteSummaryEngine.nodeHasPricing(data)) {
          return data;
        }
      } catch (e) {
        /* ignore */
      }
    }

    const finalPrice = parseFloat(container.querySelector('.final-price-value')?.value);
    if (finalPrice > 0) {
      const last = progressive?.getLastSelectedItem?.(container) || {};
      return {
        ...last,
        name: QuoteSummaryEngine.formatDisplayText(
          last.name || container.querySelector('.final-service-value')?.value || 'Selected Service'
        ),
        pricingType: container.querySelector('.pricing-type-value')?.value || last.pricingType || 'fixed',
        basePrice: parseFloat(container.querySelector('.base-price-value')?.value) || finalPrice,
        _resolvedTotalPrice: finalPrice,
      };
    }

    return progressive?.getLastSelectedItem?.(container) || {};
  }

  static collectServiceItems(container, fieldData, settings, progressive) {
    if (!container || !progressive) return [];

    const fieldId = container.dataset.fieldId || fieldData?.id;
    const fieldLabel = QuoteSummaryEngine.formatDisplayText(fieldData?.label || 'Service');
    const isComplete = progressive.isServiceReadyForPostFields?.(container);

    if (!isComplete) {
      return [];
    }

    const lastItem = progressive.getLastSelectedItem(container);
    const quantity = QuoteSummaryEngine.getQuantity(container, progressive);
    const serviceData = QuoteSummaryEngine.resolvePricedServiceData(container, progressive) || lastItem || {};
    let pricingInfo = progressive.calculatePriceWithTiers(serviceData, quantity);
    if (
      serviceData._resolvedTotalPrice != null &&
      !QuoteSummaryEngine.isPerPricingType(serviceData.pricingType, progressive)
    ) {
      pricingInfo = {
        ...pricingInfo,
        unitPrice: serviceData._resolvedTotalPrice,
        totalPrice: serviceData._resolvedTotalPrice,
      };
    } else if (serviceData._resolvedTotalPrice != null) {
      pricingInfo = {
        ...pricingInfo,
        totalPrice: serviceData._resolvedTotalPrice,
      };
    }
    const pricingType = serviceData.pricingType || 'fixed';
    const levels = QuoteSummaryEngine.collectPathLevels(container, progressive);
    const pathHidden = container.querySelector('.selected-path-value');
    const path =
      pathHidden?.value || levels.map((l) => l.name).join(' → ');
    const pricingRowName = QuoteSummaryEngine.resolvePricingRowName(levels, serviceData);
    const applicableTier = serviceData.pricingTiers?.length
      ? progressive.findApplicableTier(serviceData.pricingTiers, quantity)
      : null;
    const perTypeMeta = QuoteSummaryEngine.buildPerTypeMeta(
      pricingType,
      quantity,
      pricingInfo,
      progressive
    );

    const items = [];

    if (settings.serviceDisplayMode === 'all_levels') {
      levels.forEach((level, i) => {
        const node = level.data || {};
        const nodePrice = parseFloat(node.basePrice) || 0;
        const isLeaf = i === levels.length - 1;
        const lineTotal = isLeaf ? pricingInfo.totalPrice : nodePrice;

        items.push({
          fieldId,
          fieldLabel,
          name: isLeaf ? pricingRowName : level.name,
          path: levels
            .slice(0, i + 1)
            .map((l) => l.name)
            .join(' → '),
          pricingType: isLeaf ? pricingType : 'fixed',
          quantity: isLeaf ? quantity : 1,
          unitPrice: isLeaf ? pricingInfo.unitPrice : nodePrice,
          lineTotal,
          tierLabel: isLeaf && applicableTier
            ? QuoteSummaryEngine.getTierLabel(applicableTier, pricingType, progressive)
            : '',
          deliveryTime: isLeaf ? pricingInfo.deliveryTime || serviceData.deliveryTime : null,
          isLeaf,
          isBasePriceRow: !isLeaf && nodePrice > 0,
          regularPrice: isLeaf ? parseFloat(serviceData.basePrice) || 0 : nodePrice,
          savings: isLeaf
            ? Math.max(
                0,
                (pricingType === 'fixed'
                  ? parseFloat(serviceData.basePrice) || 0
                  : (parseFloat(serviceData.basePrice) || 0) * quantity) - pricingInfo.totalPrice
              )
            : 0,
          ...(isLeaf ? perTypeMeta : { isPerType: false }),
        });
      });
    } else {
      levels.forEach((level, i) => {
        const isLeafLevel = i === levels.length - 1;
        if (isLeafLevel) return;

        const nodePrice = parseFloat(level.data?.basePrice) || 0;
        if (nodePrice <= 0) return;

        items.push({
          fieldId,
          fieldLabel,
          name: level.name,
          path: '',
          pricingType: 'fixed',
          quantity: 1,
          unitPrice: nodePrice,
          lineTotal: nodePrice,
          isLeaf: false,
          isBasePriceRow: true,
          tierLabel: '',
          deliveryTime: null,
          regularPrice: nodePrice,
          savings: 0,
          isPerType: false,
        });
      });

      const regularTotal =
        pricingType === 'fixed'
          ? parseFloat(serviceData.basePrice) || 0
          : (parseFloat(serviceData.basePrice) || 0) * quantity;
      const savings = Math.max(0, regularTotal - pricingInfo.totalPrice);

      items.push({
        fieldId,
        fieldLabel,
        name: pricingRowName,
        path: settings.showPath ? path : '',
        pricingType,
        quantity,
        unitPrice: pricingInfo.unitPrice,
        lineTotal: pricingInfo.totalPrice,
        tierLabel: applicableTier
          ? QuoteSummaryEngine.getTierLabel(applicableTier, pricingType, progressive)
          : '',
        deliveryTime: pricingInfo.deliveryTime || serviceData.deliveryTime,
        isLeaf: true,
        regularPrice: regularTotal,
        savings,
        ...perTypeMeta,
      });
    }

    return items;
  }

  static isAddPriceEnabled(field) {
    if (!field) return false;
    const value = field.addPrice;
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  static resolveChoiceOptionPrice(field, optionLabel, element) {
    if (!QuoteSummaryEngine.isAddPriceEnabled(field)) return null;

    const prices = field.optionPrices;
    if (prices && optionLabel && Object.prototype.hasOwnProperty.call(prices, optionLabel)) {
      const configured = parseFloat(prices[optionLabel]);
      if (Number.isFinite(configured)) {
        return configured;
      }
    }

    return QuoteSummaryEngine.parseChoiceOptionPrice(element);
  }

  static parseChoiceOptionPrice(element) {
    if (!element || element.dataset.optionPrice === undefined || element.dataset.optionPrice === '') {
      return null;
    }
    const price = parseFloat(element.dataset.optionPrice);
    return Number.isFinite(price) ? price : null;
  }

  static getChoiceOptionLabel(element) {
    if (!element) return '';
    if (element.dataset.optionLabel) {
      return String(element.dataset.optionLabel).trim();
    }
    if (element.tagName === 'OPTION') {
      return String(element.textContent || '').trim();
    }
    const wrapper = element.closest('.radio-wrapper, .checkbox-wrapper');
    const optionLabel = wrapper?.querySelector('.choice-option-label');
    if (optionLabel) {
      return String(optionLabel.textContent || '').trim();
    }
    const label = wrapper?.querySelector('label');
    return String(label?.textContent || element.value || '').trim();
  }

  static buildChoiceFieldRow(name, price) {
    return {
      name: QuoteSummaryEngine.formatDisplayText(name),
      quantity: null,
      pricingType: 'fixed',
      lineTotal: price,
      isLeaf: true,
      isChoiceFieldRow: true,
    };
  }

  static collectChoiceFieldItems(form) {
    const formEl = form || document.querySelector('form.quotemate-form, .quotemate-form, form');
    if (!formEl) return [];

    const fields = (window.quoteMateFormData?.fields || []).filter(
      (f) =>
        QuoteSummaryEngine.isAddPriceEnabled(f) &&
        ['select', 'radio', 'checkbox'].includes(f.type)
    );
    const items = [];
    const seen = new Set();

    const pushChoiceRow = (field, optionLabel, price) => {
      const label = String(optionLabel || '').trim();
      if (!label || price === null || price <= 0) return;
      const key = `${field.id}\0${label}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(QuoteSummaryEngine.buildChoiceFieldRow(label, price));
    };

    fields.forEach((field) => {
      const group = formEl.querySelector(`.form-group[data-field-id="${field.id}"]`);

      if (field.type === 'select') {
        const select = group?.querySelector('select') || formEl.querySelector(`#${field.id}`);
        if (!select || !select.value) return;
        const option = select.options[select.selectedIndex];
        const label = QuoteSummaryEngine.getChoiceOptionLabel(option) || select.value;
        const price = QuoteSummaryEngine.resolveChoiceOptionPrice(field, select.value, option);
        pushChoiceRow(field, label, price);
        return;
      }

      if (field.type === 'radio') {
        const checked =
          group?.querySelector('input[type="radio"]:checked') ||
          formEl.querySelector(`input[type="radio"][name="${field.id}"]:checked`);
        if (!checked || !checked.value) return;
        const label = QuoteSummaryEngine.getChoiceOptionLabel(checked) || checked.value;
        const price = QuoteSummaryEngine.resolveChoiceOptionPrice(field, checked.value, checked);
        pushChoiceRow(field, label, price);
        return;
      }

      if (field.type === 'checkbox') {
        const checkedInputs = group
          ? group.querySelectorAll('input[type="checkbox"]:checked')
          : formEl.querySelectorAll(`input[type="checkbox"][name="${field.id}[]"]:checked`);
        checkedInputs.forEach((input) => {
          if (!input.value) return;
          const label = QuoteSummaryEngine.getChoiceOptionLabel(input) || input.value;
          const price = QuoteSummaryEngine.resolveChoiceOptionPrice(field, input.value, input);
          pushChoiceRow(field, label, price);
        });
      }
    });

    return items;
  }

  static collectAllLineItems(form, settings) {
    const progressive = QuoteSummaryEngine.getProgressive();
    const fields = window.quoteMateFormData?.fields || [];
    const serviceFields = fields.filter(
      (f) => f.type === 'service' || f.type === 'service_options'
    );
    const items = [];

    serviceFields.forEach((field) => {
      const container = progressive?.getServiceContainer?.(field.id);
      if (!container) return;
      items.push(...QuoteSummaryEngine.collectServiceItems(container, field, settings, progressive));
    });

    items.push(...QuoteSummaryEngine.collectChoiceFieldItems(form));

    return items;
  }

  static calculateTotals(lineItems, settings) {
    const subtotal = lineItems
      .filter((item) => item.isLeaf !== false || item.isBasePriceRow || item.isChoiceFieldRow)
      .reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
    const symbol = settings.currencySymbol || '$';
    let tax = 0;
    let discount = 0;
    let total = subtotal;
    const taxRate = parseFloat(settings.taxRate) || 0;
    const discountValue = parseFloat(settings.discountValue) || 0;

    if (settings.showDiscount && discountValue > 0) {
      discount =
        settings.discountType === 'fixed'
          ? discountValue
          : (subtotal * discountValue) / 100;
    }

    const afterDiscount = Math.max(0, subtotal - discount);

    if (settings.showTax && taxRate > 0) {
      if (settings.taxMode === 'inclusive') {
        tax = subtotal - subtotal / (1 + taxRate / 100);
        total = afterDiscount;
      } else {
        tax = (afterDiscount * taxRate) / 100;
        total = afterDiscount + tax;
      }
    } else {
      total = afterDiscount;
    }

    const totalSavings = lineItems.reduce((s, item) => s + (Number(item.savings) || 0), 0);

    return {
      subtotal,
      tax,
      discount,
      total: Math.max(0, total),
      taxRate,
      discountValue,
      symbol,
      totalSavings,
    };
  }

  static renderLineItems(lineItems, settings, totals, options = {}) {
    const sym = settings.currencySymbol || '$';
    const layout = settings.layoutStyle || 'detailed';
    const progressive = QuoteSummaryEngine.getProgressive();
    const grandInTable = !!options.grandInTable;

    if (!lineItems.length) {
      return `<div class="quotemate-summary-empty">${settings.emptyStateMessage || QuoteSummaryEngine.DEFAULTS.emptyStateMessage}</div>`;
    }

    if (layout === 'compact') {
      return `
        <ul class="quotemate-summary-lines quotemate-summary-lines--compact">
          ${lineItems
            .filter((item) => QuoteSummaryEngine.shouldRenderSummaryRow(item))
            .map((item) => QuoteSummaryEngine.renderCompactLine(item, sym, progressive))
            .join('')}
        </ul>`;
    }

    if (layout === 'card') {
      return `
        <div class="quotemate-summary-cards">
          ${lineItems
            .filter((item) => QuoteSummaryEngine.shouldRenderSummaryRow(item))
            .map((item) => QuoteSummaryEngine.renderItemCard(item, settings, sym, progressive))
            .join('')}
        </div>`;
    }

    return `
      <table class="quotemate-summary-table">
        <thead>
          <tr>
            <th class="quotemate-summary-table__name">Name</th>
            <th class="quotemate-summary-table__qty">Qty</th>
            <th class="quotemate-summary-table__type">Type</th>
            <th class="quotemate-summary-amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems
            .filter((item) => QuoteSummaryEngine.shouldRenderSummaryRow(item))
            .map((item) => QuoteSummaryEngine.renderSummaryTableRow(item, sym, progressive))
            .join('')}
        </tbody>
        ${grandInTable ? QuoteSummaryEngine.renderTableGrandFooter(totals, sym) : ''}
      </table>`;
  }

  static renderTableGrandFooter(totals, sym) {
    return `
        <tfoot>
          <tr class="quotemate-summary-table__row--grand">
            <td class="quotemate-summary-table__name">Grand Total</td>
            <td class="quotemate-summary-table__qty"></td>
            <td class="quotemate-summary-table__type"></td>
            <td class="quotemate-summary-amount">${QuoteSummaryEngine.formatMoney(totals.total, sym)}</td>
          </tr>
        </tfoot>`;
  }

  static renderCompactLine(item, sym, progressive) {
    const qty = QuoteSummaryEngine.formatSummaryQuantity(item, progressive);
    const type = QuoteSummaryEngine.formatSummaryRowType(item, progressive);
    const rowClass = QuoteSummaryEngine.isSummaryBasePriceRow(item)
      ? 'quotemate-summary-line--base'
      : 'quotemate-summary-line--pricing';

    return `
      <li class="quotemate-summary-line ${rowClass}">
        <span class="quotemate-summary-line__name">${escapeHtml(item.name)}</span>
        <span class="quotemate-summary-line__meta">${escapeHtml(qty)} · ${escapeHtml(type)}</span>
        <span class="quotemate-summary-line__amount">${QuoteSummaryEngine.formatMoney(item.lineTotal, sym)}</span>
      </li>`;
  }

  static renderSummaryTableRow(item, sym, progressive) {
    const qty = QuoteSummaryEngine.formatSummaryQuantity(item, progressive);
    const type = QuoteSummaryEngine.formatSummaryRowType(item, progressive);
    const rowClass = QuoteSummaryEngine.isSummaryBasePriceRow(item)
      ? 'quotemate-summary-table__row--base'
      : 'quotemate-summary-table__row--pricing';

    return `
      <tr class="${rowClass}">
        <td class="quotemate-summary-table__name">${escapeHtml(item.name)}</td>
        <td class="quotemate-summary-table__qty">${escapeHtml(qty)}</td>
        <td class="quotemate-summary-table__type">${escapeHtml(type)}</td>
        <td class="quotemate-summary-amount">${QuoteSummaryEngine.formatMoney(item.lineTotal, sym)}</td>
      </tr>`;
  }

  static renderItemCard(item, settings, sym, progressive) {
    const qty = QuoteSummaryEngine.formatSummaryQuantity(item, progressive);
    const type = QuoteSummaryEngine.formatSummaryRowType(item, progressive);
    const rowClass = QuoteSummaryEngine.isSummaryBasePriceRow(item)
      ? 'quotemate-summary-card--base'
      : 'quotemate-summary-card--pricing';

    return `
      <div class="quotemate-summary-card ${rowClass}">
        <div class="quotemate-summary-card__name">${escapeHtml(item.name)}</div>
        <div class="quotemate-summary-card__meta">Qty: ${escapeHtml(qty)} · ${escapeHtml(type)}</div>
        <div class="quotemate-summary-card__total">${QuoteSummaryEngine.formatMoney(item.lineTotal, sym)}</div>
      </div>`;
  }

  static renderTotals(totals, settings, options = {}) {
    const sym = totals.symbol || settings.currencySymbol || '$';
    const grandInTable = !!options.grandInTable;
    let html = '';

    if (settings.showSubtotal) {
      html += `
        <div class="quotemate-summary-totals__row">
          <span>Subtotal</span>
          <span>${QuoteSummaryEngine.formatMoney(totals.subtotal, sym)}</span>
        </div>`;
    }

    if (settings.showDiscount && totals.discount > 0) {
      const discLabel =
        settings.discountType === 'fixed'
          ? 'Discount'
          : `Discount (${totals.discountValue}%)`;
      html += `
        <div class="quotemate-summary-totals__row quotemate-summary-totals__row--discount">
          <span>${discLabel}</span>
          <span>-${QuoteSummaryEngine.formatMoney(totals.discount, sym)}</span>
        </div>`;
    }

    if (settings.showTax && totals.taxRate > 0) {
      const taxLabel =
        settings.taxMode === 'inclusive'
          ? `Tax (included ${totals.taxRate}%)`
          : `Tax (${totals.taxRate}%)`;
      html += `
        <div class="quotemate-summary-totals__row">
          <span>${taxLabel}</span>
          <span>${QuoteSummaryEngine.formatMoney(totals.tax, sym)}</span>
        </div>`;
    }

    if (settings.showSavingsHighlight && totals.totalSavings > 0) {
      html += `
        <div class="quotemate-summary-totals__row quotemate-summary-totals__row--savings">
          <span>Total savings</span>
          <span>${QuoteSummaryEngine.formatMoney(totals.totalSavings, sym)}</span>
        </div>`;
    }

    if (!grandInTable) {
      html += `
        <div class="quotemate-summary-totals__row quotemate-summary-totals__row--grand">
          <span>Grand Total</span>
          <span>${QuoteSummaryEngine.formatMoney(totals.total, sym)}</span>
        </div>`;
    }

    if (!html) return '';

    return `<div class="quotemate-summary-totals">${html}</div>`;
  }

  static renderFooter(settings) {
    let html = '';

    if (settings.showTermsCheckbox) {
      html += `
        <div class="quotemate-summary-terms">
          <label class="quotemate-summary-terms__label">
            <input type="checkbox" class="quotemate-summary-terms__input" name="form_summary_terms" value="1" ${settings.termsRequired ? 'required' : ''}>
            <span>${escapeHtml(settings.termsText || '')}</span>
          </label>
        </div>`;
    }

    if (settings.disclaimerText) {
      html += `<div class="quotemate-summary-disclaimer">${escapeHtml(settings.disclaimerText)}</div>`;
    }

    if (settings.showPrintButton) {
      html += `
        <div class="quotemate-summary-actions">
          <button type="button" class="btn btn-secondary quotemate-summary-print">Print / Save PDF</button>
        </div>`;
    }

    return html;
  }

  static renderForField(fieldId) {
    const field = QuoteSummaryEngine.getFieldData(fieldId);
    if (!field) return;

    const settings = QuoteSummaryEngine.normalizeSettings(field);
    const root = document.querySelector(
      `.quotemate-form-summary[data-field-id="${fieldId}"]`
    );
    if (!root) return;

    const form = root.closest('form');
    const lineItems = QuoteSummaryEngine.collectAllLineItems(form, settings);
    const totals = QuoteSummaryEngine.calculateTotals(lineItems, settings);

    const titleEl = root.querySelector('.quotemate-form-summary__title');
    if (titleEl) {
      titleEl.textContent = settings.summaryTitle || field.label || 'Quote Summary';
    }

    const layout = settings.layoutStyle || 'detailed';
    const grandInTable = layout === 'detailed' && lineItems.length > 0;
    const renderOptions = { grandInTable };

    const bodyEl = root.querySelector('.quotemate-form-summary__body');
    if (bodyEl) {
      bodyEl.innerHTML =
        QuoteSummaryEngine.renderLineItems(lineItems, settings, totals, renderOptions) +
        QuoteSummaryEngine.renderTotals(totals, settings, renderOptions) +
        QuoteSummaryEngine.renderFooter(settings);
    }

    const hiddenTotal = root.querySelector('.quotemate-form-summary__total-input');
    if (hiddenTotal) {
      hiddenTotal.value = String(totals.total);
    }

    const hiddenJson = root.querySelector('.quotemate-form-summary__snapshot-input');
    if (hiddenJson) {
      hiddenJson.value = JSON.stringify({ lineItems, totals, settings: { summaryTitle: settings.summaryTitle } });
    }

    const printBtn = root.querySelector('.quotemate-summary-print');
    printBtn?.addEventListener('click', () => QuoteSummaryEngine.printSummary(root), { once: true });

    root.classList.toggle('quotemate-form-summary--empty', lineItems.length === 0);
    root.dataset.layout = settings.layoutStyle || 'detailed';

    document.dispatchEvent(
      new CustomEvent('quotemateSummaryRendered', { detail: { fieldId, totals, lineItems } })
    );
  }

  static printSummary(root) {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      window.print();
      return;
    }
    const styles = `
      body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
      h1 { font-size: 22px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .quotemate-summary-table__row--grand td { font-weight: bold; font-size: 18px; }
      .quotemate-summary-totals__row--grand { font-weight: bold; font-size: 18px; }
    `;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Quote Summary</title><style>${styles}</style></head><body>
      <h1>${root.querySelector('.quotemate-form-summary__title')?.textContent || 'Quote Summary'}</h1>
      ${root.querySelector('.quotemate-form-summary__body')?.innerHTML || ''}
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  static refreshAllVisible() {
    QuoteSummaryEngine.findSummaryFields(window.quoteMateFormData?.fields).forEach((field) => {
      const group = document.querySelector(`.form-group[data-field-id="${field.id}"]`);
      if (!group || group.dataset.unifiedHidden === '1' || group.style.display === 'none') {
        return;
      }
      QuoteSummaryEngine.renderForField(field.id);
    });
  }

  static validateTerms() {
    const fields = QuoteSummaryEngine.findSummaryFields(window.quoteMateFormData?.fields);
    for (const field of fields) {
      const settings = QuoteSummaryEngine.normalizeSettings(field);
      if (!settings.showTermsCheckbox || !settings.termsRequired) continue;

      const group = document.querySelector(`.form-group[data-field-id="${field.id}"]`);
      if (!group || group.dataset.unifiedHidden === '1' || group.style.display === 'none') {
        continue;
      }

      const checkbox = group.querySelector('.quotemate-summary-terms__input');
      if (checkbox && !checkbox.checked) {
        return false;
      }
    }
    return true;
  }

  static getSubmitButtonText() {
    const fields = QuoteSummaryEngine.findSummaryFields(window.quoteMateFormData?.fields);
    if (!fields.length) return null;
    const settings = QuoteSummaryEngine.normalizeSettings(fields[fields.length - 1]);
    return settings.submitButtonText || QuoteSummaryEngine.DEFAULTS.submitButtonText;
  }
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.QuoteSummaryEngine = QuoteSummaryEngine;

document.addEventListener('quotemateServiceChanged', () => {
  QuoteSummaryEngine.refreshAllVisible();
});

document.addEventListener('change', (e) => {
  const target = e.target;
  if (!target || !target.closest('form')) return;
  const tag = target.tagName;
  const type = target.type;
  if (tag === 'SELECT' || type === 'radio' || type === 'checkbox') {
    QuoteSummaryEngine.refreshAllVisible();
  }
}, true);

document.addEventListener('quotemate-form-data-ready', () => {
  setTimeout(() => QuoteSummaryEngine.refreshAllVisible(), 100);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => QuoteSummaryEngine.refreshAllVisible(), 300);
});
