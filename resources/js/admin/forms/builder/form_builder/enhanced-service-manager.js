/**
 * Enhanced Service Configuration Manager
 * Supports unlimited nested hierarchies and dynamic pricing types with pricing tiers
 */
export class EnhancedServiceManager {
  constructor(formBuilder) {
    this.formBuilder = formBuilder;
    this.currentFieldId = null;
    this.branchClipboard = null;

    // Dynamic pricing types that users can configure
    this.defaultPricingTypes = [
      {
        key: 'fixed',
        label: 'Fixed Price',
        unit: 'service',
        description: 'One-time payment for the complete service'
      },
      {
        key: 'per_hour',
        label: 'Per Hour',
        unit: 'hours',
        description: 'Billed based on time spent working'
      },
      {
        key: 'per_item',
        label: 'Per Item',
        unit: 'items',
        description: 'Billed for each individual item delivered'
      },
      {
        key: 'per_page',
        label: 'Per Page',
        unit: 'pages',
        description: 'Billed for each page of content created'
      },
      {
        key: 'per_month',
        label: 'Per Month',
        unit: 'months',
        description: 'Recurring monthly subscription'
      },
      {
        key: 'per_year',
        label: 'Per Year',
        unit: 'years',
        description: 'Annual subscription or service'
      },
      {
        key: 'per_user',
        label: 'Per User',
        unit: 'users',
        description: 'Billed per user account or license'
      },
      {
        key: 'per_feature',
        label: 'Per Feature',
        unit: 'features',
        description: 'Billed for each feature or functionality'
      },
      {
        key: 'per_backlink',
        label: 'Per Backlink',
        unit: 'backlinks',
        description: 'Billed for each backlink acquired'
      },
      {
        key: 'per_post',
        label: 'Per Post',
        unit: 'posts',
        description: 'Billed for each blog post or content piece'
      },
      {
        key: 'per_campaign',
        label: 'Per Campaign',
        unit: 'campaigns',
        description: 'Billed for each marketing campaign'
      },
      {
        key: 'per_project',
        label: 'Per Project',
        unit: 'projects',
        description: 'Billed per complete project'
      }
    ];

    this.init();
  }

  init() {
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for enhanced service configuration button clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-configure-enhanced-services]')) {
        const button = e.target.closest('[data-configure-enhanced-services]');
        const fieldId = button.dataset.fieldId;
        this.openServiceConfigModal(fieldId);
      }

      // Modal event handlers
      if (e.target.closest('.enhanced-service-modal-close')) {
        const isFooterGoBack = e.target.closest('.btn-secondary.enhanced-service-modal-close');
        if (isFooterGoBack && this.currentViewParentPath !== '') {
          this.currentViewParentPath = '';
          this.refreshModal(this.getFieldData(this.currentFieldId));
        } else {
          this.closeServiceConfigModal();
        }
      }

      // Only handle these within the enhanced service modal
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-add-service-category]')) {
        const button = e.target.closest('[data-add-service-category]');
        const parentPath = button.dataset.parentPath ?? '';
        const row = button.closest('.service-flat-row');
        const fieldData = this.getFieldData(this.currentFieldId);

        if (row) {
          const typeSelect = row.querySelector('.service-pricing-type-select');
          if (this.isPerPricingTypeKey(typeSelect?.value, fieldData)) {
            return;
          }
        }

        if (parentPath === '') {
          this.addServiceCategory(parentPath);
        } else if (this.currentViewParentPath === parentPath) {
          // Already in "options for" view: + adds a new option (child service) under this parent
          this.addServiceItem(parentPath);
        } else {
          // Clicking "Add Category" on a row: save row data and show options view for that row
          this.syncRowDataFromDOM(parentPath);
          const parent = this.getServiceByPath(fieldData?.enhancedServiceStructure || [], parentPath);
          if (parent && this.isPerPricingTypeKey(parent.pricingType, fieldData)) {
            return;
          }
          this.openOptionsViewForRow(parentPath);
        }
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-back-to-main-options]')) {
        this.currentViewParentPath = '';
        this.refreshModal(this.getFieldData(this.currentFieldId));
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-options-view-path]')) {
        const btn = e.target.closest('[data-options-view-path]');
        const path = btn.getAttribute('data-options-view-path') ?? '';
        this.currentViewParentPath = path;
        this.refreshModal(this.getFieldData(this.currentFieldId));
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-hierarchy-back]')) {
        this.navigateUpOneHierarchyLevel();
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-add-service-item]')) {
        const button = e.target.closest('[data-add-service-item]');
        const parentPath = button.dataset.parentPath;
        this.addServiceItem(parentPath);
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-add-sibling-category]')) {
        const button = e.target.closest('[data-add-sibling-category]');
        const siblingPath = button.dataset.siblingPath;
        this.addSiblingCategory(siblingPath);
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-add-sibling-service]')) {
        const button = e.target.closest('[data-add-sibling-service]');
        const siblingPath = button.dataset.siblingPath;
        this.addSiblingService(siblingPath);
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-remove-service]')) {
        const button = e.target.closest('[data-remove-service]');
        const servicePath = button.dataset.servicePath;
        this.removeService(servicePath);
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-copy-service-branch]')) {
        const button = e.target.closest('[data-copy-service-branch]');
        this.copyBranch(button.dataset.servicePath);
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-paste-service-branch]')) {
        const button = e.target.closest('[data-paste-service-branch]');
        if (!button.disabled) {
          this.pasteBranch(button.dataset.servicePath);
        }
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-save-enhanced-services]')) {
        this.saveServiceConfiguration();
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-import-template]')) {
        const template = e.target.closest('[data-import-template]').dataset.template;
        this.importServiceTemplate(template);
      }

      // Pricing tier management
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-add-pricing-tier]')) {
        const button = e.target.closest('[data-add-pricing-tier]');
        const servicePath = button.dataset.servicePath;
        this.addPricingTier(servicePath);
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-remove-pricing-tier]')) {
        const button = e.target.closest('[data-remove-pricing-tier]');
        const servicePath = button.dataset.servicePath;
        const tierIndex = parseInt(button.dataset.tierIndex);
        this.removePricingTier(servicePath, tierIndex);
      }

      // Custom pricing type management
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-add-custom-pricing-type]')) {
        this.addCustomPricingType();
      }

      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-remove-custom-pricing-type]')) {
        const button = e.target.closest('[data-remove-custom-pricing-type]');
        const index = parseInt(button.dataset.index);
        this.removeCustomPricingType(index);
      }

      // Tab switching
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-tab]')) {
        const tabButton = e.target.closest('[data-tab]');
        const tabName = tabButton.dataset.tab;
        this.switchTab(tabName);
      }

      // Edit custom pricing type from service configuration
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-edit-custom-pricing-type]')) {
        const button = e.target.closest('[data-edit-custom-pricing-type]');
        const pricingTypeKey = button.dataset.pricingTypeKey;
        this.editCustomPricingType(pricingTypeKey);
      }

      // Category accordion toggle
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-toggle-category]')) {
        const button = e.target.closest('[data-toggle-category]');
        const servicePath = button.dataset.servicePath;
        this.toggleCategory(servicePath);
      }

      // Expand all categories
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-expand-all-categories]')) {
        this.expandAllCategories();
      }

      // Collapse all categories
      if (e.target.closest('.enhanced-service-config-modal') && e.target.closest('[data-collapse-all-categories]')) {
        this.collapseAllCategories();
      }
    });

    // Handle input changes
    document.addEventListener('input', (e) => {
      if (e.target.closest('.enhanced-service-config-modal')) {
        this.handleServiceInputChange(e);
      }
    });

    // Handle select changes
    document.addEventListener('change', (e) => {
      if (e.target.closest('.enhanced-service-config-modal')) {
        this.handleServiceInputChange(e);
      }
    });
  }

  openServiceConfigModal(fieldId) {
    this.currentFieldId = fieldId;
    const fieldData = this.getFieldData(fieldId);

    if (!fieldData) {
      this.showNotification('Error: Field not found.', 'error');
      return;
    }

    // Initialize enhanced service structure
    if (!fieldData.enhancedServiceStructure) {
      fieldData.enhancedServiceStructure = [];
    }

    fieldData.enhancedServiceStructure = this.stripLegacyPageBreaks(fieldData.enhancedServiceStructure);

    // If there are no categories yet, start with a single empty row
    if (fieldData.enhancedServiceStructure.length === 0) {
      fieldData.enhancedServiceStructure.push({
        name: '',
        type: 'service',
        pricingType: 'fixed',
        basePrice: 0
      });
    }

    this.currentViewParentPath = '';

    const modalHtml = this.generateServiceConfigModal(fieldData);

    // Remove existing modal
    const existingModal = document.querySelector('.enhanced-service-config-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = document.querySelector('.enhanced-service-config-modal-overlay');
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  generateServiceConfigModal(fieldData) {
    const services = fieldData?.enhancedServiceStructure || [];
    const customPricingTypes = fieldData?.customPricingTypes || [];
    const topLevelWithPaths = (services || []).map((s, i) => ({ service: s, path: String(i) })).filter(x => x.service.type !== 'page_break');
    const serviceLabel = fieldData?.serviceStructureLabel || '';
    const maxDropdownsDesktop = Math.min(12, Math.max(1, parseInt(fieldData?.maxDropdownsPerPageDesktop, 10) || 3));
    const serviceMaxQuantity = parseInt(fieldData?.serviceMaxQuantity, 10) || '';
    const maxDropdownOptions = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((n) => `<option value="${n}" ${n === maxDropdownsDesktop ? 'selected' : ''}>${n}</option>`)
      .join('');

    return `
      <div class="enhanced-service-config-modal-overlay">
        <div class="enhanced-service-config-modal">
          <div class="enhanced-service-modal-header">
            <h3>Service Configuration</h3>
            <button type="button" class="enhanced-service-modal-close">×</button>
          </div>
          
          <div class="enhanced-service-modal-body">
            <div class="enhanced-service-tabs">
              <button type="button" class="tab-button active" data-tab="general">General</button>
              <button type="button" class="tab-button" data-tab="structure">Structure</button>
              <button type="button" class="tab-button" data-tab="pricing-types">Pricing Types</button>
            </div>

            <div class="tab-panel active" data-panel="general">
              <div class="service-general-settings">
                <h4>General Settings</h4>
                <div class="service-general-field">
                  <label for="max-dropdowns-desktop-${this.currentFieldId}">Maximum Dropdowns Per Page (Desktop)</label>
                  <select
                    class="service-input"
                    id="max-dropdowns-desktop-${this.currentFieldId}"
                    data-field="maxDropdownsPerPageDesktop"
                  >${maxDropdownOptions}</select>
                  <p class="service-general-hint">
                    Tablet always shows up to 2 dropdowns per page. Mobile always shows 1 per page.
                    When the limit is reached, remaining dropdowns continue on the next page.
                  </p>
                </div>
                <div class="service-general-field">
                  <label for="service-max-quantity-${this.currentFieldId}">Maximum Quantity</label>
                  <input
                    type="number"
                    class="service-input"
                    id="service-max-quantity-${this.currentFieldId}"
                    data-field="serviceMaxQuantity"
                    list="service-max-quantity-presets-${this.currentFieldId}"
                    min="1"
                    step="1"
                    placeholder="e.g. 10, 50, 100, 500"
                    value="${serviceMaxQuantity}">
                  <datalist id="service-max-quantity-presets-${this.currentFieldId}">
                    <option value="10"></option>
                    <option value="50"></option>
                    <option value="100"></option>
                    <option value="500"></option>
                  </datalist>
                  <p class="service-general-hint">
                    Limits how high customers can set quantity for Per pricing types on the frontend.
                    Leave empty for no limit.
                  </p>
                </div>
              </div>
            </div>

            <!-- Structure Tab - Image design: Create Your Service Structure + Label + flat rows -->
            <div class="tab-panel" data-panel="structure">
              <div class="service-structure-create">
                <h4>Create Your Service Structure</h4>
                <div class="service-structure-label-field">
                  <label>Label</label>
                  <input type="text" class="service-input service-label-input" placeholder="e.g Cars, House, Year" value="${(serviceLabel || '').replace(/"/g, '&quot;')}" data-field="serviceStructureLabel">
                </div>
              </div>
              
              <div class="enhanced-service-structure-container">
                ${topLevelWithPaths.length === 0 ? this.generateAddCategoryRowOnlyHtml() : this.generateFlatCategoryRowsHtml(topLevelWithPaths)}
              </div>
            </div>
            
            <!-- Pricing Types Tab -->
            <div class="tab-panel" data-panel="pricing-types">
              <div class="pricing-types-header">
                <h4>Custom Pricing Types</h4>
                <button type="button" class="btn btn-primary" data-add-custom-pricing-type>
                  Add Custom Type
                </button>
              </div>
              
              <div class="pricing-types-list">
                <h5>Default Pricing Types</h5>
                ${this.generateDefaultPricingTypesHtml()}
                
                <div class="custom-pricing-types-section">
                  ${customPricingTypes.length > 0 ? `
                    <h5>Custom Pricing Types</h5>
                    ${this.generateCustomPricingTypesHtml(customPricingTypes)}
                  ` : `
                    <h5>Custom Pricing Types</h5>
                    <p class="no-custom-types">No custom pricing types added yet.</p>
                  `}
                </div>
              </div>
            </div>
          </div>
          
          <div class="enhanced-service-modal-footer">
            <button type="button" class="btn btn-secondary enhanced-service-modal-close">Go Back</button>
            <button type="button" class="btn btn-primary" data-save-enhanced-services>Save Configuration</button>
          </div>
        </div>
      </div>
    `;
  }

  getPricingTypeLabel(pricingTypeKey, fieldData) {
    if (!pricingTypeKey) return '';

    const customPricingTypes = fieldData?.customPricingTypes || [];
    const allPricingTypes = [...this.defaultPricingTypes, ...customPricingTypes];
    const match = allPricingTypes.find((type) => type.key === pricingTypeKey);

    if (match?.label) {
      return String(match.label).trim();
    }

    const key = String(pricingTypeKey).toLowerCase();
    if (key.startsWith('per_')) {
      const words = key.slice(4).replace(/_/g, ' ');
      return `Per ${words.charAt(0).toUpperCase()}${words.slice(1)}`;
    }

    return String(pricingTypeKey).trim();
  }

  isPerPricingTypeKey(pricingTypeKey, fieldData) {
    if (!pricingTypeKey) return false;

    const label = this.getPricingTypeLabel(pricingTypeKey, fieldData);
    if (label.startsWith('Per')) {
      return true;
    }

    return String(pricingTypeKey).toLowerCase().startsWith('per_');
  }

  updateAddCategoryVisibilityForRow(row, fieldData) {
    if (!row) return;

    const typeSelect = row.querySelector('.service-pricing-type-select');
    const pricingTypeKey = typeSelect?.value || '';
    const hidePerTypeControls = this.isPerPricingTypeKey(pricingTypeKey, fieldData);

    row.querySelectorAll('.btn-add-category, .btn-add-row').forEach((button) => {
      button.hidden = hidePerTypeControls;
      button.classList.toggle('is-per-type-hidden', hidePerTypeControls);
      button.setAttribute('aria-hidden', hidePerTypeControls ? 'true' : 'false');
    });
  }

  updateAllAddCategoryVisibility(fieldData) {
    document
      .querySelectorAll('.enhanced-service-structure-container .service-flat-row')
      .forEach((row) => this.updateAddCategoryVisibilityForRow(row, fieldData));
  }

  generateFlatCategoryRowsHtml(topLevelWithPaths, options = {}) {
    const { isChildView = false, parentPath = '' } = options;
    const fieldData = this.getFieldData(this.currentFieldId) || {};
    const customPricingTypes = fieldData.customPricingTypes || [];
    const allPricingTypes = [...this.defaultPricingTypes, ...customPricingTypes];
    const addRowParentPath = isChildView ? parentPath : '';

    return topLevelWithPaths.map(({ service, path: servicePath }) => {
      const name = (service.name || '').replace(/"/g, '&quot;');
      const price = service.basePrice ?? service.price ?? '';
      const hideAddCategory = this.isPerPricingTypeKey(service.pricingType, fieldData);
      const perTypeHiddenAttrs = hideAddCategory ? ' hidden aria-hidden="true"' : '';
      const perTypeHiddenClass = hideAddCategory ? ' is-per-type-hidden' : '';
      const pasteDisabled = !this.canPasteBranchTo(servicePath);
      const pasteDisabledAttr = pasteDisabled ? ' disabled' : '';
      const hasClipboard =
        this.branchClipboard && this.branchClipboard.fieldId === this.currentFieldId;

      return `
        <div class="service-flat-row" data-service-path="${servicePath}">
          <input 
            type="text" 
            class="service-input service-name-input" 
            placeholder="${isChildView ? 'Option name' : 'Category name'}" 
            value="${name}" 
            data-field="name" 
            data-service-path="${servicePath}">

          <select 
            class="service-input service-pricing-type-select" 
            data-field="pricingType" 
            data-service-path="${servicePath}">
            <option value="">Price type</option>
            ${allPricingTypes.map(type => `
              <option value="${type.key}" ${service.pricingType === type.key ? 'selected' : ''}>
                ${type.label}
              </option>
            `).join('')}
          </select>

          <input 
            type="number" 
            class="service-input service-price-input" 
            placeholder="Price (Optional)" 
            value="${price}" 
            step="0.01"
            min="0"
            data-field="basePrice" 
            data-service-path="${servicePath}">

          <button 
            type="button" 
            class="btn-icon btn-add-row${perTypeHiddenClass}" 
            data-add-service-category 
            data-parent-path="${addRowParentPath}" 
            title="${isChildView ? 'Add new option' : 'Add new row'}"${perTypeHiddenAttrs}>
            +
          </button>
          <button
            type="button"
            class="btn-icon btn-copy-branch"
            data-copy-service-branch
            data-service-path="${servicePath}"
            title="Copy Branch">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button
            type="button"
            class="btn-icon btn-paste-branch${hasClipboard ? ' has-clipboard' : ''}"
            data-paste-service-branch
            data-service-path="${servicePath}"
            title="Paste Branch"
            ${pasteDisabledAttr}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect></svg>
          </button>
          <button type="button" class="btn-icon btn-delete" data-remove-service data-service-path="${servicePath}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
          <button type="button" class="btn-add-category${perTypeHiddenClass}" data-add-service-category data-parent-path="${servicePath}"${perTypeHiddenAttrs}>Add Category</button>
        </div>
      `;
    }).join('');
  }

  /** When there are no categories, show only the Add Category row (matches screenshot, no old empty state). */
  generateAddCategoryRowOnlyHtml() {
    return `
      <div class="service-add-icon-wrapper">
        <button 
          type="button" 
          class="btn-add-category-icon" 
          data-add-service-category 
          data-parent-path="">
          +
        </button>
      </div>`;
  }

  generateServiceTreeHtml(services, parentPath = '', depth = 0) {
    return services.map((service, index) => {
      const servicePath = parentPath ? `${parentPath}.${index}` : `${index}`;

      // Check if this is the last sibling (excluding page breaks)
      const nonPageBreakServices = services.filter(s => s.type !== 'page_break');
      const isLastNonPageBreakSibling = service.type !== 'page_break' &&
        nonPageBreakServices[nonPageBreakServices.length - 1] === service;
      const hasNoChildren = !service.children || service.children.length === 0;
      const isLastSibling = isLastNonPageBreakSibling && hasNoChildren;

      if (service.type === 'page_break') {
        return `
          <div class="enhanced-service-node page-break-node" data-service-path="${servicePath}">
            <div class="page-break-indicator">
              <span class="page-break-line"></span>
              <span class="page-break-label">PAGE BREAK</span>
              <span class="page-break-line"></span>
              <button type="button" class="page-break-remove-btn" 
                      data-remove-service 
                      data-service-path="${servicePath}"
                      title="Remove Page Break">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        `;
      }

      const isCategory = service.type === 'category' || (!service.type && service.children);
      const hasChildren = service.children && service.children.length > 0;
      const isCollapsed = service.isCollapsed !== undefined ? service.isCollapsed : false;

      return `
        <div class="enhanced-service-node" data-service-path="${servicePath}" data-depth="${depth}">
          <div class="enhanced-service-node-header ${isCategory ? 'category-header' : 'item-header'}">
            <div class="service-node-content">
              ${isCategory ? `
                <div class="category-toggle-section">
                  <button type="button" class="category-toggle-btn ${hasChildren ? 'has-children' : ''} ${isCollapsed ? 'collapsed' : ''}" 
                          data-toggle-category 
                          data-service-path="${servicePath}"
                          title="${isCollapsed ? 'Expand category' : 'Collapse category'}">
                    <svg class="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </button>
                  <div class="category-info">
                    <input type="text" 
                           class="service-input service-name-input category-name" 
                           placeholder="Category name" 
                           value="${service.name || ''}"
                           data-field="name"
                           data-service-path="${servicePath}">
                    <span class="category-item-count">${hasChildren ? `${service.children.length} item${service.children.length !== 1 ? 's' : ''}` : '0 items'}</span>
                  </div>
                </div>
              ` : `
                <input type="text" 
                       class="service-input service-name-input" 
                       placeholder="Service name" 
                       value="${service.name || ''}"
                       data-field="name"
                       data-service-path="${servicePath}">
              `}
              
              <select class="service-input service-type-select" 
                      data-field="type"
                      data-service-path="${servicePath}">
                <option value="category" ${service.type === 'category' ? 'selected' : ''}>Category</option>
                <option value="service" ${service.type === 'service' ? 'selected' : ''}>Service</option>
              </select>
              
              ${service.type === 'service' ? this.generateServiceItemConfigHtml(service, servicePath) : ''}
            </div>
            
            <div class="enhanced-service-node-actions">
              ${isCategory ? `
                <button type="button" class="btn btn-sm btn-primary" 
                        data-add-service-category 
                        data-parent-path="${servicePath}"
                        title="Add Child Category (will be nested under this category)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7"></path>
                    <path d="M3 7H21L19.5 19.5C19.3056 20.8889 18.1611 21.9167 16.7639 21.9167H7.23611C5.83889 21.9167 4.69444 20.8889 4.5 19.5L3 7Z"></path>
                  </svg>
                  ↳ Category
                </button>
                <button type="button" class="btn btn-sm btn-secondary" 
                        data-add-service-item 
                        data-parent-path="${servicePath}"
                        title="Add Child Service (will be nested under this category)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                  </svg>
                  ↳ Service
                </button>
              ` : `
                <button type="button" class="btn btn-sm btn-secondary" 
                        data-add-service-item 
                        data-parent-path="${servicePath}"
                        title="Add Child Service (will be nested under this service)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                  </svg>
                  ↳ Service
                </button>
              `}
              
              <button type="button" class="btn btn-sm btn-danger" 
                      data-remove-service 
                      data-service-path="${servicePath}"
                      title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Remove
              </button>
            </div>
          </div>
          
          ${hasChildren ? `
            <div class="enhanced-service-node-children ${isCollapsed ? 'collapsed' : ''}" data-children-for="${servicePath}">
              ${this.generateServiceTreeHtml(service.children, servicePath, depth + 1)}
            </div>
          ` : service.children && service.children.length === 0 && service.type === 'category' ? `
            <div class="enhanced-service-node-children enhanced-empty-children ${isCollapsed ? 'collapsed' : ''}" data-children-for="${servicePath}">
              <div class="empty-children-message">
                <span>No child items yet. Use the buttons above to add child categories or services.</span>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  generateServiceItemConfigHtml(service, servicePath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const customPricingTypes = fieldData?.customPricingTypes || [];
    const allPricingTypes = [...this.defaultPricingTypes, ...customPricingTypes];

    return `
        <div class="enhanced-service-item-config" >
        <div class="service-pricing-row">
          <select class="service-input pricing-type-select" 
                  data-field="pricingType"
                  data-service-path="${servicePath}">
            <option value="">Select pricing type...</option>
            
            ${customPricingTypes.length > 0 ? `
              <optgroup label="Custom Pricing Types">
                ${customPricingTypes.map(type => `
                  <option value="${type.key}" ${service.pricingType === type.key ? 'selected' : ''}>
                    ${type.label} (per ${type.unit})
                  </option>
                `).join('')}
              </optgroup>
            ` : ''}
            
            <optgroup label="Default Pricing Types">
              ${this.defaultPricingTypes.map(type => `
                <option value="${type.key}" ${service.pricingType === type.key ? 'selected' : ''}>
                  ${type.label} (per ${type.unit})
                </option>
              `).join('')}
            </optgroup>
          </select>
          
          <div class="price-input-group">
            <span class="price-prefix">$</span>
            <input type="number" 
                   class="service-input price-input" 
                   placeholder="0.00" 
                   value="${service.basePrice || ''}"
                   step="0.01"
                   min="0"
                   data-field="basePrice"
                   data-service-path="${servicePath}">
          </div>
        </div>
        
        <!--Pricing Type Info-- >
        ${service.pricingType ? this.generatePricingTypeInfo(service, servicePath) : ''}
        
        <!--Pricing Tiers Section-- >
        <div class="pricing-tiers-section">
          <div class="tiers-header">
            <h5>Pricing Tiers</h5>
            <button type="button" class="btn btn-sm btn-primary" data-add-pricing-tier data-service-path="${servicePath}">
              Add Tier
            </button>
          </div>
          
          <div class="pricing-tiers-container" data-service-path="${servicePath}">
            ${this.generatePricingTiersHtml(service, servicePath)}
          </div>
        </div>
        
        <!--Service Constraints-- >
        <div class="service-constraints">
          ${service.pricingType && service.pricingType !== 'fixed' ? `
            <div class="constraint-row">
              <label>Min Quantity:</label>
              <input type="number" 
                     class="service-input constraint-input" 
                     placeholder="1" 
                     value="${service.minQuantity || ''}"
                     min="1"
                     data-field="minQuantity"
                     data-service-path="${servicePath}">
              
              <label>Max Quantity:</label>
              <input type="number" 
                     class="service-input constraint-input" 
                     placeholder="∞" 
                     value="${service.maxQuantity || ''}"
                     min="1"
                     data-field="maxQuantity"
                     data-service-path="${servicePath}">
            </div>
          ` : ''}
          
          <div class="constraint-row">
            <label>Default Delivery:</label>
            <input type="number" 
                   class="service-input constraint-input" 
                   placeholder="7" 
                   value="${service.deliveryTime || ''}"
                   min="1"
                   data-field="deliveryTime"
                   data-service-path="${servicePath}">
            <span class="constraint-unit">days</span>
          </div>
        </div>
        
        <!--Service Description-- >
        <textarea class="service-input service-description-input"
          placeholder="Service description (what's included, deliverables, etc.)"
          data-field="description"
          data-service-path="${servicePath}"
          rows="2">${service.description || ''}</textarea>
      </div>
        `;
  }

  // Generate pricing type information display
  generatePricingTypeInfo(service, servicePath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const allPricingTypes = [...this.defaultPricingTypes, ...(fieldData?.customPricingTypes || [])];
    const selectedType = allPricingTypes.find(type => type.key === service.pricingType);

    if (!selectedType) return '';

    const isCustom = fieldData?.customPricingTypes?.some(type => type.key === service.pricingType);

    return `
        <div class="pricing-type-info-display ${isCustom ? 'custom-type' : 'default-type'}" >
        <div class="pricing-type-badge">
          ${isCustom ? 'Custom' : 'Default'}
        </div>
        <div class="pricing-type-details">
          <strong>${selectedType.label}</strong>
          <span class="pricing-unit">per ${selectedType.unit}</span>
          ${selectedType.description ? `<p class="pricing-description">${selectedType.description}</p>` : ''}
        </div>
        ${isCustom ? `
          <button type="button" class="btn btn-sm btn-outline" 
                  data-edit-custom-pricing-type 
                  data-pricing-type-key="${service.pricingType}">
            Edit Type
          </button>
        ` : ''
      }
      </div>
        `;
  }

  // Pricing Tiers Management
  generatePricingTiersHtml(service, servicePath) {
    const pricingTiers = service.pricingTiers || [];

    if (pricingTiers.length === 0) {
      return `
        <div class="no-tiers-message" >
          <p>No pricing tiers configured. Add tiers for different quantity ranges with different prices.</p>
        </div>
        `;
    }

    return pricingTiers.map((tier, index) => `
        <div class="pricing-tier-item" data-tier-index="${index}" >
        <div class="tier-header">
          <span class="tier-label">Tier ${index + 1}</span>
          <button type="button" class="btn btn-sm btn-danger" data-remove-pricing-tier data-service-path="${servicePath}" data-tier-index="${index}">
            Remove
          </button>
        </div>
        
        <div class="tier-inputs">
          <div class="tier-range">
            <label>Min:</label>
            <input type="number" 
                   class="service-input tier-input" 
                   placeholder="1" 
                   value="${tier.minQuantity || ''}"
                   min="1"
                   data-field="minQuantity"
                   data-service-path="${servicePath}"
                   data-tier-index="${index}">
            
            <label>Max:</label>
            <input type="number" 
                   class="service-input tier-input" 
                   placeholder="∞" 
                   value="${tier.maxQuantity || ''}"
                   min="1"
                   data-field="maxQuantity"
                   data-service-path="${servicePath}"
                   data-tier-index="${index}">
          </div>
          
          <div class="tier-pricing">
            <label>Price:</label>
            <div class="price-input-group">
              <span class="price-prefix">$</span>
              <input type="number" 
                     class="service-input tier-price-input" 
                     placeholder="0.00" 
                     value="${tier.price || ''}"
                     step="0.01"
                     min="0"
                     data-field="price"
                     data-service-path="${servicePath}"
                     data-tier-index="${index}">
            </div>
          </div>
          
          <div class="tier-delivery">
            <label>Delivery:</label>
            <input type="number" 
                   class="service-input tier-input" 
                   placeholder="7" 
                   value="${tier.deliveryTime || ''}"
                   min="1"
                   data-field="deliveryTime"
                   data-service-path="${servicePath}"
                   data-tier-index="${index}">
            <span class="constraint-unit">days</span>
          </div>
        </div>
      </div>
      `).join('');
  }

  addPricingTier(servicePath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const service = this.getServiceByPath(fieldData.enhancedServiceStructure, servicePath);

    if (!service) {
      return;
    }

    if (!service.pricingTiers) {
      service.pricingTiers = [];
    }

    const newTier = {
      minQuantity: 1,
      maxQuantity: null,
      price: 0,
      deliveryTime: service.deliveryTime || 7
    };

    service.pricingTiers.push(newTier);
    this.refreshModal(fieldData);
  }

  removePricingTier(servicePath, tierIndex) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const service = this.getServiceByPath(fieldData.enhancedServiceStructure, servicePath);

    if (service && service.pricingTiers) {
      service.pricingTiers.splice(tierIndex, 1);
      this.refreshModal(fieldData);
    }
  }

  // Custom Pricing Types Management
  addCustomPricingType() {
    const fieldData = this.getFieldData(this.currentFieldId);

    if (!fieldData.customPricingTypes) {
      fieldData.customPricingTypes = [];
    }

    // Check if we already have too many custom types (limit to 20 for performance)
    if (fieldData.customPricingTypes.length >= 20) {
      this.showNotification('Maximum 20 custom pricing types allowed.', 'error');
      return;
    }

    const newPricingType = {
      key: `custom_${Date.now()} `,
      label: '',
      unit: '',
      description: '',
      isNew: true // Flag to indicate this is a newly added type
    };

    fieldData.customPricingTypes.push(newPricingType);

    // Refresh the pricing types tab immediately
    this.refreshPricingTypesTab(fieldData);

    // Focus on the first input field of the new pricing type
    setTimeout(() => {
      const newIndex = fieldData.customPricingTypes.length - 1;
      const labelInput = document.querySelector(`[data-custom-pricing-index= "${newIndex}"][data - field="label"]`);
      if (labelInput) {
        labelInput.focus();
        labelInput.select();
      }
    }, 100);

    // Show success message
    this.showNotification('Custom pricing type added! Fill in the details above.', 'success');
  }

  // Refresh only the pricing types tab
  refreshPricingTypesTab(fieldData) {
    const pricingTypesList = document.querySelector('.pricing-types-list');
    if (pricingTypesList) {
      const customPricingTypes = fieldData?.customPricingTypes || [];

      // Update the custom pricing types section
      const customTypesSection = pricingTypesList.querySelector('.custom-pricing-types-section');
      if (customTypesSection) {
        if (customPricingTypes.length > 0) {
          customTypesSection.innerHTML = `
        <h5> Custom Pricing Types</h5>
          ${this.generateCustomPricingTypesHtml(customPricingTypes)}
      `;
        } else {
          customTypesSection.innerHTML = `
        <h5> Custom Pricing Types</h5>
          <p class="no-custom-types">No custom pricing types added yet.</p>
      `;
        }
      }
    }
  }

  removeCustomPricingType(index) {
    const fieldData = this.getFieldData(this.currentFieldId);

    if (fieldData.customPricingTypes && fieldData.customPricingTypes[index]) {
      const removedType = fieldData.customPricingTypes[index];

      // Check if this pricing type is being used by any services
      const isUsed = this.isPricingTypeUsed(fieldData.enhancedServiceStructure, removedType.key);

      if (isUsed) {
        this.showNotification('Cannot remove: This pricing type is being used by services. Change those services first.', 'error');
        return;
      }

      // Show confirmation popup
      this.showRemoveConfirmation(removedType, index);
    }
  }

  // Show confirmation popup for removing pricing type
  showRemoveConfirmation(pricingType, index) {
    const confirmHtml = `
        <div class="remove-confirmation-overlay" >
          <div class="remove-confirmation-modal">
            <div class="confirmation-header">
              <h4>Remove Pricing Type</h4>
              <button type="button" class="confirmation-close">×</button>
            </div>
            <div class="confirmation-body">
              <p>Are you sure you want to remove this pricing type?</p>
              <div class="pricing-type-preview">
                <strong>${pricingType.label || 'Unnamed Pricing Type'}</strong>
                <span class="pricing-unit">per ${pricingType.unit || 'unit'}</span>
                ${pricingType.description ? `<p class="pricing-description">${pricingType.description}</p>` : ''}
              </div>
              <p class="warning-text">This action cannot be undone.</p>
            </div>
            <div class="confirmation-footer">
              <button type="button" class="btn btn-secondary cancel-remove">Cancel</button>
              <button type="button" class="btn btn-danger confirm-remove" data-index="${index}">Remove</button>
            </div>
          </div>
      </div>
        `;

    // Remove existing confirmation if any
    const existingConfirmation = document.querySelector('.remove-confirmation-overlay');
    if (existingConfirmation) {
      existingConfirmation.remove();
    }

    // Add confirmation to DOM
    document.body.insertAdjacentHTML('beforeend', confirmHtml);

    // Show confirmation
    const confirmation = document.querySelector('.remove-confirmation-overlay');
    requestAnimationFrame(() => {
      confirmation.classList.add('show');
    });

    // Add event listeners
    const closeBtn = confirmation.querySelector('.confirmation-close');
    const cancelBtn = confirmation.querySelector('.cancel-remove');
    const confirmBtn = confirmation.querySelector('.confirm-remove');

    const closeConfirmation = () => {
      confirmation.classList.remove('show');
      setTimeout(() => confirmation.remove(), 300);
    };

    closeBtn.addEventListener('click', closeConfirmation);
    cancelBtn.addEventListener('click', closeConfirmation);
    confirmBtn.addEventListener('click', () => {
      this.confirmRemovePricingType(index);
      closeConfirmation();
    });

    // Close on overlay click
    confirmation.addEventListener('click', (e) => {
      if (e.target === confirmation) {
        closeConfirmation();
      }
    });
  }

  // Confirm removal of pricing type
  confirmRemovePricingType(index) {
    const fieldData = this.getFieldData(this.currentFieldId);

    if (fieldData.customPricingTypes && fieldData.customPricingTypes[index]) {
      const removedType = fieldData.customPricingTypes[index];
      fieldData.customPricingTypes.splice(index, 1);
      this.refreshPricingTypesTab(fieldData);
      this.showNotification(`"${removedType.label || 'Unnamed Pricing Type'}" has been removed.`, 'success');
    }
  }

  // Helper method to check if a pricing type is being used
  isPricingTypeUsed(services, pricingTypeKey) {
    if (!services || !Array.isArray(services)) return false;

    for (const service of services) {
      if (service.pricingType === pricingTypeKey) {
        return true;
      }
      if (service.children && service.children.length > 0) {
        if (this.isPricingTypeUsed(service.children, pricingTypeKey)) {
          return true;
        }
      }
    }
    return false;
  }

  // Edit custom pricing type
  editCustomPricingType(pricingTypeKey) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const customPricingTypes = fieldData?.customPricingTypes || [];
    const pricingTypeIndex = customPricingTypes.findIndex(type => type.key === pricingTypeKey);

    if (pricingTypeIndex === -1) {
      this.showNotification('Pricing type not found.', 'error');
      return;
    }

    // Switch to pricing types tab
    this.switchTab('pricing-types');

    // Scroll to the specific pricing type
    setTimeout(() => {
      const pricingTypeElement = document.querySelector(`[data-custom-pricing-index= "${pricingTypeIndex}"]`);
      if (pricingTypeElement) {
        pricingTypeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pricingTypeElement.focus();
      }
    }, 100);

    this.showNotification('Switched to pricing types tab. You can now edit the pricing type.', 'info');
  }

  // Toggle category accordion
  toggleCategory(servicePath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const service = this.getServiceByPath(fieldData.enhancedServiceStructure, servicePath);

    if (!service) {
      return;
    }

    // Toggle the collapsed state
    service.isCollapsed = !service.isCollapsed;

    // Update the UI
    const toggleButton = document.querySelector(`[data-toggle-category][data-service-path= "${servicePath}"]`);
    const childrenContainer = document.querySelector(`[data-children-for= "${servicePath}"]`);

    if (toggleButton && childrenContainer) {
      // Update button state
      toggleButton.classList.toggle('collapsed', service.isCollapsed);
      toggleButton.title = service.isCollapsed ? 'Expand category' : 'Collapse category';

      // Update children container
      childrenContainer.classList.toggle('collapsed', service.isCollapsed);

      // Update item count if it exists
      const itemCount = toggleButton.closest('.category-toggle-section').querySelector('.category-item-count');
      if (itemCount && service.children) {
        itemCount.textContent = service.children.length > 0 ?
          `${service.children.length} item${service.children.length !== 1 ? 's' : ''} ` :
          '0 items';
      }
    }
  }

  // Expand all categories
  expandAllCategories() {
    const fieldData = this.getFieldData(this.currentFieldId);
    this.setAllCategoriesCollapsed(fieldData.enhancedServiceStructure, false);
    this.refreshModal(fieldData);
    this.showNotification('All categories expanded.', 'success');
  }

  // Collapse all categories
  collapseAllCategories() {
    const fieldData = this.getFieldData(this.currentFieldId);
    this.setAllCategoriesCollapsed(fieldData.enhancedServiceStructure, true);
    this.refreshModal(fieldData);
    this.showNotification('All categories collapsed.', 'success');
  }

  // Helper method to set all categories collapsed state
  setAllCategoriesCollapsed(services, collapsed) {
    if (!services || !Array.isArray(services)) return;

    for (const service of services) {
      if (service.type === 'category' || (!service.type && service.children)) {
        service.isCollapsed = collapsed;
        if (service.children && service.children.length > 0) {
          this.setAllCategoriesCollapsed(service.children, collapsed);
        }
      }
    }
  }

  // Tab Management
  switchTab(tabName) {
    const modal = document.querySelector('.enhanced-service-config-modal');
    if (!modal) return;

    // Update tab buttons
    const tabButtons = modal.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // Update tab panels
    const tabPanels = modal.querySelectorAll('[data-panel]');
    tabPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.dataset.panel === tabName) {
        panel.classList.add('active');
      }
    });
  }

  generateDefaultPricingTypesHtml() {
    return this.defaultPricingTypes.map(type => `
        <div class="pricing-type-item default-type" >
        <div class="pricing-type-info">
          <div class="pricing-type-header">
            <span class="pricing-type-label">${type.label}</span>
            <span class="pricing-type-unit">per ${type.unit}</span>
          </div>
          ${type.description ? `<p class="pricing-type-description">${type.description}</p>` : ''}
        </div>
        <span class="pricing-type-badge">Default</span>
      </div>
        `).join('');
  }

  generateCustomPricingTypesHtml(customTypes) {
    return customTypes.map((type, index) => `
        <div class="pricing-type-item custom-type ${type.isNew ? 'new-pricing-type' : ''}" >
        <div class="pricing-type-header">
          <h6>Custom Pricing Type #${index + 1}${type.isNew ? ' <span class="new-badge">NEW</span>' : ''}</h6>
          <button type="button" class="btn btn-icon btn-sm btn-danger" 
                  data-remove-custom-pricing-type 
                  data-index="${index}"
                  title="Remove this pricing type">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="pricing-type-inputs">
          <div class="input-group">
            <label>Pricing Type Name: <span class="required">*</span></label>
            <input type="text" 
                   class="service-input ${type.isNew ? 'highlight-input' : ''}" 
                   placeholder="e.g., Per Square Foot, Per Word, Per Design"
                   value="${type.label || ''}"
                   data-field="label"
                   data-custom-pricing-index="${index}">
          </div>
          <div class="input-group">
            <label>Unit Name: <span class="required">*</span></label>
            <input type="text" 
                   class="service-input ${type.isNew ? 'highlight-input' : ''}" 
                   placeholder="e.g., sq ft, words, designs"
                   value="${type.unit || ''}"
                   data-field="unit"
                   data-custom-pricing-index="${index}">
          </div>
          <div class="input-group">
            <label>Description (Optional):</label>
            <textarea class="service-input" 
                      placeholder="Brief description of this pricing type"
                      data-field="description"
                      data-custom-pricing-index="${index}"
                      rows="2">${type.description || ''}</textarea>
          </div>
        </div>
        <div class="pricing-type-preview">
          <small>Preview: $0.00 per ${type.unit || 'unit'}</small>
          ${type.isNew ? '<small class="new-hint">Fill in the details above to complete this pricing type</small>' : ''}
        </div>
      </div>
        `).join('');
  }

  /** Sync current row values from DOM into the service at servicePath */
  syncRowDataFromDOM(servicePath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData?.enhancedServiceStructure) return;

    const row = document.querySelector(`.enhanced-service-structure-container .service-flat-row[data-service-path="${servicePath}"]`);
    if (!row) return;

    const nameInput = row.querySelector('.service-name-input');
    const typeSelect = row.querySelector('.service-pricing-type-select');
    const priceInput = row.querySelector('.service-price-input');

    const service = this.getServiceByPath(fieldData.enhancedServiceStructure, servicePath);
    if (!service) return;

    if (nameInput) service.name = nameInput.value.trim();
    if (typeSelect) service.pricingType = typeSelect.value || 'fixed';
    if (priceInput) service.basePrice = parseFloat(priceInput.value) || 0;
  }

  /**
   * Breadcrumb trail + hierarchy back control for nested Structure views.
   */
  generateOptionsViewBreadcrumbSection(fieldData) {
    const breadcrumb = this.getOptionsViewBreadcrumb(fieldData);
    const breadcrumbHtml = breadcrumb
      .map((segment, index) => {
        const escaped = (segment.label || 'Options')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/"/g, '&quot;');
        const pathAttr =
          segment.path === ''
            ? 'data-options-view-path=""'
            : `data-options-view-path="${segment.path.replace(/"/g, '&quot;')}"`;
        const isLast = index === breadcrumb.length - 1;
        return `${index > 0 ? '<span class="service-breadcrumb-sep">→</span>' : ''}<button type="button" class="service-breadcrumb-item${isLast ? ' is-current' : ''}" ${pathAttr}>${escaped}</button>`;
      })
      .join('');

    return `
      <div class="service-options-view-header">
        <div class="service-options-breadcrumb" role="navigation" aria-label="Service structure hierarchy">
          <div class="service-options-breadcrumb__trail">
            ${breadcrumbHtml}
          </div>
          ${this.generateHierarchyBackButtonHtml()}
        </div>
      </div>`;
  }

  generateHierarchyBackButtonHtml() {
    return `
      <button
        type="button"
        class="service-breadcrumb-back-btn"
        data-hierarchy-back
        title="Back to Previous Level"
        aria-label="Back to Previous Level">
        <span class="service-breadcrumb-back-btn__icon" aria-hidden="true">←</span>
      </button>`;
  }

  /**
   * Build breadcrumb segments for the options view: e.g. [{ label: 'Cars', path: '' }, { label: 'models', path: '0' }, { label: 'years', path: '0.0' }]
   * Each path is the view to show when that segment is clicked.
   */
  getOptionsViewBreadcrumb(fieldData) {
    const segments = [];
    const topLabel = (fieldData?.serviceStructureLabel || '').trim() || 'Options';
    segments.push({ label: topLabel, path: '' });

    const currentPath = this.currentViewParentPath || '';
    if (!currentPath) return segments;

    const pathParts = currentPath.split('.').filter(Boolean);
    const structure = fieldData?.enhancedServiceStructure || [];

    for (let i = 0; i < pathParts.length; i++) {
      const path = pathParts.slice(0, i + 1).join('.');
      const parent = this.getServiceByPath(structure, path);
      const label = (parent?.optionsLabel || parent?.name || '').trim() || 'Options';
      segments.push({ label, path });
    }
    return segments;
  }

  /**
   * Find a non-empty optionsLabel from siblings at the same level.
   * Used to auto-fill newly opened categories with a consistent child label.
   */
  getSiblingOptionsLabel(path) {
    if (!path) return '';

    const fieldData = this.getFieldData(this.currentFieldId);
    const structure = fieldData?.enhancedServiceStructure || [];
    const pathParts = path.split('.');
    const currentIndex = parseInt(pathParts[pathParts.length - 1], 10);

    let siblings = structure;
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('.');
      const parent = this.getServiceByPath(structure, parentPath);
      siblings = parent?.children || [];
    }

    for (let i = 0; i < siblings.length; i++) {
      if (i === currentIndex) continue;
      const candidate = (siblings[i]?.optionsLabel || '').trim();
      if (candidate) {
        return candidate;
      }
    }

    return '';
  }

  /** Save current row data, turn row into category with children, then show view to add options under it */
  openOptionsViewForRow(parentPath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData?.enhancedServiceStructure) return;

    this.syncRowDataFromDOM(parentPath);

    const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, parentPath);
    if (!parent) return;

    parent.type = 'category';
    if (!parent.children) parent.children = [];
    if (!parent.optionsLabel || !String(parent.optionsLabel).trim()) {
      const inheritedLabel = this.getSiblingOptionsLabel(parentPath);
      if (inheritedLabel) {
        parent.optionsLabel = inheritedLabel;
      }
    }

    if (parent.children.length === 0) {
      parent.children.push({
        name: '',
        type: 'service',
        pricingType: 'fixed',
        basePrice: 0
      });
    }

    this.currentViewParentPath = parentPath;
    this.refreshModal(fieldData);
  }

  // Service management methods
  addServiceCategory(parentPath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData.enhancedServiceStructure) {
      fieldData.enhancedServiceStructure = [];
    }

    const newCategory = {
      name: '',
      type: 'category',
      children: []
    };

    if (parentPath === '' || !parentPath) {
      fieldData.enhancedServiceStructure.push(newCategory);
    } else {
      const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, parentPath);

      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(newCategory);

        // Ensure parent category is expanded when adding children
        parent.isCollapsed = false;
      } else {
        this.showNotification('Error: Could not find parent category.', 'error');
        return;
      }
    }

    this.refreshModal(fieldData);
  }

  addServiceItem(parentPath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData.enhancedServiceStructure) {
      fieldData.enhancedServiceStructure = [];
    }

    const newService = {
      name: '',
      type: 'service',
      pricingType: 'fixed',
      basePrice: 0
    };

    if (parentPath === '' || !parentPath) {
      fieldData.enhancedServiceStructure.push(newService);
    } else {
      const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, parentPath);

      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(newService);

        // Ensure parent category is expanded when adding children
        parent.isCollapsed = false;
      } else {
        this.showNotification('Error: Could not find parent category.', 'error');
        return;
      }
    }

    this.refreshModal(fieldData);
  }

  addSiblingCategory(siblingPath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData.enhancedServiceStructure) {
      fieldData.enhancedServiceStructure = [];
    }

    const newCategory = {
      name: '',
      type: 'category',
      children: []
    };

    if (siblingPath === '' || siblingPath.indexOf('.') === -1) {
      // Adding sibling at root level
      fieldData.enhancedServiceStructure.push(newCategory);
    } else {
      // Adding sibling to a nested item
      const pathParts = siblingPath.split('.');
      const siblingIndex = parseInt(pathParts.pop());
      const parentPath = pathParts.join('.');

      if (parentPath === '') {
        // Sibling at root level
        fieldData.enhancedServiceStructure.splice(siblingIndex + 1, 0, newCategory);
      } else {
        // Sibling in nested structure
        const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, parentPath);
        if (parent && parent.children) {
          parent.children.splice(siblingIndex + 1, 0, newCategory);
        }
      }
    }

    this.refreshModal(fieldData);
  }

  addSiblingService(siblingPath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData.enhancedServiceStructure) {
      fieldData.enhancedServiceStructure = [];
    }

    const newService = {
      name: '',
      type: 'service',
      pricingType: 'fixed',
      basePrice: 0
    };

    if (siblingPath === '' || siblingPath.indexOf('.') === -1) {
      // Adding sibling at root level
      fieldData.enhancedServiceStructure.push(newService);
    } else {
      // Adding sibling to a nested item
      const pathParts = siblingPath.split('.');
      const siblingIndex = parseInt(pathParts.pop());
      const parentPath = pathParts.join('.');

      if (parentPath === '') {
        // Sibling at root level
        fieldData.enhancedServiceStructure.splice(siblingIndex + 1, 0, newService);
      } else {
        // Sibling in nested structure
        const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, parentPath);
        if (parent && parent.children) {
          parent.children.splice(siblingIndex + 1, 0, newService);
        }
      }
    }

    this.refreshModal(fieldData);
  }

  removeService(servicePath) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const pathParts = servicePath.split('.');
    const index = parseInt(pathParts.pop());
    const parentPath = pathParts.join('.');

    if (parentPath === '') {
      fieldData.enhancedServiceStructure.splice(index, 1);
    } else {
      const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, parentPath);
      if (parent && parent.children) {
        parent.children.splice(index, 1);
      }
    }

    this.refreshModal(fieldData);
  }

  generateServiceNodeId() {
    return `svc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  stripRuntimeNodeState(node) {
    if (!node || typeof node !== 'object') return;
    delete node.isCollapsed;
    if (Array.isArray(node.children)) {
      node.children.forEach((child) => this.stripRuntimeNodeState(child));
    }
  }

  assignNewNodeIds(node) {
    if (!node || typeof node !== 'object') return;
    node.id = this.generateServiceNodeId();
    if (Array.isArray(node.children)) {
      node.children.forEach((child) => this.assignNewNodeIds(child));
    }
  }

  deepCloneBranchNode(node) {
    const clone = JSON.parse(JSON.stringify(node));
    this.stripRuntimeNodeState(clone);
    this.assignNewNodeIds(clone);
    return clone;
  }

  syncAllRowsFromDOM() {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData?.enhancedServiceStructure) return;

    if (this.currentViewParentPath !== '') {
      this.syncRowDataFromDOM(this.currentViewParentPath);
      const parent = this.getServiceByPath(
        fieldData.enhancedServiceStructure,
        this.currentViewParentPath
      );
      if (parent) {
        const labelInput = document.querySelector(
          '.enhanced-service-structure-container input[data-field="optionsLabel"]'
        );
        if (labelInput) parent.optionsLabel = labelInput.value.trim();

        const pageBreakInput = document.querySelector(
          '.enhanced-service-structure-container input[data-field="pageBreakBeforeOptions"]'
        );
        if (pageBreakInput) parent.pageBreakBeforeOptions = pageBreakInput.checked;

        const pageBreakTitleInput = document.querySelector(
          '.enhanced-service-structure-container input[data-field="pageBreakTitle"]'
        );
        if (pageBreakTitleInput) {
          parent.pageBreakTitle = parent.pageBreakBeforeOptions
            ? pageBreakTitleInput.value.trim()
            : '';
        }

        (parent.children || []).forEach((_, index) => {
          this.syncRowDataFromDOM(`${this.currentViewParentPath}.${index}`);
        });
      }
      return;
    }

    fieldData.enhancedServiceStructure.forEach((_, index) => {
      this.syncRowDataFromDOM(String(index));
    });
  }

  getParentServicePath(path) {
    if (!path || !String(path).includes('.')) return '';
    return String(path).split('.').slice(0, -1).join('.');
  }

  navigateUpOneHierarchyLevel() {
    if (!this.currentViewParentPath) return;

    const scrollEl =
      document.querySelector('.enhanced-service-modal-body') ||
      document.querySelector('.enhanced-service-config-modal .enhanced-service-modal-body');
    const scrollTop = scrollEl?.scrollTop ?? 0;

    this.syncAllRowsFromDOM();
    this.currentViewParentPath = this.getParentServicePath(this.currentViewParentPath);

    const fieldData = this.getFieldData(this.currentFieldId);
    this.refreshModal(fieldData);

    if (scrollEl) {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = scrollTop;
      });
    }
  }

  isSiblingServicePath(pathA, pathB) {
    return this.getParentServicePath(pathA) === this.getParentServicePath(pathB);
  }

  canPasteBranchTo(targetPath) {
    if (!this.branchClipboard || this.branchClipboard.fieldId !== this.currentFieldId) {
      return false;
    }

    const sourcePath = this.branchClipboard.sourcePath;
    if (!targetPath || targetPath === sourcePath) return false;
    return this.isSiblingServicePath(sourcePath, targetPath);
  }

  copyBranch(servicePath) {
    this.syncAllRowsFromDOM();

    const fieldData = this.getFieldData(this.currentFieldId);
    const node = this.getServiceByPath(fieldData?.enhancedServiceStructure || [], servicePath);
    if (!node) {
      this.showNotification('Could not find the selected branch.', 'error');
      return;
    }

    const branch = JSON.parse(JSON.stringify(node));
    this.stripRuntimeNodeState(branch);

    this.branchClipboard = {
      fieldId: this.currentFieldId,
      sourcePath: servicePath,
      branch,
    };

    const label = (node.name || 'Category').trim() || 'Category';
    this.showNotification(`Copied branch "${label}".`, 'success');
    this.refreshModal(fieldData);
  }

  applyBranchSubtreeToTarget(target, source) {
    if (!target || !source) return;

    if (source.optionsLabel !== undefined) target.optionsLabel = source.optionsLabel;
    if (source.pageBreakBeforeOptions !== undefined) {
      target.pageBreakBeforeOptions = source.pageBreakBeforeOptions;
    }
    if (source.pageBreakTitle !== undefined) target.pageBreakTitle = source.pageBreakTitle;

    const configKeys = [
      'pricingType',
      'basePrice',
      'description',
      'minQuantity',
      'maxQuantity',
      'deliveryTime',
    ];
    configKeys.forEach((key) => {
      if (source[key] !== undefined) target[key] = source[key];
    });

    if (Array.isArray(source.pricingTiers)) {
      target.pricingTiers = JSON.parse(JSON.stringify(source.pricingTiers));
    }

    if (source.type === 'category' || (Array.isArray(source.children) && source.children.length > 0)) {
      target.type = 'category';
    }

    target.children = (source.children || []).map((child) => this.deepCloneBranchNode(child));
  }

  pasteBranch(targetPath) {
    if (!this.canPasteBranchTo(targetPath)) {
      this.showNotification('Paste is only available on a sibling category.', 'error');
      return;
    }

    this.syncAllRowsFromDOM();

    const fieldData = this.getFieldData(this.currentFieldId);
    const target = this.getServiceByPath(fieldData?.enhancedServiceStructure || [], targetPath);
    const source = this.branchClipboard?.branch;

    if (!target || !source) {
      this.showNotification('Could not paste branch.', 'error');
      return;
    }

    this.applyBranchSubtreeToTarget(target, source);

    const label = (target.name || 'Category').trim() || 'Category';
    this.showNotification(`Pasted branch into "${label}".`, 'success');
    this.refreshModal(fieldData);
  }

  handleServiceInputChange(e) {
    const input = e.target;
    const field = input.dataset.field;
    const servicePath = input.dataset.servicePath;
    const tierIndex = input.dataset.tierIndex;
    const customPricingIndex = input.dataset.customPricingIndex;

    const fieldData = this.getFieldData(this.currentFieldId);

    // Handle custom pricing type updates
    if (customPricingIndex !== undefined) {
      const customPricingTypes = fieldData.customPricingTypes || [];
      const pricingType = customPricingTypes[parseInt(customPricingIndex)];

      if (pricingType) {
        if (field === 'label') {
          pricingType.label = input.value;
          // Update the key to match the label for consistency
          pricingType.key = `custom_${input.value.toLowerCase().replace(/\s+/g, '_')} `;
          // Remove isNew flag when user starts typing
          if (pricingType.isNew) {
            delete pricingType.isNew;
          }
        } else if (field === 'unit') {
          pricingType.unit = input.value;
          // Remove isNew flag when user starts typing
          if (pricingType.isNew) {
            delete pricingType.isNew;
          }
        } else if (field === 'description') {
          pricingType.description = input.value;
        }
      }
      return;
    }

    // Handle pricing tier updates
    if (tierIndex !== undefined && servicePath) {
      const service = this.getServiceByPath(fieldData.enhancedServiceStructure, servicePath);

      if (service && service.pricingTiers) {
        const tier = service.pricingTiers[parseInt(tierIndex)];

        if (tier) {
          if (field === 'price') {
            tier[field] = parseFloat(input.value) || 0;
          } else if (field === 'minQuantity' || field === 'maxQuantity' || field === 'deliveryTime') {
            tier[field] = parseInt(input.value) || null;
          }
        }
      }
      return;
    }

    // Handle top-level field updates (no service path)
    if (!servicePath) {
      if (field === 'serviceStructureLabel') {
        fieldData.serviceStructureLabel = input.value;
      } else if (field === 'maxDropdownsPerPageDesktop') {
        const parsed = parseInt(input.value, 10);
        fieldData.maxDropdownsPerPageDesktop = parsed >= 1 && parsed <= 12 ? parsed : 3;
      } else if (field === 'serviceMaxQuantity') {
        const parsed = parseInt(input.value, 10);
        fieldData.serviceMaxQuantity = parsed >= 1 ? parsed : null;
      }
      return;
    }

    const service = this.getServiceByPath(fieldData.enhancedServiceStructure, servicePath);

    if (service) {
      const oldType = service.type;

      if (field === 'basePrice') {
        service[field] = parseFloat(input.value) || 0;
      } else if (field === 'minQuantity' || field === 'maxQuantity' || field === 'deliveryTime') {
        service[field] = parseInt(input.value) || null;
      } else if (field === 'optionsLabel') {
        // Save this category's dropdown label (for its options) on the item
        service.optionsLabel = input.value.trim();
      } else if (field === 'pageBreakBeforeOptions') {
        service.pageBreakBeforeOptions = input.checked;
        if (!input.checked) {
          service.pageBreakTitle = '';
        }
        this.togglePageBreakTitleField(input.checked);
      } else if (field === 'pageBreakTitle') {
        service.pageBreakTitle = input.value.trim();
      } else {
        service[field] = input.value;
      }

      // Special handling for service type changes
      if (field === 'type') {
        const newType = input.value;

        // If changing to category, ensure children array exists
        if (newType === 'category') {
          if (!service.children) {
            service.children = [];
          }
          // Remove service-specific properties
          delete service.pricingType;
          delete service.basePrice;
          delete service.minQuantity;
          delete service.maxQuantity;
          delete service.deliveryTime;
          delete service.description;
          delete service.pricingTiers;
        }

        // If changing to service, remove children and set default pricing
        if (newType === 'service') {
          delete service.children;
          if (!service.pricingType) {
            service.pricingType = 'fixed';
          }
          if (!service.basePrice) {
            service.basePrice = 0;
          }
          if (!service.pricingTiers) {
            service.pricingTiers = [];
          }
        }

        // Refresh the modal immediately to show/hide service configuration fields
        this.refreshModal(fieldData);
        return;
      }

      if (field === 'pricingType') {
        const row = input.closest('.service-flat-row');
        if (row) {
          this.updateAddCategoryVisibilityForRow(row, fieldData);
        }
      }
    }
  }

  saveServiceConfiguration() {
    // Sync current view from DOM so we don't lose unsaved edits (labels and sub-category prices)
    if (this.currentViewParentPath !== '') {
      this.syncRowDataFromDOM(this.currentViewParentPath);
      const fieldData = this.getFieldData(this.currentFieldId);
      const parent = this.getServiceByPath(fieldData?.enhancedServiceStructure || [], this.currentViewParentPath);
      if (parent) {
        const labelInput = document.querySelector(`.enhanced-service-structure-container input[data-field="optionsLabel"]`);
        if (labelInput) parent.optionsLabel = labelInput.value.trim();
        const pageBreakInput = document.querySelector(`.enhanced-service-structure-container input[data-field="pageBreakBeforeOptions"]`);
        if (pageBreakInput) parent.pageBreakBeforeOptions = pageBreakInput.checked;
        const pageBreakTitleInput = document.querySelector(`.enhanced-service-structure-container input[data-field="pageBreakTitle"]`);
        if (pageBreakTitleInput) {
          parent.pageBreakTitle = parent.pageBreakBeforeOptions ? pageBreakTitleInput.value.trim() : '';
        }
        // Sync every child option row (name, price type, price) from DOM so sub-category prices save
        (parent.children || []).forEach((_, index) => {
          this.syncRowDataFromDOM(`${this.currentViewParentPath}.${index}`);
        });
      }
    }

    const fieldData = this.getFieldData(this.currentFieldId);

    // Validate configuration
    if (!fieldData.enhancedServiceStructure || fieldData.enhancedServiceStructure.length === 0) {
      this.showNotification('Please add at least one service or category.', 'error');
      return;
    }

    fieldData.enhancedServiceStructure = this.stripLegacyPageBreaks(fieldData.enhancedServiceStructure);

    // Ensure the field data is properly updated in the main form data
    const mainFieldData = this.formBuilder.formData.fields.find(f => f.id === this.currentFieldId);
    if (mainFieldData) {
      // Persist structure: each item's optionsLabel is already on the category node inside the tree
      mainFieldData.enhancedServiceStructure = fieldData.enhancedServiceStructure;
      // Persist top-level label (dropdown name for the first-level options)
      if (typeof fieldData.serviceStructureLabel !== 'undefined') {
        mainFieldData.serviceStructureLabel = fieldData.serviceStructureLabel;
      }
      const maxDropdownsInput = document.querySelector(
        '.enhanced-service-config-modal [data-field="maxDropdownsPerPageDesktop"]'
      );
      if (maxDropdownsInput) {
        const parsed = parseInt(maxDropdownsInput.value, 10);
        mainFieldData.maxDropdownsPerPageDesktop = parsed >= 1 && parsed <= 12 ? parsed : 3;
      } else if (typeof fieldData.maxDropdownsPerPageDesktop !== 'undefined') {
        mainFieldData.maxDropdownsPerPageDesktop = fieldData.maxDropdownsPerPageDesktop;
      }
      const maxQuantityInput = document.querySelector(
        '.enhanced-service-config-modal [data-field="serviceMaxQuantity"]'
      );
      if (maxQuantityInput) {
        const parsed = parseInt(maxQuantityInput.value, 10);
        mainFieldData.serviceMaxQuantity = parsed >= 1 ? parsed : null;
      } else if (typeof fieldData.serviceMaxQuantity !== 'undefined') {
        mainFieldData.serviceMaxQuantity = fieldData.serviceMaxQuantity;
      }
    }

    // Update form data in DOM and trigger persistence
    this.formBuilder.updateFormData();

    // Refresh the field in the canvas to show updated services
    this.formBuilder.refreshFieldInCanvas(this.currentFieldId);

    // Refresh the properties panel to show updated service structure
    if (this.formBuilder.fieldProperties) {
      const fieldElement = document.querySelector(`[data-field-id="${this.currentFieldId}"]`);
      if (fieldElement) {
        this.formBuilder.fieldProperties.showProperties(fieldElement);
      }
    }

    // Close modal
    this.closeServiceConfigModal();

    // Show success message
    this.showNotification('Enhanced service configuration saved!', 'success');
  }

  stripLegacyPageBreaks(items) {
    if (!Array.isArray(items)) {
      return items;
    }

    return items
      .filter(item => item?.type !== 'page_break' && item?.type !== 'page-break')
      .map(item => {
        if (item?.children?.length) {
          return { ...item, children: this.stripLegacyPageBreaks(item.children) };
        }
        return item;
      });
  }

  togglePageBreakTitleField(show) {
    const wrap = document.querySelector('.service-page-break-title-field');
    if (!wrap) return;
    if (show) {
      wrap.removeAttribute('hidden');
    } else {
      wrap.setAttribute('hidden', '');
      const input = wrap.querySelector('input[data-field="pageBreakTitle"]');
      if (input) input.value = '';
    }
  }

  refreshModal(fieldData) {
    if (fieldData?.enhancedServiceStructure) {
      fieldData.enhancedServiceStructure = this.stripLegacyPageBreaks(fieldData.enhancedServiceStructure);
    }

    // Toggle child-options view styling on modal body
    const modalBody = document.querySelector('.enhanced-service-modal-body');
    if (modalBody) {
      if (this.currentViewParentPath !== '') {
        modalBody.classList.add('is-child-options-view');
      } else {
        modalBody.classList.remove('is-child-options-view');
      }
    }

    // Refresh service structure container (use flat rows layout, or child "options for" view)
    const structureContainer = document.querySelector('.enhanced-service-structure-container');
    if (structureContainer) {
      if (this.currentViewParentPath !== '') {
        const parent = this.getServiceByPath(fieldData.enhancedServiceStructure, this.currentViewParentPath);
        const childLabel = (parent?.optionsLabel || '').replace(/"/g, '&quot;');
        const pageBreakBefore = parent?.pageBreakBeforeOptions ? 'checked' : '';
        const pageBreakTitle = (parent?.pageBreakTitle || '').replace(/"/g, '&quot;');
        const pageBreakTitleHidden = parent?.pageBreakBeforeOptions ? '' : 'hidden';
        const children = parent?.children || [];
        const childrenWithPaths = children
          .map((service, index) => ({ service, path: `${this.currentViewParentPath}.${index}` }));

        structureContainer.innerHTML = `
          ${this.generateOptionsViewBreadcrumbSection(fieldData)}
          <div class="service-options-label-field">
            <div class="service-options-label-field-row">
              <div class="service-options-label-input-wrap">
                <label for="service-options-label-input">Label</label>
                <input
                  id="service-options-label-input"
                  type="text"
                  class="service-input service-label-input"
                  placeholder="e.g Model, Type, Size"
                  value="${childLabel}"
                  data-field="optionsLabel"
                  data-service-path="${this.currentViewParentPath}">
              </div>
              <div class="service-page-break-controls">
                <label class="service-page-break-toggle-card" title="Show this dropdown on a new page after the previous selection">
                  <input
                    type="checkbox"
                    data-field="pageBreakBeforeOptions"
                    data-service-path="${this.currentViewParentPath}"
                    ${pageBreakBefore}>
                  <span class="service-page-break-toggle-card__content">
                    <span class="service-page-break-toggle-card__title">Page break</span>
                    <span class="service-page-break-toggle-card__hint">Show this dropdown on a new page</span>
                  </span>
                </label>
                <div class="service-page-break-title-field" ${pageBreakTitleHidden}>
                  <label for="service-page-break-title-input">Page Title</label>
                  <input
                    id="service-page-break-title-input"
                    type="text"
                    class="service-input service-page-break-title-input"
                    placeholder="e.g. Business Details"
                    value="${pageBreakTitle}"
                    data-field="pageBreakTitle"
                    data-service-path="${this.currentViewParentPath}">
                </div>
              </div>
            </div>
          </div>
          <div class="service-options-view-rows">
            ${this.generateFlatCategoryRowsHtml(childrenWithPaths, { isChildView: true, parentPath: this.currentViewParentPath })}
          </div>`;
      } else {
        let services = fieldData.enhancedServiceStructure || [];

        if (!services.length) {
          services = [{
            name: '',
            type: 'service',
            pricingType: 'fixed',
            basePrice: 0
          }];
          fieldData.enhancedServiceStructure = services;
        }

        const topLevelWithPaths = services
          .map((service, index) => ({ service, path: String(index) }))
          .filter(({ service }) => service.type !== 'page_break');

        structureContainer.innerHTML = this.generateFlatCategoryRowsHtml(topLevelWithPaths);
      }
    }

    // Refresh pricing types tab
    const pricingTypesList = document.querySelector('.pricing-types-list');
    if (pricingTypesList) {
      const customPricingTypes = fieldData?.customPricingTypes || [];

      // Update the custom pricing types section
      const customTypesSection = pricingTypesList.querySelector('.custom-pricing-types-section');
      if (customTypesSection) {
        if (customPricingTypes.length > 0) {
          customTypesSection.innerHTML = `
        <h5> Custom Pricing Types</h5>
          ${this.generateCustomPricingTypesHtml(customPricingTypes)}
      `;
        } else {
          customTypesSection.innerHTML = `
        <h5> Custom Pricing Types</h5>
          <p class="no-custom-types">No custom pricing types added yet.</p>
      `;
        }
      }
    }

    this.updateAllAddCategoryVisibility(fieldData);
  }

  closeServiceConfigModal() {
    const modal = document.querySelector('.enhanced-service-config-modal-overlay');
    if (modal) {
      modal.remove();
    }
  }

  // Utility methods
  getServiceByPath(services, path) {
    if (!path || path === '') return null;

    const pathParts = path.split('.').map(p => parseInt(p));
    let current = services;

    for (let i = 0; i < pathParts.length; i++) {
      const index = pathParts[i];
      if (!current || !current[index]) {
        return null;
      }

      // If this is the last part of the path, return the service
      if (i === pathParts.length - 1) {
        return current[index];
      }

      // Move to the children array for the next iteration
      current = current[index].children;
      if (!current) {
        return null;
      }
    }

    return null;
  }

  getFieldData(fieldId) {
    return this.formBuilder.formData.fields.find(f => f.id === fieldId);
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `enhanced - service - notification ${type} `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }
}

