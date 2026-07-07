<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

/**
 * Resolves form-level design settings and outputs CSS custom properties for the frontend.
 */
class DesignHelper
{
    /**
     * Default design values matching the current classic form appearance.
     */
    public static function get_defaults(): array
    {
        return array_merge(
            ThemeHelper::get_default_design(ThemeHelper::THEME_CLASSIC),
            [
                'fontFamily'     => 'system',
                'fontSize'       => 16,
                'formWidth'      => 'container',
                'fieldSpacing'   => 1.5,
            ]
        );
    }

    /**
     * Merge saved settings with theme preset + defaults.
     */
    public static function resolve(array $settings): array
    {
        $saved = [];
        if (!empty($settings['design']) && is_array($settings['design'])) {
            $saved = $settings['design'];
        }

        $theme_id = ThemeHelper::sanitize_id($saved['themeId'] ?? ThemeHelper::THEME_CLASSIC);
        $design = array_merge(
            self::get_defaults(),
            ThemeHelper::get_default_design($theme_id),
            $saved
        );
        $design['themeId'] = $theme_id;

        $design['formBgColor']  = self::sanitize_color($design['formBgColor']);
        $design['headerStyle']  = in_array($design['headerStyle'] ?? '', ['solid', 'gradient'], true)
            ? $design['headerStyle']
            : 'gradient';
        $design['buttonStyle']  = in_array($design['buttonStyle'] ?? '', ['solid', 'gradient'], true)
            ? $design['buttonStyle']
            : 'gradient';
        $design['headerColor']  = self::sanitize_color($design['headerColor']);
        $design['headerColorEnd'] = self::sanitize_color(
            $design['headerColorEnd'] ?? self::darken_hex($design['headerColor'], 0.22)
        );
        $design['labelColor']   = self::sanitize_color($design['labelColor']);
        $design['buttonColor']  = self::sanitize_color($design['buttonColor']);
        $design['buttonColorEnd'] = self::sanitize_color(
            $design['buttonColorEnd'] ?? self::darken_hex($design['buttonColor'], 0.22)
        );
        $design['borderColor']  = self::sanitize_color($design['borderColor']);
        $design['formBorderColor'] = self::sanitize_color($design['formBorderColor'] ?? '#e5e7eb');
        $design['formBorderWidth'] = max(0, min(8, (int) ($design['formBorderWidth'] ?? 0)));
        $design['formBorderRadius'] = max(0, min(32, (int) ($design['formBorderRadius'] ?? 12)));
        $design['focusColor']   = self::sanitize_color($design['focusColor']);
        $design['fontSize']     = max(12, min(24, (int) $design['fontSize']));
        $design['fieldSpacing'] = max(0.5, min(4, (float) $design['fieldSpacing']));
        $design['formWidth']    = in_array($design['formWidth'], ['full', 'container', 'narrow'], true)
            ? $design['formWidth']
            : 'container';

        $design['headerBg'] = self::build_background(
            $design['headerStyle'],
            $design['headerColor'],
            $design['headerColorEnd']
        );
        $design['buttonBg'] = self::build_background(
            $design['buttonStyle'],
            $design['buttonColor'],
            $design['buttonColorEnd']
        );
        $design['progressFillBg'] = $design['buttonStyle'] === 'solid'
            ? $design['buttonColor']
            : 'linear-gradient(90deg, ' . $design['buttonColor'] . ' 0%, ' . $design['buttonColorEnd'] . ' 100%)';
        $design['progressTrack']   = '#e9ecef';
        $design['textMuted']       = '#6c757d';
        $design['textColor']       = '#333333';
        $design['headerText']      = self::resolve_header_text($design);
        $design['buttonText']      = '#ffffff';
        $design['secondaryBtnBg']  = '#faf8f4';
        $design['secondaryBtnHover'] = '#f0ebe3';
        $design['secondaryBtnText'] = '#1a1a1a';
        $design['secondaryBtnBorder'] = '#e8e4dc';
        $design['cardBg']          = '#ffffff';
        $design['fontFamilyStack'] = self::resolve_font_family((string) $design['fontFamily']);
        $design['formMaxWidth']    = self::resolve_max_width($design['formWidth']);

        return $design;
    }

    /**
     * CSS class for form width variant.
     */
    public static function get_width_class(array $design): string
    {
        return 'quotemate-form-width-' . $design['formWidth'];
    }

    /**
     * Inline style string of CSS custom properties for the form wrapper.
     */
    public static function get_css_vars_style(array $design): string
    {
        $vars = [
            '--qm-form-bg'              => $design['formBgColor'],
            '--qm-header-bg'            => $design['headerBg'],
            '--qm-header-color'         => $design['headerColor'],
            '--qm-header-color-end'     => $design['headerColorEnd'],
            '--qm-header-text'          => $design['headerText'],
            '--qm-label-color'          => $design['labelColor'],
            '--qm-button-bg'            => $design['buttonBg'],
            '--qm-button-color'         => $design['buttonColor'],
            '--qm-button-color-end'     => $design['buttonColorEnd'],
            '--qm-button-text'          => $design['buttonText'],
            '--qm-progress-fill-bg'     => $design['progressFillBg'],
            '--qm-border-color'         => $design['borderColor'],
            '--qm-form-border-color'    => $design['formBorderColor'],
            '--qm-form-border-width'    => $design['formBorderWidth'] . 'px',
            '--qm-form-border-radius'   => $design['formBorderRadius'] . 'px',
            '--qm-focus-color'          => $design['focusColor'],
            '--qm-accent-color'         => $design['buttonColor'],
            '--qm-progress-track'       => $design['progressTrack'],
            '--qm-text-color'           => $design['textColor'],
            '--qm-text-muted'           => $design['textMuted'],
            '--qm-secondary-btn-bg'     => $design['secondaryBtnBg'],
            '--qm-secondary-btn-hover'  => $design['secondaryBtnHover'],
            '--qm-secondary-btn-text'   => $design['secondaryBtnText'],
            '--qm-secondary-btn-border' => $design['secondaryBtnBorder'],
            '--qm-card-bg'              => $design['cardBg'],
            '--qm-font-family'          => $design['fontFamilyStack'],
            '--qm-font-size'            => $design['fontSize'] . 'px',
            '--qm-field-spacing'        => $design['fieldSpacing'] . 'rem',
            '--qm-form-max-width'       => $design['formMaxWidth'],
            '--qm-focus-ring'           => self::hex_to_rgba($design['focusColor'], 0.25),
            '--qm-accent-shadow'        => self::hex_to_rgba($design['buttonColor'], 0.3),
            '--qm-accent-shadow-hover'  => self::hex_to_rgba($design['buttonColor'], 0.4),
            '--qm-step-shadow'          => self::hex_to_rgba($design['buttonColor'], 0.4),
        ];

        $parts = [];
        foreach ($vars as $name => $value) {
            $parts[] = $name . ':' . $value;
        }

        return implode(';', $parts);
    }

    private static function resolve_font_family(string $key): string
    {
        $map = [
            'system'    => '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            'arial'     => 'Arial, Helvetica, sans-serif',
            'helvetica' => 'Helvetica, Arial, sans-serif',
            'georgia'   => 'Georgia, "Times New Roman", serif',
            'times'     => '"Times New Roman", Times, serif',
        ];

        return $map[$key] ?? $map['system'];
    }

    private static function resolve_max_width(string $width): string
    {
        $map = [
            'full'      => '100%',
            'container' => '1248px',
            'narrow'    => '600px',
        ];

        return $map[$width] ?? $map['container'];
    }

    private static function resolve_header_text(array $design): string
    {
        if (!empty($design['headerText'])) {
            return $design['headerText'];
        }

        $light_header_themes = [
            ThemeHelper::THEME_SIDEBAR,
            ThemeHelper::THEME_NUMBERED,
            ThemeHelper::THEME_MODERN,
            ThemeHelper::THEME_MINIMAL,
        ];

        if (in_array($design['themeId'] ?? '', $light_header_themes, true)) {
            return '#1a1a1a';
        }

        return '#ffffff';
    }

    private static function build_background(string $style, string $color, string $color_end): string
    {
        if ($style === 'solid') {
            return $color;
        }

        return 'linear-gradient(135deg, ' . $color . ' 0%, ' . $color_end . ' 100%)';
    }

    private static function sanitize_color(string $color): string
    {
        $color = trim($color);
        if ($color === '') {
            return '#000000';
        }

        $sanitized = sanitize_hex_color($color);
        if ($sanitized) {
            return $sanitized;
        }

        if (preg_match('/^rgba?\([^)]+\)$/i', $color)) {
            return $color;
        }

        return '#000000';
    }

    /**
     * Darken a hex color by mixing toward black.
     */
    private static function darken_hex(string $hex, float $amount): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        $factor = max(0, min(1, 1 - $amount));
        $r = (int) round($r * $factor);
        $g = (int) round($g * $factor);
        $b = (int) round($b * $factor);

        return sprintf('#%02x%02x%02x', $r, $g, $b);
    }

    private static function hex_to_rgba(string $hex, float $alpha): string
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return sprintf('rgba(%d, %d, %d, %s)', $r, $g, $b, rtrim(rtrim(number_format($alpha, 2, '.', ''), '0'), '.'));
    }
}
