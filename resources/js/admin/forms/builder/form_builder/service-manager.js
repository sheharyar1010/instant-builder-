/**
 * Enhanced Service Configuration Manager
 * Supports unlimited nested hierarchies and dynamic pricing types
 */
export class ServiceManager {
  constructor(formBuilder) {
    this.formBuilder = formBuilder;
    this.currentFieldId = null;
    
    // Dynamic pricing types that users can configure
    this.defaultPricingTypes = [
      { key: 'fixed', label: 'Fixed Price', unit: 'service' },
      { key: 'per_hour', label: 'Per Hour', unit: 'hours' },
      { key: 'per_item', label: 'Per Item', unit: 'items' },
      { key: 'per_page', label: 'Per Page', unit: 'pages' },
      { key: 'per_month', label: 'Per Month', unit: 'months' },
      { key: 'per_year', label: 'Per Year', unit: 'years' },
      { key: 'per_user', label: 'Per User', unit: 'users' },
      { key: 'per_feature', label: 'Per Feature', unit: 'features' }
    ];
    
    this.init();
  }

  init() {
    this.attachEventListeners();
  }

  attachEventListeners() {
    // Listen for service configuration button clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-configure-services]')) {
        const button = e.target.closest('[data-configure-services]');
        const fieldId = button.dataset.fieldId;
        this.openServiceConfigModal(fieldId);
      }

      // Modal event handlers
      if (e.target.closest('.service-modal-close')) {
        this.closeServiceConfigModal();
      }

      // Only handle these within the regular service modal
      if (e.target.closest('.service-config-modal') && e.target.closest('[data-add-service-category]')) {
        const button = e.target.closest('[data-add-service-category]');
        const parentPath = button.dataset.parentPath || '';
        this.addServiceCategory(parentPath);
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-add-service-item]')) {
        const button = e.target.closest('[data-add-service-item]');
        const parentPath = button.dataset.parentPath;
        this.addServiceItem(parentPath);
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-remove-service]')) {
        const button = e.target.closest('[data-remove-service]');
        const servicePath = button.dataset.servicePath;
        this.removeService(servicePath);
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-move-service-up]')) {
        const button = e.target.closest('[data-move-service-up]');
        const servicePath = button.dataset.servicePath;
        this.moveService(servicePath, 'up');
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-move-service-down]')) {
        const button = e.target.closest('[data-move-service-down]');
        const servicePath = button.dataset.servicePath;
        this.moveService(servicePath, 'down');
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-save-services]')) {
        this.saveServiceConfiguration();
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-add-pricing-type]')) {
        this.addCustomPricingType();
      }

      if (e.target.closest('.service-config-modal') && e.target.closest('[data-import-template]')) {
        const template = e.target.closest('[data-import-template]').dataset.template;
        this.importServiceTemplate(template);
      }

      if (e.target.closest('[data-toggle-service-details]')) {
        const serviceElement = e.target.closest('.service-item');
        this.toggleServiceDetails(serviceElement);
      }
    });

    // Handle input changes in the modal
    document.addEventListener('input', (e) => {
      if (e.target.closest('.service-config-modal')) {
        this.handleServiceInputChange(e);
      }
    });

    // Handle service type changes
    document.addEventListener('change', (e) => {
      if (e.target.closest('.service-config-modal') && e.target.dataset.field === 'type') {
        this.handleServiceTypeChange(e);
      }
      if (e.target.closest('.service-config-modal') && e.target.dataset.field === 'pricingType') {
        this.handlePricingTypeChange(e);
      }
    });
  }

  openServiceConfigModal(fieldId) {
    if (!fieldId) {
      console.error('No field ID provided for service configuration');
      return;
    }

    this.currentFieldId = fieldId;
    const fieldData = this.getFieldData(fieldId);
    
    if (!fieldData) {
      this.showNotification('Error: Could not open service configuration. Field not found.', 'error');
      return;
    }

    // Initialize service structure if it doesn't exist
    if (!fieldData.serviceStructure) {
      fieldData.serviceStructure = [];
    }

    // Initialize custom pricing types if they don't exist
    if (!fieldData.customPricingTypes) {
      fieldData.customPricingTypes = [];
    }

    const modalHtml = this.generateServiceConfigModal(fieldData);
    
    // Remove existing modal if any
    const existingModal = document.querySelector('.service-config-modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal with animation
    const modal = document.querySelector('.service-config-modal-overlay');
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  closeServiceConfigModal() {
    const modal = document.querySelector('.service-config-modal-overlay');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), 300);
    }
  }

  generateServiceConfigModal(fieldData) {
    const services = fieldData?.serviceStructure || [];
    const customPricingTypes = fieldData?.customPricingTypes || [];
    const allPricingTypes = [...this.defaultPricingTypes, ...customPricingTypes];
    
    return `
      <div class="service-config-modal-overlay">
        <div class="service-config-modal">
          <div class="service-modal-header">
            <h3>Configure Dynamic Service Structure</h3>
            <button type="button" class="service-modal-close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="service-modal-body">
            <div class="service-config-tabs">
              <button type="button" class="service-tab active" data-tab="structure">Service Structure</button>
              <button type="button" class="service-tab" data-tab="pricing">Pricing Types</button>
              <button type="button" class="service-tab" data-tab="templates">Templates</button>
            </div>

            <div class="service-tab-content">
              <!-- Structure Tab -->
              <div class="tab-panel active" data-panel="structure">
                <div class="service-structure-header">
                  <h4>Service Categories & Structure</h4>
                  <div class="header-actions">
                    <button type="button" class="btn btn-primary" data-add-service-category data-parent-path="">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7"></path>
                        <path d="M3 7H21L19.5 19.5C19.3056 20.8889 18.1611 21.9167 16.7639 21.9167H7.23611C5.83889 21.9167 4.69444 20.8889 4.5 19.5L3 7Z"></path>
                      </svg>
                      Add Category
                    </button>
                  </div>
                </div>
                
                <div class="service-structure-container">
                  ${services.length === 0 ? this.generateEmptyStateHtml() : this.generateServiceTreeHtml(services, allPricingTypes)}
                </div>
              </div>

              <!-- Pricing Types Tab -->
              <div class="tab-panel" data-panel="pricing">
                <div class="pricing-types-header">
                  <h4>Custom Pricing Types</h4>
                  <button type="button" class="btn btn-primary" data-add-pricing-type>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Custom Pricing Type
                  </button>
                </div>
                
                <div class="pricing-types-list">
                  <h5>Default Pricing Types</h5>
                  ${this.generateDefaultPricingTypesHtml()}
                  
                  ${customPricingTypes.length > 0 ? `
                    <h5>Custom Pricing Types</h5>
                    ${this.generateCustomPricingTypesHtml(customPricingTypes)}
                  ` : ''}
                </div>
              </div>

              <!-- Templates Tab -->
              <div class="tab-panel" data-panel="templates">
                <div class="service-templates-header">
                  <h4>Service Templates</h4>
                  <p>Import pre-configured service structures to get started quickly.</p>
                </div>
                
                <div class="service-templates-grid">
                  ${this.generateServiceTemplatesHtml()}
                </div>
              </div>
            </div>
          </div>
          
          <div class="service-modal-footer">
            <button type="button" class="btn btn-secondary service-modal-close">Cancel</button>
            <button type="button" class="btn btn-primary" data-save-services>Save Configuration</button>
          </div>
        </div>
      </div>
    `;
  }

  generateEmptyStateHtml() {
    return `
      <div class="enhanced-empty-services-state">
        <div class="empty-state-icon">📋</div>
        <h3>Create Your Service Structure</h3>
        <p>Build unlimited levels of categories and services:</p>
        <ul>
          <li>Web Development → WordPress → Business Sites</li>
          <li>Digital Marketing → Social Media → Monthly Packages</li>
          <li>Consulting → Technical → Hourly Rates</li>
        </ul>
        <button type="button" class="btn btn-primary" data-add-service-category data-parent-path="">
          Create First Category
        </button>
      </div>
    `;
  }

  generateServiceTreeHtml(services, allPricingTypes, parentPath = '', depth = 0) {
    return services.map((service, index) => {
      const servicePath = parentPath ? `${parentPath}.${index}` : `${index}`;
      const isCategory = service.type === 'category' || (!service.type && service.children && service.children.length > 0);
      
      return `
        <div class="service-node" data-service-path="${servicePath}" data-depth="${depth}">
          <div class="service-node-header ${isCategory ? 'category-header' : 'item-header'}">
            <div class="service-node-info">
              <div class="service-node-toggle ${service.children && service.children.length > 0 ? 'has-children' : ''}" data-toggle-service-details>
                ${service.children && service.children.length > 0 ? `
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6,9 12,15 18,9"></polyline>
                  </svg>
                ` : ''}
              </div>
              <div class="service-node-content">
                <input type="text" 
                       class="service-input service-name-input" 
                       placeholder="${isCategory ? 'Category name (e.g., Web Development)' : 'Service name (e.g., WordPress Business Site)'}" 
                       value="${service.name || ''}"
                       data-field="name"
                       data-service-path="${servicePath}">
                ${isCategory ? `
                  <textarea class="service-input service-description-input" 
                            placeholder="Category description (optional)"
                            data-field="description"
                            data-service-path="${servicePath}"
                            rows="1">${service.description || ''}</textarea>
                ` : this.generateServiceItemConfigHtml(service, servicePath, allPricingTypes)}
              </div>
            </div>
            
            <div class="service-node-actions">
              ${isCategory ? `
                <button type="button" class="btn btn-icon btn-sm" 
                        data-add-service-category 
                        data-parent-path="${servicePath}"
                        title="Add Sub-Category">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V7"></path>
                    <path d="M3 7H21L19.5 19.5C19.3056 20.8889 18.1611 21.9167 16.7639 21.9167H7.23611C5.83889 21.9167 4.69444 20.8889 4.5 19.5L3 7Z"></path>
                  </svg>
                </button>
              ` : ''}
              
              <button type="button" class="btn btn-icon btn-sm" 
                      data-add-service-item 
                      data-parent-path="${servicePath}"
                      title="Add Service Item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                </svg>
              </button>
              
              <button type="button" class="btn btn-icon btn-sm" 
                      data-move-service-up 
                      data-service-path="${servicePath}"
                      title="Move Up">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="18,15 12,9 6,15"></polyline>
                </svg>
              </button>
              
              <button type="button" class="btn btn-icon btn-sm" 
                      data-move-service-down 
                      data-service-path="${servicePath}"
                      title="Move Down">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
              
              <button type="button" class="btn btn-icon btn-sm btn-danger" 
                      data-remove-service 
                      data-service-path="${servicePath}"
                      title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          ${service.children && service.children.length > 0 ? `
            <div class="service-node-children">
              ${this.generateServiceTreeHtml(service.children, allPricingTypes, servicePath, depth + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  generateServiceItemConfigHtml(service, servicePath, allPricingTypes) {
    return `
      <div class="service-item-config">
        <div class="service-pricing-config">
          <select class="service-input pricing-type-select" 
                  data-field="pricingType"
                  data-service-path="${servicePath}">
            ${allPricingTypes.map(type => `
              <option value="${type.key}" ${service.pricingType === type.key ? 'selected' : ''}>
                ${type.label}
              </option>
            `).join('')}
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
        
        <div class="service-constraints">
          ${service.pricingType && service.pricingType !== 'fixed' ? `
            <div class="constraint-row">
              <label>Min:</label>
              <input type="number" 
                     class="service-input constraint-input" 
                     placeholder="1" 
                     value="${service.minQuantity || ''}"
                     min="1"
                     data-field="minQuantity"
                     data-service-path="${servicePath}">
              
              <label>Max:</label>
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
            <label>Delivery:</label>
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
        
        <textarea class="service-input service-description-input" 
                  placeholder="Service description (what's included, deliverables, etc.)"
                  data-field="description"
                  data-service-path="${servicePath}"
                  rows="2">${service.description || ''}</textarea>
      </div>
    `;
  }

  generateDefaultPricingTypesHtml() {
    return this.defaultPricingTypes.map(type => `
      <div class="pricing-type-item default-type">
        <div class="pricing-type-info">
          <span class="pricing-type-label">${type.label}</span>
          <span class="pricing-type-unit">Unit: ${type.unit}</span>
        </div>
        <span class="pricing-type-badge">Default</span>
      </div>
    `).join('');
  }

  generateCustomPricingTypesHtml(customTypes) {
    return customTypes.map((type, index) => `
      <div class="pricing-type-item custom-type">
        <div class="pricing-type-inputs">
          <input type="text" 
                 class="service-input" 
                 placeholder="Pricing type label"
                 value="${type.label || ''}"
                 data-field="label"
                 data-custom-pricing-index="${index}">
          <input type="text" 
                 class="service-input" 
                 placeholder="Unit name"
                 value="${type.unit || ''}"
                 data-field="unit"
                 data-custom-pricing-index="${index}">
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-danger" 
                data-remove-custom-pricing 
                data-index="${index}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `).join('');
  }

  generateServiceTemplatesHtml() {
    const templates = [
      {
        key: 'web_development',
        name: 'Web Development Services',
        description: 'Complete web development service structure with WordPress, custom development, and e-commerce',
        icon: '🌐'
      },
      {
        key: 'digital_marketing',
        name: 'Digital Marketing Services',
        description: 'Social media marketing, SEO, PPC, and content marketing services with subscription options',
        icon: '📈'
      },
      {
        key: 'design_services',
        name: 'Design Services',
        description: 'UI/UX design, branding, print design, and graphic design services',
        icon: '🎨'
      },
      {
        key: 'consulting_services',
        name: 'Consulting Services',
        description: 'Business consulting, technical consulting, and advisory services',
        icon: '💼'
      }
    ];

    return templates.map(template => `
      <div class="service-template-card">
        <div class="template-icon">${template.icon}</div>
        <h5>${template.name}</h5>
        <p>${template.description}</p>
        <button type="button" class="btn btn-primary btn-sm" 
                data-import-template 
                data-template="${template.key}">
          Import Template
        </button>
      </div>
    `).join('');
  }

  // Service Management Methods
  addServiceCategory(parentPath) {
    if (!this.currentFieldId) {
      console.error('No current field ID set for service configuration');
      this.showNotification('Error: No field selected for service configuration.', 'error');
      return;
    }

    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData) {
      console.error('Field data not found for ID:', this.currentFieldId);
      this.showNotification('Error: Field data not found.', 'error');
      return;
    }

    if (!fieldData.serviceStructure) {
      fieldData.serviceStructure = [];
    }
    
    const newCategory = {
      name: '',
      type: 'category',
      description: '',
      children: []
    };
    
    if (parentPath === '') {
      fieldData.serviceStructure.push(newCategory);
    } else {
      const parent = this.getServiceByPath(fieldData.serviceStructure, parentPath);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newCategory);
      }
    }
    
    this.refreshModalStructure(fieldData);
  }

  addServiceItem(parentPath) {
    if (!this.currentFieldId) {
      console.error('No current field ID set for service configuration');
      this.showNotification('Error: No field selected for service configuration.', 'error');
      return;
    }

    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData) {
      console.error('Field data not found for ID:', this.currentFieldId);
      this.showNotification('Error: Field data not found.', 'error');
      return;
    }

    if (!fieldData.serviceStructure) {
      fieldData.serviceStructure = [];
    }
    
    const newService = {
      name: '',
      type: 'service',
      description: '',
      pricingType: 'fixed',
      basePrice: 0,
      minQuantity: 1,
      maxQuantity: null,
      deliveryTime: 7
    };
    
    if (parentPath === '') {
      fieldData.serviceStructure.push(newService);
    } else {
      const parent = this.getServiceByPath(fieldData.serviceStructure, parentPath);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newService);
      }
    }
    
    this.refreshModalStructure(fieldData);
  }

  removeService(servicePath) {
    if (!this.currentFieldId) {
      console.error('No current field ID set for service configuration');
      this.showNotification('Error: No field selected for service configuration.', 'error');
      return;
    }

    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData) {
      console.error('Field data not found for ID:', this.currentFieldId);
      this.showNotification('Error: Field data not found.', 'error');
      return;
    }

    const pathParts = servicePath.split('.');
    const index = parseInt(pathParts.pop());
    const parentPath = pathParts.join('.');
    
    if (parentPath === '') {
      fieldData.serviceStructure.splice(index, 1);
    } else {
      const parent = this.getServiceByPath(fieldData.serviceStructure, parentPath);
      if (parent && parent.children) {
        parent.children.splice(index, 1);
      }
    }
    
    this.refreshModalStructure(fieldData);
  }

  moveService(servicePath, direction) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const pathParts = servicePath.split('.');
    const index = parseInt(pathParts.pop());
    const parentPath = pathParts.join('.');
    
    let services;
    if (parentPath === '') {
      services = fieldData.serviceStructure;
    } else {
      const parent = this.getServiceByPath(fieldData.serviceStructure, parentPath);
      services = parent ? parent.children : null;
    }
    
    if (!services || services.length < 2) return;
    
    let newIndex;
    if (direction === 'up' && index > 0) {
      newIndex = index - 1;
    } else if (direction === 'down' && index < services.length - 1) {
      newIndex = index + 1;
    } else {
      return;
    }
    
    // Swap services
    [services[index], services[newIndex]] = [services[newIndex], services[index]];
    
    this.refreshModalStructure(fieldData);
  }

  saveServiceConfiguration() {
    const fieldData = this.getFieldData(this.currentFieldId);
    
    // Validate configuration
    if (!fieldData.serviceStructure || fieldData.serviceStructure.length === 0) {
      this.showNotification('Please add at least one service or category.', 'error');
      return;
    }
    
    // Validate that all services have names and prices
    const validation = this.validateServiceStructure(fieldData.serviceStructure);
    if (!validation.isValid) {
      this.showNotification(validation.message, 'error');
      return;
    }
    
    // Update form data
    this.formBuilder.updateFormData();
    
    // Refresh the field in canvas to show updated service options
    this.formBuilder.refreshFieldInCanvas(this.currentFieldId);
    
    // Close modal
    this.closeServiceConfigModal();
    
    // Show success message
    this.showNotification('Service configuration saved successfully!', 'success');
  }

  addCustomPricingType() {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (!fieldData.customPricingTypes) {
      fieldData.customPricingTypes = [];
    }
    
    fieldData.customPricingTypes.push({
      key: `custom_${Date.now()}`,
      label: '',
      unit: ''
    });
    
    this.refreshModalPricingTypes(fieldData);
  }

  removeCustomPricingType(index) {
    const fieldData = this.getFieldData(this.currentFieldId);
    if (fieldData.customPricingTypes && fieldData.customPricingTypes[index]) {
      fieldData.customPricingTypes.splice(index, 1);
      this.refreshModalPricingTypes(fieldData);
    }
  }

  importServiceTemplate(templateKey) {
    const fieldData = this.getFieldData(this.currentFieldId);
    const template = this.getServiceTemplate(templateKey);
    
    if (template) {
      fieldData.serviceStructure = template.structure;
      fieldData.customPricingTypes = template.customPricingTypes || [];
      this.refreshModalStructure(fieldData);
      this.showNotification(`${template.name} template imported successfully!`, 'success');
    }
  }

  handleServiceInputChange(e) {
    const input = e.target;
    const field = input.dataset.field;
    const servicePath = input.dataset.servicePath;
    const customPricingIndex = input.dataset.customPricingIndex;
    
    if (servicePath) {
      // Handle service field changes
      const fieldData = this.getFieldData(this.currentFieldId);
      const service = this.getServiceByPath(fieldData.serviceStructure, servicePath);
      
      if (service) {
        if (field === 'basePrice' || field === 'minQuantity' || field === 'maxQuantity' || field === 'deliveryTime') {
          service[field] = parseFloat(input.value) || 0;
        } else {
          service[field] = input.value;
        }
      }
    } else if (customPricingIndex !== undefined) {
      // Handle custom pricing type changes
      const fieldData = this.getFieldData(this.currentFieldId);
      if (fieldData.customPricingTypes && fieldData.customPricingTypes[customPricingIndex]) {
        fieldData.customPricingTypes[customPricingIndex][field] = input.value;
        
        // Update the key when label changes
        if (field === 'label') {
          fieldData.customPricingTypes[customPricingIndex].key = input.value.toLowerCase().replace(/\s+/g, '_');
        }
      }
    }
  }

  handleServiceTypeChange(e) {
    const select = e.target;
    const servicePath = select.dataset.servicePath;
    const fieldData = this.getFieldData(this.currentFieldId);
    const service = this.getServiceByPath(fieldData.serviceStructure, servicePath);
    
    if (service) {
      service.type = select.value;
      
      // If changing to category, ensure children array exists
      if (select.value === 'category' && !service.children) {
        service.children = [];
      }
      
      // If changing to service, remove children and set default pricing
      if (select.value === 'service') {
        delete service.children;
        if (!service.pricingType) {
          service.pricingType = 'fixed';
        }
        if (!service.basePrice) {
          service.basePrice = 0;
        }
      }
      
      this.refreshModalStructure(fieldData);
    }
  }

  handlePricingTypeChange(e) {
    const select = e.target;
    const servicePath = select.dataset.servicePath;
    const fieldData = this.getFieldData(this.currentFieldId);
    const service = this.getServiceByPath(fieldData.serviceStructure, servicePath);
    
    if (service) {
      service.pricingType = select.value;
      
      // Set default quantities for non-fixed pricing
      if (select.value !== 'fixed' && !service.minQuantity) {
        service.minQuantity = 1;
      }
      
      this.refreshModalStructure(fieldData);
    }
  }

  toggleServiceDetails(serviceElement) {
    const details = serviceElement.querySelector('.service-item-details');
    if (details) {
      details.classList.toggle('expanded');
    }
  }

  // Utility Methods
  getFieldData(fieldId) {
    return this.formBuilder.formData.fields.find(f => f.id === fieldId);
  }

  getServiceByPath(services, path) {
    if (!path || !services) return null;
    
    const pathParts = path.split('.').map(p => parseInt(p));
    let current = services;
    
    for (const index of pathParts) {
      if (!current || !current[index]) return null;
      current = current[index];
      if (pathParts.indexOf(index) < pathParts.length - 1) {
        current = current.children;
      }
    }
    
    return current;
  }

  validateServiceStructure(services) {
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      
      if (!service.name || service.name.trim() === '') {
        return {
          isValid: false,
          message: 'All services and categories must have names.'
        };
      }
      
      if (service.type === 'service') {
        if (!service.basePrice || service.basePrice < 0) {
          return {
            isValid: false,
            message: `Service "${service.name}" must have a valid price.`
          };
        }
      }
      
      if (service.children && service.children.length > 0) {
        const childValidation = this.validateServiceStructure(service.children);
        if (!childValidation.isValid) {
          return childValidation;
        }
      }
    }
    
    return { isValid: true };
  }

  getServiceTemplate(templateKey) {
    const templates = {
      web_development: {
        name: 'Web Development Services',
        structure: [
          {
            name: 'WordPress Development',
            type: 'category',
            description: 'Custom WordPress websites and applications',
            children: [
              {
                name: 'Business Website',
                type: 'service',
                description: 'Professional business website with up to 5 pages',
                pricingType: 'fixed',
                basePrice: 1500,
                deliveryTime: 14
              },
              {
                name: 'E-commerce Store',
                type: 'service',
                description: 'Full e-commerce solution with payment integration',
                pricingType: 'fixed',
                basePrice: 3000,
                deliveryTime: 21
              },
              {
                name: 'Custom Plugin Development',
                type: 'service',
                description: 'Custom WordPress plugin development',
                pricingType: 'per_hour',
                basePrice: 75,
                minQuantity: 10,
                deliveryTime: 7
              }
            ]
          },
          {
            name: 'Custom Development',
            type: 'category',
            description: 'Custom web applications and solutions',
            children: [
              {
                name: 'Web Application',
                type: 'service',
                description: 'Custom web application development',
                pricingType: 'per_hour',
                basePrice: 100,
                minQuantity: 40,
                deliveryTime: 30
              },
              {
                name: 'API Development',
                type: 'service',
                description: 'RESTful API development and integration',
                pricingType: 'per_hour',
                basePrice: 85,
                minQuantity: 20,
                deliveryTime: 14
              }
            ]
          }
        ],
        customPricingTypes: []
      },
      digital_marketing: {
        name: 'Digital Marketing Services',
        structure: [
          {
            name: 'Social Media Marketing',
            type: 'category',
            description: 'Complete social media management and advertising',
            children: [
              {
                name: 'Instagram Management',
                type: 'service',
                description: 'Daily Instagram content creation and posting',
                pricingType: 'per_month',
                basePrice: 500,
                minQuantity: 3,
                deliveryTime: 1
              },
              {
                name: 'Facebook Advertising',
                type: 'service',
                description: 'Facebook and Instagram ad campaign management',
                pricingType: 'per_month',
                basePrice: 800,
                minQuantity: 1,
                deliveryTime: 3
              }
            ]
          },
          {
            name: 'SEO Services',
            type: 'category',
            description: 'Search engine optimization and content marketing',
            children: [
              {
                name: 'Technical SEO Audit',
                type: 'service',
                description: 'Comprehensive technical SEO analysis',
                pricingType: 'fixed',
                basePrice: 350,
                deliveryTime: 5
              },
              {
                name: 'Content Marketing',
                type: 'service',
                description: 'Blog posts and SEO content creation',
                pricingType: 'per_item',
                basePrice: 150,
                minQuantity: 4,
                deliveryTime: 7
              }
            ]
          }
        ],
        customPricingTypes: []
      },
      design_services: {
        name: 'Design Services',
        structure: [
          {
            name: 'UI/UX Design',
            type: 'category',
            description: 'User interface and experience design',
            children: [
              {
                name: 'Website Design',
                type: 'service',
                description: 'Complete website UI/UX design',
                pricingType: 'per_page',
                basePrice: 200,
                minQuantity: 5,
                deliveryTime: 7
              },
              {
                name: 'Mobile App Design',
                type: 'service',
                description: 'Mobile application interface design',
                pricingType: 'fixed',
                basePrice: 2500,
                deliveryTime: 14
              }
            ]
          },
          {
            name: 'Branding',
            type: 'category',
            description: 'Brand identity and visual design',
            children: [
              {
                name: 'Logo Design',
                type: 'service',
                description: 'Custom logo design with 3 concepts',
                pricingType: 'fixed',
                basePrice: 500,
                deliveryTime: 5
              },
              {
                name: 'Brand Package',
                type: 'service',
                description: 'Complete brand identity package',
                pricingType: 'fixed',
                basePrice: 1500,
                deliveryTime: 10
              }
            ]
          }
        ],
        customPricingTypes: []
      },
      consulting_services: {
        name: 'Consulting Services',
        structure: [
          {
            name: 'Business Consulting',
            type: 'category',
            description: 'Strategic business consulting and planning',
            children: [
              {
                name: 'Strategy Session',
                type: 'service',
                description: 'One-on-one strategic planning session',
                pricingType: 'per_hour',
                basePrice: 150,
                minQuantity: 2,
                deliveryTime: 1
              },
              {
                name: 'Business Plan',
                type: 'service',
                description: 'Complete business plan development',
                pricingType: 'fixed',
                basePrice: 2000,
                deliveryTime: 14
              }
            ]
          },
          {
            name: 'Technical Consulting',
            type: 'category',
            description: 'Technology consulting and architecture',
            children: [
              {
                name: 'Technical Audit',
                type: 'service',
                description: 'Comprehensive technical system review',
                pricingType: 'fixed',
                basePrice: 1200,
                deliveryTime: 7
              },
              {
                name: 'Architecture Consulting',
                type: 'service',
                description: 'System architecture design and consultation',
                pricingType: 'per_hour',
                basePrice: 200,
                minQuantity: 10,
                deliveryTime: 5
              }
            ]
          }
        ],
        customPricingTypes: []
      }
    };
    
    return templates[templateKey] || null;
  }

  refreshModalStructure(fieldData) {
    const container = document.querySelector('.service-structure-container');
    if (container) {
      const customPricingTypes = fieldData.customPricingTypes || [];
      const allPricingTypes = [...this.defaultPricingTypes, ...customPricingTypes];
      
      container.innerHTML = fieldData.serviceStructure.length === 0 ? 
        this.generateEmptyStateHtml() : 
        this.generateServiceTreeHtml(fieldData.serviceStructure, allPricingTypes);
    }
  }

  refreshModalPricingTypes(fieldData) {
    const container = document.querySelector('.pricing-types-list');
    if (container) {
      const customPricingTypes = fieldData.customPricingTypes || [];
      container.innerHTML = `
        <h5>Default Pricing Types</h5>
        ${this.generateDefaultPricingTypesHtml()}
        
        ${customPricingTypes.length > 0 ? `
          <h5>Custom Pricing Types</h5>
          ${this.generateCustomPricingTypesHtml(customPricingTypes)}
        ` : ''}
      `;
    }
  }

  showNotification(message, type = 'success') {
    // Use the form builder's notification system if available
    if (this.formBuilder && this.formBuilder.showNotification) {
      this.formBuilder.showNotification(message, type);
    } else {
      // Fallback notification
      const notification = document.createElement('div');
      notification.className = `service-notification ${type}`;
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10001;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        background: ${type === 'success' ? '#c6f6d5' : '#fed7d7'};
        color: ${type === 'success' ? '#22543d' : '#c53030'};
        border: 1px solid ${type === 'success' ? '#9ae6b4' : '#fbb6ce'};
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  }
}
