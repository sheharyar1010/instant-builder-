export class FormSaver {
  constructor(formBuilder) {
    this.formBuilder = formBuilder;
    this.saveInProgress = false;
    this.init();
  }

  init() {
    const saveButton = document.getElementById("save-form");
    if (saveButton) {
      saveButton.addEventListener("click", () => {
        // Prevent multiple simultaneous save requests
        if (this.saveInProgress) {
          return;
        }
        this.saveForm();
      });
    } else {
      console.warn("Save button not found");
    }
  }

  saveForm() {
    try {
      // Set save in progress flag
      this.saveInProgress = true;

      // Update form data from the builder
      if (this.formBuilder && typeof this.formBuilder.updateFormData === 'function') {
        this.formBuilder.updateFormData();
      }

      const formElement = document.getElementById("quotemate-form-setup");
      if (!formElement) {
        this.showNotification("Error: Form element not found", "error");
        this.saveInProgress = false;
        return;
      }

      const formData = new FormData(formElement);

      // Add the dynamic data to the form
      if (this.formBuilder && this.formBuilder.formData) {
        formData.append("form_name", this.formBuilder.formData.name || "");
        formData.append("form_title", this.formBuilder.formData.title || "");
        formData.append("form_description", this.formBuilder.formData.description || "");

        // Add form_id if updating
        if (this.formBuilder.formData.id) {
          formData.append("form_id", this.formBuilder.formData.id);
        }

        // Stringify and add the fields data
        try {
          const fieldsData = this.formBuilder.formData.fields || [];
          
          // Check for enhanced service structures specifically
          fieldsData.forEach(field => {
            if (field.type === 'service' && field.enhancedServiceStructure) {
            
            }
          });
          
          const fieldsJson = JSON.stringify(fieldsData);
          formData.append("form_fields", fieldsJson);

          // Sync layout from DOM so row/column positions are current, then save layout
          if (this.formBuilder.syncLayoutFromDOM && typeof this.formBuilder.syncLayoutFromDOM === 'function') {
            this.formBuilder.syncLayoutFromDOM();
          }
          if (this.formBuilder.syncFieldsFromLayout && typeof this.formBuilder.syncFieldsFromLayout === 'function') {
            this.formBuilder.syncFieldsFromLayout();
          }
          const layout = this.formBuilder.formData.layout;
          if (layout && typeof layout === 'object' && Array.isArray(layout.rows) && layout.rows.length > 0) {
            formData.append("form_layout", JSON.stringify(layout));
          }

        } catch (error) {
          this.showNotification("Error: Invalid form fields data", "error");
          this.saveInProgress = false;
          return;
        }
      }

      // Add form settings if available
      // (Removed: settings are now saved separately via the settings modal)
      // if (window.formSettingsManager && typeof window.formSettingsManager.getSettings === 'function') {
      //   try {
      //     const settings = window.formSettingsManager.getSettings();
      //     // Ensure settings are collected before saving
      //     window.formSettingsManager.collectFormData();
      //     formData.append("form_settings", JSON.stringify(settings));
      //   } catch (error) {
      //     console.error("Could not get form settings:", error);
      //     this.showNotification("Error: Could not save form settings", "error");
      //     this.saveInProgress = false;
      //     return;
      //   }
      // } else {
      //   console.warn("Form settings manager not available");
      // }

      // Get ajax URL with fallbacks
      const ajaxUrl = this.getAjaxUrl();

      // Show loading state
      const saveButton = document.getElementById("save-form");
      if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = "Saving...";
        saveButton.disabled = true;

        // Submit the form
        fetch(ajaxUrl, {
          method: "POST",
          body: formData,
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
            this.showNotification(
              data.data?.message || "Form saved successfully!",
              "success"
            );

            // Update form settings in the UI
            if (window.formSettingsManager && data.data?.settings) {
              window.formSettingsManager.updateSettings(data.data.settings);
            }

            // Redirect if URL provided
            if (data.data?.redirect_url) {
              setTimeout(() => {
                window.location.href = data.data.redirect_url;
              }, 1000);
            }
          } else {
            this.showNotification(
              "Error: " + (data.data || data.message || "Failed to save form"),
              "error"
            );
          }
        })
        .catch((error) => {
          console.error("Save error:", error);
          this.showNotification("Error: " + error.message, "error");
        })
        .finally(() => {
          saveButton.textContent = originalText;
          saveButton.disabled = false;
          this.saveInProgress = false;
        });
      }
    } catch (error) {
      console.error("Form save error:", error);
      this.showNotification("Error: " + error.message, "error");
      this.saveInProgress = false;
    }
  }

  getAjaxUrl() {
    // Try multiple sources for the AJAX URL
    if (window.quotemateFormBuilder?.ajaxUrl) {
      return window.quotemateFormBuilder.ajaxUrl;
    }
    
    if (typeof ajaxurl !== 'undefined') {
      return ajaxurl;
    }
    
    // Fallback to default WordPress AJAX URL
    return "/wp-admin/admin-ajax.php";
  }

  showNotification(message, type = "success") {
    // Try to use the settings manager's notification system first
    if (window.formSettingsManager && typeof window.formSettingsManager.showNotification === 'function') {
      window.formSettingsManager.showNotification(message, type);
      return;
    }

    // Fallback to custom notification
    const notification = document.createElement("div");
    notification.className = `quotemate-notification ${type}`;
    notification.textContent = message;
    
    // Add styles
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
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      ${type === 'success' ? 
        'background-color: #10b981; border-left: 4px solid #059669;' : 
        'background-color: #ef4444; border-left: 4px solid #dc2626;'
      }
    `;
    
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}