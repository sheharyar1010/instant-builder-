<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class AssetHelper
{
    private static function get_vite_url(string $path = ''): string
    {
        $base = defined('VITE_DEV_SERVER') ? VITE_DEV_SERVER : 'http://localhost:5173';
        return rtrim($base, '/') . '/' . ltrim($path, '/');
    }

    private static function is_vite_running(): bool
    {
        $vite_url = self::get_vite_url('@vite/client');
        $headers = @get_headers($vite_url);
        return $headers && strpos($headers[0], '200') !== false;
    }

    public static function enqueue_assets(string $name, bool $with_scripts = false, array $localize_data = []): void
    {
        $base_handle = 'qm-' . str_replace('/', '-', $name);
        $js_handle = $base_handle . '-js';
        $css_handle = $base_handle . '-css';

        // Debug logging
        error_log("AssetHelper: Enqueuing assets for '{$name}' with scripts: " . ($with_scripts ? 'true' : 'false'));

        if (self::is_vite_running()) {
            $vite_dev_url = self::get_vite_url("js/{$name}.js");
            error_log("AssetHelper: Using Vite dev server: {$vite_dev_url}");

            if ($with_scripts && !empty($localize_data)) {
                $object_name = self::generate_namespace_object($name);
                error_log("AssetHelper: Localizing data for object '{$object_name}': " . print_r($localize_data, true));

                wp_register_script('qm-inline-config-' . $base_handle, '');
                wp_enqueue_script('qm-inline-config-' . $base_handle);

                wp_add_inline_script(
                    'qm-inline-config-' . $base_handle,
                    'window.Quotemate = window.Quotemate || {}; window.Quotemate["' . $object_name . '"] = ' . wp_json_encode($localize_data) . ';',
                    'before'
                );
            }

            wp_register_script($js_handle, $vite_dev_url, [], null, true);
            wp_enqueue_script($js_handle);

            add_filter('script_loader_tag', function ($tag, $handle_check, $src) use ($js_handle) {
                if ($handle_check === $js_handle) {
                    return '<script type="module" src="' . SanitizationHelper::sanitize($src, 'url') . '"></script>';
                }
                return $tag;
            }, 10, 3);

            return;
        }

        $css_path = QUOTEMATE_DIR . "assets/css/{$name}.css";
        if (file_exists($css_path)) {
            $css_url = QUOTEMATE_URL . "assets/css/{$name}.css";
            wp_enqueue_style($css_handle, $css_url, [], QUOTEMATE_VERSION);
            error_log("AssetHelper: Enqueued CSS: {$css_url}");
        }

        if ($with_scripts) {
            $js_path = QUOTEMATE_DIR . "assets/js/{$name}.js";
            error_log("AssetHelper: Looking for JS file at: {$js_path}");
            
            if (file_exists($js_path)) {
                $js_url = QUOTEMATE_URL . "assets/js/{$name}.js";
                wp_enqueue_script($js_handle, $js_url, [], QUOTEMATE_VERSION, true);
                error_log("AssetHelper: Enqueued JS: {$js_url}");

                // Add type="module" for ES module files in production
                add_filter('script_loader_tag', function ($tag, $handle_check, $src) use ($js_handle) {
                    if ($handle_check === $js_handle) {
                        return '<script type="module" src="' . SanitizationHelper::sanitize($src, 'url') . '"></script>';
                    }
                    return $tag;
                }, 10, 3);

                if (!empty($localize_data)) {
                    $object_name = self::generate_namespace_object($name);
                    error_log("AssetHelper: Localizing data for object '{$object_name}': " . print_r($localize_data, true));
                    
                    wp_add_inline_script(
                        $js_handle,
                        'window.Quotemate = window.Quotemate || {}; window.Quotemate["' . $object_name . '"] = ' . wp_json_encode($localize_data) . ';',
                        'before'
                    );
                }
            } else {
                error_log("AssetHelper: JS file not found at: {$js_path}");
            }
        }
    }

    public static function image(string $relative_path, string $alt = '', array $attributes = []): string
    {
        $src = SanitizationHelper::sanitize(QUOTEMATE_URL . 'assets/' . ltrim($relative_path, '/'), 'url');
        $attr_string = '';

        $attributes = array_merge([
            'src' => $src,
            'alt' => SanitizationHelper::sanitize($alt, 'attr'),
        ], $attributes);

        foreach ($attributes as $key => $value) {
            $attr_string .= sprintf(' %s="%s"', SanitizationHelper::sanitize($key, 'attr'), SanitizationHelper::sanitize($value, 'attr'));
        }

        return "<img $attr_string />";
    }

    public static function icon(string $relative_path, array $attributes = []): string
    {
        $file_path = QUOTEMATE_DIR . 'assets/icons/' . ltrim($relative_path, '/') . '.svg';

        if (!file_exists($file_path)) {
            return '<!-- SVG not found: ' . esc_html($relative_path) . ' -->';
        }

        $svg = file_get_contents($file_path);
        if (!$svg) {
            return '<!-- SVG empty or unreadable: ' . esc_html($relative_path) . ' -->';
        }

        if (!empty($attributes)) {
            if (preg_match('/<svg\s+([^>]*)>/i', $svg, $matches)) {
                $existing_attrs = $matches[1];
                $new_attrs = '';

                foreach ($attributes as $key => $value) {
                    $sanitized_key = SanitizationHelper::sanitize($key, 'attr');
                    $sanitized_val = SanitizationHelper::sanitize($value, 'attr');
                    $new_attrs .= " $sanitized_key=\"$sanitized_val\"";
                }

                $svg = str_replace($matches[0], '<svg ' . $existing_attrs . $new_attrs . '>', $svg);
            }
        }

        return $svg;
    }

    private static function generate_namespace_object(string $name): string
    {
        return str_replace(['/', '-'], '_', $name);
    }
}
