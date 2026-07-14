const VIRTUAL_PREFIX = '__svc_pb_';
export const PARENT_PAGE_CONTENT_PATH = '__parent__';

export function isParentPageContentPath(servicePath) {
  return String(servicePath || '') === PARENT_PAGE_CONTENT_PATH;
}

export function buildVirtualPageContentFieldId(servicePath, contentKey) {
  const key = contentKey === 'heading' ? 'heading' : 'desc';
  return `${VIRTUAL_PREFIX}${key}__${servicePath}`;
}

export function parseVirtualPageContentFieldId(fieldId) {
  const match = String(fieldId || '').match(/^__svc_pb_(heading|desc)__(.+)$/);
  if (!match) return null;
  return {
    contentKey: match[1] === 'heading' ? 'heading' : 'description',
    servicePath: match[2],
  };
}

export function isVirtualPageContentFieldId(fieldId) {
  return String(fieldId || '').startsWith(VIRTUAL_PREFIX);
}

export function createDefaultPageBreakHeadingField(text = '') {
  return {
    type: 'heading',
    id: 'page_break_heading',
    label: text,
    heading_level: 'h2',
    heading_align: 'center',
    required: false,
  };
}

export function createDefaultPageBreakDescriptionField(text = '') {
  return {
    type: 'paragraph',
    id: 'page_break_description',
    paragraph_content: text,
    heading_align: 'center',
    required: false,
  };
}

export function syncLegacyPageBreakStrings(node) {
  if (!node) return;
  if (node.pageBreakHeadingField) {
    node.pageBreakHeading = String(node.pageBreakHeadingField.label || '').trim();
  }
  if (node.pageBreakDescriptionField) {
    node.pageBreakDescription = String(node.pageBreakDescriptionField.paragraph_content || '').trim();
  }
}

export function ensureNodePageBreakFields(node) {
  if (!node) return node;

  if (!node.pageBreakHeadingField || typeof node.pageBreakHeadingField !== 'object') {
    node.pageBreakHeadingField = createDefaultPageBreakHeadingField(node.pageBreakHeading || '');
  } else {
    node.pageBreakHeadingField.type = 'heading';
    if (!node.pageBreakHeadingField.id) node.pageBreakHeadingField.id = 'page_break_heading';
    if (!node.pageBreakHeadingField.heading_level) node.pageBreakHeadingField.heading_level = 'h2';
    if (!node.pageBreakHeadingField.heading_align) node.pageBreakHeadingField.heading_align = 'center';
    if (node.pageBreakHeadingField.label == null && node.pageBreakHeading) {
      node.pageBreakHeadingField.label = node.pageBreakHeading;
    }
  }

  if (!node.pageBreakDescriptionField || typeof node.pageBreakDescriptionField !== 'object') {
    node.pageBreakDescriptionField = createDefaultPageBreakDescriptionField(node.pageBreakDescription || '');
  } else {
    node.pageBreakDescriptionField.type = 'paragraph';
    if (!node.pageBreakDescriptionField.id) node.pageBreakDescriptionField.id = 'page_break_description';
    if (!node.pageBreakDescriptionField.heading_align) node.pageBreakDescriptionField.heading_align = 'center';
    if (node.pageBreakDescriptionField.paragraph_content == null && node.pageBreakDescription) {
      node.pageBreakDescriptionField.paragraph_content = node.pageBreakDescription;
    }
  }

  syncLegacyPageBreakStrings(node);
  return node;
}

export function clearNodePageBreakContentFields(node) {
  if (!node) return;
  delete node.pageBreakHeadingField;
  delete node.pageBreakDescriptionField;
  node.pageBreakHeading = '';
  node.pageBreakDescription = '';
}

export function resolvePageBreakHeadingField(node) {
  if (!node) return null;
  if (node.pageBreakHeadingField) return ensureNodePageBreakFields(node).pageBreakHeadingField;
  const text = String(node.pageBreakHeading || '').trim();
  if (!text) return null;
  return createDefaultPageBreakHeadingField(text);
}

export function resolvePageBreakDescriptionField(node) {
  if (!node) return null;
  if (node.pageBreakDescriptionField) return ensureNodePageBreakFields(node).pageBreakDescriptionField;
  const text = String(node.pageBreakDescription || '').trim();
  if (!text) return null;
  return createDefaultPageBreakDescriptionField(text);
}

export function walkEnhancedStructure(nodes, callback) {
  if (!Array.isArray(nodes)) return;
  nodes.forEach((node) => {
    if (!node) return;
    callback(node);
    if (Array.isArray(node.children) && node.children.length) {
      walkEnhancedStructure(node.children, callback);
    }
  });
}

export function normalizeEnhancedStructurePageBreakFields(structure) {
  walkEnhancedStructure(structure, (node) => {
    if (node.pageBreakBeforeOptions) {
      ensureNodePageBreakFields(node);
    }
  });
}
