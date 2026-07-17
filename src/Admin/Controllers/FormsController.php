<?php

namespace Dawnsol\Quotemate\Admin\Controllers;

use Dawnsol\Quotemate\Admin\Models\Form;
use Dawnsol\Quotemate\Admin\Includes\Tables\FormsListTable;
use Dawnsol\Quotemate\Helpers\AssetHelper;
use Dawnsol\Quotemate\Helpers\RequestHelper;
use Dawnsol\Quotemate\Helpers\SanitizationHelper;
use Dawnsol\Quotemate\Helpers\ThemeHelper;
use Dawnsol\Quotemate\Helpers\ViewRenderer;
use Dawnsol\Quotemate\Traits\Singleton;

class FormsController
{
    use Singleton;

    private $loader;
    private $plugin_name;
    private $version;

    public function __construct($plugin_name, $version, $loader)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->loader = $loader;

        // Add AJAX handlers
        add_action('wp_ajax_save_form_settings', [$this, 'save_form_settings']);
    }

    public function index()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'quotemate'));
        }

        $forms_list_table = new FormsListTable();
        
        // Process actions first - this may redirect and exit
        $forms_list_table->process_actions();
        
        // If we get here, no redirect happened, so prepare items and render
        $forms_list_table->prepare_items();

        ViewRenderer::render('Forms/index', true, ['table' => $forms_list_table]);
    }

    public function create()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'quotemate'));
        }

        AssetHelper::enqueue_assets('admin/forms/create');

        ViewRenderer::render('Forms/create', true, [
            'title' => esc_html__('Create Form', 'quotemate'),
        ], 'Forms/builder');
    }

    public function store()
    {
        // Check user capabilities first
        if (!current_user_can('manage_options')) {
            return RequestHelper::json_error('You do not have permission to perform this action.');
        }

        if (!RequestHelper::verify_action_nonce('quotemate_save_form', 'nonce')) {
            return RequestHelper::json_error('Security check failed.');
        }
        // Try getting data directly from $_POST first
        $form_name = isset($_POST['form_name']) ? sanitize_text_field($_POST['form_name']) : (isset($_POST['name']) ? sanitize_text_field($_POST['name']) : '');
        $form_title = isset($_POST['form_title']) ? sanitize_text_field($_POST['form_title']) : 'Quote Request Form';
        $form_description = isset($_POST['form_description']) ? sanitize_textarea_field($_POST['form_description']) : '';
        $form_fields_raw = isset($_POST['form_fields']) ? wp_unslash($_POST['form_fields']) : '[]';
        $form_layout_raw = isset($_POST['form_layout']) ? wp_unslash($_POST['form_layout']) : '';
        $form_id = isset($_POST['form_id']) ? intval($_POST['form_id']) : 0;
        $template_id = isset($_POST['template_id']) ? intval($_POST['template_id']) : 0;
        $theme_id = isset($_POST['theme_id'])
            ? ThemeHelper::sanitize_id(sanitize_text_field(wp_unslash($_POST['theme_id'])))
            : ThemeHelper::THEME_CLASSIC;

        // Validate form name
        if (empty(trim($form_name))) {
            return RequestHelper::json_error('Form name is required.');
        }
    
        // Let's work with the direct $_POST version for now
        $form_fields = trim($form_fields_raw);
    
        // Try the decode
        $decoded_fields = json_decode($form_fields, true);
        $json_error = json_last_error();
        $json_error_msg = json_last_error_msg();
    
        if ($json_error !== JSON_ERROR_NONE) {
           
            return RequestHelper::json_error('Invalid form fields format: ' . $json_error_msg . ' (Error code: ' . $json_error . ')');
        }
    
        // Create form data structure for sanitization
        $form_data = [
            'title' => $form_title,
            'description' => $form_description,
            'fields' => $decoded_fields
        ];
    
        $sanitized_form_data = $this->sanitize_form_data($form_data);
        
        if ($form_id > 0) {
            
            // Load existing settings and merge title/description
            $existing_form = Form::find($form_id);
            $existing_settings = $existing_form ? json_decode($existing_form->settings, true) : [];
            if (!is_array($existing_settings)) $existing_settings = [];
            $existing_settings['title'] = $sanitized_form_data['title'] ?? 'Quote Request Form';
            $existing_settings['description'] = $sanitized_form_data['description'] ?? '';
            $existing_settings['layout'] = $this->sanitize_form_layout($form_layout_raw);

            $update_data = [
                'name' => $form_name,
                'settings' => json_encode($existing_settings),
                'fields' => json_encode($sanitized_form_data['fields'] ?? []),
                'updated_at' => current_time('mysql')
            ];
  
            // Debug: Check if form exists before update
            if (!$existing_form) {
              
                return RequestHelper::json_error('Form not found for update (ID: ' . $form_id . ')');
            }
    
            $result = Form::update($form_id, $update_data);
    
            if (!$result) {
                // Get more detailed error information
                global $wpdb;
                return RequestHelper::json_error('Failed to update form. Check error logs for details.');
            }
    
            return RequestHelper::json_success([
                'data' => [
                    'form_id' => $form_id,
                    // 'redirect_url' => admin_url('admin.php?page=' . $this->plugin_name . '-edit-form&form_id=' . $form_id),
                    'message' => 'Form updated successfully.'
                ]
            ]);
            
            
        } else {
            $design_defaults = array_merge(
                ThemeHelper::get_default_design($theme_id),
                [
                    'fontFamily'   => 'system',
                    'fontSize'     => 16,
                    'formWidth'    => 'container',
                    'fieldSpacing' => 1.5,
                ]
            );

            $create_data = [
                'name' => $form_name,
                'template_id' => $template_id, // Use selected template
                'active' => 1,
                'settings' => json_encode([
                    'title' => $sanitized_form_data['title'] ?? 'Quote Request Form',
                    'description' => $sanitized_form_data['description'] ?? '',
                    'layout' => $this->sanitize_form_layout($form_layout_raw),
                    'design' => $design_defaults,
                ]),
                'fields' => json_encode($sanitized_form_data['fields'] ?? []),
                'created_at' => current_time('mysql'),
                'updated_at' => current_time('mysql')
            ];
            
          
            $new_form_id = Form::create($create_data);
          
            if (!$new_form_id) {
                // Get more detailed error information
                global $wpdb;
               
                return RequestHelper::json_error('Failed to create form. Check error logs for details.');
            }
    
            return RequestHelper::json_success([
                'data' => [
                    'form_id' => $new_form_id,
                    'redirect_url' => admin_url('admin.php?page=' . $this->plugin_name . '-edit-form&form_id=' . $new_form_id),
                    'message' => 'Form created successfully.'
                ]
            ]);
            
        }
    }

    public function edit()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'quotemate'));
        }

        $form_id = RequestHelper::input('form_id', 0, 'GET', 'int');

        if (!$form_id) {
            wp_die(esc_html__('Invalid form ID.', 'quotemate'));
        }

        $form = Form::find($form_id);

        if (!$form) {
            wp_die(esc_html__('Form not found.', 'quotemate'));
        }

        // Decode form settings and fields
        $settings = json_decode($form->settings, true) ?: [];
        $fields = json_decode($form->fields, true) ?: [];
        
        // Ensure fields is always an array
        if (!is_array($fields)) {
           
            $fields = [];
        }

        // Prepare form data for JavaScript
        $form_data = [
            'id' => $form->id,
            'name' => $form->name,
            'title' => $settings['title'] ?? 'Quote Request Form',
            'description' => $settings['description'] ?? 'Please fill out this form to receive a quote for our services.',
            'fields' => $fields
        ];
        
        // Debug logging

        AssetHelper::enqueue_assets('admin/forms/edit');

        ViewRenderer::render('Forms/edit', true, [
            'title' => 'Edit Form: ' . $form->name,
            'form' => $form,
            'form_data' => $form_data
        ], 'Forms/builder');
    }

    private function sanitize_form_data($form_data)
    {
        $sanitized = [];

        // Sanitize basic form properties
        $sanitized['title'] = isset($form_data['title']) ? sanitize_text_field($form_data['title']) : '';
        $sanitized['description'] = isset($form_data['description']) ? sanitize_textarea_field($form_data['description']) : '';

        // Sanitize fields
        $sanitized['fields'] = [];
        if (isset($form_data['fields']) && is_array($form_data['fields'])) {
            foreach ($form_data['fields'] as $field) {
                $sanitized_field = $this->sanitize_field_data($field);
                if ($sanitized_field) {
                    $sanitized['fields'][] = $sanitized_field;
                }
            }
        }

        return $sanitized;
    }

    /**
     * Sanitize and validate builder layout (rows/columns/fieldIds). Returns null if invalid.
     */
    private function sanitize_form_layout($form_layout_raw)
    {
        if ($form_layout_raw === '' || $form_layout_raw === null) {
            return null;
        }
        $decoded = json_decode($form_layout_raw, true);
        if (!is_array($decoded) || !isset($decoded['rows']) || !is_array($decoded['rows'])) {
            return null;
        }
        $sanitized_rows = [];
        foreach ($decoded['rows'] as $row) {
            if (!is_array($row) || !isset($row['id']) || !isset($row['columns']) || !is_array($row['columns'])) {
                continue;
            }
            $sanitized_columns = [];
            foreach ($row['columns'] as $col) {
                if (!is_array($col) || !isset($col['id'])) {
                    continue;
                }
                $field_ids = isset($col['fieldIds']) && is_array($col['fieldIds'])
                    ? array_map('sanitize_key', $col['fieldIds'])
                    : [];
                $sanitized_columns[] = [
                    'id' => sanitize_key($col['id']),
                    'fieldIds' => $field_ids,
                ];
            }
            if (!empty($sanitized_columns)) {
                $sanitized_rows[] = [
                    'id' => sanitize_key($row['id']),
                    'columns' => $sanitized_columns,
                ];
            }
        }
        return empty($sanitized_rows) ? null : [ 'rows' => $sanitized_rows ];
    }

    private function sanitize_field_data($field)
    {
        if (!is_array($field) || !isset($field['type']) || !isset($field['id'])) {
            return null;
        }

        $sanitized = [
            'id' => sanitize_key($field['id']),
            'type' => sanitize_key($field['type']),
            'label' => isset($field['label']) ? sanitize_text_field($field['label']) : '',
            'required' => isset($field['required']) ? (bool) $field['required'] : false,
        ];

        // Sanitize optional properties
        $optional_props = [
            'description', 'placeholder', 'cssClass', 'defaultValue',
            'fieldSize', 'inputMask', 'minValue', 'maxValue',
            'acceptTypes', 'maxFileSize',
            'page_title', 'page_description', 'section_title',
            'page_prev_title', 'page_prev_description',
            'styleLabelColor', 'styleLabelSize', 'styleInputColor', 'styleInputBg',
            'styleBorderWidth', 'styleBorderColor', 'styleBorderRadius', 'stylePadding',
            'styleBorderRadiusTopLeft', 'styleBorderRadiusTopRight', 'styleBorderRadiusBottomRight', 'styleBorderRadiusBottomLeft', 'styleBorderRadiusUnit',
            'styleMarginTop', 'styleMarginRight', 'styleMarginBottom', 'styleMarginLeft', 'styleMarginUnit',
            'stylePaddingTop', 'stylePaddingRight', 'stylePaddingBottom', 'stylePaddingLeft', 'stylePaddingUnit',
            'stylePrevMarginTop', 'stylePrevMarginRight', 'stylePrevMarginBottom', 'stylePrevMarginLeft', 'stylePrevMarginUnit',
            'stylePrevPaddingTop', 'stylePrevPaddingRight', 'stylePrevPaddingBottom', 'stylePrevPaddingLeft', 'stylePrevPaddingUnit',
            'styleFontFamily', 'styleFontSize', 'styleFontWeight', 'styleTextTransform', 'styleFontStyle', 'styleTextDecoration',
            'styleLineHeight', 'styleLetterSpacing', 'styleWordSpacing',
            'styleInputFontFamily', 'styleInputFontSize', 'styleInputFontWeight',
            'heading_level', 'heading_align', 'paragraph_content',
            'page_break_align', 'page_break_button_color',
            'page_break_prev_align', 'page_break_prev_button_color',
            // Builder layout helpers (row/column indexes) – used to reconstruct rows on reload
            'rowIndex', 'columnIndex',
        ];
        foreach ($optional_props as $prop) {
            if (isset($field[$prop])) {
                $sanitized[$prop] = sanitize_text_field($field[$prop]);
            }
        }

        if (isset($sanitized['fieldSize'])) {
            $field_size = sanitize_key($sanitized['fieldSize']);
            if (in_array($field_size, ['small', 'medium', 'large'], true)) {
                $sanitized['fieldSize'] = $field_size;
            } else {
                unset($sanitized['fieldSize']);
            }
        }

        if (isset($field['optionLayout'])) {
            $option_layout = sanitize_key((string) $field['optionLayout']);
            if (in_array($option_layout, ['vertical', 'horizontal'], true)) {
                $sanitized['optionLayout'] = $option_layout;
            }
        }

        if (isset($field['optionStyle'])) {
            $option_style = sanitize_key((string) $field['optionStyle']);
            if (in_array($option_style, ['default', 'standard'], true)) {
                $sanitized['optionStyle'] = $option_style;
            }
        }

        if (($field['type'] ?? '') === 'heading') {
            if (isset($field['heading_level'])) {
                $level = sanitize_key($field['heading_level']);
                $sanitized['heading_level'] = in_array($level, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], true) ? $level : 'h2';
            }
            if (isset($field['heading_align'])) {
                $align = sanitize_key($field['heading_align']);
                $sanitized['heading_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
            }
            if (isset($field['label'])) {
                $sanitized['label'] = sanitize_textarea_field($field['label']);
            }
        }

        if (($field['type'] ?? '') === 'paragraph' && isset($field['paragraph_content'])) {
            $sanitized['paragraph_content'] = sanitize_textarea_field($field['paragraph_content']);
        }

        if (($field['type'] ?? '') === 'page_break') {
            if (isset($field['page_break_align'])) {
                $align = sanitize_key($field['page_break_align']);
                $sanitized['page_break_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
            }
            if (isset($field['page_break_button_color'])) {
                $color = trim((string) $field['page_break_button_color']);
                if ($color === '') {
                    unset($sanitized['page_break_button_color']);
                } elseif (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $color)) {
                    $sanitized['page_break_button_color'] = $color;
                }
            }
            if (isset($field['page_break_prev_align'])) {
                $align = sanitize_key($field['page_break_prev_align']);
                $sanitized['page_break_prev_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
            }
            if (isset($field['page_break_prev_button_color'])) {
                $color = trim((string) $field['page_break_prev_button_color']);
                if ($color === '') {
                    unset($sanitized['page_break_prev_button_color']);
                } elseif (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $color)) {
                    $sanitized['page_break_prev_button_color'] = $color;
                }
            }
            if (isset($field['step_title'])) {
                $step_title = sanitize_text_field($field['step_title']);
                if ($step_title !== '') {
                    $sanitized['step_title'] = $step_title;
                }
            }
        }

        if (($field['type'] ?? '') === 'form_summary') {
            if (isset($field['summary_prev_align'])) {
                $align = sanitize_key($field['summary_prev_align']);
                $sanitized['summary_prev_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
            }
            if (isset($field['summary_submit_align'])) {
                $align = sanitize_key($field['summary_submit_align']);
                $sanitized['summary_submit_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
            }
            if (isset($field['summary_prev_button_color'])) {
                $color = trim((string) $field['summary_prev_button_color']);
                if ($color === '') {
                    unset($sanitized['summary_prev_button_color']);
                } elseif (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $color)) {
                    $sanitized['summary_prev_button_color'] = $color;
                }
            }
            if (isset($field['summary_submit_button_color'])) {
                $color = trim((string) $field['summary_submit_button_color']);
                if ($color === '') {
                    unset($sanitized['summary_submit_button_color']);
                } elseif (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $color)) {
                    $sanitized['summary_submit_button_color'] = $color;
                }
            }
            if (isset($field['summaryButtonOrder'])) {
                $order = sanitize_key($field['summaryButtonOrder']);
                $sanitized['summaryButtonOrder'] = in_array($order, ['prev_submit', 'submit_prev'], true)
                    ? $order
                    : 'prev_submit';
            }
        }

        // Sanitize boolean properties (Advance tab + Style layout linked)
        $bool_props = [
            'hideLabel', 'readOnly', 'show_tax', 'show_discount',
            'styleMarginLinked', 'stylePaddingLinked', 'styleBorderRadiusLinked',
            'stylePrevMarginLinked', 'stylePrevPaddingLinked',
            'show_previous_button',
            'showSubtotal', 'showGrandTotal', 'showQuantity', 'showPricingType', 'showPath',
            'showDeliveryTime', 'showSavingsHighlight', 'showTax', 'showDiscount',
            'showTermsCheckbox', 'termsRequired', 'showPrintButton',
            'addPrice', 'addDescription', 'showPrice',
        ];
        foreach ($bool_props as $prop) {
            if (isset($field[$prop])) {
                $sanitized[$prop] = (bool) $field[$prop];
            }
        }

        // Sanitize numeric properties
        if (isset($field['tax_rate'])) {
            $sanitized['tax_rate'] = is_numeric($field['tax_rate']) ? (float) $field['tax_rate'] : 0;
        }
        if (isset($field['taxRate'])) {
            $sanitized['taxRate'] = is_numeric($field['taxRate']) ? (float) $field['taxRate'] : 0;
        }
        if (isset($field['discountValue'])) {
            $sanitized['discountValue'] = is_numeric($field['discountValue']) ? (float) $field['discountValue'] : 0;
        }

        // Form Summary text/select settings
        $summary_text_props = [
            'stepTitle', 'summaryTitle', 'currencyCode', 'currencySymbol', 'layoutStyle', 'serviceDisplayMode',
            'taxMode', 'discountType', 'submitButtonText', 'summary_prev_title', 'summaryButtonOrder',
            'summary_prev_button_color', 'summary_submit_button_color', 'summary_prev_align', 'summary_submit_align',
            'emptyStateMessage', 'termsText', 'disclaimerText',
        ];
        foreach ($summary_text_props as $prop) {
            if (isset($field[$prop])) {
                $sanitized[$prop] = sanitize_text_field($field[$prop]);
            }
        }

        if (isset($field['taxMode']) && !in_array($field['taxMode'], ['exclusive', 'inclusive'], true)) {
            $sanitized['taxMode'] = 'exclusive';
        }
        if (isset($field['discountType']) && !in_array($field['discountType'], ['percent', 'fixed'], true)) {
            $sanitized['discountType'] = 'percent';
        }
        if (isset($field['layoutStyle']) && !in_array($field['layoutStyle'], ['detailed', 'compact', 'card'], true)) {
            $sanitized['layoutStyle'] = 'detailed';
        }
        if (isset($field['serviceDisplayMode']) && !in_array($field['serviceDisplayMode'], ['final_only', 'all_levels'], true)) {
            $sanitized['serviceDisplayMode'] = 'final_only';
        }

        // Sanitize html_content (allows limited HTML)
        if (isset($field['html_content'])) {
            $sanitized['html_content'] = wp_kses_post($field['html_content']);
        }

        // Sanitize arrays (options, services, products, ranges)
        $array_props = ['options', 'services', 'products', 'ranges'];
        foreach ($array_props as $prop) {
            if (isset($field[$prop]) && is_array($field[$prop])) {
                $sanitized[$prop] = $this->sanitize_field_array($field[$prop], $prop);
            }
        }

        if (isset($field['optionPrices']) && is_array($field['optionPrices'])) {
            $sanitized['optionPrices'] = [];
            foreach ($field['optionPrices'] as $label => $price) {
                $clean_label = sanitize_textarea_field((string) $label);
                if ($clean_label === '') {
                    continue;
                }
                $sanitized['optionPrices'][$clean_label] = is_numeric($price) ? (float) $price : 0;
            }
        }

        if (isset($field['optionDescriptions']) && is_array($field['optionDescriptions'])) {
            $sanitized['optionDescriptions'] = [];
            foreach ($field['optionDescriptions'] as $label => $description) {
                $clean_label = sanitize_textarea_field((string) $label);
                $clean_description = sanitize_textarea_field((string) $description);
                if ($clean_label === '' || $clean_description === '') {
                    continue;
                }
                $sanitized['optionDescriptions'][$clean_label] = $clean_description;
            }
        }

        // Sanitize serviceStructure (legacy 2-level service format)
        if (isset($field['serviceStructure']) && is_array($field['serviceStructure'])) {
            $sanitized['serviceStructure'] = $this->sanitize_service_structure($field['serviceStructure']);
        }

        // Top-level label for the first dropdown (e.g. "Cars", "House", "Year")
        if (isset($field['serviceStructureLabel'])) {
            $sanitized['serviceStructureLabel'] = sanitize_text_field($field['serviceStructureLabel']);
        }

        if (isset($field['maxDropdownsPerPageDesktop'])) {
            $max_dropdowns = (int) $field['maxDropdownsPerPageDesktop'];
            $sanitized['maxDropdownsPerPageDesktop'] = max(1, min(12, $max_dropdowns));
        }

        if (isset($field['serviceMaxQuantity'])) {
            $max_quantity = (int) $field['serviceMaxQuantity'];
            if ($max_quantity >= 1) {
                $sanitized['serviceMaxQuantity'] = $max_quantity;
            }
        }

        if (($field['type'] ?? '') === 'service') {
            if (isset($field['pageBreakHeading'])) {
                $sanitized['pageBreakHeading'] = sanitize_text_field($field['pageBreakHeading']);
            }

            if (isset($field['pageBreakDescription'])) {
                $sanitized['pageBreakDescription'] = sanitize_textarea_field($field['pageBreakDescription']);
            }

            if (isset($field['pageBreakHeadingField']) && is_array($field['pageBreakHeadingField'])) {
                $sanitized['pageBreakHeadingField'] = $this->sanitize_embedded_content_field($field['pageBreakHeadingField'], 'heading');
                if (!empty($sanitized['pageBreakHeadingField']['label'])) {
                    $sanitized['pageBreakHeading'] = sanitize_text_field($sanitized['pageBreakHeadingField']['label']);
                }
            }

            if (isset($field['pageBreakDescriptionField']) && is_array($field['pageBreakDescriptionField'])) {
                $sanitized['pageBreakDescriptionField'] = $this->sanitize_embedded_content_field($field['pageBreakDescriptionField'], 'paragraph');
                if (!empty($sanitized['pageBreakDescriptionField']['paragraph_content'])) {
                    $sanitized['pageBreakDescription'] = sanitize_textarea_field($sanitized['pageBreakDescriptionField']['paragraph_content']);
                }
            }
        }

        // Sanitize enhancedServiceStructure (new unlimited nested service format)
        if (isset($field['enhancedServiceStructure']) && is_array($field['enhancedServiceStructure'])) {
            $sanitized['enhancedServiceStructure'] = $this->sanitize_enhanced_service_structure($field['enhancedServiceStructure']);
        }

        // Sanitize custom pricing types
        if (isset($field['customPricingTypes']) && is_array($field['customPricingTypes'])) {
            $sanitized['customPricingTypes'] = $this->sanitize_custom_pricing_types($field['customPricingTypes']);
        }

        // Sanitize conditional logic
        if (isset($field['conditionalLogic']) && is_array($field['conditionalLogic'])) {
            $sanitized['conditionalLogic'] = $this->sanitize_conditional_logic($field['conditionalLogic']);
        }

        return $sanitized;
    }

    private function sanitize_field_array($array, $type)
    {
        $sanitized = [];

        foreach ($array as $item) {
            if ($type === 'services' && is_array($item)) {
                $sanitized[] = [
                    'name' => isset($item['name']) ? sanitize_text_field($item['name']) : '',
                    'price' => isset($item['price']) ? (float) $item['price'] : 0
                ];
            } elseif ($type === 'products' && is_array($item)) {
                $sanitized[] = [
                    'name' => isset($item['name']) ? sanitize_text_field($item['name']) : '',
                    'description' => isset($item['description']) ? sanitize_text_field($item['description']) : '',
                    'quantity' => isset($item['quantity']) ? (int) $item['quantity'] : 1,
                    'price' => isset($item['price']) ? (float) $item['price'] : 0
                ];
            } else {
                // For simple arrays like options (preserve multi-line labels)
                $sanitized[] = sanitize_textarea_field((string) $item);
            }
        }

        return $sanitized;
    }

    private function sanitize_service_structure($service_structure)
    {
        $sanitized = [];

        foreach ($service_structure as $category) {
            if (!is_array($category)) {
                continue;
            }

            $sanitized_category = [
                'name' => isset($category['name']) ? sanitize_text_field($category['name']) : '',
                'description' => isset($category['description']) ? sanitize_textarea_field($category['description']) : '',
                'children' => []
            ];

            if (isset($category['children']) && is_array($category['children'])) {
                foreach ($category['children'] as $service) {
                    if (!is_array($service)) {
                        continue;
                    }

                    $sanitized_service = [
                        'name' => isset($service['name']) ? sanitize_text_field($service['name']) : '',
                        'description' => isset($service['description']) ? sanitize_textarea_field($service['description']) : '',
                        'pricingType' => isset($service['pricingType']) ? sanitize_key($service['pricingType']) : 'fixed',
                        'basePrice' => isset($service['basePrice']) ? (float) $service['basePrice'] : 0,
                        'minQuantity' => isset($service['minQuantity']) ? (int) $service['minQuantity'] : 1,
                        'maxQuantity' => isset($service['maxQuantity']) ? (int) $service['maxQuantity'] : 999,
                        'deliveryTime' => isset($service['deliveryTime']) ? sanitize_text_field($service['deliveryTime']) : ''
                    ];

                    // Validate pricing type
                    $valid_pricing_types = ['fixed', 'per_page', 'per_hour', 'per_item'];
                    if (!in_array($sanitized_service['pricingType'], $valid_pricing_types)) {
                        $sanitized_service['pricingType'] = 'fixed';
                    }

                    $sanitized_category['children'][] = $sanitized_service;
                }
            }

            $sanitized[] = $sanitized_category;
        }

        return $sanitized;
    }

    /**
     * Sanitize embedded heading/paragraph field objects stored on service structure nodes.
     */
    private function sanitize_embedded_content_field(array $field, string $type): array
    {
        $sanitized = [
            'type' => $type,
            'id' => sanitize_key($field['id'] ?? ($type === 'heading' ? 'page_break_heading' : 'page_break_description')),
            'required' => false,
        ];

        $optional_props = [
            'description', 'placeholder', 'cssClass', 'defaultValue',
            'fieldSize', 'styleLabelColor', 'styleLabelSize', 'styleInputColor', 'styleInputBg',
            'styleBorderWidth', 'styleBorderColor', 'styleBorderRadius', 'stylePadding',
            'styleBorderRadiusTopLeft', 'styleBorderRadiusTopRight', 'styleBorderRadiusBottomRight', 'styleBorderRadiusBottomLeft', 'styleBorderRadiusUnit',
            'styleMarginTop', 'styleMarginRight', 'styleMarginBottom', 'styleMarginLeft', 'styleMarginUnit',
            'stylePaddingTop', 'stylePaddingRight', 'stylePaddingBottom', 'stylePaddingLeft', 'stylePaddingUnit',
            'styleFontFamily', 'styleFontSize', 'styleFontWeight', 'styleTextTransform', 'styleFontStyle', 'styleTextDecoration',
            'styleLineHeight', 'styleLetterSpacing', 'styleWordSpacing',
            'styleInputFontFamily', 'styleInputFontSize', 'styleInputFontWeight',
            'heading_level', 'heading_align',
        ];

        foreach ($optional_props as $prop) {
            if (isset($field[$prop])) {
                $sanitized[$prop] = sanitize_text_field($field[$prop]);
            }
        }

        if ($type === 'heading') {
            $sanitized['label'] = isset($field['label'])
                ? sanitize_textarea_field($field['label'])
                : '';
            if (isset($field['heading_level'])) {
                $level = sanitize_key($field['heading_level']);
                $sanitized['heading_level'] = in_array($level, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], true) ? $level : 'h2';
            }
            if (isset($field['heading_align'])) {
                $align = sanitize_key($field['heading_align']);
                $sanitized['heading_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
            }
        }

        if ($type === 'paragraph' && isset($field['paragraph_content'])) {
            $sanitized['paragraph_content'] = sanitize_textarea_field($field['paragraph_content']);
        }

        if ($type === 'paragraph' && isset($field['heading_align'])) {
            $align = sanitize_key($field['heading_align']);
            $sanitized['heading_align'] = in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
        }

        if (isset($field['conditionalLogic']) && is_array($field['conditionalLogic'])) {
            $sanitized['conditionalLogic'] = $this->sanitize_conditional_logic($field['conditionalLogic']);
        }

        return $sanitized;
    }

    private function sanitize_enhanced_service_structure($enhanced_service_structure)
    {
        $sanitized = [];

        foreach ($enhanced_service_structure as $item) {
            if (!is_array($item)) {
                continue;
            }

            $sanitized_item = [
                'type' => isset($item['type']) ? sanitize_key($item['type']) : 'category',
            ];

            // Validate type
            if (!in_array($sanitized_item['type'], ['category', 'service', 'page_break'])) {
                $sanitized_item['type'] = 'category';
            }

            // Handle page breaks - they only need a type field
            if ($sanitized_item['type'] === 'page_break') {
                $sanitized[] = $sanitized_item;
                continue;
            }

            // Add name for category and service types
            $sanitized_item['name'] = isset($item['name']) ? sanitize_text_field($item['name']) : '';

            if (isset($item['id'])) {
                $sanitized_item['id'] = sanitize_text_field($item['id']);
            }

            // Label for this item's options dropdown (e.g. "models", "type")
            if (isset($item['optionsLabel'])) {
                $sanitized_item['optionsLabel'] = sanitize_text_field($item['optionsLabel']);
            }

            if (isset($item['pageBreakBeforeOptions'])) {
                $sanitized_item['pageBreakBeforeOptions'] = (bool) $item['pageBreakBeforeOptions'];
            }

            if (isset($item['pageBreakTitle'])) {
                $sanitized_item['pageBreakTitle'] = sanitize_text_field($item['pageBreakTitle']);
            }

            if (isset($item['pageBreakHeading'])) {
                $sanitized_item['pageBreakHeading'] = sanitize_text_field($item['pageBreakHeading']);
            }

            if (isset($item['pageBreakDescription'])) {
                $sanitized_item['pageBreakDescription'] = sanitize_textarea_field($item['pageBreakDescription']);
            }

            if (isset($item['pageBreakHeadingField']) && is_array($item['pageBreakHeadingField'])) {
                $sanitized_item['pageBreakHeadingField'] = $this->sanitize_embedded_content_field($item['pageBreakHeadingField'], 'heading');
                if (!empty($sanitized_item['pageBreakHeadingField']['label'])) {
                    $sanitized_item['pageBreakHeading'] = sanitize_text_field($sanitized_item['pageBreakHeadingField']['label']);
                }
            }

            if (isset($item['pageBreakDescriptionField']) && is_array($item['pageBreakDescriptionField'])) {
                $sanitized_item['pageBreakDescriptionField'] = $this->sanitize_embedded_content_field($item['pageBreakDescriptionField'], 'paragraph');
                if (!empty($sanitized_item['pageBreakDescriptionField']['paragraph_content'])) {
                    $sanitized_item['pageBreakDescription'] = sanitize_textarea_field($sanitized_item['pageBreakDescriptionField']['paragraph_content']);
                }
            }

            $this->apply_enhanced_item_pricing_fields($sanitized_item, $item);

            // Handle children recursively for unlimited nesting
            if (isset($item['children']) && is_array($item['children']) && count($item['children']) > 0) {
                $sanitized_item['children'] = $this->sanitize_enhanced_service_structure($item['children']);
            } else {
                // Always include children array, even if empty
                $sanitized_item['children'] = [];
            }

            $sanitized[] = $sanitized_item;
        }

        return $sanitized;
    }

    /**
     * Persist pricing on service nodes and priced category leaves (builder allows both).
     */
    private function apply_enhanced_item_pricing_fields(array &$sanitized_item, array $item): void
    {
        $has_pricing =
            $sanitized_item['type'] === 'service' ||
            isset($item['pricingType']) ||
            isset($item['basePrice']) ||
            (isset($item['pricingTiers']) && is_array($item['pricingTiers']) && count($item['pricingTiers']) > 0);

        if (!$has_pricing) {
            return;
        }

        $sanitized_item['pricingType'] = isset($item['pricingType']) ? sanitize_key($item['pricingType']) : 'fixed';
        $sanitized_item['basePrice'] = isset($item['basePrice']) ? (float) $item['basePrice'] : 0;

        $valid_pricing_types = [
            'fixed', 'per_page', 'per_hour', 'per_item', 'per_month', 'per_year',
            'per_user', 'per_feature', 'per_backlink', 'per_post', 'per_campaign', 'per_project',
        ];

        if (
            !in_array($sanitized_item['pricingType'], $valid_pricing_types, true) &&
            !str_starts_with($sanitized_item['pricingType'], 'custom_')
        ) {
            $sanitized_item['pricingType'] = 'fixed';
        }

        if (isset($item['description'])) {
            $sanitized_item['description'] = sanitize_textarea_field($item['description']);
        }
        if (isset($item['minQuantity'])) {
            $sanitized_item['minQuantity'] = (int) $item['minQuantity'];
        }
        if (isset($item['maxQuantity'])) {
            $sanitized_item['maxQuantity'] = (int) $item['maxQuantity'];
        }
        if (isset($item['deliveryTime'])) {
            $sanitized_item['deliveryTime'] = (int) $item['deliveryTime'];
        }
        if (isset($item['pricingTiers']) && is_array($item['pricingTiers'])) {
            $sanitized_item['pricingTiers'] = $this->sanitize_pricing_tiers($item['pricingTiers']);
        }
    }

    private function sanitize_pricing_tiers($pricing_tiers)
    {
        $sanitized = [];

        foreach ($pricing_tiers as $tier) {
            if (!is_array($tier)) {
                continue;
            }

            $sanitized_tier = [
                'minQuantity' => isset($tier['minQuantity']) ? (int) $tier['minQuantity'] : 1,
                'maxQuantity' => isset($tier['maxQuantity']) ? (int) $tier['maxQuantity'] : null,
                'price' => isset($tier['price']) ? (float) $tier['price'] : 0,
                'deliveryTime' => isset($tier['deliveryTime']) ? (int) $tier['deliveryTime'] : 7
            ];

            // Validate quantities
            if ($sanitized_tier['minQuantity'] < 1) {
                $sanitized_tier['minQuantity'] = 1;
            }
            if ($sanitized_tier['maxQuantity'] !== null && $sanitized_tier['maxQuantity'] < $sanitized_tier['minQuantity']) {
                $sanitized_tier['maxQuantity'] = $sanitized_tier['minQuantity'];
            }
            if ($sanitized_tier['price'] < 0) {
                $sanitized_tier['price'] = 0;
            }
            if ($sanitized_tier['deliveryTime'] < 1) {
                $sanitized_tier['deliveryTime'] = 1;
            }

            $sanitized[] = $sanitized_tier;
        }

        return $sanitized;
    }

    private function sanitize_custom_pricing_types($custom_pricing_types)
    {
        $sanitized = [];

        foreach ($custom_pricing_types as $pricing_type) {
            if (!is_array($pricing_type)) {
                continue;
            }

            $sanitized_type = [
                'key' => isset($pricing_type['key']) ? sanitize_key($pricing_type['key']) : '',
                'label' => isset($pricing_type['label']) ? sanitize_text_field($pricing_type['label']) : '',
                'unit' => isset($pricing_type['unit']) ? sanitize_text_field($pricing_type['unit']) : ''
            ];

            // Ensure key starts with 'custom_' for security
            if (!str_starts_with($sanitized_type['key'], 'custom_')) {
                $sanitized_type['key'] = 'custom_' . $sanitized_type['key'];
            }

            // Only add if we have both label and unit
            if (!empty($sanitized_type['label']) && !empty($sanitized_type['unit'])) {
                $sanitized[] = $sanitized_type;
            }
        }

        return $sanitized;
    }

    private function sanitize_conditional_logic($conditional_logic)
    {
        $sanitized = [
            'enabled' => isset($conditional_logic['enabled']) ? (bool) $conditional_logic['enabled'] : false,
            'logicType' => isset($conditional_logic['logicType']) ? sanitize_key($conditional_logic['logicType']) : 'show',
            'operator' => isset($conditional_logic['operator']) ? sanitize_key($conditional_logic['operator']) : 'all',
            'conditions' => []
        ];

        // Validate logicType
        if (!in_array($sanitized['logicType'], ['show', 'hide'])) {
            $sanitized['logicType'] = 'show';
        }

        // Validate operator
        if (!in_array($sanitized['operator'], ['all', 'any'])) {
            $sanitized['operator'] = 'all';
        }

        // Sanitize conditions
        if (isset($conditional_logic['conditions']) && is_array($conditional_logic['conditions'])) {
            foreach ($conditional_logic['conditions'] as $condition) {
                $sanitized_condition = $this->sanitize_conditional_rule($condition);
                if ($sanitized_condition) {
                    $sanitized['conditions'][] = $sanitized_condition;
                }
            }
        }

        return $sanitized;
    }

    private function sanitize_conditional_rule($condition)
    {
        if (!is_array($condition)) {
            return null;
        }

        $valid_operators = [
            'is', 'is_not', 'greater_than', 'less_than',
            'contains', 'starts_with', 'ends_with',
            'is_empty', 'is_not_empty'
        ];

        $sanitized = [
            'field' => isset($condition['field']) ? sanitize_key($condition['field']) : '',
            'operator' => isset($condition['operator']) ? sanitize_key($condition['operator']) : 'is',
            'value' => isset($condition['value']) ? sanitize_text_field($condition['value']) : ''
        ];

        // Validate operator
        if (!in_array($sanitized['operator'], $valid_operators)) {
            $sanitized['operator'] = 'is';
        }

        // Don't require value for empty/not empty operators
        if (in_array($sanitized['operator'], ['is_empty', 'is_not_empty'])) {
            $sanitized['value'] = '';
        }

        // Must have a field reference
        if (empty($sanitized['field'])) {
            return null;
        }

        return $sanitized;
    }

    public function add_screen_options()
    {
        add_screen_option('per_page', [
            'label'   => 'Forms per page',
            'default' => 10,
            'option'  => 'quotemate_forms_per_page',
        ]);
    }

    public function set_screen_option($status, $option, $value)
    {
        if ($option === 'quotemate_forms_per_page') {
            return $value;
        }

        return $status;
    }

    public function save_form_settings()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            return RequestHelper::json_error('You do not have permission to perform this action.');
        }

        if (!RequestHelper::verify_action_nonce('quotemate_save_form_settings', 'quotemate_nonce')) {
            return RequestHelper::json_error('Security check failed.');
        }

        $form_id = isset($_POST['form_id']) ? intval($_POST['form_id']) : 0;
        if (!$form_id) {
            return RequestHelper::json_error('Invalid form ID.');
        }

        $settings = isset($_POST['settings']) ? wp_unslash($_POST['settings']) : '';
        if (empty($settings)) {
            return RequestHelper::json_error('No settings data provided.');
        }

        try {
            // Decode settings to validate JSON
            $decoded_settings = json_decode($settings, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return RequestHelper::json_error('Invalid settings format: ' . json_last_error_msg());
            }

            // Get existing form
            $form = Form::find($form_id);
            if (!$form) {
                return RequestHelper::json_error('Form not found.');
            }

            // Update form settings
            $result = Form::update($form_id, [
                'settings' => $settings,
                'updated_at' => current_time('mysql')
            ]);

            if (!$result) {
                return RequestHelper::json_error('Failed to update form settings.');
            }

            return RequestHelper::json_success([
                'message' => 'Form settings saved successfully.',
                'settings' => $decoded_settings
            ]);

        } catch (\Exception $e) {
          
            return RequestHelper::json_error('An error occurred while saving settings.');
        }
    }
}
