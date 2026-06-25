<?php
// Updated FormDisplayController.php
namespace Dawnsol\Quotemate\Admin\Controllers;

use Dawnsol\Quotemate\Traits\Singleton;
use Dawnsol\Quotemate\Admin\Models\Form;
use Dawnsol\Quotemate\Admin\Models\Submission;
use Dawnsol\Quotemate\Helpers\ViewRenderer;
use Dawnsol\Quotemate\Helpers\LogHelper;

class FormDisplayController
{
    use Singleton;

    public function __construct()
    {
       
        add_action('wp_ajax_quotemate_submit_form', [$this, 'handle_form_submission']);
        add_action('wp_ajax_nopriv_quotemate_submit_form', [$this, 'handle_form_submission']);
       
    }

    public function render_form_shortcode($atts)
    {
        $atts = shortcode_atts([
            'id' => 0,
        ], $atts);

        $form_id = intval($atts['id']);
        if (!$form_id) {
            return '<p>No form specified.</p>';
        }

        $form = Form::find($form_id);
        if (!$form) {
            return '<p>Form not found.</p>';
        }

        $settings = json_decode($form->settings, true) ?? [];
        $fields   = json_decode($form->fields, true) ?? [];

        // Enqueue conditional logic and calculation assets if needed
        $this->enqueue_form_assets($fields);

        ob_start();
        ViewRenderer::render('Templates/form-view', false, [
            'form'     => $form,
            'fields'   => $fields,
            'settings' => $settings,
        ]);
        return ob_get_clean();
    }

    /**
     * Enqueue form assets (conditional logic and calculations) based on field types
     */
    private function enqueue_form_assets($fields)
    {
        // Check if any fields have conditional logic
        $has_conditional_logic = false;
        $has_calculation_fields = false;
        $has_form_summary = false;
        
        foreach ($fields as $field) {
            // Check for conditional logic
            if (isset($field['conditionalLogic']) && 
                isset($field['conditionalLogic']['enabled']) && 
                $field['conditionalLogic']['enabled'] === true &&
                !empty($field['conditionalLogic']['conditions'])) {
                $has_conditional_logic = true;
            }
            
            // Check for calculation-related fields
            if (in_array($field['type'], ['service', 'service_options', 'quantity', 'quote_total', 'form_summary'])) {
                $has_calculation_fields = true;
            }

            if (($field['type'] ?? '') === 'form_summary') {
                $has_form_summary = true;
            }
        }

        // Enqueue conditional logic if needed
        if ($has_conditional_logic) {
            wp_enqueue_script(
                'quotemate-conditional-logic',
                QUOTEMATE_URL . 'public/js/conditional-logic.js',
                [],
                QUOTEMATE_VERSION,
                true
            );

            // Enqueue conditional logic CSS
            wp_register_style('quotemate-conditional-logic-css', false);
            wp_enqueue_style('quotemate-conditional-logic-css');
            wp_add_inline_style('quotemate-conditional-logic-css', '
                .form-group[data-hidden-by-logic="true"] {
                    display: none !important;
                }
                .form-group {
                    transition: opacity 0.3s ease;
                }
            ');
        }

        // Enqueue calculation engine if needed
        if ($has_calculation_fields) {
            wp_enqueue_script(
                'quotemate-calculation',
                QUOTEMATE_URL . 'public/js/quote-calculation.js',
                [],
                QUOTEMATE_VERSION,
                true
            );
        }
        
        $has_enhanced_service = $this->hasEnhancedServiceFields($fields);
        $needs_unified_steps = $has_enhanced_service
            || $this->hasFormPageBreaks($fields)
            || $this->hasServiceStructurePageBreaks($fields);

        // Enqueue progressive service selector if enhanced service fields are present
        // Only load on frontend, not in admin
        if (!is_admin() && $has_enhanced_service) {
            wp_enqueue_script(
                'quotemate-progressive-service-selector',
                QUOTEMATE_URL . 'public/js/progressive-service-selector.js',
                [],
                time(), // Force cache bust for debugging
                true
            );
            wp_enqueue_style(
                'quotemate-progressive-service-selector',
                QUOTEMATE_URL . 'public/css/progressive-service-selector.css',
                [],
                QUOTEMATE_VERSION
            );
        }

        if (!is_admin() && $needs_unified_steps) {
            $unified_deps = $has_enhanced_service ? ['quotemate-progressive-service-selector'] : [];
            wp_enqueue_script(
                'quotemate-unified-form-steps',
                QUOTEMATE_URL . 'public/js/unified-form-steps.js',
                $unified_deps,
                time(),
                true
            );
        }

        if (!is_admin() && $has_form_summary) {
            $summary_deps = [];
            if ($has_enhanced_service) {
                $summary_deps[] = 'quotemate-progressive-service-selector';
            }
            if ($needs_unified_steps) {
                $summary_deps[] = 'quotemate-unified-form-steps';
            }
            wp_enqueue_style(
                'quotemate-quote-summary',
                QUOTEMATE_URL . 'public/css/quote-summary.css',
                [],
                time()
            );
            wp_enqueue_script(
                'quotemate-quote-summary',
                QUOTEMATE_URL . 'public/js/quote-summary.js',
                array_values(array_unique($summary_deps)),
                time(),
                true
            );
        }
        // Always enqueue multi-step form script as it handles pagination if present
        wp_enqueue_script(
            'quotemate-multi-step-form',
            QUOTEMATE_URL . 'public/js/multi-step-form.js',
            [],
            QUOTEMATE_VERSION,
            true
        );

    }

    public function handle_form_submission()
    {
       
        
        // Temporarily disable nonce check for debugging
        // Verify nonce
        if (!wp_verify_nonce($_POST['quotemate_nonce'] ?? '', 'quotemate_submit_form')) {
           
            // Temporarily comment out for debugging
            // wp_send_json_error(['message' => esc_html__('Security check failed. Please refresh the page and try again.', 'quotemate')]);
            // return;
        }
        
       

        // Rate limiting check
        if ($this->is_rate_limited()) {
            wp_send_json_error(['message' => esc_html__('Too many submissions. Please wait a moment before trying again.', 'quotemate')]);
            return;
        }

        $form_id = intval($_POST['form_id'] ?? 0);
        if (!$form_id) {
            wp_send_json_error(['message' => esc_html__('Invalid form ID.', 'quotemate')]);
            return;
        }

        $form = Form::find($form_id);
        if (!$form) {
            wp_send_json_error(['message' => esc_html__('Form not found.', 'quotemate')]);
            return;
        }

        // Check if form is active
        if (!$form->active) {
            wp_send_json_error(['message' => esc_html__('This form is currently inactive.', 'quotemate')]);
            return;
        }

        $fields = json_decode($form->fields, true) ?? [];
        $submitted_data = [];
        $user_email = '';
        $quote_total_price = 0.00;

        // Process form data
        foreach ($fields as $field) {
            if (in_array($field['type'], ['page_break', 'section_break'])) {
                continue;
            }

            $field_id = $field['id'];
            $field_value = $_POST[$field_id] ?? '';

            // Validate required fields
            if (!empty($field['required']) && empty($field_value) && $field['type'] !== 'form_summary') {
                wp_send_json_error(['message' => sprintf(esc_html__('Field "%s" is required.', 'quotemate'), esc_html($field['label']))]);
                return;
            }

            // Special handling for service fields
            if ($field['type'] === 'service' || $field['type'] === 'service_options') {

                // Collect all dynamic service fields
                $service_data = [
                    'selected_service' => sanitize_text_field($field_value),
                    'selected_path' => sanitize_text_field($_POST[$field_id . '_selected_path'] ?? ''),
                    'pricing_type' => sanitize_text_field($_POST[$field_id . '_pricing_type'] ?? ''),
                    'base_price' => floatval($_POST[$field_id . '_base_price'] ?? 0),
                    'final_price' => floatval($_POST[$field_id . '_final_price'] ?? 0)
                ];
                
                // Add dynamic fields (category, subcategory, etc.)
                $dynamic_fields = [];
                foreach ($_POST as $key => $value) {
                    if (strpos($key, $field_id . '_') === 0 && !in_array($key, [
                        $field_id . '_selected_path',
                        $field_id . '_pricing_type', 
                        $field_id . '_base_price',
                        $field_id . '_final_price'
                    ])) {
                        $field_name = str_replace($field_id . '_', '', $key);
                        $dynamic_fields[$field_name] = sanitize_text_field($value);
                    }
                }
                
                // Add dynamic fields to service data
                if (!empty($dynamic_fields)) {
                    $service_data['dynamic_fields'] = $dynamic_fields;
                }
                
                $submitted_data[$field_id] = [
                    'label' => $field['label'] ?? $field_id,
                    'value' => $service_data,
                    'type' => $field['type'],
                    'display_value' => $service_data['selected_service'] . ' ($' . number_format($service_data['final_price'], 2) . ')'
                ];
            } elseif ($field['type'] === 'form_summary') {
                $snapshot_raw = wp_unslash($_POST[$field_id . '_snapshot'] ?? '');
                $snapshot = json_decode($snapshot_raw, true);
                $total_value = is_numeric($field_value) ? floatval($field_value) : 0.0;
                if ($total_value <= 0 && is_array($snapshot) && isset($snapshot['totals']['total'])) {
                    $total_value = floatval($snapshot['totals']['total']);
                }
                $quote_total_price = $total_value;

                $submitted_data[$field_id] = [
                    'label' => $field['label'] ?? $field_id,
                    'value' => $total_value,
                    'type' => $field['type'],
                    'snapshot' => is_array($snapshot) ? $snapshot : [],
                    'display_value' => '$' . number_format($total_value, 2),
                ];
            } else {
                // Sanitize based on field type
                switch ($field['type']) {
                    case 'email':
                        $field_value = sanitize_email($field_value);
                        if (!empty($field_value) && !is_email($field_value)) {
                            wp_send_json_error(['message' => esc_html__('Please enter a valid email address.', 'quotemate')]);
                            return;
                        }
                        if (!empty($field_value)) {
                            $user_email = $field_value;
                        }
                        break;
                    case 'textarea':
                        $field_value = sanitize_textarea_field($field_value);
                        break;
                    case 'select':
                    case 'radio':
                        $field_value = sanitize_text_field($field_value);
                        // Validate against allowed options
                        if (!empty($field['options']) && !in_array($field_value, $field['options'])) {
                            $field_value = '';
                        }
                        break;
                    case 'checkbox':
                        $field_value = $field_value ? '1' : '0';
                        break;
                    case 'number':
                        $field_value = is_numeric($field_value) ? floatval($field_value) : '';
                        break;
                    default:
                        $field_value = sanitize_text_field($field_value);
                        break;
                }

                $submitted_data[$field_id] = [
                    'label' => $field['label'] ?? $field_id,
                    'value' => $field_value,
                    'type' => $field['type']
                ];
            }
        }

        // Save submission to database
        try {
            $submission_data = [
                'form_id' => $form_id,
                'submitted_data' => json_encode($submitted_data),
                'user_email' => $user_email,
                'price' => $quote_total_price,
                'viewed' => 0
            ];

            $submission_id = Submission::create($submission_data);

            if ($submission_id) {
                // Set rate limiting
                $this->set_rate_limit();
                
                // Send notification emails
                $this->send_notification_emails($form, $submitted_data, $user_email);

                wp_send_json_success([
                    'message' => esc_html__('Your quote request has been submitted successfully! We will get back to you soon.', 'quotemate'),
                    'submission_id' => $submission_id
                ]);
            } else {
                wp_send_json_error(['message' => esc_html__('Failed to save your submission. Please try again.', 'quotemate')]);
            }
        } catch (Exception $e) {
            LogHelper::error('Quotemate form submission error: ' . $e->getMessage());
            wp_send_json_error(['message' => esc_html__('An error occurred while processing your submission.', 'quotemate')]);
        }
    }

    /**
     * Check if user is rate limited
     */
    private function is_rate_limited()
    {
        // Disable rate limiting completely for development
        if (defined('WP_DEBUG') && WP_DEBUG && isset($_GET['disable_rate_limit'])) {
            return false;
        }
        
        $ip = $this->get_client_ip();
        $rate_limit_key = 'quotemate_rate_limit_' . md5($ip);
        $last_submission = get_transient($rate_limit_key);
        
        return $last_submission !== false;
    }

    /**
     * Set rate limit for user
     */
    private function set_rate_limit()
    {
        $ip = $this->get_client_ip();
        $rate_limit_key = 'quotemate_rate_limit_' . md5($ip);
        
        // Rate limit duration: 30 seconds for testing, can be increased for production
        $rate_limit_duration = 30; // 30 seconds instead of 5 minutes
        
        // Option to disable rate limiting for development
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $rate_limit_duration = 5; // 5 seconds for development
        }
        
        set_transient($rate_limit_key, time(), $rate_limit_duration);
    }

    /**
     * Get client IP address
     */
    private function get_client_ip()
    {
        $ip_keys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    private function send_notification_emails($form, $submitted_data, $user_email)
    {
        // Admin notification
        // $admin_email = get_option('admin_email');

        $admin_email = 'developerdawnsol@gmail.com';
        $subject = 'New Quote Request from ' . get_bloginfo('name');
        
        $message = "A new quote request has been submitted:\n\n";
        foreach ($submitted_data as $field_id => $field_data) {
            if (!empty($field_data['value'])) {
                if ($field_data['type'] === 'service' && is_array($field_data['value'])) {
                    $service_data = $field_data['value'];
                    $message .= $field_data['label'] . ":\n";
                    $message .= "  - Service: " . $service_data['selected_service'] . "\n";
                    $message .= "  - Path: " . $service_data['selected_path'] . "\n";
                    $message .= "  - Pricing: " . $service_data['pricing_type'] . "\n";
                    $message .= "  - Base Price: $" . number_format($service_data['base_price'], 2) . "\n";
                    $message .= "  - Final Price: $" . number_format($service_data['final_price'], 2) . "\n";
                } else {
                    $message .= $field_data['label'] . ": " . $field_data['value'] . "\n";
                }
            }
        }
        
        wp_mail($admin_email, $subject, $message);

        // Customer confirmation (if email provided)
        if (!empty($user_email)) {
            $customer_subject = 'Quote Request Confirmation - ' . get_bloginfo('name');
            $customer_message = "Thank you for your quote request. We have received your information and will get back to you soon.\n\n";
            $customer_message .= "Your submitted information:\n";
            
            foreach ($submitted_data as $field_id => $field_data) {
                if (!empty($field_data['value'])) {
                    if ($field_data['type'] === 'service' && is_array($field_data['value'])) {
                        $service_data = $field_data['value'];
                        $customer_message .= $field_data['label'] . ":\n";
                        $customer_message .= "  - Service: " . $service_data['selected_service'] . "\n";
                        $customer_message .= "  - Path: " . $service_data['selected_path'] . "\n";
                        $customer_message .= "  - Pricing: " . $service_data['pricing_type'] . "\n";
                        $customer_message .= "  - Base Price: $" . number_format($service_data['base_price'], 2) . "\n";
                        $customer_message .= "  - Final Price: $" . number_format($service_data['final_price'], 2) . "\n";
                    } else {
                        $customer_message .= $field_data['label'] . ": " . $field_data['value'] . "\n";
                    }
                }
            }
            
            wp_mail($user_email, $customer_subject, $customer_message);
        }
    }
    
    /**
     * Check if form has enhanced service fields (with serviceStructure)
     */
    private function hasEnhancedServiceFields($fields)
    {
        foreach ($fields as $field) {
            if (($field['type'] === 'service' || $field['type'] === 'service_options')) {
                // Check for legacy service structure
                if (!empty($field['serviceStructure']) && is_array($field['serviceStructure']) && count($field['serviceStructure']) > 0) {
                    return true;
                }
                
                // Check for enhanced service structure
                if (!empty($field['enhancedServiceStructure']) && is_array($field['enhancedServiceStructure']) && count($field['enhancedServiceStructure']) > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    private function hasFormPageBreaks($fields)
    {
        foreach ($fields as $field) {
            if (($field['type'] ?? '') === 'page_break') {
                return true;
            }
        }
        return false;
    }

    private function hasServiceStructurePageBreaks($fields)
    {
        foreach ($fields as $field) {
            if (!in_array($field['type'] ?? '', ['service', 'service_options'], true)) {
                continue;
            }

            $structure = $field['enhancedServiceStructure'] ?? $field['serviceStructure'] ?? [];
            if ($this->structureHasPageBreaks($structure)) {
                return true;
            }
        }
        return false;
    }

    private function structureHasPageBreaks($structure)
    {
        foreach ($structure as $item) {
            if (!is_array($item)) {
                continue;
            }

            if (($item['type'] ?? '') === 'page_break') {
                return true;
            }

            if (!empty($item['pageBreakBeforeOptions'])) {
                return true;
            }

            if (!empty($item['children']) && $this->structureHasPageBreaks($item['children'])) {
                return true;
            }
        }
        return false;
    }
}