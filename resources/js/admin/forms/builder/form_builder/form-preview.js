export class FormPreview {
    constructor(formBuilder) {
      this.formBuilder = formBuilder;
      this.init();
    }
  
    init() {
      document.getElementById("preview-form").addEventListener("click", () => {
        this.previewForm();
      });
    }
  
    previewForm() {
      // Create a copy of the form data to preview
      const previewData = JSON.parse(JSON.stringify(this.formBuilder.formData));
      
      // Create modal container
      const modal = document.createElement('div');
      modal.className = 'quotemate-modal preview-modal';
      modal.innerHTML = `
        <div class="quotemate-modal__content">
          <div class="quotemate-modal__header">
            <h3>Form Preview</h3>
            <button class="quotemate-modal__close" aria-label="Close">&times;</button>
          </div>
          <div class="quotemate-modal__body">
            <div class="quotemate-form-preview">
              <h2 class="quotemate-form-preview__title">${previewData.title}</h2>
              <p class="quotemate-form-preview__description">${previewData.description}</p>
              <div class="quotemate-form-preview__fields">
                ${this.generatePreviewFields(previewData.fields)}
              </div>
              <div class="quotemate-form-preview__footer">
                <button type="button" class="quotemate-button quotemate-button--primary">Submit</button>
              </div>
            </div>
          </div>
        </div>
      `;
  
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .quotemate-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .quotemate-modal__content {
          background-color: white;
          border-radius: 8px;
          max-width: 800px;
          width: 90%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }
        .quotemate-modal__header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .quotemate-modal__header h3 {
          margin: 0;
          font-size: 18px;
        }
        .quotemate-modal__close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        .quotemate-modal__body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .quotemate-form-preview {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .quotemate-form-preview__title {
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        .quotemate-form-preview__description {
          margin: 0 0 20px 0;
          color: #666;
        }
        .quotemate-form-preview__fields {
          margin-bottom: 20px;
        }
        .quotemate-form-preview__field {
          margin-bottom: 15px;
        }
        .quotemate-form-preview__label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .quotemate-form-preview__input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(modal);
      
      // Close modal functionality
      const closeBtn = modal.querySelector('.quotemate-modal__close');
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
      });
      
      // Close when clicking outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          document.head.removeChild(style);
        }
      });
    }
  
    generatePreviewFields(fields) {
      if (!fields || fields.length === 0) {
        return '<p>No fields added to this form yet.</p>';
      }
      
      return fields.map(field => {
        switch (field.type) {
          case 'text':
          case 'email':
          case 'name':
          case 'company':
          case 'phone':
            return `
              <div class="quotemate-form-preview__field">
                <label class="quotemate-form-preview__label">
                  ${field.label} ${field.required ? '<span style="color: red;">*</span>' : ''}
                </label>
                <input type="${field.type === 'email' ? 'email' : 'text'}" 
                       class="quotemate-form-preview__input" 
                       placeholder="${field.placeholder || ''}"
                       ${field.required ? 'required' : ''}>
                ${field.description ? `<div class="quotemate-form-preview__description">${field.description}</div>` : ''}
              </div>
            `;
          
          case 'textarea':
            return `
              <div class="quotemate-form-preview__field">
                <label class="quotemate-form-preview__label">
                  ${field.label} ${field.required ? '<span style="color: red;">*</span>' : ''}
                </label>
                <textarea class="quotemate-form-preview__input" 
                          placeholder="${field.placeholder || ''}"
                          rows="4"
                          ${field.required ? 'required' : ''}></textarea>
                ${field.description ? `<div class="quotemate-form-preview__description">${field.description}</div>` : ''}
              </div>
            `;
          
          case 'select':
            return `
              <div class="quotemate-form-preview__field">
                <label class="quotemate-form-preview__label">
                  ${field.label} ${field.required ? '<span style="color: red;">*</span>' : ''}
                </label>
                <select class="quotemate-form-preview__input" ${field.required ? 'required' : ''}>
                  <option value="">Select an option</option>
                  ${field.options ? field.options.map(option => `<option value="${option}">${option}</option>`).join('') : ''}
                </select>
                ${field.description ? `<div class="quotemate-form-preview__description">${field.description}</div>` : ''}
              </div>
            `;
          
          case 'radio':
            return `
              <div class="quotemate-form-preview__field">
                <label class="quotemate-form-preview__label">
                  ${field.label} ${field.required ? '<span style="color: red;">*</span>' : ''}
                </label>
                <div class="quotemate-form-preview__options">
                  ${field.options ? field.options.map(option => `
                    <label class="quotemate-form-preview__option">
                      <input type="radio" name="preview_${field.id}" value="${option}" ${field.required ? 'required' : ''}>
                      ${option}
                    </label>
                  `).join('') : ''}
                </div>
                ${field.description ? `<div class="quotemate-form-preview__description">${field.description}</div>` : ''}
              </div>
            `;
          
          case 'checkbox':
            return `
              <div class="quotemate-form-preview__field">
                <label class="quotemate-form-preview__label">
                  ${field.label} ${field.required ? '<span style="color: red;">*</span>' : ''}
                </label>
                <div class="quotemate-form-preview__options">
                  ${field.options ? field.options.map(option => `
                    <label class="quotemate-form-preview__option">
                      <input type="checkbox" name="preview_${field.id}[]" value="${option}">
                      ${option}
                    </label>
                  `).join('') : ''}
                </div>
                ${field.description ? `<div class="quotemate-form-preview__description">${field.description}</div>` : ''}
              </div>
            `;
          
          case 'section_break':
            return `
              <div class="quotemate-form-preview__section-break">
                <h3>${field.section_title || 'Section Break'}</h3>
                <hr>
              </div>
            `;
          
          case 'html':
            return `
              <div class="quotemate-form-preview__html">
                ${field.html_content || ''}
              </div>
            `;
          
          default:
            return `
              <div class="quotemate-form-preview__field">
                <label class="quotemate-form-preview__label">
                  ${field.label} ${field.required ? '<span style="color: red;">*</span>' : ''}
                </label>
                <input type="text" class="quotemate-form-preview__input" placeholder="Field preview">
                ${field.description ? `<div class="quotemate-form-preview__description">${field.description}</div>` : ''}
              </div>
            `;
        }
      }).join('');
    }
  }