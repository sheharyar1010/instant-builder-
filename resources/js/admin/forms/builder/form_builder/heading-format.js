/**
 * Heading rich-text tags: [br], [color=#hex]text[/color]
 * Safe output — only br + span with sanitized color.
 */

export const HEADING_FORMAT_TAGS_HTML = `
  <div class="quotemate-heading-format-help">
    <p class="quotemate-heading-format-help__title">Formatting tags</p>
    <ul class="quotemate-heading-format-help__list">
      <li><code>[br]</code> — start text on a new line</li>
      <li><code>[color=#667eea]text[/color]</code> — change text color (hex, rgb, or color name)</li>
    </ul>
    <p class="quotemate-heading-format-help__example">
      <span class="quotemate-heading-format-help__example-label">Example:</span>
      <code>Get started with our web[br][color=#007cba]pricing calculator![/color]</code>
    </p>
  </div>
`;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sanitizeHeadingColor(color) {
  if (!color) return null;
  const value = String(color).trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) return value;
  if (/^rgba?\(\s*[\d.%\s,]+\)$/i.test(value)) return value;
  if (/^hsla?\(\s*[\d.%deg,\s]+\)$/i.test(value)) return value;
  if (/^[a-zA-Z]{3,20}$/.test(value)) return value.toLowerCase();
  return null;
}

/**
 * @param {string} text Raw heading text from builder
 * @returns {string} Safe HTML
 */
export function formatHeadingText(text) {
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
