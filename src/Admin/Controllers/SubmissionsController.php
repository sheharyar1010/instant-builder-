<?php

namespace Dawnsol\Quotemate\Admin\Controllers;

use Dawnsol\Quotemate\Admin\Models\Form;
use Dawnsol\Quotemate\Admin\Models\Submission;
use Dawnsol\Quotemate\Admin\Includes\Tables\SubmissionsListTable;
use Dawnsol\Quotemate\Helpers\AssetHelper;
use Dawnsol\Quotemate\Helpers\RequestHelper;
use Dawnsol\Quotemate\Helpers\SanitizationHelper;
use Dawnsol\Quotemate\Helpers\ViewRenderer;
use Dawnsol\Quotemate\Traits\Singleton;

class SubmissionsController
{
    use Singleton;

    private $loader;
    private $plugin_name;
    private $version;

    public function __construct($plugin_name = '', $version = '', $loader = null)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->loader = $loader;

        // Add AJAX handlers
        add_action('wp_ajax_update_submission', [$this, 'update_submission']);
        add_action('wp_ajax_update_submission_price', [$this, 'update_submission_price']);
        add_action('wp_ajax_update_submission_data', [$this, 'update_submission_data']);
    }

    /**
     * Display list of submissions for a specific form
     */
    public function index()
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

        // Create submissions list table
        $submissions_list_table = new SubmissionsListTable($form_id);
        $submissions_list_table->prepare_items();

        // Enqueue styles
        wp_enqueue_style('quotemate-submissions', QUOTEMATE_URL . 'assets/css/admin/submissions.css', [], $this->version);

        ViewRenderer::render('Submissions/index', true, [
            'table' => $submissions_list_table,
            'form' => $form
        ]);
    }

    /**
     * View a single submission
     */
    public function view()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have permission to access this page.', 'quotemate'));
        }

        $submission_id = RequestHelper::input('submission_id', 0, 'GET', 'int');
        
        if (!$submission_id) {
            wp_die(esc_html__('Invalid submission ID.', 'quotemate'));
        }

        $submission = Submission::find($submission_id);
        
        if (!$submission) {
            wp_die(esc_html__('Submission not found.', 'quotemate'));
        }

        // Mark submission as viewed if not already viewed
        if (!$submission->viewed) {
            Submission::mark_as_viewed($submission_id);
        }

        // Get form details
        $form = Form::find($submission->form_id);
        if (!$form) {
            wp_die(esc_html__('Associated form not found.', 'quotemate'));
        }

        // Decode submitted data
        $submitted_data = json_decode($submission->submitted_data, true) ?: [];
        
        // Get form fields for reference
        $form_fields = json_decode($form->fields, true) ?: [];
        
        // Create a field map for easy reference
        $field_map = [];
        foreach ($form_fields as $field) {
            $field_map[$field['id']] = $field;
        }

        // Enqueue styles and scripts
        wp_enqueue_style('quotemate-submissions', QUOTEMATE_URL . 'assets/css/admin/submissions.css', [], $this->version);
        wp_enqueue_script('quotemate-submission-view', QUOTEMATE_URL . 'assets/js/admin/submissions/view.js', ['jquery'], $this->version, true);
        
        // Pass data to script
        wp_localize_script('quotemate-submission-view', 'quotemate_submission', [
            'id' => $submission_id,
            'nonce' => wp_create_nonce('wp_ajax')
        ]);

        ViewRenderer::render('Submissions/view', true, [
            'submission' => $submission,
            'form' => $form,
            'submitted_data' => $submitted_data,
            'field_map' => $field_map
        ]);
    }

    /**
     * Handle AJAX submission update
     */
    public function update_submission()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            return RequestHelper::json_error('You do not have permission to perform this action.');
        }

        if (!RequestHelper::verify_action_nonce('quotemate_update_submission', 'quotemate_nonce')) {
            return RequestHelper::json_error('Security check failed.');
        }

        $submission_id = isset($_POST['submission_id']) ? intval($_POST['submission_id']) : 0;
        if (!$submission_id) {
            return RequestHelper::json_error('Invalid submission ID.');
        }

        $submission = Submission::find($submission_id);
        if (!$submission) {
            return RequestHelper::json_error('Submission not found.');
        }

        $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
        $submitted_data = isset($_POST['submitted_data']) ? wp_unslash($_POST['submitted_data']) : '';

        // Update price
        if (isset($_POST['price'])) {
            $result = Submission::update_price($submission_id, $price);
            if (!$result) {
                return RequestHelper::json_error('Failed to update price.');
            }
        }

        // Update submitted data if provided
        if (!empty($submitted_data)) {
            try {
                // Decode to validate JSON
                $decoded_data = json_decode($submitted_data, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    return RequestHelper::json_error('Invalid data format: ' . json_last_error_msg());
                }

                // Update submission data
                $result = Submission::update_submitted_data($submission_id, $submitted_data);

                if ($result === false) {
                    return RequestHelper::json_error('Failed to update submission data.');
                }
            } catch (\Exception $e) {
                return RequestHelper::json_error('Error updating submission: ' . $e->getMessage());
            }
        }

        return RequestHelper::json_success([
            'message' => 'Submission updated successfully.',
            'submission_id' => $submission_id
        ]);
    }

    /**
     * Handle AJAX price update
     */
    public function update_submission_price()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_send_json_error('You do not have permission to perform this action.');
            return;
        }

        // Verify nonce
        if (!RequestHelper::verify_action_nonce('update_submission_price', 'nonce')) {
            wp_send_json_error('Security check failed.');
            return;
        }

        $submission_id = isset($_POST['submission_id']) ? intval($_POST['submission_id']) : 0;
        if (!$submission_id) {
            wp_send_json_error('Invalid submission ID.');
            return;
        }

        $submission = Submission::find($submission_id);
        if (!$submission) {
            wp_send_json_error('Submission not found.');
            return;
        }

        $price = isset($_POST['price']) ? floatval($_POST['price']) : 0;
        if ($price < 0) {
            wp_send_json_error('Price cannot be negative.');
            return;
        }

        // Update price
        $result = Submission::update_price($submission_id, $price);
        if (!$result) {
            wp_send_json_error('Failed to update price.');
            return;
        }

        wp_send_json_success([
            'message' => 'Price updated successfully.',
            'submission_id' => $submission_id,
            'price' => $price
        ]);
    }

    /**
     * Handle AJAX submission data update
     */
    public function update_submission_data()
    {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_send_json_error('You do not have permission to perform this action.');
            return;
        }

        // Verify nonce
        if (!RequestHelper::verify_action_nonce('update_submission_data', 'nonce')) {
            wp_send_json_error('Security check failed.');
            return;
        }

        $submission_id = isset($_POST['submission_id']) ? intval($_POST['submission_id']) : 0;
        if (!$submission_id) {
            wp_send_json_error('Invalid submission ID.');
            return;
        }

        $submission = Submission::find($submission_id);
        if (!$submission) {
            wp_send_json_error('Submission not found.');
            return;
        }

        $submission_data = isset($_POST['submission_data']) ? $_POST['submission_data'] : [];
        if (empty($submission_data)) {
            wp_send_json_error('No data provided.');
            return;
        }

        // Get existing submitted data
        $existing_data = json_decode($submission->submitted_data, true) ?: [];
        
        // Update the data with new values
        foreach ($submission_data as $field_id => $value) {
            if (isset($existing_data[$field_id])) {
                $existing_data[$field_id]['value'] = sanitize_text_field($value);
            }
        }

        // Update submission data
        $result = Submission::update_submitted_data($submission_id, json_encode($existing_data));
        if ($result === false) {
            wp_send_json_error('Failed to update submission data.');
            return;
        }

        wp_send_json_success([
            'message' => 'Submission data updated successfully.',
            'submission_id' => $submission_id
        ]);
    }

    /**
     * Add screen options for submissions list
     */
    public function add_screen_options()
    {
        add_screen_option('per_page', [
            'label'   => 'Submissions per page',
            'default' => 10,
            'option'  => 'quotemate_submissions_per_page',
        ]);
    }

    /**
     * Set screen option
     */
    public function set_screen_option($status, $option, $value)
    {
        if ($option === 'quotemate_submissions_per_page') {
            return $value;
        }

        return $status;
    }
} 