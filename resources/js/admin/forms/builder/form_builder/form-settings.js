import {
  DESIGN_DEFAULTS,
  THEME_PRESETS,
  applyDesignCssVars,
  applyDesignToBuilderCanvas,
  buildDesignCssVars,
  getThemePreset,
  syncBuilderLivePreview,
  syncBuilderStepProgress,
} from "./design-vars.js";

class FormSettingsManager {
    constructor() {
        // Initialize with default settings
        this.settings = {
            general: {
                formName: "",
                formTitle: "",
                formDescription: "",
                formActive: true,
                enableCaptcha: false,
                enableSubmissionLimit: false,
                maxSubmissions: 1,
            },
            email: {
                enableAdminEmail: true,
                adminEmail: "",
                adminSubject: "New Quote Request - {form_name}",
                adminBody: "A new quote request has been submitted:\n\nForm: {form_name}\nSubmitted: {submission_date}\nUser Email: {user_email}\n\nDetails:\n{all_fields}\n\n---\nThis is an automated message from {site_name}",
                enableCustomerEmail: true,
                fromEmail: "",
                fromName: "",
                customerSubject: "Quote Request Confirmation - {site_name}",
                customerBody: "Thank you for your quote request!\n\nWe have received your information and will get back to you within 24 hours.\n\nYour submitted information:\n{all_fields}\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n{site_name} Team",
            },
            redirect: {
                afterSubmission: "message",
                successMessage: "Thank you for your quote request! We will get back to you soon.",
                redirectUrl: "",
                errorMessage: "An error occurred while processing your request. Please try again.",
                validationMessage: "Please fill in all required fields correctly.",
            },
            design: {
                ...DESIGN_DEFAULTS,
            },
            advanced: {
                customCss: "",
                customJs: "",
                gaEvent: "",
                fbEvent: "",
            },
        };

        // Try to load settings from form data
        this.loadSettingsFromFormData();
        this.init();
    }

    parseSettingsValue(settings) {
        if (!settings) {
            return {};
        }
        if (typeof settings === 'string') {
            try {
                return JSON.parse(settings);
            } catch (error) {
                console.warn('Failed to parse settings JSON:', error);
                return {};
            }
        }
        if (typeof settings === 'object') {
            return settings;
        }
        return {};
    }

    normalizeFormBuilderSettings() {
        if (!window.quotemateFormBuilder?.formData) {
            return {};
        }

        const parsed = this.parseSettingsValue(window.quotemateFormBuilder.formData.settings);
        window.quotemateFormBuilder.formData.settings = parsed;
        return parsed;
    }

    syncFormBuilderDesign(design) {
        if (!window.quotemateFormBuilder?.formData) {
            return;
        }

        const settings = this.normalizeFormBuilderSettings();
        settings.design = {
            ...(settings.design || {}),
            ...design,
        };
        window.quotemateFormBuilder.formData.settings = settings;
    }

    loadSettingsFromFormData() {
        try {
            if (window.quotemateFormBuilder?.formData?.settings) {
                const savedSettings = this.normalizeFormBuilderSettings();
                this.settings = this.mergeSettings(this.settings, savedSettings);
            }

            // Try to get basic form info from form data
            if (window.quotemateFormBuilder?.formData) {
                const formData = window.quotemateFormBuilder.formData;
                this.settings.general.formName = formData.name || this.settings.general.formName;
                this.settings.general.formTitle = formData.title || this.settings.general.formTitle;
                this.settings.general.formDescription = formData.description || this.settings.general.formDescription;
                this.settings.general.formActive = formData.active === '1' || formData.active === true;
            }
        } catch (error) {
            console.warn('Error loading settings from form data:', error);
        }
    }

    mergeSettings(defaultSettings, savedSettings) {
        const merged = { ...defaultSettings };
        
        // Merge each section
        for (const section in savedSettings) {
            if (merged[section] && typeof savedSettings[section] === 'object') {
                if (section === 'design') {
                    merged[section] = {
                        ...DESIGN_DEFAULTS,
                        ...merged[section],
                        ...savedSettings[section],
                    };
                } else {
                    merged[section] = { ...merged[section], ...savedSettings[section] };
                }
            }
        }
        
        return merged;
    }

    init() {
      // Wait for DOM to be fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.bindEvents();
          this.loadSettings();
          this.updatePreview();
          this.updateDesignPreview();
        });
      } else {
        this.bindEvents();
        this.loadSettings();
        this.updatePreview();
        this.updateDesignPreview();
      }
    }
  
    // Helper method to safely get elements
    getElement(id) {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with ID '${id}' not found`);
      }
      return element;
    }
  
    // Helper method to safely query elements
    queryElement(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element with selector '${selector}' not found`);
      }
      return element;
    }
  
    bindEvents() {
      // Modal controls
      const closeSettings = this.getElement("closeSettings");
      const cancelSettings = this.getElement("cancelSettings");
      const saveSettings = this.getElement("saveSettings");
  
  
      if (closeSettings) {
        closeSettings.addEventListener("click", () => this.closeModal());
      }
  
      if (cancelSettings) {
        cancelSettings.addEventListener("click", () => this.closeModal());
      }
  
      if (saveSettings) {
        saveSettings.addEventListener("click", () => this.saveSettings());
      }
  
      // Tab switching
      document.querySelectorAll(".settings-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          this.switchTab(tab.dataset.tab);
        });
      });
  
      // Form inputs
      this.bindFormInputs();
  
      // After submission radio buttons
      document.querySelectorAll('input[name="afterSubmission"]').forEach((radio) => {
        radio.addEventListener("change", () => {
          this.toggleAfterSubmissionFields();
        });
      });
  
      // Font size slider
      const fontSize = this.getElement("fontSize");
      if (fontSize) {
        fontSize.addEventListener("input", (e) => {
          const fontSizeValue = this.getElement("fontSizeValue");
          if (fontSizeValue) {
            fontSizeValue.textContent = e.target.value + "px";
          }
          this.updateDesignPreview();
        });
      }

      const headerStyle = this.getElement("headerStyle");
      if (headerStyle) {
        headerStyle.addEventListener("change", () => {
          this.toggleGradientFields();
          this.updateDesignPreview();
        });
      }

      const buttonStyle = this.getElement("buttonStyle");
      if (buttonStyle) {
        buttonStyle.addEventListener("change", () => {
          this.toggleGradientFields();
          this.updateDesignPreview();
        });
      }

      const fontFamily = this.getElement("fontFamily");
      if (fontFamily) {
        fontFamily.addEventListener("change", () => this.updateDesignPreview());
      }

      const formWidth = this.getElement("formWidth");
      if (formWidth) {
        formWidth.addEventListener("change", () => this.updateDesignPreview());
      }
  
      // Field spacing slider
      const fieldSpacing = this.getElement("fieldSpacing");
      if (fieldSpacing) {
        fieldSpacing.addEventListener("input", (e) => {
          const fieldSpacingValue = this.getElement("fieldSpacingValue");
          if (fieldSpacingValue) {
            fieldSpacingValue.textContent = e.target.value + "rem";
          }
          this.updateDesignPreview();
        });
      }

      const formBorderWidth = this.getElement("formBorderWidth");
      if (formBorderWidth) {
        formBorderWidth.addEventListener("input", (e) => {
          const formBorderWidthValue = this.getElement("formBorderWidthValue");
          if (formBorderWidthValue) {
            formBorderWidthValue.textContent = e.target.value + "px";
          }
          this.updateDesignPreview();
        });
      }

      const formBorderRadius = this.getElement("formBorderRadius");
      if (formBorderRadius) {
        formBorderRadius.addEventListener("input", (e) => {
          const formBorderRadiusValue = this.getElement("formBorderRadiusValue");
          if (formBorderRadiusValue) {
            formBorderRadiusValue.textContent = e.target.value + "px";
          }
          this.updateDesignPreview();
        });
      }

      document.querySelectorAll(".qm-theme-option").forEach((option) => {
        option.addEventListener("click", () => {
          const themeId = option.dataset.themeId;
          if (themeId) {
            this.applyThemePreset(themeId);
          }
        });
      });
  
      // Color inputs
      document.querySelectorAll(".color-input").forEach((input) => {
        input.addEventListener("input", () => {
          this.updateDesignPreview();
        });
        input.addEventListener("change", () => {
          this.updateDesignPreview();
        });
      });
  
      // Template variable insertion
      document.querySelectorAll(".template-var").forEach((variable) => {
        variable.addEventListener("click", () => {
          this.insertTemplateVariable(variable.textContent);
        });
      });
  
      // Close modal on outside click
      const settingsModal = this.getElement("settingsModal");
      if (settingsModal) {
        settingsModal.addEventListener("click", (e) => {
          if (e.target.id === "settingsModal") {
            this.closeModal();
          }
        });
      }
    }
  
    bindFormInputs() {
      // General settings
      const formName = this.getElement("formName");
      if (formName) {
        formName.addEventListener("input", (e) => {
          this.settings.general.formName = e.target.value;
          this.updatePreview();
        });
      }
  
      const formTitle = this.getElement("formTitle");
      if (formTitle) {
        formTitle.addEventListener("input", (e) => {
          this.settings.general.formTitle = e.target.value;
          this.updatePreview();
        });
      }
  
      const formDescription = this.getElement("formDescription");
      if (formDescription) {
        formDescription.addEventListener("input", (e) => {
          this.settings.general.formDescription = e.target.value;
          this.updatePreview();
        });
      }
  
      // Add more form input bindings as needed...
    }
  
    openModal() {
      const modal = this.getElement("settingsModal");
      if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    }
  
    closeModal() {
      const modal = this.getElement("settingsModal");
      if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }
    }
  
    switchTab(tabName) {
      // Update tab buttons
      document.querySelectorAll(".settings-tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      const activeTab = this.queryElement(`[data-tab="${tabName}"]`);
      if (activeTab) {
        activeTab.classList.add("active");
      }
  
      // Update tab content
      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });
      const activeContent = this.getElement(tabName);
      if (activeContent) {
        activeContent.classList.add("active");
      }
    }
  
    toggleAfterSubmissionFields() {
      const selectedRadio = this.queryElement('input[name="afterSubmission"]:checked');
      if (!selectedRadio) return;
  
      const selectedValue = selectedRadio.value;
      const messageGroup = this.getElement("successMessageGroup");
      const redirectGroup = this.getElement("redirectUrlGroup");
  
      if (selectedValue === "message") {
        if (messageGroup) messageGroup.style.display = "block";
        if (redirectGroup) redirectGroup.style.display = "none";
      } else {
        if (messageGroup) messageGroup.style.display = "none";
        if (redirectGroup) redirectGroup.style.display = "block";
      }
    }
  
    insertTemplateVariable(variable) {
      // Get the currently focused textarea
      const activeTextarea = document.activeElement;
      if (activeTextarea && activeTextarea.tagName === "TEXTAREA") {
        const start = activeTextarea.selectionStart;
        const end = activeTextarea.selectionEnd;
        const text = activeTextarea.value;
  
        activeTextarea.value = text.substring(0, start) + variable + text.substring(end);
        activeTextarea.focus();
        activeTextarea.setSelectionRange(start + variable.length, start + variable.length);
      }
    }
  
    loadSettings() {
      // Load general settings
      const formName = this.getElement("formName");
      if (formName) formName.value = this.settings.general.formName || "";
  
      const formTitle = this.getElement("formTitle");
      if (formTitle) formTitle.value = this.settings.general.formTitle || "";
  
      const formDescription = this.getElement("formDescription");
      if (formDescription) formDescription.value = this.settings.general.formDescription || "";
  
      const formActive = this.getElement("formActive");
      if (formActive) formActive.checked = this.settings.general.formActive || false;
  
      // Load email settings
      const enableAdminEmail = this.getElement("enableAdminEmail");
      if (enableAdminEmail) enableAdminEmail.checked = this.settings.email.enableAdminEmail;
  
      const adminEmail = this.getElement("adminEmail");
      if (adminEmail) adminEmail.value = this.settings.email.adminEmail;
  
      const adminSubject = this.getElement("adminSubject");
      if (adminSubject) adminSubject.value = this.settings.email.adminSubject;
  
      const adminBody = this.getElement("adminBody");
      if (adminBody) adminBody.value = this.settings.email.adminBody;
  
      // Load redirect settings
      const afterSubmissionRadio = this.queryElement(`input[name="afterSubmission"][value="${this.settings.redirect.afterSubmission}"]`);
      if (afterSubmissionRadio) afterSubmissionRadio.checked = true;
  
      const successMessage = this.getElement("successMessage");
      if (successMessage) successMessage.value = this.settings.redirect.successMessage;
  
      const redirectUrl = this.getElement("redirectUrl");
      if (redirectUrl) redirectUrl.value = this.settings.redirect.redirectUrl;
  
      // Load design settings
      const formBgColor = this.getElement("formBgColor");
      if (formBgColor) formBgColor.value = this.settings.design.formBgColor;

      const headerStyle = this.getElement("headerStyle");
      if (headerStyle) headerStyle.value = this.settings.design.headerStyle || "gradient";

      const headerColor = this.getElement("headerColor");
      if (headerColor) headerColor.value = this.settings.design.headerColor;

      const headerColorEnd = this.getElement("headerColorEnd");
      if (headerColorEnd) headerColorEnd.value = this.settings.design.headerColorEnd || "#764ba2";

      const buttonStyle = this.getElement("buttonStyle");
      if (buttonStyle) buttonStyle.value = this.settings.design.buttonStyle || "gradient";

      const labelColor = this.getElement("labelColor");
      if (labelColor) labelColor.value = this.settings.design.labelColor;

      const buttonColor = this.getElement("buttonColor");
      if (buttonColor) buttonColor.value = this.settings.design.buttonColor;

      const buttonColorEnd = this.getElement("buttonColorEnd");
      if (buttonColorEnd) buttonColorEnd.value = this.settings.design.buttonColorEnd || "#764ba2";

      const borderColor = this.getElement("borderColor");
      if (borderColor) borderColor.value = this.settings.design.borderColor;

      const formBorderColor = this.getElement("formBorderColor");
      if (formBorderColor) formBorderColor.value = this.settings.design.formBorderColor || "#e5e7eb";

      const formBorderWidth = this.getElement("formBorderWidth");
      if (formBorderWidth) {
        formBorderWidth.value = this.settings.design.formBorderWidth ?? 0;
        const formBorderWidthValue = this.getElement("formBorderWidthValue");
        if (formBorderWidthValue) {
          formBorderWidthValue.textContent = (this.settings.design.formBorderWidth ?? 0) + "px";
        }
      }

      const formBorderRadius = this.getElement("formBorderRadius");
      if (formBorderRadius) {
        formBorderRadius.value = this.settings.design.formBorderRadius ?? 12;
        const formBorderRadiusValue = this.getElement("formBorderRadiusValue");
        if (formBorderRadiusValue) {
          formBorderRadiusValue.textContent = (this.settings.design.formBorderRadius ?? 12) + "px";
        }
      }

      const focusColor = this.getElement("focusColor");
      if (focusColor) focusColor.value = this.settings.design.focusColor;

      const fontFamily = this.getElement("fontFamily");
      if (fontFamily) fontFamily.value = this.settings.design.fontFamily || "system";

      const formWidth = this.getElement("formWidth");
      if (formWidth) formWidth.value = this.settings.design.formWidth || "container";

      const fieldSpacing = this.getElement("fieldSpacing");
      if (fieldSpacing) {
        fieldSpacing.value = this.settings.design.fieldSpacing;
        const fieldSpacingValue = this.getElement("fieldSpacingValue");
        if (fieldSpacingValue) fieldSpacingValue.textContent = this.settings.design.fieldSpacing + "rem";
      }

      const fontSize = this.getElement("fontSize");
      if (fontSize) {
        fontSize.value = this.settings.design.fontSize;
        const fontSizeValue = this.getElement("fontSizeValue");
        if (fontSizeValue) fontSizeValue.textContent = this.settings.design.fontSize + "px";
      }

      this.syncThemeOptionUI(this.settings.design.themeId || "classic");

      this.toggleGradientFields();
      this.toggleAfterSubmissionFields();
      this.updateDesignPreview();
    }

    toggleGradientFields() {
      const headerStyle = this.getElement("headerStyle")?.value || "gradient";
      const buttonStyle = this.getElement("buttonStyle")?.value || "gradient";
      const headerEndWrap = this.getElement("headerColorEndWrap");
      const buttonEndWrap = this.getElement("buttonColorEndWrap");
      const headerColorLabel = this.getElement("headerColorLabel");
      const buttonColorLabel = this.getElement("buttonColorLabel");

      if (headerEndWrap) {
        headerEndWrap.style.display = headerStyle === "gradient" ? "" : "none";
      }
      if (buttonEndWrap) {
        buttonEndWrap.style.display = buttonStyle === "gradient" ? "" : "none";
      }
      if (headerColorLabel) {
        headerColorLabel.textContent = headerStyle === "gradient" ? "Gradient Start" : "Header Color";
      }
      if (buttonColorLabel) {
        buttonColorLabel.textContent = buttonStyle === "gradient" ? "Gradient Start" : "Button Color";
      }
    }

    syncThemeOptionUI(themeId) {
      document.querySelectorAll(".qm-theme-option").forEach((option) => {
        const isActive = option.dataset.themeId === themeId;
        option.classList.toggle("qm-theme-option--active", isActive);
        option.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    applyThemePreset(themeId) {
      const currentThemeId = this.settings.design?.themeId || "classic";
      if (themeId === currentThemeId) {
        return;
      }

      const preset = getThemePreset(themeId);
      if (!preset) {
        return;
      }

      const confirmed = window.confirm(
        "Switching theme will reset colors to that theme's defaults. Continue?"
      );
      if (!confirmed) {
        this.syncThemeOptionUI(currentThemeId);
        return;
      }

      const design = {
        ...this.settings.design,
        ...preset,
        themeId,
        fontFamily: this.settings.design.fontFamily || DESIGN_DEFAULTS.fontFamily,
        fontSize: this.settings.design.fontSize || DESIGN_DEFAULTS.fontSize,
        formWidth: this.settings.design.formWidth || DESIGN_DEFAULTS.formWidth,
        fieldSpacing: this.settings.design.fieldSpacing || DESIGN_DEFAULTS.fieldSpacing,
      };

      this.settings.design = design;
      this.populateDesignFields(design);
      this.syncThemeOptionUI(themeId);
      this.toggleGradientFields();
      this.updateDesignPreview();
    }

    populateDesignFields(design) {
      const fieldMap = {
        formBgColor: "formBgColor",
        headerStyle: "headerStyle",
        headerColor: "headerColor",
        headerColorEnd: "headerColorEnd",
        buttonStyle: "buttonStyle",
        labelColor: "labelColor",
        buttonColor: "buttonColor",
        buttonColorEnd: "buttonColorEnd",
        borderColor: "borderColor",
        formBorderColor: "formBorderColor",
        focusColor: "focusColor",
        fontFamily: "fontFamily",
        formWidth: "formWidth",
      };

      Object.entries(fieldMap).forEach(([key, elementId]) => {
        const element = this.getElement(elementId);
        if (element && design[key] !== undefined) {
          element.value = design[key];
        }
      });

      const formBorderWidth = this.getElement("formBorderWidth");
      if (formBorderWidth && design.formBorderWidth !== undefined) {
        formBorderWidth.value = design.formBorderWidth;
        const valueEl = this.getElement("formBorderWidthValue");
        if (valueEl) valueEl.textContent = design.formBorderWidth + "px";
      }

      const formBorderRadius = this.getElement("formBorderRadius");
      if (formBorderRadius && design.formBorderRadius !== undefined) {
        formBorderRadius.value = design.formBorderRadius;
        const valueEl = this.getElement("formBorderRadiusValue");
        if (valueEl) valueEl.textContent = design.formBorderRadius + "px";
      }

      const fieldSpacing = this.getElement("fieldSpacing");
      if (fieldSpacing && design.fieldSpacing !== undefined) {
        fieldSpacing.value = design.fieldSpacing;
        const valueEl = this.getElement("fieldSpacingValue");
        if (valueEl) valueEl.textContent = design.fieldSpacing + "rem";
      }

      const fontSize = this.getElement("fontSize");
      if (fontSize && design.fontSize !== undefined) {
        fontSize.value = design.fontSize;
        const valueEl = this.getElement("fontSizeValue");
        if (valueEl) valueEl.textContent = design.fontSize + "px";
      }
    }

    getCurrentDesignSettings() {
      const activeTheme = document.querySelector(".qm-theme-option--active");
      const themeId =
        activeTheme?.dataset.themeId ||
        this.settings.design.themeId ||
        DESIGN_DEFAULTS.themeId;

      return {
        themeId,
        formBgColor: this.getElement("formBgColor")?.value || this.settings.design.formBgColor,
        headerStyle: this.getElement("headerStyle")?.value || this.settings.design.headerStyle,
        headerColor: this.getElement("headerColor")?.value || this.settings.design.headerColor,
        headerColorEnd: this.getElement("headerColorEnd")?.value || this.settings.design.headerColorEnd,
        buttonStyle: this.getElement("buttonStyle")?.value || this.settings.design.buttonStyle,
        labelColor: this.getElement("labelColor")?.value || this.settings.design.labelColor,
        buttonColor: this.getElement("buttonColor")?.value || this.settings.design.buttonColor,
        buttonColorEnd: this.getElement("buttonColorEnd")?.value || this.settings.design.buttonColorEnd,
        borderColor: this.getElement("borderColor")?.value || this.settings.design.borderColor,
        formBorderColor: this.getElement("formBorderColor")?.value || this.settings.design.formBorderColor,
        formBorderWidth: parseInt(this.getElement("formBorderWidth")?.value, 10) ?? this.settings.design.formBorderWidth ?? 0,
        formBorderRadius: parseInt(this.getElement("formBorderRadius")?.value, 10) ?? this.settings.design.formBorderRadius ?? 12,
        focusColor: this.getElement("focusColor")?.value || this.settings.design.focusColor,
        fontFamily: this.getElement("fontFamily")?.value || this.settings.design.fontFamily,
        fontSize: parseInt(this.getElement("fontSize")?.value, 10) || this.settings.design.fontSize,
        formWidth: this.getElement("formWidth")?.value || this.settings.design.formWidth,
        fieldSpacing: parseFloat(this.getElement("fieldSpacing")?.value) || this.settings.design.fieldSpacing,
      };
    }
  
    updatePreview() {
      const previewTitle = this.getElement("previewTitle");
      if (previewTitle) {
        previewTitle.textContent = this.settings.general.formTitle;
      }
  
      const previewDescription = this.getElement("previewDescription");
      if (previewDescription) {
        previewDescription.textContent = this.settings.general.formDescription;
      }

      const builderTitle = document.querySelector(".quotemate-form-builder__form-title");
      if (builderTitle) {
        builderTitle.textContent = this.settings.general.formTitle;
      }

      const builderDescription = document.querySelector(".quotemate-form-builder__form-description");
      if (builderDescription) {
        builderDescription.textContent = this.settings.general.formDescription;
      }

      const formTitleInput = this.queryElement(".form-title-input");
      if (formTitleInput) {
        formTitleInput.value = this.settings.general.formName;
      }
    }
  
    updateDesignPreview() {
      const design = this.getCurrentDesignSettings();
      const vars = buildDesignCssVars(design);

      const preview = this.getElement("designPreview");
      if (preview) {
        applyDesignCssVars(preview, design);

        const title = preview.querySelector("h3");
        if (title) title.style.color = vars["--qm-label-color"];

        preview.querySelectorAll("label").forEach((label) => {
          label.style.color = vars["--qm-label-color"];
        });

        preview.querySelectorAll("input").forEach((input) => {
          input.style.borderColor = vars["--qm-border-color"];
        });

        const button = preview.querySelector("button");
        if (button) {
          button.style.background = vars["--qm-button-bg"];
          button.style.color = vars["--qm-button-text"];
        }
      }

      applyDesignToBuilderCanvas(design);

      const fieldList = window.formBuilder?.formData?.fields ?? [];
      syncBuilderStepProgress(fieldList, 0, design);

      this.settings.design = {
        ...(this.settings.design || {}),
        ...design,
      };

      this.syncFormBuilderDesign(design);
    }
  
    saveSettings() {
      // Collect all form data
      this.collectFormData();
  
      // Create form data for submission
      const formData = new FormData();
      formData.append("action", "save_form_settings");
      formData.append("form_id", this.getFormId());
      formData.append("settings", JSON.stringify(this.settings));
      formData.append("quotemate_nonce", window.quotemateFormBuilder?.quotemate_nonce || "");
  
      // Show loading state
      const saveBtn = this.getElement("saveSettings");
      if (!saveBtn) return;
  
      const originalText = saveBtn.textContent;
      saveBtn.textContent = "Saving...";
      saveBtn.disabled = true;
  
      // Submit to server
      fetch(this.getAjaxUrl(), {
        method: "POST",
        body: formData,
        credentials: 'same-origin'
      })
        .then((response) => {
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then((responseText) => {
          let data;
          try {
              data = JSON.parse(responseText);
          } catch (error) {
              console.error("Raw response:", responseText);
              throw new Error("Invalid server response");
          }

          if (data.success) {
              this.showNotification(data.data?.message || "Settings saved successfully!", "success");

              if (data.data?.settings) {
                  const savedSettings = this.parseSettingsValue(data.data.settings);
                  this.settings = this.mergeSettings(this.settings, savedSettings);
                  if (window.quotemateFormBuilder?.formData) {
                      window.quotemateFormBuilder.formData.settings = this.mergeSettings(
                          this.normalizeFormBuilderSettings(),
                          savedSettings
                      );
                  }
              }

              this.updateDesignPreview();
              this.closeModal();
          } else {
              this.showNotification(
                  "Error: " + (data.data || "Failed to save settings"),
                  "error"
              );
          }
        })
        .catch((error) => {
          console.error("Save error:", error);
          this.showNotification("Error: " + error.message, "error");
        })
        .finally(() => {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        });
    }
  
    collectFormData() {
      // General settings
      this.settings.general = {
        formName: this.getElement("formName")?.value || this.settings.general.formName,
        formTitle: this.getElement("formTitle")?.value || this.settings.general.formTitle,
        formDescription: this.getElement("formDescription")?.value || this.settings.general.formDescription,
        formActive: this.getElement("formActive")?.checked || this.settings.general.formActive,
        enableCaptcha: this.getElement("enableCaptcha")?.checked || this.settings.general.enableCaptcha,
        enableSubmissionLimit: this.getElement("enableSubmissionLimit")?.checked || this.settings.general.enableSubmissionLimit,
        maxSubmissions: parseInt(this.getElement("maxSubmissions")?.value) || this.settings.general.maxSubmissions,
      };
  
      // Email settings
      this.settings.email = {
        enableAdminEmail: this.getElement("enableAdminEmail")?.checked || this.settings.email.enableAdminEmail,
        adminEmail: this.getElement("adminEmail")?.value || this.settings.email.adminEmail,
        adminSubject: this.getElement("adminSubject")?.value || this.settings.email.adminSubject,
        adminBody: this.getElement("adminBody")?.value || this.settings.email.adminBody,
        enableCustomerEmail: this.getElement("enableCustomerEmail")?.checked || this.settings.email.enableCustomerEmail,
        fromEmail: this.getElement("fromEmail")?.value || this.settings.email.fromEmail,
        fromName: this.getElement("fromName")?.value || this.settings.email.fromName,
        customerSubject: this.getElement("customerSubject")?.value || this.settings.email.customerSubject,
        customerBody: this.getElement("customerBody")?.value || this.settings.email.customerBody,
      };
  
      // Redirect settings
      const afterSubmissionRadio = this.queryElement('input[name="afterSubmission"]:checked');
      this.settings.redirect = {
        afterSubmission: afterSubmissionRadio?.value || this.settings.redirect.afterSubmission,
        successMessage: this.getElement("successMessage")?.value || this.settings.redirect.successMessage,
        redirectUrl: this.getElement("redirectUrl")?.value || this.settings.redirect.redirectUrl,
        errorMessage: this.getElement("errorMessage")?.value || this.settings.redirect.errorMessage,
        validationMessage: this.getElement("validationMessage")?.value || this.settings.redirect.validationMessage,
      };
  
      // Design settings
      this.settings.design = {
        themeId:
          document.querySelector(".qm-theme-option--active")?.dataset.themeId ||
          this.settings.design.themeId ||
          DESIGN_DEFAULTS.themeId,
        formBgColor: this.getElement("formBgColor")?.value || this.settings.design.formBgColor,
        headerStyle: this.getElement("headerStyle")?.value || this.settings.design.headerStyle,
        headerColor: this.getElement("headerColor")?.value || this.settings.design.headerColor,
        headerColorEnd: this.getElement("headerColorEnd")?.value || this.settings.design.headerColorEnd,
        buttonStyle: this.getElement("buttonStyle")?.value || this.settings.design.buttonStyle,
        labelColor: this.getElement("labelColor")?.value || this.settings.design.labelColor,
        buttonColor: this.getElement("buttonColor")?.value || this.settings.design.buttonColor,
        buttonColorEnd: this.getElement("buttonColorEnd")?.value || this.settings.design.buttonColorEnd,
        borderColor: this.getElement("borderColor")?.value || this.settings.design.borderColor,
        formBorderColor: this.getElement("formBorderColor")?.value || this.settings.design.formBorderColor,
        formBorderWidth: parseInt(this.getElement("formBorderWidth")?.value, 10) ?? this.settings.design.formBorderWidth ?? 0,
        formBorderRadius: parseInt(this.getElement("formBorderRadius")?.value, 10) ?? this.settings.design.formBorderRadius ?? 12,
        focusColor: this.getElement("focusColor")?.value || this.settings.design.focusColor,
        fontFamily: this.getElement("fontFamily")?.value || this.settings.design.fontFamily,
        fontSize: parseInt(this.getElement("fontSize")?.value) || this.settings.design.fontSize,
        formWidth: this.getElement("formWidth")?.value || this.settings.design.formWidth,
        fieldSpacing: parseFloat(this.getElement("fieldSpacing")?.value) || this.settings.design.fieldSpacing,
      };
  
      // Advanced settings
      this.settings.advanced = {
        customCss: this.getElement("customCss")?.value || this.settings.advanced.customCss,
        customJs: this.getElement("customJs")?.value || this.settings.advanced.customJs,
        gaEvent: this.getElement("gaEvent")?.value || this.settings.advanced.gaEvent,
        fbEvent: this.getElement("fbEvent")?.value || this.settings.advanced.fbEvent,
      };
    }
  
    showNotification(message, type = "success") {
      const notification = document.createElement("div");
      notification.className = `notification ${type}`;
      notification.textContent = message;
      
      // Add styles if not already present
      if (!notification.style.cssText) {
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          border-radius: 4px;
          color: white;
          font-weight: bold;
          z-index: 10000;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          ${type === 'success' ? 'background-color: #10b981;' : 'background-color: #ef4444;'}
        `;
      }
      
      document.body.appendChild(notification);
  
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
  
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }
  
    getFormId() {
      // Get form ID from URL or form data
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("form_id") || "0";
    }
  
    getNonce() {
      // Get nonce from global variable or form
      return window.quotemateFormBuilder?.nonce || "";
    }
  
    getAjaxUrl() {
      // Get AJAX URL from global variable
      return window.quotemateFormBuilder?.ajaxUrl || "/wp-admin/admin-ajax.php";
    }
  
    // Method to get settings for use in other parts of the application
    getSettings() {
      this.collectFormData();
      return this.settings;
    }
  
    // Method to update settings from external source
    updateSettings(newSettings) {
      const parsedSettings = this.parseSettingsValue(newSettings);
      this.settings = this.mergeSettings(this.settings, parsedSettings);

      if (window.quotemateFormBuilder?.formData) {
        window.quotemateFormBuilder.formData.settings = this.parseSettingsValue(
          window.quotemateFormBuilder.formData.settings
        );
        window.quotemateFormBuilder.formData.settings = this.mergeSettings(
          window.quotemateFormBuilder.formData.settings,
          parsedSettings
        );
      }

      this.loadSettings();
      this.updatePreview();
      this.updateDesignPreview();
    }
  }

  window.FormSettingsManager = FormSettingsManager;
  window.QuotemateDesign = {
    applyToBuilder: applyDesignToBuilderCanvas,
    buildCssVars: buildDesignCssVars,
    themePresets: THEME_PRESETS,
    getThemePreset,
    syncLivePreview: syncBuilderLivePreview,
  };
  
  // Initialize the settings manager when DOM is loaded
  document.addEventListener("DOMContentLoaded", function () {
    // Wait a bit to ensure all components are loaded
    setTimeout(() => {
      if (!window.formSettingsManager) {
        window.formSettingsManager = new FormSettingsManager();
      }
    }, 100);
  });
  
  // Export for use in other scripts
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FormSettingsManager;
  }