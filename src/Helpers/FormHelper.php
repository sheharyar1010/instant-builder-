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

        foreach ($fields as $field) {
            if ($field['type'] === 'page_break') {
                if (!empty($current_section['fields'])) {
                    $current_step['sections'][] = $current_section;
                    $current_section = ['title' => null, 'fields' => []];
                }
                if (!empty($current_step['sections'])) {
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
                $serviceName = esc_html($item['name'] ?? '');
                $basePrice = isset($item['basePrice']) ? (float)$item['basePrice'] : 0;
                $pricingType = $item['pricingType'] ?? 'fixed';
                $maxQuantity = isset($item['maxQuantity']) ? (int)$item['maxQuantity'] : 0;
                
                $priceDisplay = '';
                if ($pricingType === 'fixed') {
                    $priceDisplay = ' ($' . number_format($basePrice, 2) . ')';
                } else {
                    $typeLabel = str_replace('_', ' ', $pricingType);
                    $priceDisplay = ' ($' . number_format($basePrice, 2) . ' ' . $typeLabel . ')';
                }
                
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
                echo '<option value="' . esc_attr($item['name'] ?? '') . '" data-service=\'' . json_encode($serviceData) . '\'>' . $indent . $serviceName . $priceDisplay . '</option>';
            } elseif ($item['type'] === 'category' && !empty($item['children'])) {
                $categoryName = esc_html($item['name'] ?? 'Category');
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
}
 