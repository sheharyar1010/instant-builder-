<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class FormHelper
{
    /**
     * Groups form fields into pages and sections
     *
     * @param array $fields The form fields to group
     * @return array The grouped fields
     */
    public static function group_fields_by_pages(array $fields): array
    {
        $steps = [];
        $current_step = ['sections' => []];
        $current_section = ['title' => null, 'fields' => []];
        $page_break_index = 0;

        foreach ($fields as $field) {
            if ($field['type'] === 'page_break') {
                if (!empty($current_section['fields'])) {
                    $current_step['sections'][] = $current_section;
                    $current_section = ['title' => null, 'fields' => []];
                }
                if (!empty($current_step['sections'])) {
                    $current_step['page_break_after'] = $field;
                    $current_step['page_break_index'] = $page_break_index;
                    $page_break_index++;
                    $steps[] = $current_step;
                }
                $current_step = ['sections' => []];
            } elseif ($field['type'] === 'section_break') {
                if (!empty($current_section['fields'])) {
                    $current_step['sections'][] = $current_section;
                }
                $current_section = [
                    'title' => $field['label'] ?? 'Section',
                    'fields' => []
                ];
            } else {
                $current_section['fields'][] = $field;
            }
        }

        if (!empty($current_section['fields'])) {
            $current_step['sections'][] = $current_section;
        }
        if (!empty($current_step['sections'])) {
            $steps[] = $current_step;
        }

        return $steps;
    }

    /**
     * @param mixed $align
     */
    public static function resolve_page_break_align($align): string
    {
        $align = sanitize_key((string) ($align ?? 'center'));
        return in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
    }

    /**
     * @param mixed $align
     */
    public static function get_page_break_nav_align_class($align): string
    {
        return 'quotemate-form-navigation--align-' . self::resolve_page_break_align($align);
    }

    /**
     * @param array<string, mixed> $page_break
     * @param array<string, mixed> $form_design
     */
    public static function resolve_page_break_button_background(array $page_break, array $form_design): string
    {
        $custom = trim((string) ($page_break['page_break_button_color'] ?? ''));
        if ($custom !== '' && preg_match('/^#[0-9A-Fa-f]{3,8}$/', $custom)) {
            return $custom;
        }

        return (string) ($form_design['buttonBg'] ?? $form_design['buttonColor'] ?? '#667eea');
    }

    /**
     * @param array<string, mixed> $page_break
     * @param array<string, mixed> $form_design
     */
    public static function resolve_page_break_prev_button_background(array $page_break, array $form_design): string
    {
        $custom = trim((string) ($page_break['page_break_prev_button_color'] ?? ''));
        if ($custom !== '' && preg_match('/^#[0-9A-Fa-f]{3,8}$/', $custom)) {
            return $custom;
        }

        return (string) ($form_design['secondaryBtnBg'] ?? '#faf8f4');
    }

    /**
     * @param array<string, mixed> $field
     */
    public static function get_page_break_button_spacing_style(array $field, string $variant = 'next'): string
    {
        $margin_prefix = $variant === 'prev' ? 'stylePrevMargin' : 'styleMargin';
        $padding_prefix = $variant === 'prev' ? 'stylePrevPadding' : 'stylePadding';
        $v = [];
        $u = function ($val, $unit) {
            if ($val === '' || $val === null) {
                return '';
            }
            $num = preg_replace('/[^\d.-]/', '', (string) $val);
            return $num !== '' ? $num . ($unit ?: 'px') : '';
        };
        $margin_unit = $field[$margin_prefix . 'Unit'] ?? 'px';
        $padding_unit = $field[$padding_prefix . 'Unit'] ?? 'px';
        foreach (['Top', 'Right', 'Bottom', 'Left'] as $side) {
            $margin_val = $u($field[$margin_prefix . $side] ?? '', $margin_unit);
            if ($margin_val !== '') {
                $v[] = 'margin-' . strtolower($side) . ':' . $margin_val;
            }
            $padding_val = $u($field[$padding_prefix . $side] ?? '', $padding_unit);
            if ($padding_val !== '') {
                $v[] = 'padding-' . strtolower($side) . ':' . $padding_val;
            }
        }

        return implode(';', $v);
    }

    /**
     * @param array<int, array<string, mixed>> $fields
     */
    public static function get_page_break_index(array $fields, string $field_id): int
    {
        $index = 0;
        foreach ($fields as $field) {
            if (($field['type'] ?? '') !== 'page_break') {
                continue;
            }
            if (($field['id'] ?? '') === $field_id) {
                return $index;
            }
            $index++;
        }

        return 0;
    }

    public static function should_show_page_break_previous(array $page_break): bool
    {
        if (!array_key_exists('show_previous_button', $page_break)) {
            return true;
        }

        $value = $page_break['show_previous_button'];
        if ($value === false || $value === 'false' || $value === 0 || $value === '0') {
            return false;
        }

        return (bool) $value;
    }

    /**
     * Page break field that ends the given form page (0-based), or null for the last page.
     *
     * @param array<int, array<string, mixed>> $fields
     */
    public static function get_page_break_after_form_page(array $fields, int $page_index): ?array
    {
        $current_page = 0;
        foreach ($fields as $field) {
            if (($field['type'] ?? '') !== 'page_break') {
                continue;
            }
            if ($current_page === $page_index) {
                return $field;
            }
            $current_page++;
        }

        return null;
    }

    /**
     * Resolve saved builder layout from settings, or rebuild from field row/column indexes.
     *
     * @param array<string, mixed> $settings
     * @param array<int, array<string, mixed>> $fields
     * @return array<string, mixed>|null
     */
    public static function resolve_layout(array $settings, array $fields): ?array
    {
        if (!empty($settings['layout']['rows']) && is_array($settings['layout']['rows'])) {
            return $settings['layout'];
        }

        $has_indexes = false;
        foreach ($fields as $field) {
            if (isset($field['rowIndex']) || isset($field['columnIndex'])) {
                $has_indexes = true;
                break;
            }
        }

        if (!$has_indexes) {
            return null;
        }

        $rows_map = [];
        foreach ($fields as $field) {
            $field_id = $field['id'] ?? '';
            if ($field_id === '') {
                continue;
            }
            $row_index = (int) ($field['rowIndex'] ?? 0);
            $col_index = (int) ($field['columnIndex'] ?? 0);
            if (!isset($rows_map[$row_index])) {
                $rows_map[$row_index] = [];
            }
            if (!isset($rows_map[$row_index][$col_index])) {
                $rows_map[$row_index][$col_index] = [];
            }
            $rows_map[$row_index][$col_index][] = $field_id;
        }

        if (empty($rows_map)) {
            return null;
        }

        ksort($rows_map);
        $rows = [];
        $logical_row = 0;
        foreach ($rows_map as $cols_map) {
            ksort($cols_map);
            $logical_row++;
            $row_id = 'row_' . $logical_row;
            $columns = [];
            $logical_col = 0;
            foreach ($cols_map as $field_ids) {
                $logical_col++;
                $columns[] = [
                    'id' => $row_id . '_col_' . $logical_col,
                    'fieldIds' => $field_ids,
                ];
            }
            $rows[] = [
                'id' => $row_id,
                'columns' => $columns,
            ];
        }

        return ['rows' => $rows];
    }

    /**
     * Organize section fields into builder rows/columns for frontend rendering.
     *
     * @param array<int, array<string, mixed>> $section_fields
     * @param array<string, mixed>|null $layout
     * @return array{has_layout: bool, rows: array<int, array{column_count: int, columns: array<int, array{fields: array}>}>}
     */
    public static function organize_section_fields_by_layout(array $section_fields, ?array $layout): array
    {
        if (empty($layout['rows']) || !is_array($layout['rows'])) {
            return [
                'has_layout' => false,
                'rows' => [],
            ];
        }

        $field_map = [];
        foreach ($section_fields as $field) {
            if (!empty($field['id'])) {
                $field_map[$field['id']] = $field;
            }
        }

        $placed_ids = [];
        $rows_out = [];

        foreach ($layout['rows'] as $layout_row) {
            $layout_columns = $layout_row['columns'] ?? [];
            $columns_out = [];
            $row_has_field = false;

            foreach ($layout_columns as $layout_col) {
                $col_fields = [];
                foreach ($layout_col['fieldIds'] ?? [] as $field_id) {
                    if (isset($field_map[$field_id])) {
                        $col_fields[] = $field_map[$field_id];
                        $placed_ids[$field_id] = true;
                        $row_has_field = true;
                    }
                }
                $columns_out[] = ['fields' => $col_fields];
            }

            if ($row_has_field) {
                $rows_out[] = [
                    'column_count' => max(1, count($layout_columns)),
                    'columns' => $columns_out,
                ];
            }
        }

        $orphans = [];
        foreach ($section_fields as $field) {
            $field_id = $field['id'] ?? '';
            if ($field_id !== '' && empty($placed_ids[$field_id])) {
                $orphans[] = $field;
            }
        }

        if (!empty($orphans)) {
            $rows_out[] = [
                'column_count' => 1,
                'columns' => [['fields' => $orphans]],
            ];
        }

        return [
            'has_layout' => !empty($rows_out),
            'rows' => $rows_out,
        ];
    }

    /**
     * Flat field groups per page_break (no section nesting).
     */
    public static function group_fields_into_pages_flat(array $fields): array
    {
        $pages = [];
        $current = [];

        foreach ($fields as $field) {
            if (($field['type'] ?? '') === 'page_break') {
                if (!empty($current)) {
                    $pages[] = $current;
                    $current = [];
                }
                continue;
            }
            $current[] = $field;
        }

        if (!empty($current) || empty($pages)) {
            $pages[] = $current;
        }

        return $pages;
    }

    /**
     * Step labels: Getting Started → custom step title or first field label per page → Final Quote.
     */
    public static function get_step_labels_from_fields(array $fields): array
    {
        $pages = self::group_fields_into_pages_flat($fields);
        $page_count = max(1, count($pages));
        $page_breaks = [];
        foreach ($fields as $field) {
            if (($field['type'] ?? '') === 'page_break') {
                $page_breaks[] = $field;
            }
        }
        $skip_types = ['section_break', 'html', 'divider', 'heading', 'paragraph'];
        $labels = [];

        foreach ($pages as $index => $page_fields) {
            if ($index === 0) {
                $labels[] = __('Getting Started', 'quotemate');
                continue;
            }

            if ($index === $page_count - 1) {
                $labels[] = __('Final Quote', 'quotemate');
                continue;
            }

            $preceding_break = $page_breaks[$index - 1] ?? null;
            $custom_title = trim((string) ($preceding_break['step_title'] ?? ''));
            if ($custom_title !== '') {
                $labels[] = $custom_title;
                continue;
            }

            $label = null;
            foreach ($page_fields as $field) {
                if (in_array($field['type'] ?? '', $skip_types, true)) {
                    continue;
                }

                $field_label = trim($field['label'] ?? '');
                if ($field_label !== '') {
                    $label = TextFormatHelper::to_title_case($field_label);
                    break;
                }
            }

            $labels[] = $label ? TextFormatHelper::to_title_case($label) : sprintf(__('Step %d', 'quotemate'), $index + 1);
        }

        return !empty($labels) ? $labels : [__('Getting Started', 'quotemate')];
    }

    /**
     * Render enhanced service structure recursively
     *
     * @param array $structure
     * @param int $level
     */
    public static function render_enhanced_services($structure, $level = 0)
    {
        foreach ($structure as $item) {
            if (isset($item['type']) && $item['type'] === 'page_break') {
                continue;
            }
            if ($item['type'] === 'service') {
                $serviceName = esc_html(TextFormatHelper::format_display_name($item['name'] ?? ''));
                $basePrice = isset($item['basePrice']) ? (float)$item['basePrice'] : 0;
                $pricingType = $item['pricingType'] ?? 'fixed';
                $maxQuantity = isset($item['maxQuantity']) ? (int)$item['maxQuantity'] : 0;
                
                // Create service data for JavaScript
                $serviceData = [
                    'name' => $item['name'],
                    'pricingType' => $pricingType,
                    'basePrice' => $basePrice,
                    'maxQuantity' => $maxQuantity,
                    'deliveryTime' => $item['deliveryTime'] ?? 0,
                    'pricingTiers' => $item['pricingTiers'] ?? []
                ];
                
                $indent = str_repeat('— ', $level);
                echo '<option value="' . esc_attr($item['name'] ?? '') . '" data-service=\'' . json_encode($serviceData) . '\'>' . $indent . $serviceName . '</option>';
            } elseif ($item['type'] === 'category' && !empty($item['children'])) {
                $categoryName = esc_html(TextFormatHelper::format_display_name($item['name'] ?? 'Category'));
                echo '<optgroup label="' . $categoryName . '">';
                self::render_enhanced_services($item['children'], $level + 1);
                echo '</optgroup>';
            }
        }
    }

    /**
     * Check if any service in the structure has maxQuantity
     *
     * @param array $structure
     * @return bool
     */
    public static function has_service_with_max_quantity($structure)
    {
        foreach ($structure as $item) {
            if ($item['type'] === 'service' && isset($item['maxQuantity']) && $item['maxQuantity'] > 0) {
                return true;
            }
            if (isset($item['children']) && is_array($item['children'])) {
                if (self::has_service_with_max_quantity($item['children'])) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Find the first service with maxQuantity
     *
     * @param array $structure
     * @return array|null
     */
    public static function find_service_with_max_quantity($structure)
    {
        foreach ($structure as $item) {
            if ($item['type'] === 'service' && isset($item['maxQuantity']) && $item['maxQuantity'] > 0) {
                return $item;
            }
            if (isset($item['children']) && is_array($item['children'])) {
                $found = self::find_service_with_max_quantity($item['children']);
                if ($found) return $found;
            }
        }
        return null;
    }

    /**
     * Build inline style string for a field (margin, padding, typography, colors, border) for frontend form output.
     * Mirrors the builder's getFieldStyleVars so the live form matches the builder preview.
     *
     * @param array $field Field data with optional style* keys
     * @return string Empty or semicolon-separated CSS declarations (e.g. for style="...")
     */
    public static function get_field_style_attr(array $field): string
    {
        $v = [];
        $u = function ($val, $unit) {
            if ($val === '' || $val === null) return '';
            $num = preg_replace('/[^\d.-]/', '', (string) $val);
            return $num !== '' ? $num . ($unit ?: 'px') : '';
        };
        $marginUnit = $field['styleMarginUnit'] ?? 'px';
        $paddingUnit = $field['stylePaddingUnit'] ?? 'px';
        foreach (['styleMarginTop' => 'margin-top', 'styleMarginRight' => 'margin-right', 'styleMarginBottom' => 'margin-bottom', 'styleMarginLeft' => 'margin-left'] as $k => $css) {
            $val = $u($field[$k] ?? '', $marginUnit);
            if ($val !== '') $v[] = $css . ':' . $val;
        }
        foreach (['stylePaddingTop' => 'padding-top', 'stylePaddingRight' => 'padding-right', 'stylePaddingBottom' => 'padding-bottom', 'stylePaddingLeft' => 'padding-left'] as $k => $css) {
            $val = $u($field[$k] ?? '', $paddingUnit);
            if ($val !== '') $v[] = $css . ':' . $val;
        }
        if (!empty($field['styleLabelColor'])) $v[] = '--qm-label-color:' . esc_attr($field['styleLabelColor']);
        $labelSize = $field['styleFontSize'] ?? $field['styleLabelSize'] ?? '';
        if ($labelSize !== '') $v[] = '--qm-label-size:' . esc_attr($labelSize);
        if (!empty($field['styleFontFamily'])) $v[] = '--qm-label-font-family:' . esc_attr($field['styleFontFamily']);
        if (!empty($field['styleFontWeight'])) $v[] = '--qm-label-font-weight:' . esc_attr($field['styleFontWeight']);
        if (!empty($field['styleTextTransform'])) $v[] = '--qm-label-text-transform:' . esc_attr($field['styleTextTransform']);
        if (!empty($field['styleFontStyle'])) $v[] = '--qm-label-font-style:' . esc_attr($field['styleFontStyle']);
        if (!empty($field['styleTextDecoration'])) $v[] = '--qm-label-text-decoration:' . esc_attr($field['styleTextDecoration']);
        if (!empty($field['styleLineHeight'])) $v[] = '--qm-label-line-height:' . esc_attr($field['styleLineHeight']);
        if (!empty($field['styleLetterSpacing'])) $v[] = '--qm-label-letter-spacing:' . esc_attr($field['styleLetterSpacing']);
        if (!empty($field['styleWordSpacing'])) $v[] = '--qm-label-word-spacing:' . esc_attr($field['styleWordSpacing']);
        if (!empty($field['styleInputColor'])) $v[] = '--qm-input-color:' . esc_attr($field['styleInputColor']);
        if (!empty($field['styleInputFontFamily'])) $v[] = '--qm-input-font-family:' . esc_attr($field['styleInputFontFamily']);
        if (!empty($field['styleInputFontSize'])) $v[] = '--qm-input-font-size:' . esc_attr($field['styleInputFontSize']);
        if (!empty($field['styleInputFontWeight'])) $v[] = '--qm-input-font-weight:' . esc_attr($field['styleInputFontWeight']);
        if (!empty($field['styleInputBg'])) $v[] = '--qm-input-bg:' . esc_attr($field['styleInputBg']);
        if (!empty($field['styleBorderWidth'])) $v[] = '--qm-border-width:' . esc_attr($field['styleBorderWidth']);
        if (!empty($field['styleBorderColor'])) $v[] = '--qm-border-color:' . esc_attr($field['styleBorderColor']);
        $radiusUnit = $field['styleBorderRadiusUnit'] ?? 'px';
        $u_radius = function ($val) use ($radiusUnit) {
            if ($val === '' || $val === null) return '';
            $num = preg_replace('/[^\d.-]/', '', (string) $val);
            return $num !== '' ? $num . $radiusUnit : '';
        };
        $legacy_r = $field['styleBorderRadius'] ?? '';
        $rtl = $u_radius($field['styleBorderRadiusTopLeft'] ?? $legacy_r) ?: '0';
        $rtr = $u_radius($field['styleBorderRadiusTopRight'] ?? $legacy_r) ?: '0';
        $rbr = $u_radius($field['styleBorderRadiusBottomRight'] ?? $legacy_r) ?: '0';
        $rbl = $u_radius($field['styleBorderRadiusBottomLeft'] ?? $legacy_r) ?: '0';
        $any_radius = array_filter([$field['styleBorderRadiusTopLeft'] ?? null, $field['styleBorderRadiusTopRight'] ?? null, $field['styleBorderRadiusBottomRight'] ?? null, $field['styleBorderRadiusBottomLeft'] ?? null, $legacy_r], function ($v) { return $v !== '' && $v !== null; });
        if (!empty($any_radius)) {
            $v[] = '--qm-border-radius-tl:' . esc_attr($rtl);
            $v[] = '--qm-border-radius-tr:' . esc_attr($rtr);
            $v[] = '--qm-border-radius-br:' . esc_attr($rbr);
            $v[] = '--qm-border-radius-bl:' . esc_attr($rbl);
        }
        if (!empty($field['stylePadding'])) $v[] = '--qm-input-padding:' . esc_attr($field['stylePadding']);
        return implode(';', $v);
    }

    /**
     * CSS class for field width (small / medium / large) — mirrors admin builder getFieldSizeClass().
     */
    public static function get_field_size_class(array $field): string
    {
        $full_width_types = [
            'page_break', 'section_break', 'html', 'heading', 'paragraph', 'quote_total', 'form_summary',
            'divider', 'service', 'service_options',
        ];
        $type = $field['type'] ?? '';
        $size = in_array($type, $full_width_types, true)
            ? 'large'
            : ($field['fieldSize'] ?? 'medium');

        if (!in_array($size, ['small', 'medium', 'large'], true)) {
            $size = 'medium';
        }

        return 'quotemate-form-field--size-' . $size;
    }

    /**
     * Ensure content-block fields have required keys (legacy forms saved before heading/paragraph support).
     *
     * @param array<int, array<string, mixed>> $fields
     * @return array<int, array<string, mixed>>
     */
    public static function normalize_fields(array $fields): array
    {
        foreach ($fields as &$field) {
            $type = $field['type'] ?? '';

            if ($type === 'heading') {
                $field['heading_level'] = HeadingHelper::resolve_heading_tag($field);
                $field['heading_align'] = HeadingHelper::resolve_heading_align($field);
                if (empty($field['label'])) {
                    $field['label'] = 'Heading';
                }
            }

            if ($type === 'paragraph' && empty($field['paragraph_content'])) {
                $field['paragraph_content'] = $field['label'] ?? '';
            }
        }
        unset($field);

        return $fields;
    }
}
 