export class DragDropHandler {
    constructor(formBuilder) {
      this.formBuilder = formBuilder;
    }
  
    init() {
      this.setupDragItems();
    }
  
    setupDragItems() {
      const fieldItems = document.querySelectorAll(".quotemate-form-builder__field-item");
      
      fieldItems.forEach((item) => {
        item.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", item.dataset.fieldType);
        });
      });
    }
  }