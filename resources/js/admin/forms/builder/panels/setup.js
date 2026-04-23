import "/scss/admin/forms/builder/panels/setup.scss";

class TemplateFilter {
  constructor(wrapperSelector) {
    this.wrapper = document.querySelector(wrapperSelector);
    if (!this.wrapper) return;

    this.searchInput = this.wrapper.querySelector("#template-search");
    this.categoryItems = this.wrapper.querySelectorAll(
      ".quotemate-form-setup__template-category-item"
    );
    this.templates = this.wrapper.querySelectorAll(
      ".quotemate-form-setup__template-item"
    );

    this.bindEvents();
  }

  bindEvents() {
    this.categoryItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        this.onCategoryClick(item);
      });
    });

    this.searchInput.addEventListener("input", () => {
      this.applyFilters();
    });
  }

  onCategoryClick(clickedItem) {
    this.categoryItems.forEach((item) =>
      item.classList.remove(
        "quotemate-form-setup__template-category-item--active"
      )
    );
    clickedItem.classList.add(
      "quotemate-form-setup__template-category-item--active"
    );
    this.applyFilters();
  }

  getActiveCategoryId() {
    const active = this.wrapper.querySelector(
      ".quotemate-form-setup__template-category-item--active"
    );
    return active ? active.getAttribute("data-category-id") : "0";
  }

  getSearchTerm() {
    return this.searchInput.value.trim().toLowerCase();
  }

  applyFilters() {
    const activeCategory = this.getActiveCategoryId();
    const searchTerm = this.getSearchTerm();

    this.templates.forEach((template) => {
      const categoryId = template.getAttribute("data-category-id");
      const title =
        template
          .querySelector(".quotemate-form-setup__template-title")
          ?.textContent.toLowerCase() || "";
      const description =
        template
          .querySelector(".quotemate-form-setup__template-description")
          ?.textContent.toLowerCase() || "";

      const matchesCategory =
        activeCategory === "0" || categoryId === activeCategory;
      const matchesSearch =
        title.includes(searchTerm) || description.includes(searchTerm);

      if (matchesCategory && matchesSearch) {
        template.classList.remove(
          "quotemate-form-setup__template-item--hidden"
        );
      } else {
        template.classList.add("quotemate-form-setup__template-item--hidden");
      }
    });
  }
}

class CreateForm {
  constructor(formSelector) {
    this.form = document.querySelector(formSelector);
    if (!this.form) return;

    // Get data with fallback
    this.ajaxData = window.Quotemate?.admin_forms_builder_panels_setup || {};
    
    // Debug logging
    console.log('CreateForm initialized with:', {
      form: this.form,
      ajaxData: this.ajaxData,
      windowQuotemate: window.Quotemate
    });
    
    this.init();
  }

  init() {
    this.nameInput = this.form.querySelector("#form-name");
    this.templateInputs = this.form.querySelectorAll(
      ".quotemate-form-setup__template-button--use"
    );
    this.hiddenTemplateInput = this.form.querySelector(
      'input[name="template_id"]'
    );
    this.editMode = this.ajaxData.edit_mode;
    this.formIdInput = this.form.querySelector('input[name="form_id"]');

    // Debug logging
    console.log('CreateForm initialized with:', {
      form: this.form,
      ajaxData: this.ajaxData,
      windowQuotemate: window.Quotemate,
      nameInput: this.nameInput,
      templateInputs: this.templateInputs.length,
      editMode: this.editMode
    });

    this.bindEvents();
  }

  bindEvents() {
    this.templateInputs.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const templateItem = button.closest(
          ".quotemate-form-setup__template-item"
        );
        const templateId = templateItem.getAttribute("data-template-id");

        if (!templateId) return alert("Template ID missing");

        this.hiddenTemplateInput.value = templateId;

        this.submitForm({
          name: this.nameInput.value.trim(),
          template_id: templateId,
          form_id: this.editMode ? this.formIdInput?.value : null,
        });
      });
    });
  }

  async submitForm({ name, template_id, form_id }) {
    if (!name) {
      alert("Please enter a form name.");
      return;
    }

    // Get AJAX URL with fallback
    let ajaxUrl = this.ajaxData?.ajaxUrl;
    if (!ajaxUrl) {
      // Fallback to WordPress admin-ajax.php
      ajaxUrl = window.location.origin + '/wp-admin/admin-ajax.php';
    }

    // Get nonce from multiple sources with fallback
    let nonce = this.ajaxData?.nonce;
    
    // Fallback 1: Try to get from hidden input field
    if (!nonce) {
      const nonceInput = this.form.querySelector('input[name="nonce"]');
      nonce = nonceInput ? nonceInput.value : null;
    }
    
    // Fallback 2: Try to get from window.Quotemate object
    if (!nonce && window.Quotemate?.admin_forms_builder_panels_setup?.nonce) {
      nonce = window.Quotemate.admin_forms_builder_panels_setup.nonce;
    }
    
    // Debug logging
    console.log('Form submission data:', {
      ajaxUrl: ajaxUrl,
      ajaxData: this.ajaxData,
      nonce: nonce,
      name: name,
      template_id: template_id,
      form_id: form_id
    });
    
    if (!nonce) {
      console.error('Nonce not found! This is a security issue.');
      alert("Security token not found. Please refresh the page and try again.");
      return;
    }

    const payload = {
      action: this.editMode ? "update_form" : "create_form",
      nonce: nonce,
      name,
      template_id,
    };

    if (this.editMode && form_id) {
      payload.form_id = form_id;
    }

    console.log('Submitting form with payload:', payload);

    try {
      const response = await fetch(ajaxUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(payload),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.redirect_url;
      } else {
        alert(data?.message || "Something went wrong.");
      }
    } catch (error) {
      console.error("Request failed:", error);
      alert("Server error. Please try again.");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new TemplateFilter(".quotemate-form-setup__template-selection");
  new CreateForm("#quotemate-form-setup");
});
