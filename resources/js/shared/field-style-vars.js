/**
 * Build inline style / CSS custom properties for a field object.
 * Mirrors FormHelper::get_field_style_attr() and the builder canvas preview.
 */

function parseHexColor(hex) {
  const raw = String(hex ?? '').trim().replace(/^#/, '');
  if (!raw) return null;
  if (raw.length === 3) {
    return {
      r: parseInt(raw[0] + raw[0], 16),
      g: parseInt(raw[1] + raw[1], 16),
      b: parseInt(raw[2] + raw[2], 16),
    };
  }
  if (raw.length >= 6) {
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }
  return null;
}

function hexToRgba(hex, alpha) {
  const rgb = parseHexColor(hex);
  if (!rgb) return String(hex ?? '').trim();
  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function appendBorderRadiusVars(v, fieldData, prefix) {
  const radiusUnit = fieldData?.[`${prefix}Unit`] || 'px';
  const uRadius = (val) =>
    val !== undefined && val !== '' && val != null
      ? `${String(val).replace(/[^\d.-]/g, '') || 0}${radiusUnit}`
      : '';
  const legacy = fieldData?.styleBorderRadius;
  const rtl = uRadius(fieldData?.[`${prefix}TopLeft`] ?? legacy) || '0';
  const rtr = uRadius(fieldData?.[`${prefix}TopRight`] ?? legacy) || '0';
  const rbr = uRadius(fieldData?.[`${prefix}BottomRight`] ?? legacy) || '0';
  const rbl = uRadius(fieldData?.[`${prefix}BottomLeft`] ?? legacy) || '0';
  const anyRadiusSet = [
    fieldData?.[`${prefix}TopLeft`],
    fieldData?.[`${prefix}TopRight`],
    fieldData?.[`${prefix}BottomRight`],
    fieldData?.[`${prefix}BottomLeft`],
    prefix === 'styleBorderRadius' ? legacy : null,
  ].some((value) => value !== undefined && value !== '' && value != null);

  if (!anyRadiusSet) return;

  const cssPrefix = prefix === 'styleFieldBorderRadius' ? '--qm-field-border-radius' : '--qm-border-radius';
  v.push(
    `${cssPrefix}-tl:${rtl}`,
    `${cssPrefix}-tr:${rtr}`,
    `${cssPrefix}-br:${rbr}`,
    `${cssPrefix}-bl:${rbl}`
  );
}

export function getFieldStyleVars(fieldData = {}) {
  const v = [];
  const u = (val, unit) =>
    val !== undefined && val !== '' && val != null
      ? `${String(val).replace(/[^\d.-]/g, '') || 0}${unit || 'px'}`
      : '';
  const skipWrapperSpacing = fieldData?.type === 'form_summary';
  const marginUnit = fieldData?.styleMarginUnit || 'px';
  const paddingUnit = fieldData?.stylePaddingUnit || 'px';

  if (!skipWrapperSpacing) {
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
  }

  if (fieldData?.styleFieldBg) {
    const opacityRaw = fieldData?.styleFieldBgOpacity;
    const hasOpacity = opacityRaw !== undefined && opacityRaw !== '' && opacityRaw != null;
    if (hasOpacity) {
      const opacity = parseFloat(String(opacityRaw).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(opacity)) {
        v.push(`--qm-field-bg:${hexToRgba(fieldData.styleFieldBg, opacity / 100)}`);
      } else {
        v.push(`--qm-field-bg:${fieldData.styleFieldBg}`);
      }
    } else {
      v.push(`--qm-field-bg:${fieldData.styleFieldBg}`);
    }
  }
  if (fieldData?.styleFieldBorderWidth) v.push(`--qm-field-border-width:${fieldData.styleFieldBorderWidth}`);
  if (fieldData?.styleFieldBorderColor) v.push(`--qm-field-border-color:${fieldData.styleFieldBorderColor}`);
  appendBorderRadiusVars(v, fieldData, 'styleFieldBorderRadius');
  if (fieldData?.styleFieldShadow) v.push(`--qm-field-shadow:${fieldData.styleFieldShadow}`);
  if (fieldData?.styleFieldGap) v.push(`--qm-field-gap:${fieldData.styleFieldGap}`);
  if (fieldData?.styleDescriptionColor) v.push(`--qm-description-color:${fieldData.styleDescriptionColor}`);
  if (fieldData?.stylePlaceholderColor) v.push(`--qm-placeholder-color:${fieldData.stylePlaceholderColor}`);

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
  appendBorderRadiusVars(v, fieldData, 'styleBorderRadius');
  if (fieldData?.stylePadding) v.push(`--qm-input-padding:${fieldData.stylePadding}`);
  return v.length ? v.join(';') : '';
}
