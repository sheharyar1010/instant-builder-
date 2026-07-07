<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

/**
 * Form visual theme presets (layout + default colors).
 */
class ThemeHelper
{
    public const THEME_CLASSIC  = 'classic';
    public const THEME_SIDEBAR  = 'sidebar';
    public const THEME_NUMBERED = 'numbered';
    public const THEME_MODERN   = 'modern';
    public const THEME_MINIMAL  = 'minimal';

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function get_all(): array
    {
        return [
            self::THEME_CLASSIC => [
                'id'          => self::THEME_CLASSIC,
                'name'        => __('Classic Gradient', 'quotemate'),
                'description' => __('Purple gradient header with top progress bar.', 'quotemate'),
                'nav'         => 'top-bar',
            ],
            self::THEME_SIDEBAR => [
                'id'          => self::THEME_SIDEBAR,
                'name'        => __('Sidebar Steps', 'quotemate'),
                'description' => __('Vertical step list on the left, content on the right.', 'quotemate'),
                'nav'         => 'sidebar',
            ],
            self::THEME_NUMBERED => [
                'id'          => self::THEME_NUMBERED,
                'name'        => __('Numbered Steps', 'quotemate'),
                'description' => __('Top circles with step labels and underline accent.', 'quotemate'),
                'nav'         => 'numbered',
            ],
            self::THEME_MODERN => [
                'id'          => self::THEME_MODERN,
                'name'        => __('Modern Dots', 'quotemate'),
                'description' => __('Minimal dot progress line with clean layout.', 'quotemate'),
                'nav'         => 'dots',
            ],
            self::THEME_MINIMAL => [
                'id'          => self::THEME_MINIMAL,
                'name'        => __('Minimal Card', 'quotemate'),
                'description' => __('Simple centered card with subtle progress.', 'quotemate'),
                'nav'         => 'minimal',
            ],
        ];
    }

    public static function get_ids(): array
    {
        return array_keys(self::get_all());
    }

    public static function exists(string $theme_id): bool
    {
        return isset(self::get_all()[$theme_id]);
    }

    public static function sanitize_id(string $theme_id): string
    {
        $theme_id = sanitize_key($theme_id);
        return self::exists($theme_id) ? $theme_id : self::THEME_CLASSIC;
    }

    /**
     * Default design colors per theme (overridable in Design settings).
     *
     * @return array<string, mixed>
     */
    public static function get_default_design(string $theme_id): array
    {
        $theme_id = self::sanitize_id($theme_id);

        $presets = [
            self::THEME_CLASSIC => [
                'themeId'          => self::THEME_CLASSIC,
                'headerStyle'      => 'gradient',
                'headerColor'      => '#667eea',
                'headerColorEnd'   => '#764ba2',
                'buttonStyle'      => 'gradient',
                'buttonColor'      => '#667eea',
                'buttonColorEnd'   => '#764ba2',
                'formBgColor'      => '#ffffff',
                'labelColor'       => '#495057',
                'borderColor'      => '#ced4da',
                'focusColor'       => '#667eea',
                'formBorderColor'  => '#e5e7eb',
                'formBorderWidth'  => 0,
                'formBorderRadius' => 12,
            ],
            self::THEME_SIDEBAR => [
                'themeId'          => self::THEME_SIDEBAR,
                'headerStyle'      => 'solid',
                'headerColor'      => '#ffffff',
                'headerColorEnd'   => '#ffffff',
                'buttonStyle'      => 'solid',
                'buttonColor'      => '#e53935',
                'buttonColorEnd'   => '#c62828',
                'formBgColor'      => '#f5f5f5',
                'labelColor'       => '#333333',
                'borderColor'      => '#dee2e6',
                'focusColor'       => '#e53935',
                'formBorderColor'  => '#e5e7eb',
                'formBorderWidth'  => 0,
                'formBorderRadius' => 12,
            ],
            self::THEME_NUMBERED => [
                'themeId'          => self::THEME_NUMBERED,
                'headerStyle'      => 'solid',
                'headerColor'      => '#ffffff',
                'headerColorEnd'   => '#ffffff',
                'buttonStyle'      => 'solid',
                'buttonColor'      => '#ff6b35',
                'buttonColorEnd'   => '#e55a2b',
                'formBgColor'      => '#ffffff',
                'labelColor'       => '#1a1a1a',
                'borderColor'      => '#d1d5db',
                'focusColor'       => '#ff6b35',
                'formBorderColor'  => '#e5e7eb',
                'formBorderWidth'  => 0,
                'formBorderRadius' => 8,
            ],
            self::THEME_MODERN => [
                'themeId'          => self::THEME_MODERN,
                'headerStyle'      => 'solid',
                'headerColor'      => '#ffffff',
                'headerColorEnd'   => '#ffffff',
                'buttonStyle'      => 'solid',
                'buttonColor'      => '#2563eb',
                'buttonColorEnd'   => '#1d4ed8',
                'formBgColor'      => '#f8fafc',
                'labelColor'       => '#1e293b',
                'borderColor'      => '#cbd5e1',
                'focusColor'       => '#2563eb',
                'formBorderColor'  => '#e2e8f0',
                'formBorderWidth'  => 0,
                'formBorderRadius' => 12,
            ],
            self::THEME_MINIMAL => [
                'themeId'          => self::THEME_MINIMAL,
                'headerStyle'      => 'solid',
                'headerColor'      => '#ffffff',
                'headerColorEnd'   => '#ffffff',
                'buttonStyle'      => 'solid',
                'buttonColor'      => '#f5c518',
                'buttonColorEnd'   => '#e6b800',
                'formBgColor'      => '#fafafa',
                'labelColor'       => '#1a1a1a',
                'borderColor'      => '#d4d4d4',
                'focusColor'       => '#f5c518',
                'formBorderColor'  => '#e5e5e5',
                'formBorderWidth'  => 1,
                'formBorderRadius' => 8,
            ],
        ];

        return $presets[$theme_id] ?? $presets[self::THEME_CLASSIC];
    }

    public static function get_css_url(string $theme_id): string
    {
        $theme_id = self::sanitize_id($theme_id);
        return QUOTEMATE_URL . 'public/css/themes/' . $theme_id . '.css';
    }
}
