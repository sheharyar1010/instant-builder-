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

  static formatMoney(amount, symbol) {
    const n = Number(amount) || 0;
    return `${symbol || '$'}${n.toFixed(2)}`;
  }

  static formatPricingType(type) {
    if (!type) return 'Fixed';
    return String(type)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
    const unit = progressive?.getQuantityUnit?.(pricingType) || 'units';
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
        name: data?.name || opt.textContent?.trim() || catSelect.value,
        data,
        depth: 0,
      });
    }

    container.querySelectorAll('select.service-select').forEach((select, idx) => {
      if (!select.value) return;
      const opt = select.options[select.selectedIndex];
      const data = progressive?.parseOptionData?.(opt) || null;
      levels.push({
        name: data?.name || opt.textContent?.trim() || select.value,
        data,
        depth: idx + 1,
      });
    });

    return levels;
  }

  static collectServiceItems(container, fieldData, settings, progressive) {
    if (!container || !progressive) return [];

    const fieldId = container.dataset.fieldId || fieldData?.id;
    const fieldLabel = fieldData?.label || 'Service';
    const isComplete = progressive.isServiceReadyForPostFields?.(container);

    if (!isComplete) {
      return [];
    }

    const lastItem = progressive.getLastSelectedItem(container);
    const quantity = QuoteSummaryEngine.getQuantity(container, progressive);
    const serviceData = lastItem || {};
    const pricingInfo = progressive.calculatePriceWithTiers(serviceData, quantity);
    const pricingType = serviceData.pricingType || 'fixed';
    const levels = QuoteSummaryEngine.collectPathLevels(container, progressive);
    const pathHidden = container.querySelector('.selected-path-value');
    const path =
      pathHidden?.value || levels.map((l) => l.name).join(' → ');
    const applicableTier = serviceData.pricingTiers?.length
      ? progressive.findApplicableTier(serviceData.pricingTiers, quantity)
      : null;

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
          name: level.name,
          path: levels
            .slice(0, i + 1)
            .map((l) => l.name)
            .join(' → '),
          pricingType: isLeaf ? pricingType : node.pricingType || 'category',
          quantity: isLeaf ? quantity : 1,
          unitPrice: isLeaf ? pricingInfo.unitPrice : nodePrice,
          lineTotal,
          tierLabel: isLeaf && applicableTier
            ? QuoteSummaryEngine.getTierLabel(applicableTier, pricingType, progressive)
            : '',
          deliveryTime: isLeaf ? pricingInfo.deliveryTime || serviceData.deliveryTime : null,
          isLeaf,
          regularPrice: isLeaf ? parseFloat(serviceData.basePrice) || 0 : nodePrice,
          savings: isLeaf
            ? Math.max(
                0,
                (pricingType === 'fixed'
                  ? parseFloat(serviceData.basePrice) || 0
                  : (parseFloat(serviceData.basePrice) || 0) * quantity) - pricingInfo.totalPrice
              )
            : 0,
        });
      });
    } else {
      const regularTotal =
        pricingType === 'fixed'
          ? parseFloat(serviceData.basePrice) || 0
          : (parseFloat(serviceData.basePrice) || 0) * quantity;
      const savings = Math.max(0, regularTotal - pricingInfo.totalPrice);

      items.push({
        fieldId,
        fieldLabel,
        name: serviceData.name || path.split(' → ').pop() || 'Selected service',
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
      });
    }

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

    return items;
  }

  static calculateTotals(lineItems, settings) {
    const subtotal = lineItems
      .filter((item) => item.isLeaf !== false)
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

  static renderLineItems(lineItems, settings, totals) {
    const sym = settings.currencySymbol || '$';
    const layout = settings.layoutStyle || 'detailed';

    if (!lineItems.length) {
      return `<div class="quotemate-summary-empty">${settings.emptyStateMessage || QuoteSummaryEngine.DEFAULTS.emptyStateMessage}</div>`;
    }

    if (layout === 'compact') {
      return `
        <ul class="quotemate-summary-lines quotemate-summary-lines--compact">
          ${lineItems
            .map(
              (item) => `
            <li class="quotemate-summary-line">
              <span class="quotemate-summary-line__name">${escapeHtml(item.name)}</span>
              <span class="quotemate-summary-line__amount">${QuoteSummaryEngine.formatMoney(item.lineTotal, sym)}</span>
            </li>`
            )
            .join('')}
        </ul>`;
    }

    if (layout === 'card') {
      return `
        <div class="quotemate-summary-cards">
          ${lineItems
            .map((item) => QuoteSummaryEngine.renderItemCard(item, settings, sym))
            .join('')}
        </div>`;
    }

    return `
      <table class="quotemate-summary-table">
        <thead>
          <tr>
            <th>Item</th>
            ${settings.showPath ? '<th>Path</th>' : ''}
            ${settings.showQuantity ? '<th>Qty</th>' : ''}
            ${settings.showPricingType ? '<th>Type</th>' : ''}
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map((item) => QuoteSummaryEngine.renderTableRow(item, settings, sym)).join('')}
        </tbody>
      </table>`;
  }

  static renderItemCard(item, settings, sym) {
    return `
      <div class="quotemate-summary-card">
        <div class="quotemate-summary-card__title">${escapeHtml(item.fieldLabel)}</div>
        <div class="quotemate-summary-card__name">${escapeHtml(item.name)}</div>
        ${settings.showPath && item.path ? `<div class="quotemate-summary-card__path">${escapeHtml(item.path)}</div>` : ''}
        ${settings.showQuantity ? `<div class="quotemate-summary-card__meta">Qty: ${item.quantity}</div>` : ''}
        ${settings.showPricingType ? `<div class="quotemate-summary-card__meta">${escapeHtml(QuoteSummaryEngine.formatPricingType(item.pricingType))}</div>` : ''}
        ${item.tierLabel ? `<div class="quotemate-summary-card__tier">Tier: ${escapeHtml(item.tierLabel)}</div>` : ''}
        ${settings.showDeliveryTime && item.deliveryTime ? `<div class="quotemate-summary-card__delivery">Delivery: ${escapeHtml(String(item.deliveryTime))} days</div>` : ''}
        ${settings.showSavingsHighlight && item.savings > 0 ? `<div class="quotemate-summary-card__savings">You save ${QuoteSummaryEngine.formatMoney(item.savings, sym)}</div>` : ''}
        <div class="quotemate-summary-card__total">${QuoteSummaryEngine.formatMoney(item.lineTotal, sym)}</div>
      </div>`;
  }

  static renderTableRow(item, settings, sym) {
    return `
      <tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong>
          ${item.tierLabel ? `<br><small class="quotemate-summary-tier">Tier: ${escapeHtml(item.tierLabel)}</small>` : ''}
          ${settings.showDeliveryTime && item.deliveryTime ? `<br><small>Delivery: ${escapeHtml(String(item.deliveryTime))} days</small>` : ''}
          ${settings.showSavingsHighlight && item.savings > 0 ? `<br><small class="quotemate-summary-savings">Save ${QuoteSummaryEngine.formatMoney(item.savings, sym)}</small>` : ''}
        </td>
        ${settings.showPath ? `<td>${escapeHtml(item.path || '—')}</td>` : ''}
        ${settings.showQuantity ? `<td>${item.quantity}</td>` : ''}
        ${settings.showPricingType ? `<td>${escapeHtml(QuoteSummaryEngine.formatPricingType(item.pricingType))}</td>` : ''}
        <td class="quotemate-summary-amount">${QuoteSummaryEngine.formatMoney(item.lineTotal, sym)}</td>
      </tr>`;
  }

  static renderTotals(totals, settings) {
    const sym = totals.symbol;
    let html = '<div class="quotemate-summary-totals">';

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

    if (settings.showGrandTotal) {
      html += `
        <div class="quotemate-summary-totals__row quotemate-summary-totals__row--grand">
          <span>Grand Total</span>
          <span>${QuoteSummaryEngine.formatMoney(totals.total, sym)}</span>
        </div>`;
    }

    html += '</div>';
    return html;
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

    const bodyEl = root.querySelector('.quotemate-form-summary__body');
    if (bodyEl) {
      bodyEl.innerHTML =
        QuoteSummaryEngine.renderLineItems(lineItems, settings, totals) +
        QuoteSummaryEngine.renderTotals(totals, settings) +
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

document.addEventListener('quotemate-form-data-ready', () => {
  setTimeout(() => QuoteSummaryEngine.refreshAllVisible(), 100);
});

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => QuoteSummaryEngine.refreshAllVisible(), 300);
});
