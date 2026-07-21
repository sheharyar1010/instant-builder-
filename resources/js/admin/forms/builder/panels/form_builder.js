import "/scss/admin/forms/builder/panels/form_builder.scss";

let formBuilder;

document.addEventListener("DOMContentLoaded", function () {
  formBuilder = new QuotemateFormBuilder();
  formBuilder.init();
  window.formBuilder = formBuilder;
});
class QuotemateFormBuilder {
  constructor() {
    this.fieldCounter = 0;
    this.selectedField = null;
    this.formData = {
      title: "Quote Request Form",
      description:
        "Please fill out this form to receive a quote for our services.",
      fields: [],
    };
    this.loadExistingFormData();
  }

  loadExistingFormData() {
    const qm_config =
      window.Quotemate["admin_forms_builder_panels_form_builder"];

    if (
      typeof qm_config !== "undefined" &&
      typeof qm_config.quotemate_form_data !== "undefined"
    ) {
      const existingData = qm_config.quotemate_form_data;
      let settings = {};
      try {
        settings = JSON.parse(existingData.settings);
      } catch (e) {
        settings = {
          title: "Quote Request Form",
          description:
            "Please fill out this form to receive a quote for our services.",
        };
      }

      this.formData = {
        id: existingData.id || null,
        name: existingData.name || "Untitled Form",
        title: settings.title || "Quote Request Form",
        description:
          settings.description ||
          "Please fill out this form to receive a quote for our services.",
        fields: existingData.fields ? JSON.parse(existingData.fields) : [],
      };

      // Update form name input
      const formNameInput = document.getElementById("form-name");
      if (formNameInput) {
        formNameInput.value = this.formData.name;
      }

      // Update form title and description in the builder
      const titleElement = document.querySelector(
        ".quotemate-form-builder__form-title"
      );
      const descriptionElement = document.querySelector(
        ".quotemate-form-builder__form-description"
      );

      if (titleElement) {
        titleElement.textContent = this.formData.title;
      }
      if (descriptionElement) {
        descriptionElement.textContent = this.formData.description;
      }

      // Load existing fields
      this.loadExistingFields();
    }
  }
  loadExistingFields() {
    if (this.formData.fields && this.formData.fields.length > 0) {
      // Hide the placeholder
      const placeholder = document.querySelector(
        ".quotemate-form-builder__drop-placeholder"
      );
      if (placeholder) {
        placeholder.style.display = "none";
      }

      // Find the highest field counter from existing fields
      this.formData.fields.forEach((field) => {
        const fieldIdNumber = parseInt(field.id.replace("field_", ""));
        if (fieldIdNumber > this.fieldCounter) {
          this.fieldCounter = fieldIdNumber;
        }
      });

      // Render existing fields
      const dropZone = document.getElementById("form-drop-zone");
      this.formData.fields.forEach((fieldData) => {
        const fieldHtml = this.generateFieldHtmlFromData(fieldData);
        const fieldElement = document.createElement("div");
        fieldElement.innerHTML = fieldHtml;
        dropZone.appendChild(fieldElement.firstElementChild);
      });
    }
  }

  generateFieldHtmlFromData(fieldData) {
    const fieldLabel = fieldData.label || this.getFieldLabel(fieldData.type);
    const fieldId = fieldData.id;
    const fieldType = fieldData.type;

    let inputHtml = "";
    switch (fieldType) {
      case "name":
      case "company":
      case "email":
      case "phone":
      case "address":
        inputHtml = `<input type="${
          fieldType === "email" ? "email" : "text"
        }" class="quotemate-form-field__input" placeholder="${
          fieldData.placeholder || ""
        }" value="${fieldData.defaultValue || ""}">`;
        break;

      case "select":
        const selectOptions = fieldData.options || [];
        inputHtml = `
          <select class="quotemate-form-field__input">
            <option value="">Choose an option</option>
            ${selectOptions
              .map(
                (option) => `
              <option value="${option
                .toLowerCase()
                .replace(/\s+/g, "_")}">${option}</option>
            `
              )
              .join("")}
          </select>`;
        break;

      case "radio":
        const radioOptions = fieldData.options || [];
        if (radioOptions.length > 0) {
          inputHtml = `
            <div class="quotemate-form-field__options">
              ${radioOptions
                .map(
                  (option) => `
                <label>
                  <input type="radio" name="${fieldId}" value="${option
                    .toLowerCase()
                    .replace(/\s+/g, "_")}">
                  ${option}
                </label>
              `
                )
                .join("")}
            </div>`;
        } else {
          inputHtml = `
            <div class="quotemate-form-field__options">
              <p class="quotemate-form-field__empty">No options added yet. Configure in field settings.</p>
            </div>`;
        }
        break;

      case "checkbox":
        const checkboxOptions = fieldData.options || [];
        if (checkboxOptions.length > 0) {
          inputHtml = `
            <div class="quotemate-form-field__options">
              ${checkboxOptions
                .map(
                  (option) => `
                <label>
                  <input type="checkbox" name="${fieldId}[]" value="${option
                    .toLowerCase()
                    .replace(/\s+/g, "_")}">
                  ${option}
                </label>
              `
                )
                .join("")}
            </div>`;
        } else {
          inputHtml = `
            <div class="quotemate-form-field__options">
              <p class="quotemate-form-field__empty">No options added yet. Configure in field settings.</p>
            </div>`;
        }
        break;

      case "textarea":
        inputHtml = `<textarea class="quotemate-form-field__input" rows="4" placeholder="${
          fieldData.placeholder || ""
        }">${fieldData.defaultValue || ""}</textarea>`;
        break;

      case "file":
        inputHtml = `<input type="file" class="quotemate-form-field__input">`;
        break;

      default:
        inputHtml = `<input type="text" class="quotemate-form-field__input" placeholder="Enter ${fieldLabel.toLowerCase()}" value="${
          fieldData.defaultValue || ""
        }">`;
    }

    return `
      <div class="quotemate-form-field" data-field-id="${fieldId}" data-field-type="${fieldType}">
        <div class="quotemate-form-field__actions">
          <button type="button" class="quotemate-form-field__action" data-action="edit-field" data-field-id="${fieldId}">Edit</button>
          <button type="button" class="quotemate-form-field__action" data-action="duplicate-field" data-field-id="${fieldId}">Duplicate</button>
          <button type="button" class="quotemate-form-field__action" data-action="delete-field" data-field-id="${fieldId}">Delete</button>
        </div>
        <label class="quotemate-form-field__label">
          ${fieldLabel} ${
      fieldData.required
        ? '<span class="quotemate-form-field__required">*</span>'
        : ""
    }
        </label>
        ${inputHtml}
      </div>
    `;
  }

  init() {
    this.initDragAndDrop();
    this.initFieldSelection();
    this.initFormTitleEditing();
    this.initSaveForm();
    this.initPreview();
    this.initFieldSearch();
    this.initDynamicEventListeners();
  }

  initFieldSearch() {
    const searchInput = document.querySelector(".quotemate-form-builder__field-search");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
      const term = searchInput.value.trim().toLowerCase();
      const fieldItems = document.querySelectorAll(".quotemate-form-builder__field-item");
      const categories = document.querySelectorAll(".quotemate-form-builder__field-category");

      fieldItems.forEach((item) => {
        const label = item.querySelector(".quotemate-form-builder__field-label");
        const labelText = label ? label.textContent.trim().toLowerCase() : "";
        const fieldType = (item.getAttribute("data-field-type") || "").toLowerCase();
        const matches = !term || labelText.includes(term) || fieldType.includes(term);
        item.style.display = matches ? "" : "none";
      });

      categories.forEach((category) => {
        const items = category.querySelectorAll(".quotemate-form-builder__field-item");
        const visibleCount = Array.from(items).filter((el) => el.style.display !== "none").length;
        category.style.display = visibleCount > 0 ? "" : "none";
      });
    });
  }

  initDynamicEventListeners() {
    // Delegate all dynamic button clicks
    document.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (!button) return;

      const fieldId = button.dataset.fieldId;

      switch (button.dataset.action) {
        case "edit-field":
          this.editField(fieldId);
          break;
        case "duplicate-field":
          this.duplicateField(fieldId);
          break;
        case "delete-field":
          this.deleteField(fieldId);
          break;
      }
    });

    // Note: Calculation logic is now handled by CalculationEngine in main.js
    // These events are kept for backward compatibility but delegate to the new system
  }

  initDragAndDrop() {
    const fieldItems = document.querySelectorAll(
      ".quotemate-form-builder__field-item"
    );
    const dropZone = document.getElementById("form-drop-zone");

    fieldItems.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.dataset.fieldType);
      });
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone
        .querySelector(".quotemate-form-builder__drop-placeholder")
        .classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", (e) => {
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone
          .querySelector(".quotemate-form-builder__drop-placeholder")
          .classList.remove("dragover");
      }
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      const fieldType = e.dataTransfer.getData("text/plain");
      this.addField(fieldType);
      dropZone
        .querySelector(".quotemate-form-builder__drop-placeholder")
        .classList.remove("dragover");
    });
  }

  addField(fieldType) {
    this.fieldCounter++;
    const fieldId = `field_${this.fieldCounter}`;

    // Hide placeholder if this is the first field
    const placeholder = document.querySelector(
      ".quotemate-form-builder__drop-placeholder"
    );
    if (placeholder && placeholder.style.display !== "none") {
      placeholder.style.display = "none";
    }

    const fieldHtml = this.generateFieldHtml(fieldType, fieldId);
    const dropZone = document.getElementById("form-drop-zone");

    const fieldElement = document.createElement("div");
    fieldElement.innerHTML = fieldHtml;
    dropZone.appendChild(fieldElement.firstElementChild);

    // Add to form data
    const fieldData = {
      id: fieldId,
      type: fieldType,
      label: this.getFieldLabel(fieldType),
      required: false,
    };

    // Add specific properties based on field type - removed default options
    switch (fieldType) {
      case "service_options":
        fieldData.options = []; // Empty by default
        break;
      case "service":
        fieldData.services = []; // Empty by default
        break;
      case "project_type":
        fieldData.options = []; // Empty by default
        break;
      case "budget":
        fieldData.ranges = []; // Empty by default
        break;

      case "quote_validity":
      case "deadline":
      case "date":
        fieldData.defaultValue = new Date().toISOString().split("T")[0];
        break;
      case "radio":
      case "checkbox":
      case "select":
        fieldData.options = [];
        break;
    }
    this.formData.fields.push(fieldData);
    this.updateFormData();
  }
  generateFieldHtml(fieldType, fieldId) {
    const fieldLabel = this.getFieldLabel(fieldType);

    let inputHtml = "";
    switch (fieldType) {
      case "service_options":
        inputHtml = `
                <div class="quotemate-form-field__options">
                    <p class="quotemate-form-field__empty">No service options added yet. Configure in field settings.</p>
                </div>`;
        break;

      case "service":
        inputHtml = `
                <select class="quotemate-form-field__input">
                    <option value="">Select a service</option>
                </select>`;
        break;

      case "project_type":
        inputHtml = `
                <select class="quotemate-form-field__input">
                    <option value="">Select project type</option>
                </select>`;
        break;

      case "budget":
        inputHtml = `
                <select class="quotemate-form-field__input">
                    <option value="">Select budget range</option>
                </select>`;
        break;

      case "deadline":
      case "quote_validity":
        inputHtml = `<input type="date" class="quotemate-form-field__input" value="${
          new Date().toISOString().split("T")[0]
        }">`;
        break;

      case "description":
        inputHtml = `<textarea class="quotemate-form-field__input" rows="4" placeholder="Describe your project in detail"></textarea>`;
        break;

      case "company":
        inputHtml = `<input type="text" class="quotemate-form-field__input" placeholder="Company name">`;
        break;

      case "text":
        inputHtml = `<input type="text" class="quotemate-form-field__input" placeholder="Enter text here">`;
        break;

      case "textarea":
        inputHtml = `<textarea class="quotemate-form-field__input" rows="4" placeholder="Enter your message here"></textarea>`;
        break;

      case "select":
        inputHtml = `<select class="quotemate-form-field__input">
                    <option value="">Choose an option</option>
                </select>`;
        break;

      case "radio":
        inputHtml = `<div class="quotemate-form-field__options">
                    <p class="quotemate-form-field__empty">No options added yet. Configure in field settings.</p>
                </div>`;
        break;

      case "checkbox":
        inputHtml = `<div class="quotemate-form-field__options">
                    <p class="quotemate-form-field__empty">No options added yet. Configure in field settings.</p>
                </div>`;
        break;

      case "file":
        inputHtml = `<input type="file" class="quotemate-form-field__input">`;
        break;

      default:
        inputHtml = `<input type="text" class="quotemate-form-field__input" placeholder="Enter ${fieldLabel.toLowerCase()}">`;
    }

    return `
        <div class="quotemate-form-field" data-field-id="${fieldId}" data-field-type="${fieldType}">
            <div class="quotemate-form-field__actions">
                <button type="button" class="quotemate-form-field__action" data-action="edit-field" data-field-id="${fieldId}">Edit</button>
                <button type="button" class="quotemate-form-field__action" data-action="duplicate-field" data-field-id="${fieldId}">Duplicate</button>
                <button type="button" class="quotemate-form-field__action" data-action="delete-field" data-field-id="${fieldId}">Delete</button>
            </div>
            <label class="quotemate-form-field__label">
                ${fieldLabel} <span class="quotemate-form-field__required">*</span>
            </label>
            ${inputHtml}
        </div>
    `;
  }
  addServiceOption(fieldId) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData) {
      if (!fieldData.services) {
        fieldData.services = [];
      }
      fieldData.services.push({
        name: `Service ${fieldData.services.length + 1}`,
        price: 0,
      });
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }
  updateServiceOption(fieldId, index, price, name) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.services && fieldData.services[index]) {
      fieldData.services[index].name = name;
      fieldData.services[index].price = parseFloat(price) || 0;
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
    }
  }

  getFieldLabel(fieldType) {
    const labels = {
      name: "Full Name",
      company: "Company",
      email: "Email",
      phone: "Phone",
      address: "Address",
      service: "Service Needed",
      project_type: "Project Type",
      budget: "Budget Range",
      deadline: "Project Deadline",
      description: "Project Description",
      quote_validity: "Quote Validity",
      text: "Single Line Text",
      textarea: "Paragraph Text",
      select: "Drop Down",
      radio: "Multiple Choice",
      checkbox: "Checkboxes",
      file: "File Upload",
    };
    return labels[fieldType] || "Field";
  }

  initFieldSelection() {
    document.addEventListener("click", (e) => {
      if (e.target.closest(".quotemate-form-field")) {
        const field = e.target.closest(".quotemate-form-field");
        this.selectField(field);
      }
    });
  }

  selectField(fieldElement) {
    // Remove previous selection
    document.querySelectorAll(".quotemate-form-field.selected").forEach((f) => {
      f.classList.remove("selected");
    });

    // Select new field
    fieldElement.classList.add("selected");
    this.selectedField = fieldElement;

    // Show properties panel
    this.showProperties(fieldElement);
  }

  showProperties(fieldElement) {
    const propertiesPanel = document.getElementById("properties-panel");
    const fieldType = fieldElement.dataset.fieldType;
    const fieldId = fieldElement.dataset.fieldId;

    // Generate properties form based on field type
    const propertiesContent = this.generatePropertiesHtml(fieldType, fieldId);
    propertiesPanel.querySelector(
      ".quotemate-form-builder__properties-content"
    ).innerHTML = propertiesContent;
    propertiesPanel.style.display = "block";
  }

  generatePropertiesHtml(fieldType, fieldId) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);

    let baseHtml = `
            <div class="quotemate-form-properties">
                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__label">Field Label</label>
                    <input type="text" class="quotemate-form-field__input" value="${
                      fieldData
                        ? fieldData.label
                        : this.getFieldLabel(fieldType)
                    }" data-property="label" data-field-id="${fieldId}">
                </div>
                
                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__label">Description</label>
                    <textarea class="quotemate-form-field__input" rows="3" placeholder="Add field description" data-property="description" data-field-id="${fieldId}">${
      fieldData && fieldData.description ? fieldData.description : ""
    }</textarea>
                </div>

                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__checkbox">
                        <input type="checkbox" ${
                          fieldData && fieldData.required ? "checked" : ""
                        } data-property="required" data-field-id="${fieldId}"> Required Field
                    </label>
                </div>
        `;

    // Add field-specific options
    if (
      fieldType === "select" ||
      fieldType === "radio" ||
      fieldType === "checkbox"
    ) {
      const options = fieldData && fieldData.options ? fieldData.options : [];
      baseHtml += `
                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__label">Choices</label>
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
                    <button type="button" class="quotemate-btn quotemate-btn--secondary" data-add-choice data-field-id="${fieldId}">Add Choice</button>
                </div>
            `;
    }

    if (fieldType === "service") {
      const services =
        fieldData && fieldData.services ? fieldData.services : [];
      baseHtml += `
                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__label">Service Options</label>
                    <div class="quotemate-form-properties__service-options">
                        ${services
                          .map(
                            (service, index) => `
                            <div class="quotemate-form-properties__service-option">
                                <input type="text" class="quotemate-form-field__input" value="${service.name}" placeholder="Service name" data-service-name="${index}" data-field-id="${fieldId}">
                                <input type="number" class="quotemate-form-field__input" value="${service.price}" placeholder="Price" data-service-price="${index}" data-field-id="${fieldId}">
                                <button type="button" class="quotemate-form-properties__remove-choice" data-remove-service="${index}" data-field-id="${fieldId}">×</button>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <button type="button" class="quotemate-btn quotemate-btn--secondary" data-add-service data-field-id="${fieldId}">Add Service</button>
                </div>
            `;
    }

    if (fieldType === "text" || fieldType === "textarea") {
      baseHtml += `
                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__label">Placeholder Text</label>
                    <input type="text" class="quotemate-form-field__input" value="${
                      fieldData && fieldData.placeholder
                        ? fieldData.placeholder
                        : ""
                    }" placeholder="Enter placeholder text" data-property="placeholder" data-field-id="${fieldId}">
                </div>
            `;
    }

    baseHtml += `
                <div class="quotemate-form-properties__section">
                    <label class="quotemate-form-properties__label">CSS Class Name</label>
                    <input type="text" class="quotemate-form-field__input" value="${
                      fieldData && fieldData.cssClass ? fieldData.cssClass : ""
                    }" placeholder="custom-class" data-property="cssClass" data-field-id="${fieldId}">
                </div>
            </div>
        `;

    // Add event listeners after HTML is inserted
    setTimeout(() => {
      this.attachPropertyEventListeners();
    }, 0);

    return baseHtml;
  }

  attachPropertyEventListeners() {
    // Property changes
    document.querySelectorAll("[data-property]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const fieldId = e.target.dataset.fieldId;
        const property = e.target.dataset.property;
        const value =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        this.updateFieldProperty(fieldId, property, value);
      });
    });

    // Choice management
    document.querySelectorAll("[data-choice-index]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const fieldId = e.target.dataset.fieldId;
        const index = parseInt(e.target.dataset.choiceIndex);
        this.updateFieldChoice(fieldId, index, e.target.value);
      });
    });

    document.querySelectorAll("[data-remove-choice]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        const index = parseInt(e.target.dataset.removeChoice);
        this.removeFieldChoice(fieldId, index);
      });
    });

    document.querySelectorAll("[data-add-choice]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        this.addFieldChoice(fieldId);
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
          this.updateServiceOption(
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
        this.removeServiceOption(fieldId, index);
      });
    });

    document.querySelectorAll("[data-add-service]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const fieldId = e.target.dataset.fieldId;
        this.addServiceOption(fieldId);
      });
    });
  }

  removeServiceOption(fieldId, index) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.services && fieldData.services.length > 0) {
      fieldData.services.splice(index, 1);
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }

  updateFieldProperty(fieldId, property, value) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData) {
      fieldData[property] = value;
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
    }
  }

  updateFieldChoice(fieldId, choiceIndex, value) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.options) {
      fieldData.options[choiceIndex] = value;
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
    }
  }

  addFieldChoice(fieldId) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData) {
      if (!fieldData.options) {
        fieldData.options = [];
      }
      fieldData.options.push(`Option ${fieldData.options.length + 1}`);
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }

  removeFieldChoice(fieldId, choiceIndex) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.options && fieldData.options.length > 0) {
      fieldData.options.splice(choiceIndex, 1);
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }

  refreshFieldInCanvas(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);

    if (fieldElement && fieldData) {
      // Update label
      const labelElement = fieldElement.querySelector(
        ".quotemate-form-field__label"
      );
      if (labelElement) {
        labelElement.innerHTML = `${fieldData.label} ${
          fieldData.required
            ? '<span class="quotemate-form-field__required">*</span>'
            : ""
        }`;
      }

      // Update input based on field type
      if (fieldData.type === "select" && fieldData.options) {
        const selectElement = fieldElement.querySelector("select");
        if (selectElement) {
          selectElement.innerHTML =
            `<option value="">Choose an option</option>` +
            fieldData.options
              .map(
                (option) =>
                  `<option value="${option
                    .toLowerCase()
                    .replace(/\s+/g, "_")}">${option}</option>`
              )
              .join("");
        }
      } else if (fieldData.type === "service" && fieldData.services) {
        const selectElement = fieldElement.querySelector("select");
        if (selectElement) {
          selectElement.innerHTML =
            `<option value="">Select a service</option>` +
            fieldData.services
              .map(
                (service) =>
                  `<option value="${service.name
                    .toLowerCase()
                    .replace(/\s+/g, "_")}" data-price="${service.price}">${
                    service.name
                  } ($${service.price})</option>`
              )
              .join("");
        }
      } else if (
        (fieldData.type === "radio" || fieldData.type === "checkbox") &&
        fieldData.options
      ) {
        const optionsContainer = fieldElement.querySelector(
          ".quotemate-form-field__options"
        );
        if (optionsContainer) {
          if (fieldData.options.length > 0) {
            const inputType = fieldData.type;
            const inputName =
              fieldData.type === "checkbox" ? `${fieldId}[]` : fieldId;
            optionsContainer.innerHTML = fieldData.options
              .map(
                (option) =>
                  `<label><input type="${inputType}" name="${inputName}" value="${option
                    .toLowerCase()
                    .replace(/\s+/g, "_")}"> ${option}</label>`
              )
              .join("");
          } else {
            optionsContainer.innerHTML =
              '<p class="quotemate-form-field__empty">No options added yet. Configure in field settings.</p>';
          }
        }
      }

      // Update placeholder
      if (fieldData.placeholder) {
        const inputElement = fieldElement.querySelector(
          'input[type="text"], input[type="email"], textarea'
        );
        if (inputElement) {
          inputElement.placeholder = fieldData.placeholder;
        }
      }
    }
  }

  editField(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    this.selectField(fieldElement);
  }

  /** Deep-clone field data for duplicate/copy (independent options, services, etc.) */
  cloneFieldData(fieldData, newFieldId) {
    const clone = JSON.parse(JSON.stringify(fieldData));
    clone.id = newFieldId;
    return clone;
  }

  duplicateField(fieldId) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (!fieldData) return;

    this.fieldCounter++;
    const newFieldId = `field_${this.fieldCounter}`;
    const newFieldData = this.cloneFieldData(fieldData, newFieldId);

    const originalElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    if (!originalElement?.parentNode) return;

    const wrap = document.createElement('div');
    wrap.innerHTML = this.generateFieldHtmlFromData(newFieldData);
    const newElement = wrap.firstElementChild;
    if (!newElement) return;

    originalElement.parentNode.insertBefore(newElement, originalElement.nextSibling);

    this.formData.fields.push(newFieldData);
    this.updateFormData();
  }

  deleteField(fieldId) {
    if (confirm("Are you sure you want to delete this field?")) {
      const fieldElement = document.querySelector(
        `[data-field-id="${fieldId}"]`
      );
      if (fieldElement) {
        fieldElement.remove();
      }

      this.formData.fields = this.formData.fields.filter(
        (f) => f.id !== fieldId
      );
      this.updateFormData();

      // Hide properties panel if this field was selected
      if (
        this.selectedField &&
        this.selectedField.dataset.fieldId === fieldId
      ) {
        document.getElementById("properties-panel").style.display = "none";
        this.selectedField = null;
      }

      // Show placeholder if no fields left
      if (this.formData.fields.length === 0) {
        document.querySelector(
          ".quotemate-form-builder__drop-placeholder"
        ).style.display = "flex";
      }
    }
  }
  initFormTitleEditing() {
    const titleElement = document.querySelector(
      ".quotemate-form-builder__form-title"
    );
    const descriptionElement = document.querySelector(
      ".quotemate-form-builder__form-description"
    );

    titleElement.addEventListener("input", () => {
      this.formData.title = titleElement.textContent;
      this.updateFormData();
    });

    descriptionElement.addEventListener("input", () => {
      this.formData.description = descriptionElement.textContent;
      this.updateFormData();
    });
  }

  initSaveForm() {
    // This is now handled by FormSaver class
  }

  initPreview() {
    document.getElementById("preview-form").addEventListener("click", () => {
      this.previewForm();
    });

    // Close properties panel
    document
      .querySelector(".quotemate-form-builder__close-properties")
      .addEventListener("click", () => {
        document.getElementById("properties-panel").style.display = "none";
        if (this.selectedField) {
          this.selectedField.classList.remove("selected");
          this.selectedField = null;
        }
      });
  }

  updateFormData() {
    const formNameInput = document.getElementById("form-name");
    this.formData.name = formNameInput.value || "Untitled Form";

    document.getElementById("form-data").value = JSON.stringify(this.formData);
  }

  saveForm() {
    // This is now handled by FormSaver class
  }

  previewForm() {
    // Open preview in new window/tab
    const previewData = {
      title: this.formData.title,
      description: this.formData.description,
      fields: this.formData.fields,
    };

    const previewWindow = window.open("", "_blank");
    previewWindow.document.write(this.generatePreviewHtml(previewData));
  }

  generatePreviewHtml(formData) {
    const fieldsHtml = formData.fields
      .map((field) => {
        let inputHtml = "";

        switch (field.type) {
          case "text":
          case "email":
          case "number":
          case "phone":
            inputHtml = `<input type="${field.type}" name="${
              field.id
            }" placeholder="${field.placeholder || ""}" ${
              field.required ? "required" : ""
            }>`;
            break;
          case "textarea":
            inputHtml = `<textarea name="${field.id}" rows="4" placeholder="${
              field.placeholder || ""
            }" ${field.required ? "required" : ""}></textarea>`;
            break;
          case "select":
            inputHtml = `<select name="${field.id}" ${
              field.required ? "required" : ""
            }>
                            <option value="">Choose an option</option>
                            ${
                              field.options
                                ? field.options
                                    .map(
                                      (option) =>
                                        `<option value="${option}">${option}</option>`
                                    )
                                    .join("")
                                : ""
                            }
                        </select>`;
            break;
          case "radio":
            inputHtml = field.options
              ? field.options
                  .map(
                    (option) =>
                      `<label><input type="radio" name="${
                        field.id
                      }" value="${option}" ${
                        field.required ? "required" : ""
                      }> ${option}</label>`
                  )
                  .join("")
              : "";
            break;
          case "checkbox":
            inputHtml = field.options
              ? field.options
                  .map(
                    (option) =>
                      `<label><input type="checkbox" name="${field.id}[]" value="${option}"> ${option}</label>`
                  )
                  .join("")
              : "";
            break;
          default:
            inputHtml = `<input type="text" name="${field.id}" ${
              field.required ? "required" : ""
            }>`;
        }

        return `
                    <div class="form-field">
                        <label>${field.label} ${
          field.required ? '<span style="color: red;">*</span>' : ""
        }</label>
                        ${inputHtml}
                    </div>
                `;
      })
      .join("");

    return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Form Preview - ${formData.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                        .form-field { margin-bottom: 20px; }
                        label { display: block; margin-bottom: 5px; font-weight: bold; }
                        input, textarea, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                        button { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <h1>${formData.title}</h1>
                    <p>${formData.description}</p>
                    <form>
                        ${fieldsHtml}
                        <button type="submit">Submit</button>
                    </form>
                </body>
                </html>
            `;
  }

  showNotification(message, type) {
    const notification = document.createElement("div");
    notification.className = `quotemate-notification quotemate-notification--${type}`;
    notification.textContent = message;

    notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 4px;
                color: white;
                z-index: 1000;
                background: ${type === "success" ? "#28a745" : "#dc3545"};
            `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}