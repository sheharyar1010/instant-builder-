/**
 * Consistent Title Case + brand-aware display labels for the quote form UI.
 */
(function (global) {
  const BRAND_NAMES = {
    wordpress: 'WordPress',
    woocommerce: 'WooCommerce',
    shopify: 'Shopify',
    react: 'React',
    'next.js': 'Next.js',
    nextjs: 'Next.js',
    'node.js': 'Node.js',
    nodejs: 'Node.js',
    laravel: 'Laravel',
    vue: 'Vue.js',
    vuejs: 'Vue.js',
    angular: 'Angular',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    mongodb: 'MongoDB',
    aws: 'AWS',
    seo: 'SEO',
    api: 'API',
    ui: 'UI',
    ux: 'UX',
    ios: 'iOS',
    android: 'Android',
    drupal: 'Drupal',
    joomla: 'Joomla',
    magento: 'Magento',
    prestashop: 'PrestaShop',
    squarespace: 'Squarespace',
    wix: 'Wix',
    elementor: 'Elementor',
    divi: 'Divi',
    figma: 'Figma',
    github: 'GitHub',
    gitlab: 'GitLab',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    instagram: 'Instagram',
    youtube: 'YouTube',
    google: 'Google',
    analytics: 'Analytics',
  };

  const PHRASE_REPLACEMENTS = [
    [/\bnext\s*\.?\s*js\b/gi, 'Next.js'],
    [/\bnode\s*\.?\s*js\b/gi, 'Node.js'],
    [/\bwoo\s*commerce\b/gi, 'WooCommerce'],
    [/\bword\s*press\b/gi, 'WordPress'],
  ];

  function normalizeTokenKey(token) {
    return String(token || '')
      .toLowerCase()
      .replace(/[^a-z0-9.+]/g, '');
  }

  function formatToken(token) {
    if (!token) return '';
    if (/^\d+$/.test(token)) return token;

    const key = normalizeTokenKey(token);
    if (BRAND_NAMES[key]) return BRAND_NAMES[key];

    const lower = token.toLowerCase();
    if (BRAND_NAMES[lower]) return BRAND_NAMES[lower];

    if (token.length <= 4 && token === token.toUpperCase() && /[A-Z]/.test(token)) {
      return token;
    }

    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function toTitleCase(text) {
    if (text == null) return '';
    let value = String(text).trim().replace(/\s+/g, ' ');
    if (!value) return '';

    PHRASE_REPLACEMENTS.forEach(([pattern, replacement]) => {
      value = value.replace(pattern, replacement);
    });

    return value
      .split(/(\s+|-)/)
      .map((part) => {
        if (!part || /^\s+$/.test(part)) return part;
        if (part === '-') return '-';
        return formatToken(part);
      })
      .join('');
  }

  function formatChoosePlaceholder(subject, fallbackKind) {
    const formatted = toTitleCase(subject);
    if (formatted) {
      return `Choose ${formatted}`;
    }

    const defaults = {
      category: 'Category',
      service: 'Service',
      option: 'Option',
    };
    const fallback = defaults[fallbackKind] || defaults.option;
    return `Choose ${fallback}`;
  }

  function formatDisplayName(text) {
    return toTitleCase(text);
  }

  function formatChooseNumberPlaceholder(unitPlural) {
    const unit = toTitleCase(unitPlural || 'Items');
    return `Choose Number of ${unit}`;
  }

  function formatQuantityOption(count, unitPlural) {
    const plural = toTitleCase(unitPlural || 'Items');
    const singular = /s$/i.test(plural) ? plural.slice(0, -1) : plural;
    const qty = Math.max(1, parseInt(count, 10) || 1);
    return qty === 1 ? `${qty} ${singular}` : `${qty} ${plural}`;
  }

  const QuoteMateTextFormat = {
    toTitleCase,
    formatChoosePlaceholder,
    formatDisplayName,
    formatChooseNumberPlaceholder,
    formatQuantityOption,
  };

  global.QuoteMateTextFormat = QuoteMateTextFormat;
})(typeof window !== 'undefined' ? window : globalThis);
