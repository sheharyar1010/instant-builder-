/**
 * Build inline style / CSS custom properties for a field object.
 * Mirrors FormHelper::get_field_style_attr() and the builder canvas preview.
 */
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
  const uRadius = (val) =>
    val !== undefined && val !== '' && val != null
      ? `${String(val).replace(/[^\d.-]/g, '') || 0}${radiusUnit}`
      : '';
  const legacy = fieldData?.styleBorderRadius;
  const rtl = uRadius(fieldData?.styleBorderRadiusTopLeft ?? legacy) || '0';
  const rtr = uRadius(fieldData?.styleBorderRadiusTopRight ?? legacy) || '0';
  const rbr = uRadius(fieldData?.styleBorderRadiusBottomRight ?? legacy) || '0';
  const rbl = uRadius(fieldData?.styleBorderRadiusBottomLeft ?? legacy) || '0';
  const anyRadiusSet = [
    fieldData?.styleBorderRadiusTopLeft,
    fieldData?.styleBorderRadiusTopRight,
    fieldData?.styleBorderRadiusBottomRight,
    fieldData?.styleBorderRadiusBottomLeft,
    legacy,
  ].some((value) => value !== undefined && value !== '' && value != null);

  if (anyRadiusSet) {
    v.push(
      `--qm-border-radius-tl:${rtl}`,
      `--qm-border-radius-tr:${rtr}`,
      `--qm-border-radius-br:${rbr}`,
      `--qm-border-radius-bl:${rbl}`
    );
  }

  if (fieldData?.stylePadding) v.push(`--qm-input-padding:${fieldData.stylePadding}`);
  return v.length ? v.join(';') : '';
}
