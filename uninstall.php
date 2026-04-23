<?php
/**
 * Uninstall QuoteMate Plugin
 * 
 * @package QuoteMate
 * @since 1.0.0
 */

// If uninstall not called from WordPress, then exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Check if user wants to keep data
$keep_data = get_option('quotemate_keep_data_on_uninstall', false);

if (!$keep_data) {
    // Remove all plugin data
    quotemate_remove_all_data();
} else {
    // Only remove plugin options, keep form and submission data
    quotemate_remove_plugin_options();
}

/**
 * Remove all plugin data including forms and submissions
 */
function quotemate_remove_all_data() {
    global $wpdb;
    
    // Remove all database tables
    $tables = [
        $wpdb->prefix . 'quotemate_forms',
        $wpdb->prefix . 'quotemate_submissions', 
        $wpdb->prefix . 'quotemate_templates',
        $wpdb->prefix . 'quotemate_template_categories',
        $wpdb->prefix . 'quotemate_settings'
    ];
    
    foreach ($tables as $table) {
        $wpdb->query("DROP TABLE IF EXISTS {$table}");
    }
    
    // Remove plugin options
    quotemate_remove_plugin_options();
}

/**
 * Remove only plugin options, keep data tables
 */
function quotemate_remove_plugin_options() {
    // Remove plugin options
    delete_option('quotemate_version');
    delete_option('quotemate_db_version');
    delete_option('quotemate_settings');
    delete_option('quotemate_keep_data_on_uninstall');
    
    // Remove any transients
    delete_transient('quotemate_forms_cache');
    delete_transient('quotemate_templates_cache');
    
    // Clear any scheduled cron jobs
    wp_clear_scheduled_hook('quotemate_cleanup_submissions');
} 