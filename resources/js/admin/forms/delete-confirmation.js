class DeleteConfirmation {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    document.addEventListener('click', (e) => {
      const deleteLink = e.target.closest('.submitdelete');
      if (!deleteLink) return;

      e.preventDefault();
      
      const formId = deleteLink.dataset.formId;
      const formTitle = deleteLink.dataset.formTitle;
      const href = deleteLink.href;

      this.showConfirmationDialog(formTitle, href);
    });
  }

  showConfirmationDialog(formTitle, href) {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'quotemate-modal confirmation-modal';
    modal.innerHTML = `
      <div class="quotemate-modal__content">
        <div class="quotemate-modal__header">
          <h3>Delete Form</h3>
          <button class="quotemate-modal__close" aria-label="Close">&times;</button>
        </div>
        <div class="quotemate-modal__body">
          <p>Are you sure you want to delete the form "${formTitle}"?</p>
          <p class="warning">This action cannot be undone.</p>
        </div>
        <div class="quotemate-modal__footer">
          <button class="quotemate-button quotemate-button--secondary cancel-button">Cancel</button>
          <button class="quotemate-button quotemate-button--danger confirm-button">Delete Form</button>
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
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .quotemate-modal__content {
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .quotemate-modal__header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .quotemate-modal__header h3 {
        margin: 0;
        font-size: 1.25rem;
        color: #111827;
      }
      .quotemate-modal__close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        color: #6b7280;
      }
      .quotemate-modal__body {
        padding: 1.5rem;
        color: #374151;
      }
      .quotemate-modal__body .warning {
        color: #dc2626;
        margin-top: 0.5rem;
        font-weight: 500;
      }
      .quotemate-modal__footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
      }
      .quotemate-button {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .quotemate-button--danger {
        background: #dc2626;
        color: white;
        border: none;
      }
      .quotemate-button--danger:hover {
        background: #b91c1c;
      }
      .quotemate-button--secondary {
        background: white;
        color: #4b5563;
        border: 1px solid #d1d5db;
      }
      .quotemate-button--secondary:hover {
        background: #f3f4f6;
      }
    `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(modal);

    // Handle events
    const closeModal = () => {
      document.body.removeChild(modal);
      document.head.removeChild(style);
    };

    modal.querySelector('.quotemate-modal__close').addEventListener('click', closeModal);
    modal.querySelector('.cancel-button').addEventListener('click', closeModal);
    modal.querySelector('.confirm-button').addEventListener('click', () => {
      window.location.href = href;
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DeleteConfirmation();
}); 