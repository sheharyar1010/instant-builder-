import "/scss/admin/forms/builder/panels/form_builder.scss";
import "/scss/admin/forms/builder/service-manager.scss";
import "/scss/admin/forms/builder/enhanced-service-manager.scss";
import { DragDropHandler } from "./drag-drop-handler";
import { FormSaver } from "./save_form";
import { FormPreview } from "./form-preview";
import { FieldProperties } from "./field-properties";
import { CalculationEngine } from "./calculation-engine";
import { ServiceManager } from "./service-manager";
import { EnhancedServiceManager } from "./enhanced-service-manager";
import { syncBuilderLivePreview, resolveHeadingLevel, getHeadingAlignClass, resolveHeadingAlign, resolvePageBreakAlign, getPageBreakAlignClass, buildPageBreakPreviewHtml } from "./design-vars.js";
import { formatHeadingText } from "./heading-format.js";
import Sortable from 'sortablejs';

let formBuilder;
class QuotemateFormBuilder {
  constructor() {
    this.fieldCounter = 0;
    this.selectedField = null;
    this.formData = {
      title: "Quote Request Form",
      description: "Please fill out this form to receive a quote for our services.",
      fields: [],
    };

    // Ensure fields is always an array
    if (!Array.isArray(this.formData.fields)) {

      this.formData.fields = [];
    }



    this.dragDropHandler = new DragDropHandler(this);
    this.formPreview = new FormPreview(this);
    this.fieldProperties = new FieldProperties(this);
    this.calculationEngine = new CalculationEngine(this);
    this.serviceManager = new ServiceManager(this);
    this.enhancedServiceManager = new EnhancedServiceManager(this);

    // Initialize form saver only once
    if (!window.formSaver) {
      window.formSaver = new FormSaver(this);
    }

    this.loadExistingFormData();
  }

  /** Default number of columns when creating a new row (use + Column / − Column to change per row) */
  getDefaultColumnCount() {
    return 1;
  }

  /** Elementor-style layout: rows, each with columns; each column has fieldIds. Column count is dynamic per row. */
  getDefaultLayout() {
    const n = this.getDefaultColumnCount();
    const cols = Array.from({ length: n }, (_, i) => ({ id: 'col_' + (i + 1), fieldIds: [] }));
    return {
      rows: [ { id: 'row_1', columns: cols } ]
    };
  }

  ensureLayout() {
    const fields = this.formData?.fields || [];
    const hasLayout =
      this.formData.layout &&
      Array.isArray(this.formData.layout.rows) &&
      this.formData.layout.rows.length > 0;

    if (hasLayout) {
      return;
    }

    // If we have saved row/column indexes on fields, rebuild layout from them
    const positionedFields = fields.filter(
      (f) => f && (f.rowIndex !== undefined || f.columnIndex !== undefined)
    );

    if (positionedFields.length) {
      const rowsMap = new Map(); // rowIndex -> Map<colIndex, fieldIds[]>

      positionedFields.forEach((field) => {
        const r = Number(field.rowIndex ?? 0) || 0;
        const c = Number(field.columnIndex ?? 0) || 0;

        if (!rowsMap.has(r)) {
          rowsMap.set(r, new Map());
        }
        const colsMap = rowsMap.get(r);
        if (!colsMap.has(c)) {
          colsMap.set(c, []);
        }
        colsMap.get(c).push(field.id);
      });

      // Include any fields without explicit row/col at the end of the last row, first column
      const unpositioned = fields.filter(
        (f) => f && !positionedFields.includes(f)
      );
      if (unpositioned.length) {
        const maxRowIndex =
          rowsMap.size > 0 ? Math.max(...Array.from(rowsMap.keys())) : 0;
        const targetRowIndex =
          rowsMap.size > 0 ? maxRowIndex : 0;
        if (!rowsMap.has(targetRowIndex)) {
          rowsMap.set(targetRowIndex, new Map());
        }
        const colsMap = rowsMap.get(targetRowIndex);
        const targetColIndex =
          colsMap.size > 0 ? Math.min(...Array.from(colsMap.keys())) : 0;
        if (!colsMap.has(targetColIndex)) {
          colsMap.set(targetColIndex, []);
        }
        const bucket = colsMap.get(targetColIndex);
        unpositioned.forEach((f) => bucket.push(f.id));
      }

      const sortedRowIndexes = Array.from(rowsMap.keys()).sort((a, b) => a - b);
      const rows = sortedRowIndexes.map((rIdx, logicalRow) => {
        const rowId = "row_" + (logicalRow + 1);
        const colsMap = rowsMap.get(rIdx);
        const sortedColIndexes = Array.from(colsMap.keys()).sort(
          (a, b) => a - b
        );
        const columns = sortedColIndexes.map((cIdx, logicalCol) => {
          const colId = rowId + "_col_" + (logicalCol + 1);
          return {
            id: colId,
            fieldIds: colsMap.get(cIdx) || [],
          };
        });
        return { id: rowId, columns };
      });

      this.formData.layout = { rows };
      return;
    }

    // Fallback: single row / single column with all fields (legacy behaviour)
    this.formData.layout = this.getDefaultLayout();
    const col = this.formData.layout.rows[0].columns[0];
    fields.forEach((f) => col.fieldIds.push(f.id));
  }

  /** Build formData.fields order from layout (row by row, column by column) */
  syncFieldsFromLayout() {
    if (!this.formData.layout) return;
    const order = [];
    this.formData.layout.rows.forEach(row => {
      row.columns.forEach(col => {
        (col.fieldIds || []).forEach(id => order.push(id));
      });
    });
    const map = new Map((this.formData.fields || []).map(f => [f.id, f]));
    this.formData.fields = order.map(id => map.get(id)).filter(Boolean);
  }

  /** Span units for field sizing within a row (capacity = 3) */
  getFieldSpan(fieldData) {
    const fullWidthTypes = ['page_break', 'section_break', 'divider', 'heading', 'paragraph', 'html', 'quote_total', 'form_summary'];
    if (fullWidthTypes.includes(fieldData?.type)) return 3;
    const size = (fieldData?.fieldSize || 'medium');
    if (size === 'large') return 3;
    if (size === 'small') return 1;
    return 2; // medium
  }

  // NOTE: We no longer auto-move fields between rows based on size.
  // Row placement is 100% controlled by the user via drag and drop.

  /** Read DOM column contents and update layout */
  syncLayoutFromDOM() {
    const dropZone = document.getElementById('form-drop-zone');
    if (!dropZone || !this.formData.layout) return;
    dropZone.querySelectorAll('.quotemate-form-builder__row').forEach(rowEl => {
      const rowId = rowEl.dataset.rowId;
      const row = this.formData.layout.rows.find(r => r.id === rowId);
      if (!row) return;
      rowEl.querySelectorAll('.quotemate-form-builder__column').forEach(colEl => {
        const colId = colEl.dataset.columnId;
        const col = row.columns.find(c => c.id === colId);
        if (!col) return;
        const rowIndex = parseInt(colEl.dataset.rowIndex || '0', 10) || 0;
        const columnIndex = parseInt(colEl.dataset.columnIndex || '0', 10) || 0;
        col.fieldIds = Array.from(colEl.querySelectorAll('.quotemate-form-field'))
          .map(f => f.getAttribute('data-field-id'))
          .filter(Boolean);

        // Persist row/column index on each field so layout can be reconstructed after reload
        col.fieldIds.forEach(fid => {
          const field = (this.formData.fields || []).find(f => f.id === fid);
          if (field) {
            field.rowIndex = rowIndex;
            field.columnIndex = columnIndex;
          }
        });
      });
    });
  }

  /** Rows list container inside the drop zone (sections only, no nesting) */
  getRowsListElement() {
    const dropZone = document.getElementById('form-drop-zone');
    return dropZone?.querySelector('.quotemate-form-builder__rows-list') || dropZone;
  }

  /** Direct child row sections in canvas order */
  getTopLevelRowSections() {
    const rowsList = this.getRowsListElement();
    if (!rowsList) return [];
    return Array.from(rowsList.children).filter(
      (el) => el.classList.contains('quotemate-form-builder__section')
    );
  }

  /** Move any accidentally nested sections back to the rows list */
  repairNestedRows() {
    const rowsList = this.getRowsListElement();
    if (!rowsList) return;
    let nested = rowsList.querySelector('.quotemate-form-builder__section .quotemate-form-builder__section');
    while (nested) {
      rowsList.appendChild(nested);
      nested = rowsList.querySelector('.quotemate-form-builder__section .quotemate-form-builder__section');
    }
  }

  /** Reorder layout.rows to match section order in the canvas */
  syncRowsOrderFromDOM() {
    const rowsList = this.getRowsListElement();
    if (!rowsList || !this.formData?.layout) return;
    this.repairNestedRows();
    const orderedIds = this.getTopLevelRowSections()
      .map((section) => section.dataset.rowId)
      .filter(Boolean);
    const rowMap = new Map(this.formData.layout.rows.map((row) => [row.id, row]));
    const reordered = orderedIds.map((id) => rowMap.get(id)).filter(Boolean);
    if (reordered.length === this.formData.layout.rows.length) {
      this.formData.layout.rows = reordered;
    }
  }

  /** Update row/column indices in DOM after row reorder */
  updateRowIndicesInDOM() {
    const rowsList = this.getRowsListElement();
    if (!rowsList) return;
    this.getTopLevelRowSections().forEach((section, rowIndex) => {
      section.querySelectorAll('.quotemate-form-builder__column').forEach((colEl, colIndex) => {
        colEl.dataset.rowIndex = String(rowIndex);
        colEl.dataset.columnIndex = String(colIndex);
      });
    });
    this.syncLayoutFromDOM();
  }

  /** Refresh "Row N" labels without re-rendering the canvas */
  updateRowLabelsInCanvas() {
    this.getTopLevelRowSections().forEach((section, rowIndex) => {
      const title = section.querySelector('.quotemate-form-builder__section-title');
      if (title) title.textContent = `Row ${rowIndex + 1}`;
    });
  }

  /** Show "Drop field here" when a column has no fields; hide when it has fields */
  ensureColumnPlaceholder(columnEl) {
    if (!columnEl?.classList.contains('quotemate-form-builder__column')) return;
    const hasFields = columnEl.querySelector('.quotemate-form-field');
    let placeholder = columnEl.querySelector('.quotemate-form-builder__column-placeholder');
    if (!hasFields) {
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'quotemate-form-builder__column-placeholder';
        placeholder.innerHTML = '<span>Drop field here</span>';
        columnEl.appendChild(placeholder);
      }
    } else if (placeholder) {
      placeholder.remove();
    }
  }

  /** Insert a single field element into a column at the drop index (real-time, no full re-render) */
  appendFieldToColumnElement(columnEl, fieldData, indexInColumn = null) {
    const html = this.generateFieldHtmlFromData(fieldData);
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const fieldEl = wrap.firstElementChild;
    const fields = Array.from(columnEl.querySelectorAll(':scope > .quotemate-form-field'));
    const placeholder = columnEl.querySelector(':scope > .quotemate-form-builder__column-placeholder');
    const safeIndex = indexInColumn == null
      ? fields.length
      : Math.min(Math.max(0, indexInColumn), fields.length);

    if (fields[safeIndex]) {
      columnEl.insertBefore(fieldEl, fields[safeIndex]);
    } else if (placeholder) {
      columnEl.insertBefore(fieldEl, placeholder);
    } else {
      columnEl.appendChild(fieldEl);
    }

    this.ensureColumnPlaceholder(columnEl);
    this.syncLayoutFromDOM();
    this.syncFieldsFromLayout();
    this.updateFormData();
    setTimeout(() => {
      this.initializeConditionalLogicForExistingFields();
      if (this.calculationEngine) this.calculationEngine.calculateTotals();
      if (fieldData?.type === 'page_break') {
        this.syncPageBreakFieldsAfterOrderChange();
      }
    }, 0);
  }

  /** Index among existing canvas fields where a palette clone was dropped */
  getPaletteDropIndexInColumn(columnEl, droppedItem) {
    if (!columnEl || !droppedItem) {
      return 0;
    }
    let index = 0;
    for (const child of columnEl.children) {
      if (child === droppedItem) {
        return index;
      }
      if (child.classList.contains('quotemate-form-field')) {
        index++;
      }
    }
    return index;
  }

  /** Render Elementor-style canvas: sections (rows) with header + columns */
  renderCanvas() {
    const dropZone = document.getElementById('form-drop-zone');
    if (!dropZone) return;
    this.ensureLayout();
    const layout = this.formData.layout;
    dropZone.innerHTML = '';
    const rowsList = document.createElement('div');
    rowsList.className = 'quotemate-form-builder__rows-list';
    dropZone.appendChild(rowsList);
    layout.rows.forEach((row, rowIndex) => {
      const section = document.createElement('div');
      section.className = 'quotemate-form-builder__section';
      section.dataset.rowId = row.id;

      const header = document.createElement('div');
      header.className = 'quotemate-form-builder__section-header';
      const colCount = (row.columns || []).length;
      const rowIdAttr = this.escapeAttr(row.id);
      header.innerHTML = `
        <div class="quotemate-form-builder__section-header-left">
          <span class="quotemate-form-builder__section-drag-handle" title="Drag to reorder row">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="14" height="14" aria-hidden="true"><circle cx="96" cy="128" r="24"/><circle cx="96" cy="256" r="24"/><circle cx="96" cy="384" r="24"/><circle cx="192" cy="128" r="24"/><circle cx="192" cy="256" r="24"/><circle cx="192" cy="384" r="24"/></svg>
          </span>
          <span class="quotemate-form-builder__section-title">Row ${rowIndex + 1}</span>
        </div>
        <div class="quotemate-form-builder__section-actions">
          <span class="quotemate-form-builder__section-cols-label">Columns: ${colCount}</span>
          <button type="button" class="quotemate-form-builder__section-btn quotemate-form-builder__section-btn--add-col" title="Add column" data-action="add-column" data-row-id="${rowIdAttr}">+ Column</button>
          <button type="button" class="quotemate-form-builder__section-btn quotemate-form-builder__section-btn--remove-col" title="Remove column" data-action="remove-column" data-row-id="${rowIdAttr}" ${colCount <= 1 ? 'disabled' : ''}>− Column</button>
          <button type="button" class="quotemate-form-builder__section-btn quotemate-form-builder__section-btn--duplicate" title="Duplicate row" data-action="duplicate-row" data-row-id="${rowIdAttr}">Duplicate</button>
          <button type="button" class="quotemate-form-builder__section-btn quotemate-form-builder__section-btn--delete" title="Delete row" data-action="delete-row" data-row-id="${rowIdAttr}">Delete</button>
        </div>
      `;
      section.appendChild(header);

      const rowEl = document.createElement('div');
      rowEl.className = 'quotemate-form-builder__row';
      rowEl.dataset.rowId = row.id;
      rowEl.style.gridTemplateColumns = 'repeat(' + (row.columns || []).length + ', 1fr)';
      row.columns.forEach((col, colIndex) => {
        const colEl = document.createElement('div');
        colEl.className = 'quotemate-form-builder__column';
        colEl.dataset.rowId = row.id;
        colEl.dataset.columnId = col.id;
        colEl.dataset.rowIndex = String(rowIndex);
        colEl.dataset.columnIndex = String(colIndex);
        (col.fieldIds || []).forEach(fieldId => {
          const fieldData = (this.formData.fields || []).find(f => f.id === fieldId);
          if (fieldData) {
            const html = this.generateFieldHtmlFromData(fieldData);
            const wrap = document.createElement('div');
            wrap.innerHTML = html;
            colEl.appendChild(wrap.firstElementChild);
          }
        });
        if (colEl.children.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'quotemate-form-builder__column-placeholder';
          empty.innerHTML = '<span>Drop field here</span>';
          colEl.appendChild(empty);
        }
        rowEl.appendChild(colEl);
      });
      section.appendChild(rowEl);
      rowsList.appendChild(section);
    });
    const addRowBtn = document.createElement('button');
    addRowBtn.type = 'button';
    addRowBtn.className = 'quotemate-form-builder__add-row';
    addRowBtn.textContent = '+ Add row';
    addRowBtn.addEventListener('click', () => this.addRow());
    dropZone.appendChild(addRowBtn);
    if (this.renderStructurePanel) this.renderStructurePanel();
    this.refreshBuilderLivePreview();
  }

  refreshBuilderLivePreview() {
    if (typeof syncBuilderLivePreview === 'function') {
      syncBuilderLivePreview(null, this.formData?.fields ?? []);
    }
  }

  addRow() {
    this.ensureLayout();
    const id = 'row_' + Date.now();
    const n = this.getDefaultColumnCount();
    const columns = Array.from({ length: n }, (_, i) => ({ id: id + '_col_' + (i + 1), fieldIds: [] }));
    this.formData.layout.rows.push({ id, columns });
    this.renderCanvas();
    this.initSortableFields();
    this.updateFormData();
  }

  addColumn(rowId) {
    this.ensureLayout();
    const row = this.formData.layout.rows.find(r => r.id === rowId);
    if (!row) return;
    const newColId = rowId + '_col_' + (row.columns.length + 1);
    row.columns.push({ id: newColId, fieldIds: [] });
    this.renderCanvas();
    this.initSortableFields();
    this.updateFormData();
  }

  removeColumn(rowId) {
    this.ensureLayout();
    const row = this.formData.layout.rows.find(r => r.id === rowId);
    if (!row || row.columns.length <= 1) return;
    const removed = row.columns.pop();
    (removed.fieldIds || []).forEach(fid => {
      const idx = (this.formData.fields || []).findIndex(f => f.id === fid);
      if (idx !== -1) this.formData.fields.splice(idx, 1);
    });
    this.renderCanvas();
    this.initSortableFields();
    this.updateFormData();
  }

  deleteRow(rowId) {
    this.ensureLayout();
    const rows = this.formData.layout.rows;
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx === -1) return;

    const isFirstRow = idx === 0;
    if (isFirstRow) {
      // First row: clear all fields from it (remove highlighted fields), keep the row
      const row = rows[idx];
      const idsToRemove = new Set();
      (row.columns || []).forEach(col => {
        (col.fieldIds || []).forEach(fid => idsToRemove.add(fid));
        col.fieldIds = [];
      });
      if (this.formData.fields && idsToRemove.size) {
        this.formData.fields = this.formData.fields.filter(f => !idsToRemove.has(f.id));
      }
    } else if (rows.length > 1) {
      rows.splice(idx, 1);
    } else {
      // Only one row and it's not first (shouldn't happen) – clear it
      const row = rows[0];
      const idsToRemove = new Set();
      (row.columns || []).forEach(col => {
        (col.fieldIds || []).forEach(fid => idsToRemove.add(fid));
        col.fieldIds = [];
      });
      if (this.formData.fields && idsToRemove.size) {
        this.formData.fields = this.formData.fields.filter(f => !idsToRemove.has(f.id));
      }
    }
    this.renderCanvas();
    this.initSortableFields();
    this.updateFormData();
  }

  /** Deep-clone field data for duplicate/copy (independent options, services, etc.) */
  cloneFieldData(fieldData, newFieldId) {
    const clone = JSON.parse(JSON.stringify(fieldData));
    clone.id = newFieldId;
    return clone;
  }

  duplicateRow(rowId) {
    this.ensureLayout();
    const rows = this.formData.layout.rows;
    const idx = rows.findIndex(r => r.id === rowId);
    if (idx === -1) return;
    const row = rows[idx];
    const newId = 'row_' + Date.now();
    const newColumns = (row.columns || []).map((col, i) => {
      const newColId = newId + '_col_' + (i + 1);
      const newFieldIds = (col.fieldIds || []).map(oldFid => {
        this.fieldCounter++;
        const newFid = 'field_' + this.fieldCounter;
        const fieldData = (this.formData.fields || []).find(f => f.id === oldFid);
        if (fieldData) {
          this.formData.fields.push(this.cloneFieldData(fieldData, newFid));
        }
        return newFid;
      });
      return { id: newColId, fieldIds: newFieldIds };
    });
    rows.splice(idx + 1, 0, { id: newId, columns: newColumns });
    this.renderCanvas();
    this.initSortableFields();
    this.syncPageBreakFieldsAfterOrderChange();
    this.updateFormData();
  }

  loadExistingFormData() {
    // Check for form data from AssetHelper first
    const qm_config =
      window.Quotemate["admin_forms_builder_form_builder_main"];

    // Check for form data from PHP template as fallback
    const phpFormData = window.quotemateFormBuilder?.formData;


    let existingData = null;

    if (
      typeof qm_config !== "undefined" &&
      typeof qm_config.quotemate_form_data !== "undefined"
    ) {
      existingData = qm_config.quotemate_form_data;

    } else if (phpFormData) {
      existingData = phpFormData;

    }

    if (existingData) {
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

      // Ensure fields is always an array
      let fields = [];
      if (existingData.fields) {
        try {
          const parsedFields = JSON.parse(existingData.fields);
          fields = Array.isArray(parsedFields) ? parsedFields : [];

        } catch (e) {

          fields = [];
        }
      } else {

      }

      // Layout is stored in settings.layout when saved from the builder
      let layout = null;
      const rawLayout = settings.layout || existingData.layout;
      if (rawLayout) {
        const parsed = typeof rawLayout === 'string' ? (() => { try { return JSON.parse(rawLayout); } catch (e) { return null; } })() : rawLayout;
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          layout = parsed;
        }
      }

      this.formData = {
        id: existingData.id || null,
        name: existingData.name || "Untitled Form",
        title: settings.title || "Quote Request Form",
        description:
          settings.description ||
          "Please fill out this form to receive a quote for our services.",
        fields: this.normalizeLoadedFields(fields),
        layout: layout,
      };
      this.ensureLayout();

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

      // Load existing fields (Elementor-style rows/columns canvas)
      this.loadExistingFields();
    } else {
      this.ensureLayout();
      this.renderCanvas();
      this.initSortableFields();
    }
  }

  loadExistingFields() {
    if (!Array.isArray(this.formData.fields)) this.formData.fields = [];
    this.formData.fields = this.normalizeLoadedFields(this.formData.fields);
    this.ensureLayout();
    this.formData.fields.forEach((field) => {
      const n = parseInt(field.id.replace("field_", ""), 10);
      if (n > this.fieldCounter) this.fieldCounter = n;
    });
    this.renderCanvas();
    if (this.initSortableFields) this.initSortableFields();
    this.syncPageBreakFieldsAfterOrderChange();
    setTimeout(() => {
      this.initializeConditionalLogicForExistingFields();
      if (this.calculationEngine) this.calculationEngine.calculateTotals();
    }, 100);
  }

  normalizeLoadedFields(fields) {
    if (!Array.isArray(fields)) return [];
    return fields.map((field) => {
      if (field?.type === 'heading') {
        return {
          ...field,
          heading_level: resolveHeadingLevel(field.heading_level),
          heading_align: resolveHeadingAlign(field.heading_align),
          label: field.label || 'Heading',
        };
      }
      if (field?.type === 'paragraph' && !field.paragraph_content) {
        return {
          ...field,
          paragraph_content: field.label || 'Enter your paragraph text here.',
        };
      }
      if (field?.type === 'page_break') {
        return {
          ...field,
          page_title: field.page_title || 'Next Page',
          page_break_align: resolvePageBreakAlign(field.page_break_align),
        };
      }
      return field;
    });
  }

  getFieldStyleVars(fieldData) {
    const v = [];
    const u = (val, unit) => (val !== undefined && val !== '' && val != null) ? `${String(val).replace(/[^\d.-]/g, '') || 0}${unit || 'px'}` : '';
    const marginUnit = fieldData?.styleMarginUnit || 'px';
    const paddingUnit = fieldData?.stylePaddingUnit || 'px';
    const mt = u(fieldData?.styleMarginTop, marginUnit);
    const mr = u(fieldData?.styleMarginRight, marginUnit);
    const mb = u(fieldData?.styleMarginBottom, marginUnit);
    const ml = u(fieldData?.styleMarginLeft, marginUnit);
    if (mt) v.push(`margin-top:${mt}`);
    if (mr) v.push(`margin-right:${mr}`);
    if (mb) v.push(`margin-bottom:${mb}`);
    if (ml) v.push(`margin-left:${ml}`);
    const pt = u(fieldData?.stylePaddingTop, paddingUnit);
    const pr = u(fieldData?.stylePaddingRight, paddingUnit);
    const pb = u(fieldData?.stylePaddingBottom, paddingUnit);
    const pl = u(fieldData?.stylePaddingLeft, paddingUnit);
    if (pt) v.push(`padding-top:${pt}`);
    if (pr) v.push(`padding-right:${pr}`);
    if (pb) v.push(`padding-bottom:${pb}`);
    if (pl) v.push(`padding-left:${pl}`);
    if (fieldData?.styleLabelColor) v.push(`--qm-label-color:${fieldData.styleLabelColor}`);
    const labelSize = fieldData?.styleFontSize || fieldData?.styleLabelSize;
    if (labelSize) v.push(`--qm-label-size:${labelSize}`);
    if (fieldData?.styleFontFamily) v.push(`--qm-label-font-family:${fieldData.styleFontFamily}`);
    if (fieldData?.styleFontWeight) v.push(`--qm-label-font-weight:${fieldData.styleFontWeight}`);
    if (fieldData?.styleTextTransform) v.push(`--qm-label-text-transform:${fieldData.styleTextTransform}`);
    if (fieldData?.styleFontStyle) v.push(`--qm-label-font-style:${fieldData.styleFontStyle}`);
    if (fieldData?.styleTextDecoration) v.push(`--qm-label-text-decoration:${fieldData.styleTextDecoration}`);
    if (fieldData?.styleLineHeight) v.push(`--qm-label-line-height:${fieldData.styleLineHeight}`);
    if (fieldData?.styleLetterSpacing) v.push(`--qm-label-letter-spacing:${fieldData.styleLetterSpacing}`);
    if (fieldData?.styleWordSpacing) v.push(`--qm-label-word-spacing:${fieldData.styleWordSpacing}`);
    if (fieldData?.styleInputColor) v.push(`--qm-input-color:${fieldData.styleInputColor}`);
    if (fieldData?.styleInputFontFamily) v.push(`--qm-input-font-family:${fieldData.styleInputFontFamily}`);
    if (fieldData?.styleInputFontSize) v.push(`--qm-input-font-size:${fieldData.styleInputFontSize}`);
    if (fieldData?.styleInputFontWeight) v.push(`--qm-input-font-weight:${fieldData.styleInputFontWeight}`);
    if (fieldData?.styleInputBg) v.push(`--qm-input-bg:${fieldData.styleInputBg}`);
    if (fieldData?.styleBorderWidth) v.push(`--qm-border-width:${fieldData.styleBorderWidth}`);
    if (fieldData?.styleBorderColor) v.push(`--qm-border-color:${fieldData.styleBorderColor}`);
    const radiusUnit = fieldData?.styleBorderRadiusUnit || 'px';
    const uRadius = (val) => (val !== undefined && val !== '' && val != null) ? `${String(val).replace(/[^\d.-]/g, '') || 0}${radiusUnit}` : '';
    const legacy = fieldData?.styleBorderRadius;
    const rtl = uRadius(fieldData?.styleBorderRadiusTopLeft ?? legacy) || '0';
    const rtr = uRadius(fieldData?.styleBorderRadiusTopRight ?? legacy) || '0';
    const rbr = uRadius(fieldData?.styleBorderRadiusBottomRight ?? legacy) || '0';
    const rbl = uRadius(fieldData?.styleBorderRadiusBottomLeft ?? legacy) || '0';
    const anyRadiusSet = [fieldData?.styleBorderRadiusTopLeft, fieldData?.styleBorderRadiusTopRight, fieldData?.styleBorderRadiusBottomRight, fieldData?.styleBorderRadiusBottomLeft, legacy].some(v => v !== undefined && v !== '' && v != null);
    if (anyRadiusSet) {
      v.push(`--qm-border-radius-tl:${rtl}`, `--qm-border-radius-tr:${rtr}`, `--qm-border-radius-br:${rbr}`, `--qm-border-radius-bl:${rbl}`);
    }
    if (fieldData?.stylePadding) v.push(`--qm-input-padding:${fieldData.stylePadding}`);
    return v.length ? v.join(';') : '';
  }

  getFieldSizeClass(fieldData) {
    const fullWidthTypes = ['page_break', 'section_break', 'html', 'heading', 'paragraph', 'quote_total', 'form_summary', 'divider'];
    const size = fullWidthTypes.includes(fieldData?.type) ? 'large' : (fieldData?.fieldSize || 'medium');
    return `quotemate-form-field--size-${size}`;
  }

  getFieldOrderFromLayout() {
    if (!this.formData?.layout?.rows?.length) {
      return (this.formData.fields || []).map((field) => field.id);
    }
    const order = [];
    this.formData.layout.rows.forEach((row) => {
      (row.columns || []).forEach((col) => {
        (col.fieldIds || []).forEach((id) => order.push(id));
      });
    });
    return order;
  }

  getPageBreakIndex(fieldId) {
    let index = 0;
    for (const id of this.getFieldOrderFromLayout()) {
      const field = (this.formData.fields || []).find((f) => f.id === id);
      if (field?.type !== 'page_break') {
        continue;
      }
      if (id === fieldId) {
        return index;
      }
      index++;
    }
    return 0;
  }

  canPageBreakShowPrevious(fieldId) {
    return this.getPageBreakIndex(fieldId) > 0;
  }

  applyPageBreakPositionDefaults(fieldData, pageBreakIndex) {
    if (!fieldData || fieldData.type !== 'page_break') {
      return;
    }
    if (pageBreakIndex > 0) {
      if (!fieldData.page_prev_title) {
        fieldData.page_prev_title = 'Previous';
      }
      if (fieldData.page_prev_description === undefined) {
        fieldData.page_prev_description = '';
      }
      if (!fieldData.page_break_prev_align) {
        fieldData.page_break_prev_align = 'center';
      }
      if (fieldData.show_previous_button === undefined) {
        fieldData.show_previous_button = true;
      }
      return;
    }
    if (fieldData.show_previous_button === false || fieldData.show_previous_button === 'false') {
      delete fieldData.show_previous_button;
    }
  }

  refreshAllPageBreakFieldsInCanvas() {
    (this.formData.fields || []).forEach((field) => {
      if (field?.type === 'page_break') {
        this.refreshFieldInCanvas(field.id);
      }
    });
  }

  syncPageBreakFieldsAfterOrderChange() {
    this.syncFieldsFromLayout();
    let pageBreakIndex = 0;
    for (const id of this.getFieldOrderFromLayout()) {
      const field = (this.formData.fields || []).find((f) => f.id === id);
      if (field?.type !== 'page_break') {
        continue;
      }
      this.applyPageBreakPositionDefaults(field, pageBreakIndex);
      pageBreakIndex++;
    }
    this.refreshAllPageBreakFieldsInCanvas();
    this.refreshBuilderLivePreview();
  }

  /** Grid column span: small=1, medium=2, large=3 */
  getFieldSpan(fieldData) {
    const fullWidthTypes = ['page_break', 'section_break', 'html', 'heading', 'paragraph', 'quote_total', 'form_summary', 'divider'];
    const size = fullWidthTypes.includes(fieldData?.type) ? 'large' : (fieldData?.fieldSize || 'medium');
    return size === 'small' ? 1 : size === 'medium' ? 2 : 3;
  }

  /** Compute grid positions so fields stay put – no auto-fill of empty space */
  computeInitialGridPositions(fields) {
    if (!Array.isArray(fields)) return;
    const GRID_COLS = 3;
    let row = 1, col = 0;
    fields.forEach((f) => {
      if (f == null) return;
      const span = this.getFieldSpan(f);
      if (f.gridRow != null && f.gridCol != null) {
        // Advance cursor past this field so next assignment doesn't overlap
        let nc = Number(f.gridCol) + span, nr = Number(f.gridRow);
        if (nc >= GRID_COLS) { nc = 0; nr++; }
        if (nr > row || (nr === row && nc > col)) { row = nr; col = nc; }
        return;
      }
      if (col + span > GRID_COLS) {
        col = 0;
        row++;
      }
      f.gridRow = row;
      f.gridCol = col;
      col += span;
      if (col >= GRID_COLS) {
        col = 0;
        row++;
      }
    });
  }

  /** Get occupied cells (row,col) for all fields except excludeId */
  getOccupiedCells(fields, excludeId) {
    const occ = new Set();
    (fields || []).forEach((f) => {
      if (!f || f.id === excludeId) return;
      const r = Number(f.gridRow) || 1;
      const c = Number(f.gridCol) || 0;
      const span = this.getFieldSpan(f);
      for (let i = 0; i < span; i++) occ.add(`${r},${c + i}`);
    });
    return occ;
  }

  /** Next free slot after (afterRow, afterCol) spanning afterSpan, for a field of fieldSpan */
  getNextSlotAfter(afterRow, afterCol, afterSpan, fieldSpan, occupied) {
    const GRID_COLS = 3;
    let c = afterCol + afterSpan;
    let r = afterRow;
    if (c >= GRID_COLS) {
      c = 0;
      r++;
    }
    while (r < 999) {
      if (c + fieldSpan <= GRID_COLS) {
        let fits = true;
        for (let i = 0; i < fieldSpan; i++) {
          if (occupied.has(`${r},${c + i}`)) {
            fits = false;
            break;
          }
        }
        if (fits) return { row: r, col: c };
      }
      c++;
      if (c >= GRID_COLS) {
        c = 0;
        r++;
      }
    }
    return { row: r, col: 0 };
  }

  /** First free slot before (beforeRow, beforeCol) for a field of fieldSpan */
  getPrevSlotBefore(beforeRow, beforeCol, fieldSpan, occupied) {
    const GRID_COLS = 3;
    let c = beforeCol - 1;
    let r = beforeRow;
    if (c < 0) {
      c = GRID_COLS - 1;
      r = Math.max(1, r - 1);
    }
    while (r >= 1) {
      if (c - fieldSpan + 1 >= 0) {
        const start = c - fieldSpan + 1;
        let fits = true;
        for (let i = 0; i < fieldSpan; i++) {
          if (occupied.has(`${r},${start + i}`)) {
            fits = false;
            break;
          }
        }
        if (fits) return { row: r, col: start };
      }
      c--;
      if (c < 0) {
        c = GRID_COLS - 1;
        r--;
      }
    }
    return { row: 1, col: 0 };
  }

  getInputAttrs(fieldData, defaults = {}) {
    const attrs = [];
    if (fieldData?.readOnly) {
      attrs.push('readonly');
    }
    if (fieldData?.inputMask) {
      attrs.push(`data-input-mask="${this.escapeAttr(fieldData.inputMask)}"`);
    }
    Object.entries(defaults).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && !attrs.some(a => a.startsWith(k))) attrs.push(`${k}="${v}"`);
    });
    return attrs.join(' ');
  }

  escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;');
  }

  escapeHtml(str) {
    const s = String(str || '');
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Get a service node by path (e.g. "0" or "0.1") from enhancedServiceStructure */
  getServiceByPath(structure, path) {
    if (!path || !Array.isArray(structure)) return null;
    const parts = path.split('.').map((p) => parseInt(p, 10));
    let current = structure;
    for (let i = 0; i < parts.length; i++) {
      const idx = parts[i];
      if (current == null || !current[idx]) return null;
      if (i === parts.length - 1) return current[idx];
      current = current[idx].children;
      if (!current) return null;
    }
    return null;
  }

  /** Max depth of enhanced service tree (1 = one level, 2 = two levels, etc.) */
  getServiceStructureMaxDepth(structure) {
    if (!structure || !Array.isArray(structure) || structure.length === 0) return 0;
    let max = 1;
    structure.forEach((item) => {
      if (item.type === 'page_break') return;
      if (item.children && item.children.length > 0) {
        const d = 1 + this.getServiceStructureMaxDepth(item.children);
        if (d > max) max = d;
      }
    });
    return max;
  }

  /** Labels for each dropdown level from saved structure: [cars, models, item, last] etc. */
  getServiceLevelLabels(fieldData) {
    const structure = fieldData.enhancedServiceStructure || [];
    const topItems = structure.filter((s) => s.type !== 'page_break');
    const labels = [];
    // First dropdown label = top-level label (e.g. "cars") from Service Configuration
    const topLabel = (fieldData.serviceStructureLabel || '').trim() ||
      (topItems[0] && (topItems[0].name || '').trim()) || 'Service';
    labels[0] = topLabel;
    // Remaining levels: walk first path and use each category's optionsLabel (e.g. "models", "item", "last")
    const walkFirstPath = (arr, level) => {
      if (!arr || arr.length === 0) return;
      const first = arr.find((s) => s.type !== 'page_break' && s.children && s.children.length > 0);
      if (!first) return;
      labels[level] = (first.optionsLabel || first.name || '').trim() || 'Option';
      walkFirstPath(first.children, level + 1);
    };
    if (topItems.length > 0) walkFirstPath(topItems, 1);
    return labels;
  }

  /** Build option HTML for one item (path, has-children) */
  buildServiceOptionHtml(item, path) {
    const hasChildren = item.children && item.children.length > 0;
    const text = item.name || 'Option';
    return `<option value="${this.escapeAttr(path)}" data-path="${this.escapeAttr(path)}" data-has-children="${hasChildren ? '1' : '0'}">${this.escapeHtml(text)}</option>`;
  }

  /** Build HTML for cascading service dropdowns: only first dropdown + container for next levels (shown on selection) */
  getServiceCascadingDropdownsHtml(fieldId, fieldData) {
    const enhancedServiceStructure = fieldData.enhancedServiceStructure || [];
    if (enhancedServiceStructure.length === 0) return '';
    const topItems = enhancedServiceStructure.filter((s) => s.type !== 'page_break');
    const levelLabels = this.getServiceLevelLabels(fieldData);

    const choosePlaceholder = (label) => `Choose ${label || 'option'}`;
    let level0Options = `<option value="">${this.escapeHtml(choosePlaceholder(levelLabels[0]))}</option>`;
    topItems.forEach((item, i) => {
      level0Options += this.buildServiceOptionHtml(item, String(i));
    });

    return `
    <div class="quotemate-service-dropdowns" data-field-id="${this.escapeAttr(fieldId)}">
      <div class="quotemate-service-dropdown-level" data-level="0">
        <select class="quotemate-form-field__input quotemate-service-select" data-level="0" data-path="">
          ${level0Options}
        </select>
      </div>
      <div class="quotemate-service-dropdown-levels"></div>
    </div>`;
  }

  /** Build HTML for one additional dropdown level (label + select with options); used when user selects an option that has children */
  buildServiceDropdownLevelHtml(parentPath, node, level) {
    const children = node.children || [];
    const label = (node.optionsLabel || node.name || 'Option').trim() || 'Option';
    let optionsHtml = `<option value="">${this.escapeHtml(`Choose ${label}`)}</option>`;
    children.forEach((item, i) => {
      const path = parentPath ? `${parentPath}.${i}` : String(i);
      optionsHtml += this.buildServiceOptionHtml(item, path);
    });
    return `<div class="quotemate-service-dropdown-level" data-level="${level}">
      <select class="quotemate-form-field__input quotemate-service-select" data-level="${level}" data-path="${this.escapeAttr(parentPath)}">
        ${optionsHtml}
      </select>
    </div>`;
  }

  /** Remove all dropdown levels at or after fromLevel (only levels inside .quotemate-service-dropdown-levels) */
  clearServiceDropdownLevelsFrom(wrapper, fromLevel) {
    const container = wrapper.querySelector('.quotemate-service-dropdown-levels');
    if (!container) return;
    container.querySelectorAll('.quotemate-service-dropdown-level').forEach((div) => {
      const l = parseInt(div.dataset.level, 10);
      if (l >= fromLevel) div.remove();
    });
  }

  generateFieldHtmlFromData(fieldData) {
    const fieldId = fieldData.id;
    const fieldType = fieldData.type;
    const fieldLabel = fieldData.label || this.getFieldLabel(fieldType);
    let inputHtml = "";
    const inputAttrs = this.getInputAttrs(fieldData);

    switch (fieldType) {
      case "name":
      case "company":
      case "email":
      case "phone":
      case "address":
      case "city":
      case "state_province":
      case "zip_postal":
      case "project_title":
      case "project_location":
        inputHtml = `<input type="${fieldType === "email" ? "email" : "text"
          }" id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input" placeholder="${this.escapeAttr(fieldData.placeholder || '')}" value="${this.escapeAttr(fieldData.defaultValue || '')}" ${inputAttrs}>`;
        break;

      case "start_date":
        inputHtml = `<input type="date" id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input" value="${this.escapeAttr(fieldData.defaultValue || '')}" ${inputAttrs}>`;
        break;

      case "service":
        const serviceStructure = fieldData.serviceStructure || [];
        const enhancedServiceStructure = fieldData.enhancedServiceStructure || [];
        const serviceOptions = fieldData.services || [];

        if (enhancedServiceStructure.length > 0) {
          inputHtml = this.getServiceCascadingDropdownsHtml(fieldId, fieldData);
        } else if (serviceStructure.length > 0) {
          let optionsHtml = '<option value="">Select a service</option>';
          serviceStructure.forEach(category => {
            if (category.children && category.children.length > 0) {
              optionsHtml += `<optgroup label="${category.name || 'Services'}">`;
              category.children.forEach(service => {
                const pricingLabel = service.pricingType === 'fixed' ?
                  `$${service.basePrice || '0.00'}` :
                  `$${service.basePrice || '0.00'} ${service.pricingType.replace('_', ' ')}`;
                optionsHtml += `<option value="${service.name}">${service.name} (${pricingLabel})</option>`;
              });
              optionsHtml += '</optgroup>';
            }
          });

          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              ${optionsHtml}
            </select>`;
        } else if (serviceOptions.length > 0) {
          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              <option value="">Select a service</option>
              ${serviceOptions
              .map(
                (service) => `
                <option value="${service.name.toLowerCase().replace(/\s+/g, "_")}">${service.name} ($${service.price || '0.00'})</option>
              `
              )
              .join("")}
            </select>`;
        } else {
          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              <option value="">No services configured yet. Use field settings to configure.</option>
            </select>`;
        }
        break;

      case "select":
      case "project_category":
      case "service_type":
      case "completion_timeline":
      case "budget_range":
      case "unit_type":
      case "material_type":
        const selectOptions = fieldData.options || [];
        const defaultSelectVal = (fieldData.defaultValue || '').toLowerCase().replace(/\s+/g, '_');
        if (selectOptions.length > 0) {
          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              <option value="">Choose an option</option>
              ${selectOptions
              .map(
                (option) => {
                  const optVal = option.toLowerCase().replace(/\s+/g, '_');
                  return `<option value="${optVal}" ${optVal === defaultSelectVal ? 'selected' : ''}>${option}</option>`;
                }
              )
              .join("")}
            </select>`;
        } else {
          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              <option value="">No options added yet. Configure in field settings.</option>
            </select>`;
        }
        break;

      case "pricing":
        const pricingOptions = fieldData.options || [];
        if (pricingOptions.length > 0) {
          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              <option value="">Select a pricing option</option>
              ${pricingOptions
              .map(
                (option) => `
                <option value="${option.toLowerCase().replace(/\s+/g, "_")}">${option} (${fieldData.prices ? fieldData.prices[option] || '0.00' : '0.00'})</option>
              `
              )
              .join("")}
            </select>`;
        } else {
          inputHtml = `
            <select id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input">
              <option value="">No pricing options added yet. Configure in field settings.</option>
            </select>`;
        }
        break;

      case "radio":
      case "urgency_level":
        const radioOptions = fieldData.options || [];
        const defaultRadioVal = (fieldData.defaultValue || '').toLowerCase().replace(/\s+/g, '_');
        if (radioOptions.length > 0) {
          inputHtml = `
            <div class="quotemate-form-field__options">
              ${radioOptions
              .map(
                (option) => {
                  const optVal = option.toLowerCase().replace(/\s+/g, '_');
                  return `<label>
                    <input type="radio" name="${fieldId}" value="${optVal}" ${optVal === defaultRadioVal ? 'checked' : ''}>
                  ${option}
                  </label>`;
                }
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
      case "additional_options":
      case "addons":
        const checkboxOptions = fieldData.options || [];
        const defaultCheckVals = (fieldData.defaultValue || '').split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean);
        if (checkboxOptions.length > 0) {
          inputHtml = `
            <div class="quotemate-form-field__options">
              ${checkboxOptions
              .map(
                (option) => {
                  const optVal = option.toLowerCase().replace(/\s+/g, '_');
                  return `<label>
                    <input type="checkbox" name="${fieldId}[]" value="${optVal}" ${defaultCheckVals.includes(optVal) ? 'checked' : ''}>
                  ${option}
                  </label>`;
                }
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
      case "quote_notes":
      case "project_description": {
        inputHtml = `<textarea id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input" rows="5" placeholder="${this.escapeAttr(fieldData.placeholder || '')}" ${inputAttrs}>${this.escapeAttr(fieldData.defaultValue || '')}</textarea>`;
        break;
      }

      case "quantity":
      case "area_size": {
        const qVal = fieldData.defaultValue ?? '1';
        const qMin = fieldData.minValue !== undefined && fieldData.minValue !== '' ? `min="${fieldData.minValue}"` : '';
        const qMax = fieldData.maxValue !== undefined && fieldData.maxValue !== '' ? `max="${fieldData.maxValue}"` : '';
        inputHtml = `<input type="number" id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input" value="${this.escapeAttr(qVal)}" step="1" ${qMin} ${qMax} ${inputAttrs}>`;
        break;
      }

      case "file":
      case "attach_files": {
        const accept = fieldData.acceptTypes ? `accept="${this.escapeAttr(fieldData.acceptTypes)}"` : '';
        const dataMaxSize = fieldData.maxFileSize ? `data-max-size="${this.escapeAttr(fieldData.maxFileSize)}"` : '';
        inputHtml = `<input type="file" id="${this.escapeAttr(fieldId)}" name="${this.escapeAttr(fieldId)}" class="form-control quotemate-form-field__input" ${accept} ${dataMaxSize}>`;
        break;
      }

      case "divider":
        inputHtml = `<div class="quotemate-form-field__divider"><hr class="quotemate-form-field__divider-line"></div>`;
        break;

      case "heading": {
        const headingTag = resolveHeadingLevel(fieldData.heading_level);
        const alignClass = getHeadingAlignClass(fieldData.heading_align);
        const headingHtml = formatHeadingText(fieldData.label || 'Heading');
        inputHtml = `<${headingTag} class="quotemate-form-field__heading quotemate-form-field__heading--${headingTag} ${alignClass}">${headingHtml}</${headingTag}>`;
        break;
      }

      case "paragraph":
        inputHtml = `<div class="quotemate-form-field__paragraph">${this.escapeHtml(fieldData.paragraph_content || fieldData.label || 'Enter your paragraph text here.')}</div>`;
        break;

      case "page_break":
        inputHtml = buildPageBreakPreviewHtml(fieldData, {
          showPrevious: this.canPageBreakShowPrevious(fieldId),
        });
        break;

      case "section_break":
        inputHtml = `
          <div class="quotemate-form-field__section-break">
            <hr class="quotemate-form-field__break-line">
            <span class="quotemate-form-field__break-text">Section: ${fieldData.section_title || 'New Section'}</span>
          </div>`;
        break;

      case "html":
        inputHtml = `
          <div class="quotemate-form-field__html-content">
            ${fieldData.html_content || '<p>HTML content will be displayed here</p>'}
          </div>`;
        break;

      case "form_summary":
        inputHtml = `
          <div class="quotemate-form-summary-preview">
            <div class="quotemate-form-summary-preview__title">${fieldData.summaryTitle || 'Quote Summary'}</div>
            <div class="quotemate-form-summary-preview__line">Service line item — ${this.escapeHtml(fieldData.currencySymbol || '$')}0.00</div>
            ${fieldData.showSubtotal !== false ? '<div class="quotemate-form-summary-preview__line">Subtotal</div>' : ''}
            ${fieldData.showTax ? `<div class="quotemate-form-summary-preview__line">Tax (${fieldData.taxRate || 0}%)</div>` : ''}
            ${fieldData.showDiscount ? '<div class="quotemate-form-summary-preview__line">Discount</div>' : ''}
            ${fieldData.showGrandTotal !== false ? `<div class="quotemate-form-summary-preview__total">Grand Total — ${this.escapeHtml(fieldData.currencySymbol || '$')}0.00</div>` : ''}
            <div class="quotemate-form-summary-preview__hint">Live totals appear on the frontend after all steps are completed.</div>
          </div>`;
        break;

      case "quote_total":
        inputHtml = `
          <div class="quotemate-quote-total">
            <div class="quotemate-quote-total__subtotal">
              <span class="quotemate-quote-total__label">Subtotal:</span>
              <span class="quotemate-quote-total__value">$0.00</span>
            </div>
            ${fieldData.show_tax ? `
              <div class="quotemate-quote-total__tax">
                <span class="quotemate-quote-total__label">Tax (${fieldData.tax_rate || 0}%):</span>
                <span class="quotemate-quote-total__value">$0.00</span>
              </div>
            ` : ''}
            ${fieldData.show_discount ? `
              <div class="quotemate-quote-total__discount">
                <span class="quotemate-quote-total__label">Discount:</span>
                <div class="quotemate-quote-total__discount-input">
                  <input type="number" min="0" max="100" step="1" value="0" class="quotemate-form-field__input" placeholder="0">
                  <span>%</span>
                </div>
              </div>
            ` : ''}
            <div class="quotemate-quote-total__total">
              <span class="quotemate-quote-total__label">Total:</span>
              <span class="quotemate-quote-total__value">$0.00</span>
            </div>
          </div>`;
        break;

      default:
        // For any unhandled field types (e.g. project_type, text), show a text input
        inputHtml = `<input type="text" class="quotemate-form-field__input" placeholder="${this.escapeAttr(fieldData.placeholder || 'Enter ' + fieldLabel.toLowerCase())}" value="${this.escapeAttr(fieldData.defaultValue || '')}" ${inputAttrs}>`;
    }

    // --- UNIFIED FIELD WRAPPER FOR ALL FIELD TYPES ---
    // Build the drag handle HTML
    const dragHandleHtml = `
      <span class="quotemate-form-field__drag-handle" title="Drag to reorder">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width="18" height="18"><circle cx="96" cy="128" r="24"/><circle cx="96" cy="256" r="24"/><circle cx="96" cy="384" r="24"/><circle cx="192" cy="128" r="24"/><circle cx="192" cy="256" r="24"/><circle cx="192" cy="384" r="24"/></svg>
      </span>
    `;
    // Build the actions HTML
    const actionsHtml = `
      <div class="quotemate-form-field__actions">
        <button type="button" class="quotemate-form-field__action" data-action="edit-field" data-field-id="${fieldId}">Edit</button>
        <button type="button" class="quotemate-form-field__action" data-action="duplicate-field" data-field-id="${fieldId}">Copy</button>
        <button type="button" class="quotemate-form-field__action" data-action="delete-field" data-field-id="${fieldId}">Delete</button>
      </div>
    `;
    // Toolbar: drag handle + actions grouped on the right
    const toolbarHtml = `
      <div class="quotemate-form-field__toolbar">
        ${dragHandleHtml}
        ${actionsHtml}
      </div>
    `;
    // Build the label/description HTML (if applicable)
    let labelHtml = '';
    let descriptionHtml = '';
    if (fieldType !== 'page_break' && fieldType !== 'section_break' && fieldType !== 'html' && fieldType !== 'heading' && fieldType !== 'paragraph' && fieldType !== 'divider' && fieldType !== 'form_summary' && fieldType !== 'service' && fieldType !== 'service_options') {
      labelHtml = `<label for="${this.escapeAttr(fieldId)}" class="field-label quotemate-form-field__label">${fieldLabel} ${fieldData.required ? '<span class="quotemate-form-field__required">*</span>' : ''}</label>`;
      if (fieldData.description) {
        descriptionHtml = `<p class="quotemate-form-field__description">${fieldData.description}</p>`;
      }
    }
    // For section breaks, show their special title
    if (fieldType === 'section_break') {
      labelHtml = `<span class="quotemate-form-field__break-text">Section: ${fieldData.section_title || 'New Section'}</span>`;
    } else if (fieldType === 'divider') {
      labelHtml = '';
    }
    // Build label HTML - hide when hideLabel is set
    const effectiveLabelHtml = fieldData.hideLabel ? '' : labelHtml;
    const sizeClass = this.getFieldSizeClass(fieldData);
    const isContentBlock = ['heading', 'paragraph', 'html', 'divider'].includes(fieldType);
    const fieldClasses = ['quotemate-form-field', 'form-group', sizeClass];
    if (isContentBlock) {
      fieldClasses.push('quotemate-form-field--content-block');
    }
    if (fieldType === 'page_break') {
      fieldClasses.push('quotemate-form-field--page-break');
    }
    const styleVars = this.getFieldStyleVars(fieldData);

    // Compose the unified field wrapper (input + toolbar grouped inside field body)
    return `
      <div class="${fieldClasses.join(' ')}" data-field-id="${fieldId}" data-field-type="${fieldType}"${styleVars ? ` style="${styleVars}"` : ''}>
        ${effectiveLabelHtml}
        ${descriptionHtml}
        <div class="quotemate-form-field__body">
          <div class="field-input">
            ${inputHtml}
          </div>
          ${toolbarHtml}
        </div>
      </div>
    `;
  }

  init() {
    // this.dragDropHandler.init(); // Remove this line to prevent duplicate field creation
    this.initFieldSelection();
    this.initFormTitleEditing();
    this.formPreview.init();
    this.initFieldSearch();
    this.initDynamicEventListeners();
    this.initStyleLayoutControls();
    this.initColorPicker();
    this.initSortableFields();
    this.initializeConditionalLogic();
    this.initLayoutAndStructure();

    setTimeout(() => {
      this.refreshBuilderLivePreview();
    }, 600);

    // Initialize service manager after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (this.serviceManager) {
      }
    }, 100);
  }

  /** Layout section (Row/Container) + Structure panel (tree view) */
  initLayoutAndStructure() {
    const addRowBtn = document.getElementById('quotemate-add-row-from-layout');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        this.addRow();
        this.renderStructurePanel();
      });
    }
    this.renderStructurePanel();
    document.addEventListener('click', (e) => {
      const rowEl = e.target.closest('[data-structure-row-id]');
      const fieldEl = e.target.closest('[data-structure-field-id]');
      if (rowEl) {
        e.preventDefault();
        const rowId = rowEl.dataset.structureRowId;
        const section = document.querySelector(`.quotemate-form-builder__section[data-row-id="${rowId}"]`);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          document.querySelectorAll('.quotemate-form-builder__section').forEach(s => s.classList.remove('quotemate-form-builder__section--structure-selected'));
          section.classList.add('quotemate-form-builder__section--structure-selected');
        }
      }
      if (fieldEl) {
        e.preventDefault();
        const fieldId = fieldEl.dataset.structureFieldId;
        const fieldNode = document.querySelector(`.quotemate-form-field[data-field-id="${fieldId}"]`);
        if (fieldNode) {
          this.selectField(fieldNode);
          fieldNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }

  /** Build and render the Structure panel tree from layout + fields */
  renderStructurePanel() {
    const container = document.getElementById('structure-tree');
    if (!container) return;
    this.ensureLayout();
    const layout = this.formData.layout;
    const fieldsMap = new Map((this.formData.fields || []).map(f => [f.id, f]));

    if (!layout.rows.length) {
      container.innerHTML = '<p class="quotemate-form-builder__structure-empty">No rows yet. Click <strong>Row</strong> in Layout to add one.</p>';
      return;
    }

    let html = '<ul class="quotemate-form-builder__structure-list">';
    layout.rows.forEach((row, rowIndex) => {
      html += `<li class="quotemate-form-builder__structure-node">
        <button type="button" class="quotemate-form-builder__structure-row" data-structure-row-id="${this.escapeAttr(row.id)}">
          <span class="quotemate-form-builder__structure-icon quotemate-form-builder__structure-icon--row">▭</span>
          <span>Row ${rowIndex + 1}</span>
        </button>`;
      html += '<ul class="quotemate-form-builder__structure-list quotemate-form-builder__structure-list--columns">';
      (row.columns || []).forEach((col, colIndex) => {
        const fieldIds = col.fieldIds || [];
        if (fieldIds.length === 0) {
          html += `<li class="quotemate-form-builder__structure-node">
            <span class="quotemate-form-builder__structure-col"><span class="quotemate-form-builder__structure-icon quotemate-form-builder__structure-icon--col">⊞</span> Column ${colIndex + 1}</span>
            <span class="quotemate-form-builder__structure-hint">(empty)</span>
          </li>`;
        } else {
          html += `<li class="quotemate-form-builder__structure-node">
            <span class="quotemate-form-builder__structure-col"><span class="quotemate-form-builder__structure-icon quotemate-form-builder__structure-icon--col">⊞</span> Column ${colIndex + 1}</span>
            <ul class="quotemate-form-builder__structure-list">`;
          fieldIds.forEach(fid => {
            const f = fieldsMap.get(fid);
            const label = (f && (f.label || f.type)) ? this.escapeHtml(f.label || f.type) : fid;
            html += `<li class="quotemate-form-builder__structure-node">
              <button type="button" class="quotemate-form-builder__structure-field" data-structure-field-id="${this.escapeAttr(fid)}">
                <span class="quotemate-form-builder__structure-icon quotemate-form-builder__structure-icon--field">T</span>
                <span>${label}</span>
              </button>
            </li>`;
          });
          html += '</ul></li>';
        }
      });
      html += '</ul></li>';
    });
    html += '</ul>';
    container.innerHTML = html;
  }

  /**
   * Hex to HSV (h 0-360, s 0-100, v 0-100).
   */
  _hexToHsv(hex) {
    const parsed = this._parseHex(hex);
    if (!parsed) return { h: 0, s: 0, v: 100 };
    const r = parsed.r / 255, g = parsed.g / 255, b = parsed.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : (d / max) * 100;
    const v = max * 100;
    if (d !== 0) {
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
      if (h < 0) h += 360;
    }
    return { h, s, v };
  }

  _parseHex(hex) {
    if (!hex || typeof hex !== 'string') return null;
    hex = hex.replace(/^#/, '').trim();
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }

  /**
   * HSV to hex (#rrggbb).
   */
  _hsvToHex(h, s, v) {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; } else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; } else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return '#' + [r + m, g + m, b + m].map(u => {
      const n = Math.round(Math.max(0, Math.min(1, u)) * 255);
      return n.toString(16).padStart(2, '0');
    }).join('');
  }

  /**
   * Create color picker popup and delegate swatch clicks.
   */
  initColorPicker() {
    const popup = document.createElement('div');
    popup.id = 'quotemate-color-picker-popup';
    popup.className = 'quotemate-color-picker';
    popup.innerHTML = `
      <div class="quotemate-color-picker__header">
        <span class="quotemate-color-picker__title">Color Picker</span>
      </div>
      <div class="quotemate-color-picker__body">
        <div class="quotemate-color-picker__sv" role="presentation">
          <div class="quotemate-color-picker__sv-white"></div>
          <div class="quotemate-color-picker__sv-black"></div>
          <span class="quotemate-color-picker__thumb" aria-hidden="true"></span>
        </div>
        <div class="quotemate-color-picker__hue" role="slider" aria-label="Hue">
          <span class="quotemate-color-picker__thumb" aria-hidden="true"></span>
        </div>
        <div class="quotemate-color-picker__hex">
          <input type="text" class="quotemate-color-picker__hex-input" value="#000000" maxlength="9" aria-label="Hex color">
        </div>
      </div>
    `;
    document.body.appendChild(popup);
    this._colorPickerPopup = popup;
    this._colorPickerTarget = null;

    document.addEventListener('click', (e) => {
      if (e.target.closest('#quotemate-color-picker-popup')) return;
      const swatch = e.target.closest('.quotemate-color-swatch');
      if (swatch) {
        e.preventDefault();
        const section = swatch.closest('.quotemate-color-field');
        const input = section ? section.querySelector('.quotemate-color-input') : null;
        if (input) this._openColorPicker(input, swatch);
        return;
      }
      this._closeColorPicker();
    });
  }

  _openColorPicker(input, swatch) {
    this._colorPickerTarget = { input, swatch };
    const popup = this._colorPickerPopup;
    const hex = (input.value && /^#[0-9A-Fa-f]{3,8}$/.test(input.value.trim())) ? input.value.trim() : '#ffffff';
    const hsv = this._hexToHsv(hex);

    const rect = swatch.getBoundingClientRect();
    popup.style.left = `${rect.left}px`;
    popup.style.top = `${Math.max(8, rect.bottom - 4)}px`;
    popup.classList.add('quotemate-color-picker--open');

    const svEl = popup.querySelector('.quotemate-color-picker__sv');
    const svWhite = popup.querySelector('.quotemate-color-picker__sv-white');
    const svBlack = popup.querySelector('.quotemate-color-picker__sv-black');
    const svThumb = svEl.querySelector('.quotemate-color-picker__thumb');
    const hueEl = popup.querySelector('.quotemate-color-picker__hue');
    const hueThumb = hueEl.querySelector('.quotemate-color-picker__thumb');
    const hexInput = popup.querySelector('.quotemate-color-picker__hex-input');

    const updateUI = () => {
      const hueColor = this._hsvToHex(hsv.h, 100, 100);
      svWhite.style.background = `linear-gradient(to right, #fff, ${hueColor})`;
      svBlack.style.background = 'linear-gradient(to top, #000, transparent)';
      svThumb.style.left = `${(hsv.s / 100) * 100}%`;
      svThumb.style.top = `${100 - (hsv.v / 100) * 100}%`;
      hueThumb.style.left = `${(hsv.h / 360) * 100}%`;
      hexInput.value = this._hsvToHex(hsv.h, hsv.s, hsv.v);
    };

    const applyToTarget = () => {
      const hexOut = this._hsvToHex(hsv.h, hsv.s, hsv.v);
      input.value = hexOut;
      swatch.style.backgroundColor = hexOut;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    updateUI();

    const onSv = (clientX, clientY) => {
      const r = svEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      hsv.s = x * 100;
      hsv.v = (1 - y) * 100;
      updateUI();
      applyToTarget();
    };

    const onHue = (clientX) => {
      const r = hueEl.getBoundingClientRect();
      hsv.h = Math.max(0, Math.min(360, ((clientX - r.left) / r.width) * 360));
      updateUI();
      applyToTarget();
    };

    const drag = (move, up) => {
      const onMove = (e) => { move(e.clientX, e.clientY); };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        up();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    svEl.onmousedown = (e) => { e.preventDefault(); onSv(e.clientX, e.clientY); drag((x, y) => onSv(x, y), () => {}); };
    hueEl.onmousedown = (e) => { e.preventDefault(); onHue(e.clientX); drag((x) => onHue(x), () => {}); };

    hexInput.value = this._hsvToHex(hsv.h, hsv.s, hsv.v);
    hexInput.oninput = () => {
      const parsed = this._parseHex(hexInput.value);
      if (parsed) {
        const { h, s, v } = this._hexToHsv(hexInput.value);
        hsv.h = h; hsv.s = s; hsv.v = v;
        updateUI();
        applyToTarget();
      }
    };
  }

  _closeColorPicker() {
    this._colorPickerPopup.classList.remove('quotemate-color-picker--open');
    this._colorPickerTarget = null;
  }

  /**
   * Delegated handlers for Style tab: collapsible categories, Layout link toggle, linked-value sync.
   */
  initStyleLayoutControls() {
    const panel = document.getElementById('field-settings-content');
    if (!panel) return;

    panel.addEventListener('click', (e) => {
      const styleSubTab = e.target.closest('.quotemate-style-sub-tab');
      if (styleSubTab) {
        e.preventDefault();
        const tabName = styleSubTab.getAttribute('data-style-sub-tab');
        const container = styleSubTab.closest('.quotemate-form-properties--style');
        if (container && tabName) {
          container.querySelectorAll('.quotemate-style-sub-tab').forEach((t) => t.classList.remove('active'));
          container.querySelectorAll('.quotemate-style-sub-panel').forEach((p) => p.classList.remove('active'));
          styleSubTab.classList.add('active');
          const panel = container.querySelector(`.quotemate-style-sub-panel[data-style-panel="${tabName}"]`);
          if (panel) panel.classList.add('active');
        }
        return;
      }

      const categoryHeader = e.target.closest('.quotemate-style-category__header');
      if (categoryHeader) {
        e.preventDefault();
        const category = categoryHeader.closest('.quotemate-style-category');
        if (category) {
          const collapsed = category.classList.toggle('quotemate-style-category--collapsed');
          categoryHeader.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }
        return;
      }

      const btn = e.target.closest('[data-style-link-toggle]');
      if (!btn) return;
      e.preventDefault();
      const kind = btn.getAttribute('data-style-link-toggle');
      const linkPropSuffix = { margin: 'Margin', padding: 'Padding', borderRadius: 'BorderRadius' }[kind] || 'Margin';
      const block = btn.closest('.quotemate-style-layout-block');
      const hidden = block?.querySelector('input[data-property$="Linked"]');
      if (!block || !hidden) return;
      const fieldId = btn.dataset.fieldId || hidden.dataset.fieldId;
      const isLinked = hidden.value === 'true';
      hidden.value = isLinked ? 'false' : 'true';
      block.classList.toggle('quotemate-style-layout-block--linked', !isLinked);
      const linkLabel = kind === 'borderRadius' ? 'corners' : 'sides';
      btn.title = !isLinked ? `Unlink ${linkLabel}` : `Link ${linkLabel}`;
      if (fieldId && hidden.dataset.property) {
        this.updateFieldProperty(fieldId, hidden.dataset.property, hidden.value === 'true');
      }
    });

    panel.addEventListener('input', (e) => {
      if (!e.target.classList.contains('quotemate-style-layout-input')) return;
      const block = e.target.closest('.quotemate-style-layout-block');
      if (!block || !block.classList.contains('quotemate-style-layout-block--linked')) return;
      const fieldId = e.target.dataset.fieldId;
      const val = e.target.value;
      block.querySelectorAll('.quotemate-style-layout-input').forEach((inp) => {
        if (inp === e.target) return;
        inp.value = val;
        const property = inp.dataset.property;
        if (fieldId && property) {
          this.updateFieldProperty(fieldId, property, val);
        }
      });
    });
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
    const dropZone = document.getElementById("form-drop-zone");
    if (dropZone) {
      dropZone.addEventListener("click", (e) => {
        const button = e.target.closest("[data-action][data-row-id]");
        if (!button || !dropZone.contains(button)) return;
        const action = button.dataset.action;
        const rowId = button.dataset.rowId;
        if (!rowId) return;
        switch (action) {
          case "delete-row":
            e.preventDefault();
            e.stopPropagation();
            this.deleteRow(rowId);
            return;
          case "duplicate-row":
            e.preventDefault();
            e.stopPropagation();
            this.duplicateRow(rowId);
            return;
          case "add-column":
            e.preventDefault();
            e.stopPropagation();
            this.addColumn(rowId);
            return;
          case "remove-column":
            e.preventDefault();
            e.stopPropagation();
            this.removeColumn(rowId);
            return;
        }
      }, true);
    }

    document.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const section = button.closest(".quotemate-form-builder__section");
      const rowId = button.dataset.rowId || (section ? section.dataset.rowId : null);

      switch (action) {
        case "edit-field":
          this.editField(button.dataset.fieldId);
          break;
        case "duplicate-field":
          this.duplicateField(button.dataset.fieldId);
          break;
        case "delete-field":
          this.deleteField(button.dataset.fieldId);
          break;
        case "delete-row":
          e.preventDefault();
          if (rowId) this.deleteRow(rowId);
          break;
        case "duplicate-row":
          e.preventDefault();
          if (rowId) this.duplicateRow(rowId);
          break;
        case "add-column":
          e.preventDefault();
          if (rowId) this.addColumn(rowId);
          break;
        case "remove-column":
          e.preventDefault();
          if (rowId) this.removeColumn(rowId);
          break;
      }
    });

    document.addEventListener("change", (e) => {
      const select = e.target.closest("select.quotemate-service-select");
      if (!select) return;
      const wrapper = select.closest(".quotemate-service-dropdowns");
      if (!wrapper) return;
      const fieldId = wrapper.dataset.fieldId;
      const fieldData = this.formData.fields.find((f) => f.id === fieldId);
      if (!fieldData || !fieldData.enhancedServiceStructure || fieldData.enhancedServiceStructure.length === 0) return;
      const structure = fieldData.enhancedServiceStructure;
      const currentLevel = parseInt(select.dataset.level, 10);
      const nextLevel = currentLevel + 1;
      this.clearServiceDropdownLevelsFrom(wrapper, nextLevel);
      const selectedPath = select.value;
      if (!selectedPath) return;
      const selectedOpt = select.options[select.selectedIndex];
      const hasChildren = selectedOpt?.dataset.hasChildren === "1";
      if (!hasChildren) return;
      const node = this.getServiceByPath(structure, selectedPath);
      if (!node || !node.children || node.children.length === 0) return;
      const container = wrapper.querySelector(".quotemate-service-dropdown-levels");
      if (container) {
        container.insertAdjacentHTML("beforeend", this.buildServiceDropdownLevelHtml(selectedPath, node, nextLevel));
      }
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

    // Re-initialize sortable to include the new field
    if (this.initSortableFields) this.initSortableFields();

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
      case "project_category":
      case "service_type":
      case "completion_timeline":
      case "budget_range":
      case "unit_type":
      case "material_type":
        fieldData.options = [];
        break;
      case "urgency_level":
      case "additional_options":
      case "addons":
        fieldData.options = [];
        break;
      case "start_date":
        fieldData.defaultValue = new Date().toISOString().split("T")[0];
        break;
      case "area_size":
        fieldData.defaultValue = "0";
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
      case "heading":
        fieldData.heading_level = "h2";
        fieldData.heading_align = "center";
        break;
      case "paragraph":
        fieldData.paragraph_content = "Enter your paragraph text here.";
        break;
    }
    this.formData.fields.push(fieldData);
    this.updateFormData();

    // Initialize conditional logic for the new field
    setTimeout(() => {
      const newFieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
      if (newFieldElement) {
        this.attachConditionalLogicListeners(newFieldElement, fieldData);
      }
    }, 100);
  }
  generateFieldHtml(fieldType, fieldId) {
    // Use the same logic as generateFieldHtmlFromData for unified style
    const fieldData = { id: fieldId, type: fieldType, label: this.getFieldLabel(fieldType) };
    // For new fields, set up default values for special types
    if (fieldType === 'page_break') {
      fieldData.page_title = 'Next Page';
      fieldData.page_description = '';
      fieldData.page_break_align = 'center';
    } else if (fieldType === 'section_break') {
      fieldData.section_title = 'New Section';
    } else if (fieldType === 'heading') {
      fieldData.heading_level = 'h2';
      fieldData.heading_align = 'center';
    } else if (fieldType === 'paragraph') {
      fieldData.paragraph_content = 'Enter your paragraph text here.';
    } else if (fieldType === 'form_summary') {
      Object.assign(fieldData, {
        summaryTitle: 'Quote Summary',
        showSubtotal: true,
        currencyCode: 'USD',
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
      });
    } else if (fieldType === 'quote_total') {
      fieldData.show_tax = false;
      fieldData.tax_rate = 0;
      fieldData.show_discount = false;
    }
    // Call generateFieldHtmlFromData for unified rendering
    return this.generateFieldHtmlFromData(fieldData);
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
      this.fieldProperties.showProperties(
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

      // Trigger recalculation when service prices change
      if (this.calculationEngine) {
        setTimeout(() => this.calculationEngine.calculateTotals(), 100);
      }
    }
  }

  getFieldLabel(fieldType) {
    const labels = {
      name: "Full Name",
      company: "Company Name",
      email: "Email Address",
      phone: "Phone Number",
      address: "Address",
      city: "City",
      state_province: "State/Province",
      zip_postal: "ZIP/Postal Code",
      service: "Service Selection",
      service_options: "Service Options",
      project_type: "Project Type",
      project_title: "Project Title",
      project_category: "Project Category",
      service_type: "Service Type",
      project_description: "Project Description",
      project_location: "Project Location",
      start_date: "Start Date",
      completion_timeline: "Completion Timeline",
      urgency_level: "Urgency Level",
      budget_range: "Budget Range",
      budget: "Budget Range",
      attach_files: "Attach Reference Files",
      quantity: "Quantity",
      unit_type: "Unit Type",
      area_size: "Area Size (sq ft)",
      material_type: "Material Type",
      additional_options: "Additional Options",
      addons: "Add-ons",
      quote_total: "Quote Total",
      form_summary: "Form Summary",
      quote_notes: "Quote Notes",
      deadline: "Project Deadline",
      description: "Project Description",
      quote_validity: "Quote Validity",
      text: "Single Line Text",
      textarea: "Paragraph Text",
      select: "Drop Down",
      radio: "Multiple Choice",
      checkbox: "Checkboxes",
      file: "File Upload",
      page_break: "Page Break",
      section_break: "Section Break",
      heading: "Heading",
      paragraph: "Paragraph",
      html: "HTML Block",
      divider: "Divider"
    };
    return labels[fieldType] || "Field";
  }

  initFieldSelection() {
    document.addEventListener("click", (e) => {
      // Prevent opening settings when clicking delete button
      if (e.target.closest(".quotemate-form-field__action[data-action='delete-field']")) {
        return;
      }
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

    // Show properties in the field settings tab and switch to it
    this.fieldProperties.showProperties(fieldElement);
  }

  getCanvasFieldElement(fieldId) {
    if (!fieldId) return null;
    if (this.selectedField?.dataset?.fieldId === fieldId) {
      return this.selectedField;
    }
    return document.querySelector(`.quotemate-form-field[data-field-id="${fieldId}"]`);
  }
  removeServiceOption(fieldId, index) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.services && fieldData.services.length > 0) {
      fieldData.services.splice(index, 1);
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.fieldProperties.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }

  updateFieldProperty(fieldId, property, value) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData) {
      fieldData[property] = value;

      if (property === 'addPrice' && value && ['select', 'radio', 'checkbox'].includes(fieldData.type)) {
        if (!fieldData.optionPrices) {
          fieldData.optionPrices = {};
        }
        (fieldData.options || []).forEach((label) => {
          if (!Object.prototype.hasOwnProperty.call(fieldData.optionPrices, label)) {
            fieldData.optionPrices[label] = 0;
          }
        });
      }

      if (fieldData.type === 'form_summary' && property === 'currencyCode') {
        const currency = FieldProperties.getCurrencyByCode(value);
        if (currency) {
          fieldData.currencySymbol = currency.symbol;
        }
      }

      this.updateFormData();
      if (!(fieldData.type === 'page_break' && property === 'step_title')) {
        this.refreshFieldInCanvas(fieldId);
      }

      if (fieldData.type === 'page_break' && property === 'step_title') {
        this.refreshBuilderLivePreview();
      }

      const shouldRefreshProperties =
        (fieldData.type === 'heading' &&
          ['heading_level', 'heading_align', 'label'].includes(property)) ||
        (fieldData.type === 'page_break' &&
          [
            'page_title',
            'page_description',
            'page_break_align',
            'page_break_button_color',
            'page_prev_title',
            'page_prev_description',
            'page_break_prev_align',
            'page_break_prev_button_color',
            'show_previous_button',
          ].includes(property)) ||
        (fieldData.type === 'form_summary' &&
          ['showTax', 'showDiscount', 'showTermsCheckbox', 'discountType', 'currencyCode', 'taxMode'].includes(
            property
          )) ||
        (fieldData.type === 'quote_total' && ['show_tax', 'show_discount'].includes(property)) ||
        (['select', 'radio', 'checkbox'].includes(fieldData.type) && property === 'addPrice');

      if (shouldRefreshProperties) {
        this.syncPropertiesFromPanel();
        const fieldElement = this.getCanvasFieldElement(fieldId);
        if (fieldElement) {
          this.fieldProperties.showProperties(fieldElement);
        }
      }
    }
  }

  updateFieldChoice(fieldId, choiceIndex, value) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.options) {
      const oldLabel = fieldData.options[choiceIndex];
      fieldData.options[choiceIndex] = value;
      if (fieldData.optionPrices && oldLabel !== undefined && oldLabel !== value) {
        if (Object.prototype.hasOwnProperty.call(fieldData.optionPrices, oldLabel)) {
          fieldData.optionPrices[value] = fieldData.optionPrices[oldLabel];
          delete fieldData.optionPrices[oldLabel];
        }
      }
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
    }
  }

  updateFieldChoicePrice(fieldId, choiceIndex, price) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (!fieldData || !fieldData.options || choiceIndex < 0 || choiceIndex >= fieldData.options.length) {
      return;
    }
    if (!fieldData.optionPrices) {
      fieldData.optionPrices = {};
    }
    const label = fieldData.options[choiceIndex];
    fieldData.optionPrices[label] = parseFloat(price) || 0;
    this.updateFormData();
  }

  addFieldChoice(fieldId) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData) {
      if (!fieldData.options) {
        fieldData.options = [];
      }
      const newLabel = `Option ${fieldData.options.length + 1}`;
      fieldData.options.push(newLabel);
      if (fieldData.addPrice) {
        if (!fieldData.optionPrices) {
          fieldData.optionPrices = {};
        }
        fieldData.optionPrices[newLabel] = 0;
      }
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.fieldProperties.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }

  removeFieldChoice(fieldId, choiceIndex) {
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);
    if (fieldData && fieldData.options && fieldData.options.length > 0) {
      const removedLabel = fieldData.options[choiceIndex];
      fieldData.options.splice(choiceIndex, 1);
      if (fieldData.optionPrices && removedLabel !== undefined) {
        delete fieldData.optionPrices[removedLabel];
      }
      this.updateFormData();
      this.refreshFieldInCanvas(fieldId);
      this.fieldProperties.showProperties(
        document.querySelector(`[data-field-id="${fieldId}"]`)
      );
    }
  }

  refreshFieldInCanvas(fieldId) {
    const fieldElement = this.getCanvasFieldElement(fieldId);
    const fieldData = this.formData.fields.find((f) => f.id === fieldId);

    if (fieldElement && fieldData) {
      // Update field size class on wrapper
      const sizeClass = this.getFieldSizeClass(fieldData);
      const isContentBlock = ['heading', 'paragraph', 'html', 'divider'].includes(fieldData.type);
      let className = fieldElement.className.replace(/\bquotemate-form-field--size-\S+/g, '').trim();
      className = className.replace(/\bquotemate-form-field--content-block\b/g, '').trim();
      if (isContentBlock) {
        className += ' quotemate-form-field--content-block';
      }
      fieldElement.className = `${className} ${sizeClass}`.trim();

      // Update style vars from Style tab
      const styleVars = this.getFieldStyleVars(fieldData);
      if (styleVars) {
        fieldElement.setAttribute('style', styleVars);
      } else {
        fieldElement.removeAttribute('style');
      }

      // Update label visibility and content
      const labelElement = fieldElement.querySelector(
        ".quotemate-form-field__label"
      );
      if (labelElement) {
        labelElement.style.display = fieldData.hideLabel ? 'none' : '';
        labelElement.innerHTML = `${fieldData.label} ${fieldData.required
            ? '<span class="quotemate-form-field__required">*</span>'
            : ""
          }`;
      }

      // Update input based on field type
      if (fieldData.type === "select" && fieldData.options) {
        const selectElement = fieldElement.querySelector("select");
        const defaultSelectVal = (fieldData.defaultValue || '').toLowerCase().replace(/\s+/g, '_');
        if (selectElement) {
          selectElement.innerHTML =
            `<option value="">Choose an option</option>` +
            fieldData.options
              .map((option) => {
                const optVal = option.toLowerCase().replace(/\s+/g, '_');
                return `<option value="${optVal}" ${optVal === defaultSelectVal ? 'selected' : ''}>${option}</option>`;
              })
              .join("");
        }
      } else if (fieldData.type === "service") {
        if (fieldData.enhancedServiceStructure && fieldData.enhancedServiceStructure.length > 0) {
          const cascadingHtml = this.getServiceCascadingDropdownsHtml(fieldId, fieldData);
          if (cascadingHtml) {
            const wrapper = fieldElement.querySelector(".quotemate-service-dropdowns");
            if (wrapper) {
              wrapper.outerHTML = cascadingHtml;
            } else {
              const inputWrapper = fieldElement.querySelector(".quotemate-form-field__label")?.nextElementSibling || fieldElement.querySelector("select");
              if (inputWrapper) {
                if (inputWrapper.matches("select")) {
                  inputWrapper.outerHTML = cascadingHtml;
                } else {
                  inputWrapper.innerHTML = cascadingHtml;
                }
              }
            }
          }
        } else {
          const selectElement = fieldElement.querySelector("select.quotemate-form-field__input");
          if (selectElement) {
            if (fieldData.serviceStructure && fieldData.serviceStructure.length > 0) {
              let optionsHtml = '<option value="">Select a service</option>';
              fieldData.serviceStructure.forEach(category => {
                if (category.children && category.children.length > 0) {
                  optionsHtml += `<optgroup label="${category.name || 'Services'}">`;
                  category.children.forEach(service => {
                    const pricingLabel = service.pricingType === 'fixed' ?
                      `$${service.basePrice || '0.00'}` :
                      `$${service.basePrice || '0.00'} ${service.pricingType.replace('_', ' ')}`;
                    optionsHtml += `<option value="${service.name}" data-price="${service.basePrice}">${service.name} (${pricingLabel})</option>`;
                  });
                  optionsHtml += '</optgroup>';
                }
              });
              selectElement.innerHTML = optionsHtml;
            } else if (fieldData.services && fieldData.services.length > 0) {
              selectElement.innerHTML =
                `<option value="">Select a service</option>` +
                fieldData.services
                  .map(
                    (service) =>
                      `<option value="${service.name
                        .toLowerCase()
                        .replace(/\s+/g, "_")}" data-price="${service.price}">${service.name
                      } ($${service.price})</option>`
                  )
                  .join("");
            } else {
              selectElement.innerHTML = '<option value="">No services configured yet. Use field settings to configure.</option>';
            }
          }
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
            const defaultVals = fieldData.type === "checkbox"
              ? (fieldData.defaultValue || '').split(',').map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean)
              : [(fieldData.defaultValue || '').toLowerCase().replace(/\s+/g, '_')];
            optionsContainer.innerHTML = fieldData.options
              .map((option) => {
                const optVal = option.toLowerCase().replace(/\s+/g, '_');
                const checked = defaultVals.includes(optVal) ? ' checked' : '';
                return `<label><input type="${inputType}" name="${inputName}" value="${optVal}"${checked}> ${option}</label>`;
              })
              .join("");
          } else {
            optionsContainer.innerHTML =
              '<p class="quotemate-form-field__empty">No options added yet. Configure in field settings.</p>';
          }
        }
      } else if (fieldData.type === 'heading') {
        const headingTag = resolveHeadingLevel(fieldData.heading_level);
        const alignClass = getHeadingAlignClass(fieldData.heading_align);
        const headingHtml = formatHeadingText(fieldData.label || 'Heading');
        const inputWrapper = fieldElement.querySelector('.field-input');
        if (inputWrapper) {
          inputWrapper.innerHTML = `<${headingTag} class="quotemate-form-field__heading quotemate-form-field__heading--${headingTag} ${alignClass}">${headingHtml}</${headingTag}>`;
        }
      } else if (fieldData.type === 'page_break') {
        const inputWrapper = fieldElement.querySelector('.field-input');
        if (inputWrapper) {
          inputWrapper.innerHTML = buildPageBreakPreviewHtml(fieldData, {
            showPrevious: this.canPageBreakShowPrevious(fieldId),
          });
        }
      } else if (fieldData.type === 'paragraph') {
        const inputWrapper = fieldElement.querySelector('.field-input');
        if (inputWrapper) {
          inputWrapper.innerHTML = `<div class="quotemate-form-field__paragraph">${this.escapeHtml(fieldData.paragraph_content || fieldData.label || 'Enter your paragraph text here.')}</div>`;
        }
      }

      // Update placeholder, defaultValue, readOnly, inputMask
        const inputElement = fieldElement.querySelector(
        'input[type="text"], input[type="email"], input[type="number"], textarea'
        );
        if (inputElement) {
        if (fieldData.placeholder !== undefined) inputElement.placeholder = fieldData.placeholder || '';
        if (fieldData.defaultValue !== undefined && inputElement.tagName !== 'TEXTAREA') inputElement.value = fieldData.defaultValue || '';
        if (fieldData.defaultValue !== undefined && inputElement.tagName === 'TEXTAREA') inputElement.value = fieldData.defaultValue || '';
        inputElement.readOnly = !!fieldData.readOnly;
        if (fieldData.inputMask) inputElement.dataset.inputMask = fieldData.inputMask;
      }
      // Update quantity min/max
      const numInput = fieldElement.querySelector('input[type="number"]');
      if (numInput && fieldData.type === 'quantity') {
        if (fieldData.minValue !== undefined && fieldData.minValue !== '') numInput.min = fieldData.minValue;
        if (fieldData.maxValue !== undefined && fieldData.maxValue !== '') numInput.max = fieldData.maxValue;
      }
      // Update file accept
      const fileInput = fieldElement.querySelector('input[type="file"]');
      if (fileInput && fieldData.type === 'file') {
        if (fieldData.acceptTypes) fileInput.accept = fieldData.acceptTypes;
        if (fieldData.maxFileSize) fileInput.dataset.maxSize = fieldData.maxFileSize;
      }
    }
  }

  editField(fieldId) {
    const fieldElement = document.querySelector(`[data-field-id="${fieldId}"]`);
    this.selectField(fieldElement);
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
    this.syncLayoutFromDOM();
    this.syncFieldsFromLayout();
    this.syncPageBreakFieldsAfterOrderChange();
    this.updateFormData();
    if (this.renderStructurePanel) this.renderStructurePanel();
  }

  showConfirmationDialog(message, onConfirm) {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'quotemate-modal confirmation-modal';
    modal.innerHTML = `
      <div class="quotemate-modal__content">
        <div class="quotemate-modal__header">
          <h3>Confirm Action</h3>
          <button class="quotemate-modal__close" aria-label="Close">&times;</button>
        </div>
        <div class="quotemate-modal__body">
          <p>${message}</p>
        </div>
        <div class="quotemate-modal__footer">
          <button class="quotemate-button quotemate-button--secondary cancel-button">Cancel</button>
          <button class="quotemate-button quotemate-button--primary confirm-button">Confirm</button>
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
      .quotemate-button--primary {
        background: #2563eb;
        color: white;
        border: none;
      }
      .quotemate-button--primary:hover {
        background: #1d4ed8;
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
    return new Promise((resolve) => {
      const closeModal = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
      };

      modal.querySelector('.quotemate-modal__close').addEventListener('click', () => {
        closeModal();
        resolve(false);
      });

      modal.querySelector('.cancel-button').addEventListener('click', () => {
        closeModal();
        resolve(false);
      });

      modal.querySelector('.confirm-button').addEventListener('click', () => {
        closeModal();
        resolve(true);
      });

      // Close on background click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
          resolve(false);
        }
      });
    });
  }

  async deleteField(fieldId) {
    const confirmed = await this.showConfirmationDialog("Are you sure you want to delete this field?");

    if (confirmed) {
      const fieldElement = document.querySelector(
        `[data-field-id="${fieldId}"]`
      );
      const columnEl = fieldElement?.closest('.quotemate-form-builder__column');

      if (fieldElement) {
        fieldElement.remove();
      }

      if (columnEl) {
        this.ensureColumnPlaceholder(columnEl);
      }

      this.formData.fields = this.formData.fields.filter(
        (f) => f.id !== fieldId
      );

      this.syncLayoutFromDOM();
      this.syncFieldsFromLayout();
      this.syncPageBreakFieldsAfterOrderChange();
      this.updateFormData();
      if (this.renderStructurePanel) this.renderStructurePanel();

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

  /**
   * Only sync property inputs that belong to the currently visible settings panels.
   * Hidden General/Advance/Style sub-tabs duplicate the same data-property keys and would
   * otherwise overwrite saved values (e.g. page break Previous button margin).
   */
  isPanelPropertyInputVisible(input) {
    if (!input) return false;
    const hiddenSubTab = input.closest('.quotemate-form-builder__sub-tab-content:not(.active)');
    if (hiddenSubTab) return false;
    const hiddenStylePanel = input.closest('.quotemate-style-sub-panel:not(.active)');
    if (hiddenStylePanel) return false;
    return true;
  }

  /**
   * Sync field properties from the properties panel (General, Advance, Style) into formData.
   * Ensures Advance and Style tab values are saved even if change/input events did not fire.
   */
  syncPropertiesFromPanel() {
    const panel = document.getElementById("field-settings-content");
    if (!panel) return;

    // Sync [data-property] inputs (General, Advance, Style)
    panel.querySelectorAll("[data-property][data-field-id]").forEach((input) => {
      if (!this.isPanelPropertyInputVisible(input)) return;
      const fieldId = input.dataset.fieldId;
      const property = input.dataset.property;
      if (!fieldId || !property) return;

      const fieldData = this.formData.fields.find((f) => f.id === fieldId);
      if (!fieldData) return;

      let value;
      if (input.type === "checkbox") {
        value = input.checked;
      } else {
        value = input.value;
      }

      // Coerce layout/radius linked state to boolean
      if (property === 'styleMarginLinked' || property === 'stylePaddingLinked' || property === 'styleBorderRadiusLinked' || property === 'stylePrevMarginLinked' || property === 'stylePrevPaddingLinked') {
        value = value === 'true' || value === true;
      }

      // Handle nested properties (e.g. conditionalLogic.enabled)
      if (property.includes(".")) {
        const parts = property.split(".");
        let target = fieldData;
        for (let i = 0; i < parts.length - 1; i++) {
          const key = parts[i];
          if (!target[key] || typeof target[key] !== "object") {
            target[key] = {};
          }
          target = target[key];
        }
        target[parts[parts.length - 1]] = value;
      } else {
        fieldData[property] = value;
      }
    });

    // Sync choices from [data-choice-index] inputs
    panel.querySelectorAll(".quotemate-form-properties__choice [data-choice-index]").forEach((input) => {
      if (!this.isPanelPropertyInputVisible(input)) return;
      const fieldId = input.dataset.fieldId;
      const index = parseInt(input.dataset.choiceIndex, 10);
      if (!fieldId || isNaN(index)) return;

      const fieldData = this.formData.fields.find((f) => f.id === fieldId);
      if (!fieldData || !fieldData.options) return;

      if (index >= 0 && index < fieldData.options.length) {
        const oldLabel = fieldData.options[index];
        const newLabel = input.value;
        fieldData.options[index] = newLabel;
        if (fieldData.optionPrices && oldLabel !== newLabel) {
          if (Object.prototype.hasOwnProperty.call(fieldData.optionPrices, oldLabel)) {
            fieldData.optionPrices[newLabel] = fieldData.optionPrices[oldLabel];
            delete fieldData.optionPrices[oldLabel];
          }
        }
      }
    });

    // Sync option prices for standard choice fields
    panel.querySelectorAll(".quotemate-form-properties__choice--priced").forEach((row) => {
      const labelInput = row.querySelector("[data-choice-index]");
      if (!this.isPanelPropertyInputVisible(labelInput)) return;
      const priceInput = row.querySelector("[data-choice-price]");
      if (!labelInput || !priceInput) return;

      const fieldId = labelInput.dataset.fieldId;
      const fieldData = this.formData.fields.find((f) => f.id === fieldId);
      if (!fieldData || !fieldData.addPrice) return;

      if (!fieldData.optionPrices) {
        fieldData.optionPrices = {};
      }
      const label = labelInput.value;
      if (label) {
        fieldData.optionPrices[label] = parseFloat(priceInput.value) || 0;
      }
    });

    // Sync service options from [data-service-name] and [data-service-price]
    panel.querySelectorAll(".quotemate-form-properties__service-option").forEach((row) => {
      const nameInput = row.querySelector("[data-service-name]");
      const priceInput = row.querySelector("[data-service-price]");
      if (!nameInput || !priceInput) return;

      const fieldId = nameInput.dataset.fieldId;
      const index = parseInt(nameInput.dataset.serviceName, 10);
      if (!fieldId || isNaN(index)) return;

      const fieldData = this.formData.fields.find((f) => f.id === fieldId);
      if (!fieldData || !fieldData.services) return;

      if (index >= 0 && index < fieldData.services.length) {
        fieldData.services[index] = {
          name: nameInput.value,
          price: parseFloat(priceInput.value) || 0
        };
      }
    });
  }

  updateFormData() {
    this.syncPropertiesFromPanel();
    const formNameInput = document.getElementById("form-name");
    this.formData.name = formNameInput.value || "Untitled Form";
    if (document.querySelector('#form-drop-zone .quotemate-form-builder__row')) {
      this.syncLayoutFromDOM();
      this.syncFieldsFromLayout();
    }
    const formDataElement = document.getElementById("form-data");
    if (formDataElement) {
      formDataElement.value = JSON.stringify(this.formData);
    }
  }

  // Conditional Logic Methods
  updateConditionalLogicProperty(fieldId, property, value) {
    const fieldData = this.formData.fields.find(f => f.id === fieldId);
    if (!fieldData) {

      return;
    }

    if (!fieldData.conditionalLogic) {
      fieldData.conditionalLogic = {
        enabled: false,
        logicType: 'show',
        operator: 'all',
        conditions: []
      };
    }

    fieldData.conditionalLogic[property] = value;

    this.updateFormData();
  }

  evaluateConditionalLogic() {
    // In the admin form builder, we should NOT hide fields based on conditional logic
    // Conditional logic should only be evaluated on the frontend for actual form users
    // All fields should remain visible in the builder for configuration purposes

    return;

    // This method evaluates all conditional logic rules and shows/hides fields accordingly
    this.formData.fields.forEach(field => {
      if (field.conditionalLogic && field.conditionalLogic.enabled) {
        const shouldShow = this.evaluateFieldConditions(field);
        const shouldDisplay = field.conditionalLogic.logicType === 'show' ? shouldShow : !shouldShow;

        // Update field visibility in the form builder
        const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
        if (fieldElement) {
          fieldElement.style.display = shouldDisplay ? 'block' : 'none';
          fieldElement.setAttribute('data-conditional-hidden', shouldDisplay ? 'false' : 'true');
        }
      } else {
        // Show field if no conditional logic is set
        const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
        if (fieldElement) {
          fieldElement.style.display = 'block';
          fieldElement.setAttribute('data-conditional-hidden', 'false');
        }
      }
    });
  }

  evaluateFieldConditions(field) {
    if (!field.conditionalLogic || !field.conditionalLogic.conditions || field.conditionalLogic.conditions.length === 0) {
      return true;
    }

    const conditions = field.conditionalLogic.conditions;
    const operator = field.conditionalLogic.operator; // 'all' (AND) or 'any' (OR)

    const results = conditions.map(condition => this.evaluateCondition(condition));

    if (operator === 'all') {
      // AND logic - all conditions must be true
      return results.every(result => result === true);
    } else {
      // OR logic - at least one condition must be true
      return results.some(result => result === true);
    }
  }

  evaluateCondition(condition) {
    if (!condition.field || !condition.operator) {
      return false;
    }

    const sourceFieldData = this.formData.fields.find(f => f.id === condition.field);
    if (!sourceFieldData) {
      return false;
    }

    // Get the current value of the source field from the form builder
    const sourceFieldElement = document.querySelector(`[data-field-id="${condition.field}"]`);
    if (!sourceFieldElement) {
      return false;
    }

    let currentValue = this.getFieldCurrentValue(sourceFieldElement, sourceFieldData);
    const conditionValue = condition.value;

    // Evaluate based on operator
    switch (condition.operator) {
      case 'is':
        return currentValue === conditionValue;
      case 'is_not':
        return currentValue !== conditionValue;
      case 'greater_than':
        return parseFloat(currentValue) > parseFloat(conditionValue);
      case 'less_than':
        return parseFloat(currentValue) < parseFloat(conditionValue);
      case 'contains':
        return currentValue.toLowerCase().includes(conditionValue.toLowerCase());
      case 'starts_with':
        return currentValue.toLowerCase().startsWith(conditionValue.toLowerCase());
      case 'ends_with':
        return currentValue.toLowerCase().endsWith(conditionValue.toLowerCase());
      case 'is_empty':
        return !currentValue || currentValue.trim() === '';
      case 'is_not_empty':
        return currentValue && currentValue.trim() !== '';
      default:
        return false;
    }
  }

  getFieldCurrentValue(fieldElement, fieldData) {
    const fieldType = fieldData.type;

    switch (fieldType) {
      case 'text':
      case 'email':
      case 'textarea':
      case 'number':
      case 'quantity':
        const input = fieldElement.querySelector('input, textarea');
        return input ? input.value : '';

      case 'select':
        const select = fieldElement.querySelector('select');
        return select ? select.value : '';

      case 'radio':
        const checkedRadio = fieldElement.querySelector('input[type="radio"]:checked');
        return checkedRadio ? checkedRadio.value : '';

      case 'checkbox':
        const checkedCheckboxes = fieldElement.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkedCheckboxes).map(cb => cb.value).join(',');

      default:
        return '';
    }
  }

  // Add method to initialize conditional logic for existing fields
  initializeConditionalLogic() {
    // Ensure fields is always an array
    if (!Array.isArray(this.formData.fields)) {

      this.formData.fields = [];
    }

    // Attach change listeners to all form fields for real-time evaluation
    this.formData.fields.forEach(field => {
      const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
      if (fieldElement) {
        this.attachConditionalLogicListeners(fieldElement, field);
      }
    });

    // Initial evaluation
    this.evaluateConditionalLogic();
  }

  attachConditionalLogicListeners(fieldElement, fieldData) {
    const inputs = fieldElement.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const eventType = input.type === 'checkbox' || input.type === 'radio' ? 'change' : 'input';

      input.addEventListener(eventType, () => {
        // Re-evaluate all conditional logic when any field changes
        this.evaluateConditionalLogic();
      });
    });
  }

  // Add method to initialize conditional logic specifically for existing fields
  initializeConditionalLogicForExistingFields() {
    // Ensure fields is always an array
    if (!Array.isArray(this.formData.fields)) {

      this.formData.fields = [];
    }

    this.formData.fields.forEach(field => {
      const fieldElement = document.querySelector(`[data-field-id="${field.id}"]`);
      if (fieldElement && field.conditionalLogic) {
        this.attachConditionalLogicListeners(fieldElement, field);
      }
    });
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

  getBuilderScrollContainer() {
    if (!this._builderScrollContainer || !document.contains(this._builderScrollContainer)) {
      this._builderScrollContainer =
        document.querySelector('#quotemate-builder .quotemate-panels-content')
        || document.querySelector('.quotemate-panels-content');
    }
    return this._builderScrollContainer;
  }

  /** Shared Sortable auto-scroll for the builder canvas (gradual edge speed). */
  getSortableAutoScrollOptions() {
    const formBuilder = this;
    const scrollEl = this.getBuilderScrollContainer();
    return {
      scroll: scrollEl || true,
      bubbleScroll: true,
      forceAutoScrollFallback: true,
      scrollSensitivity: 72,
      scrollSpeed: 12,
      scrollFn(offsetX, offsetY, originalEvent, _touchEvt, scrollElement) {
        const container = scrollElement || formBuilder.getBuilderScrollContainer();
        if (!container || !originalEvent) {
          return 'continue';
        }

        const rect = container.getBoundingClientRect();
        const edge = 72;
        const maxStep = 20;
        const y = originalEvent.clientY;
        const x = originalEvent.clientX;
        let scrolled = false;

        if (y < rect.top + edge) {
          const intensity = Math.min(1, Math.max(0, (rect.top + edge - y) / edge));
          container.scrollTop -= Math.max(1, Math.round(intensity * maxStep));
          scrolled = true;
        } else if (y > rect.bottom - edge) {
          const intensity = Math.min(1, Math.max(0, (y - (rect.bottom - edge)) / edge));
          container.scrollTop += Math.max(1, Math.round(intensity * maxStep));
          scrolled = true;
        }

        if (container.scrollWidth > container.clientWidth) {
          if (x < rect.left + edge) {
            const intensity = Math.min(1, Math.max(0, (rect.left + edge - x) / edge));
            container.scrollLeft -= Math.max(1, Math.round(intensity * maxStep));
            scrolled = true;
          } else if (x > rect.right - edge) {
            const intensity = Math.min(1, Math.max(0, (x - (rect.right - edge)) / edge));
            container.scrollLeft += Math.max(1, Math.round(intensity * maxStep));
            scrolled = true;
          }
        }

        return scrolled ? undefined : 'continue';
      },
    };
  }

  initSortableFields() {
    const dropZone = document.getElementById('form-drop-zone');
    if (!dropZone) return;
    if (this.sortableInstances) {
      this.sortableInstances.forEach(s => s.destroy());
    }
    this.sortableInstances = [];

    dropZone.querySelectorAll('.quotemate-form-builder__column').forEach(colEl => {
      const s = Sortable.create(colEl, {
        ...this.getSortableAutoScrollOptions(),
        animation: 150,
        handle: '.quotemate-form-field__drag-handle',
        draggable: '.quotemate-form-field',
        ghostClass: 'quotemate-form-field--dragging',
        group: { name: 'form-fields', put: true },
        direction: 'vertical',
        invertSwap: true,
        swapThreshold: 0.5,
        filter: '.quotemate-form-builder__column-placeholder',
        placeholderClass: 'quotemate-form-field__sortable-placeholder',
        onMove: (evt) => {
          const isPaletteItem = evt.dragged.classList.contains('quotemate-form-builder__field-item');
          const isExistingField = evt.dragged.classList.contains('quotemate-form-field');
          if (!isPaletteItem && !isExistingField) {
            return false;
          }
          return evt.to.classList.contains('quotemate-form-builder__column');
        },
        onAdd: (evt) => {
          const rowIndex = parseInt(evt.to?.dataset?.rowIndex ?? '0', 10);
          const columnIndex = parseInt(evt.to?.dataset?.columnIndex ?? '0', 10);
          // New field dragged from palette
          if (evt.item.classList.contains('quotemate-form-builder__field-item')) {
            const fieldType = evt.item.getAttribute('data-field-type');
            const dropIndex = this.getPaletteDropIndexInColumn(evt.to, evt.item);
            evt.item.remove();
            this.addFieldToColumn(fieldType, rowIndex, columnIndex, dropIndex);
            const newFieldId = 'field_' + this.fieldCounter;
            const fieldData = (this.formData.fields || []).find(f => f.id === newFieldId);
            if (fieldData && evt.to && evt.to.classList.contains('quotemate-form-builder__column')) {
              this.appendFieldToColumnElement(evt.to, fieldData, dropIndex);
            } else {
              this.renderCanvas();
              this.updateFormData();
            }
            if (this.renderStructurePanel) this.renderStructurePanel();
          } else if (evt.item.classList.contains('quotemate-form-field')) {
            if (evt.to?.classList.contains('quotemate-form-builder__column')) {
              this.ensureColumnPlaceholder(evt.to);
            }
            if (evt.from?.classList.contains('quotemate-form-builder__column')) {
              this.ensureColumnPlaceholder(evt.from);
            }
          }
        },
        onEnd: () => {
          this.syncLayoutFromDOM();
          this.syncFieldsFromLayout();
          this.syncPageBreakFieldsAfterOrderChange();
          this.updateFormData();
          if (this.renderStructurePanel) this.renderStructurePanel();
        }
      });
      this.sortableInstances.push(s);
    });

    document.querySelectorAll('.quotemate-form-builder__field-list').forEach(list => {
      if (list._sortablePaletteInstance) list._sortablePaletteInstance.destroy();
      list._sortablePaletteInstance = Sortable.create(list, {
        ...this.getSortableAutoScrollOptions(),
        group: { name: 'form-fields', pull: 'clone', put: false },
        sort: false,
        animation: 150,
        draggable: '.quotemate-form-builder__field-item',
      });
    });

    this.initSortableRows();
  }

  initSortableRows() {
    const dropZone = document.getElementById('form-drop-zone');
    const rowsList = dropZone?.querySelector('.quotemate-form-builder__rows-list');
    if (!rowsList) return;
    if (this.rowSortableInstance) {
      this.rowSortableInstance.destroy();
      this.rowSortableInstance = null;
    }
    const sections = this.getTopLevelRowSections();
    if (sections.length < 2) return;

    this.rowSortableInstance = Sortable.create(rowsList, {
      ...this.getSortableAutoScrollOptions(),
      animation: 150,
      handle: '.quotemate-form-builder__section-drag-handle',
      draggable: '.quotemate-form-builder__section',
      ghostClass: 'quotemate-form-builder__section--dragging',
      direction: 'vertical',
      swapThreshold: 0.65,
      invertSwap: false,
      onMove: (evt) => {
        if (evt.to !== rowsList) return false;
        if (evt.related && !evt.related.classList.contains('quotemate-form-builder__section')) {
          return false;
        }
        return true;
      },
      onStart: () => {
        rowsList.classList.add('quotemate-form-builder__rows-list--sorting');
      },
      onEnd: () => {
        rowsList.classList.remove('quotemate-form-builder__rows-list--sorting');
        this.repairNestedRows();
        this.syncRowsOrderFromDOM();
        this.updateRowIndicesInDOM();
        this.updateRowLabelsInCanvas();
        this.syncFieldsFromLayout();
        this.updateFormData();
        if (this.renderStructurePanel) this.renderStructurePanel();
      },
    });
  }

  /** Add field to a specific row/column (Elementor-style) */
  addFieldToColumn(fieldType, rowIndex, columnIndex, indexInColumn) {
    this.fieldCounter++;
    const fieldId = `field_${this.fieldCounter}`;
    const fieldData = {
      id: fieldId,
      type: fieldType,
      label: this.getFieldLabel(fieldType),
      required: false,
      fieldSize: 'medium',
    };
    switch (fieldType) {
      case "service_options": fieldData.options = []; break;
      case "service": fieldData.services = []; break;
      case "project_type": fieldData.options = []; break;
      case "budget": fieldData.ranges = []; break;
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
    if (!Array.isArray(this.formData.fields)) this.formData.fields = [];
    this.formData.fields.push(fieldData);
    this.ensureLayout();
    const row = this.formData.layout.rows[rowIndex];
    const col = row && row.columns[columnIndex];
    if (col) {
      col.fieldIds = col.fieldIds || [];
      const safeIndex = indexInColumn == null
        ? col.fieldIds.length
        : Math.min(Math.max(0, indexInColumn), col.fieldIds.length);
      col.fieldIds.splice(safeIndex, 0, fieldId);
    }
  }

  /** Legacy: add field at flat index (e.g. when no layout); maps to first column */
  addFieldAt(fieldType, index) {
    this.ensureLayout();
    const rowIndex = 0;
    const col = this.formData.layout.rows[rowIndex].columns[0];
    const indexInColumn = Math.min(index, col.fieldIds.length);
    this.addFieldToColumn(fieldType, rowIndex, 0, indexInColumn);
    this.renderCanvas();
    this.initSortableFields();
    this.updateFormData();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  formBuilder = new QuotemateFormBuilder();
  formBuilder.init();
  window.formBuilder = formBuilder;
});

// Add drag handle and drag state CSS
if (!document.getElementById('quotemate-form-builder-drag-css')) {
  const style = document.createElement('style');
  style.id = 'quotemate-form-builder-drag-css';
  style.innerHTML = `
    .quotemate-form-field__drag-handle {
      cursor: grab;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      min-width: 24px;
      min-height: 24px;
      font-size: 18px;
      color: #888;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .quotemate-form-field--dragging {
      background: #f0f4ff !important;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}