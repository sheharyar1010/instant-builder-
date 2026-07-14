(function (global) {
  const HEADING_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const HEADING_ALIGNMENTS = ['left', 'center', 'right'];

  function resolveHeadingLevel(level) {
    return HEADING_LEVELS.includes(level) ? level : 'h2';
  }

  function resolveHeadingAlign(align) {
    const value = String(align || 'center').toLowerCase();
    return HEADING_ALIGNMENTS.includes(value) ? value : 'center';
  }

  function getHeadingAlignClass(align) {
    const resolved = resolveHeadingAlign(align);
    return `quotemate-form-heading--align-${resolved} quotemate-form-field__heading--align-${resolved}`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sanitizeHeadingColor(color) {
    if (!color) return null;
    const value = String(color).trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return value;
    if (/^rgba?\(\s*[\d.%\s,]+\)$/i.test(value)) return value;
    if (/^hsla?\(\s*[\d.%deg,\s]+\)$/i.test(value)) return value;
    if (/^[a-zA-Z]{3,20}$/.test(value)) return value.toLowerCase();
    return null;
  }

  function formatHeadingText(text) {
    if (text == null || text === '') return '';

    const src = String(text);
    let out = '';
    let i = 0;
    const len = src.length;

    while (i < len) {
      const rest = src.slice(i);
      const brMatch = rest.match(/^\[br\]/i);
      if (brMatch) {
        out += '<br>';
        i += brMatch[0].length;
        continue;
      }

      const colorOpen = rest.match(/^\[color=([^\]]+)\]/i);
      if (colorOpen) {
        const closeTag = '[/color]';
        const innerStart = i + colorOpen[0].length;
        const closePos = src.toLowerCase().indexOf(closeTag.toLowerCase(), innerStart);
        if (closePos !== -1) {
          const inner = src.slice(innerStart, closePos);
          const color = sanitizeHeadingColor(colorOpen[1]);
          if (color) {
            out += `<span class="quotemate-form-heading__accent" style="color:${escapeHtml(color)}">`;
            out += formatHeadingText(inner);
            out += '</span>';
          } else {
            out += escapeHtml(src.slice(i, closePos + closeTag.length));
          }
          i = closePos + closeTag.length;
          continue;
        }
      }

      let next = i;
      while (next < len) {
        const ch = src[next];
        if (ch === '[' || ch === '\n' || ch === '\r') break;
        next++;
      }

      if (next > i) {
        out += escapeHtml(src.slice(i, next));
        i = next;
        continue;
      }

      if (src[i] === '\r' && src[i + 1] === '\n') {
        out += '<br>';
        i += 2;
      } else if (src[i] === '\n' || src[i] === '\r') {
        out += '<br>';
        i += 1;
      } else {
        out += escapeHtml(src[i]);
        i += 1;
      }
    }

    return out;
  }

  function getFieldStyleVars(fieldData) {
    fieldData = fieldData || {};
    const v = [];
    const u = (val, unit) =>
      val !== undefined && val !== '' && val != null
        ? `${String(val).replace(/[^\d.-]/g, '') || 0}${unit || 'px'}`
        : '';
    const marginUnit = fieldData.styleMarginUnit || 'px';
    const paddingUnit = fieldData.stylePaddingUnit || 'px';

    const mt = u(fieldData.styleMarginTop, marginUnit);
    const mr = u(fieldData.styleMarginRight, marginUnit);
    const mb = u(fieldData.styleMarginBottom, marginUnit);
    const ml = u(fieldData.styleMarginLeft, marginUnit);
    if (mt) v.push(`margin-top:${mt}`);
    if (mr) v.push(`margin-right:${mr}`);
    if (mb) v.push(`margin-bottom:${mb}`);
    if (ml) v.push(`margin-left:${ml}`);
    const pt = u(fieldData.stylePaddingTop, paddingUnit);
    const pr = u(fieldData.stylePaddingRight, paddingUnit);
    const pb = u(fieldData.stylePaddingBottom, paddingUnit);
    const pl = u(fieldData.stylePaddingLeft, paddingUnit);
    if (pt) v.push(`padding-top:${pt}`);
    if (pr) v.push(`padding-right:${pr}`);
    if (pb) v.push(`padding-bottom:${pb}`);
    if (pl) v.push(`padding-left:${pl}`);

    if (fieldData.styleLabelColor) v.push(`--qm-label-color:${fieldData.styleLabelColor}`);
    const labelSize = fieldData.styleFontSize || fieldData.styleLabelSize;
    if (labelSize) v.push(`--qm-label-size:${labelSize}`);
    if (fieldData.styleFontFamily) v.push(`--qm-label-font-family:${fieldData.styleFontFamily}`);
    if (fieldData.styleFontWeight) v.push(`--qm-label-font-weight:${fieldData.styleFontWeight}`);
    if (fieldData.styleTextTransform) v.push(`--qm-label-text-transform:${fieldData.styleTextTransform}`);
    if (fieldData.styleFontStyle) v.push(`--qm-label-font-style:${fieldData.styleFontStyle}`);
    if (fieldData.styleTextDecoration) v.push(`--qm-label-text-decoration:${fieldData.styleTextDecoration}`);
    if (fieldData.styleLineHeight) v.push(`--qm-label-line-height:${fieldData.styleLineHeight}`);
    if (fieldData.styleLetterSpacing) v.push(`--qm-label-letter-spacing:${fieldData.styleLetterSpacing}`);
    if (fieldData.styleWordSpacing) v.push(`--qm-label-word-spacing:${fieldData.styleWordSpacing}`);
    if (fieldData.styleInputColor) v.push(`--qm-input-color:${fieldData.styleInputColor}`);
    if (fieldData.styleInputFontFamily) v.push(`--qm-input-font-family:${fieldData.styleInputFontFamily}`);
    if (fieldData.styleInputFontSize) v.push(`--qm-input-font-size:${fieldData.styleInputFontSize}`);
    if (fieldData.styleInputFontWeight) v.push(`--qm-input-font-weight:${fieldData.styleInputFontWeight}`);
    if (fieldData.styleInputBg) v.push(`--qm-input-bg:${fieldData.styleInputBg}`);
    if (fieldData.styleBorderWidth) v.push(`--qm-border-width:${fieldData.styleBorderWidth}`);
    if (fieldData.styleBorderColor) v.push(`--qm-border-color:${fieldData.styleBorderColor}`);

    const radiusUnit = fieldData.styleBorderRadiusUnit || 'px';
    const uRadius = (val) =>
      val !== undefined && val !== '' && val != null
        ? `${String(val).replace(/[^\d.-]/g, '') || 0}${radiusUnit}`
        : '';
    const legacy = fieldData.styleBorderRadius;
    const rtl = uRadius(fieldData.styleBorderRadiusTopLeft ?? legacy) || '0';
    const rtr = uRadius(fieldData.styleBorderRadiusTopRight ?? legacy) || '0';
    const rbr = uRadius(fieldData.styleBorderRadiusBottomRight ?? legacy) || '0';
    const rbl = uRadius(fieldData.styleBorderRadiusBottomLeft ?? legacy) || '0';
    const anyRadiusSet = [
      fieldData.styleBorderRadiusTopLeft,
      fieldData.styleBorderRadiusTopRight,
      fieldData.styleBorderRadiusBottomRight,
      fieldData.styleBorderRadiusBottomLeft,
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

    if (fieldData.stylePadding) v.push(`--qm-input-padding:${fieldData.stylePadding}`);
    return v.length ? v.join(';') : '';
  }

  global.QuoteMateFieldStyle = {
    getFieldStyleVars,
    resolveHeadingLevel,
    resolveHeadingAlign,
    getHeadingAlignClass,
    formatHeadingText,
    escapeHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
