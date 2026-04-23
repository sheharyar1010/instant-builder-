<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Traits\Singleton;

defined('ABSPATH') || exit;

/**
 * Configuration Class
 * 
 * Centralizes all plugin configuration and settings
 * 
 * @since 1.0.0
 */
class Config
{
    use Singleton;

    /**
     * Plugin configuration
     */
    private $config = [];

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->init_config();
    }

    /**
     * Initialize configuration
     */
    private function init_config()
    {
        $this->config = [
            'plugin' => [
                'name' => QUOTEMATE_NAME,
                'version' => QUOTEMATE_VERSION,
                'file' => QUOTEMATE_PLUGIN_FILE,
                'dir' => QUOTEMATE_DIR,
                'url' => QUOTEMATE_URL,
                'basename' => QUOTEMATE_BASENAME,
            ],
            'database' => [
                'tables' => [
                    'forms' => 'quotemate_forms',
                    'submissions' => 'quotemate_submissions',
                    'templates' => 'quotemate_templates',
                    'template_categories' => 'quotemate_template_categories',
                    'settings' => 'quotemate_settings',
                ],
                'version' => '1.0.0',
            ],
            'capabilities' => [
                'manage_forms' => 'manage_options',
                'view_submissions' => 'manage_options',
                'edit_submissions' => 'manage_options',
                'delete_submissions' => 'manage_options',
            ],
            'nonces' => [
                'admin_action' => 'quotemate_admin_action',
                'save_form' => 'quotemate_save_form',
                'save_form_settings' => 'quotemate_save_form_settings',
                'update_submission' => 'quotemate_update_submission',
                'update_submission_price' => 'update_submission_price',
                'update_submission_data' => 'update_submission_data',
                'submit_form' => 'quotemate_submit_form',
                'uninstall_settings' => 'quotemate_uninstall_settings',
                'dismiss_notice' => 'quotemate_dismiss_notice',
            ],
            'rate_limiting' => [
                'enabled' => true,
                'cooldown' => 300, // 5 minutes
                'max_attempts' => 1,
            ],
            'email' => [
                'admin_notifications' => true,
                'customer_confirmations' => true,
                'html_emails' => true,
            ],
            'security' => [
                'sanitize_inputs' => true,
                'validate_nonces' => true,
                'check_capabilities' => true,
                'rate_limiting' => true,
            ],
            'debug' => [
                'enabled' => defined('WP_DEBUG') && WP_DEBUG,
                'log_errors' => true,
                'log_queries' => false,
            ],
        ];
    }

    /**
     * Get configuration value
     */
    public function get($key, $default = null)
    {
        $keys = explode('.', $key);
        $value = $this->config;

        foreach ($keys as $k) {
            if (!isset($value[$k])) {
                return $default;
            }
            $value = $value[$k];
        }

        return $value;
    }

    /**
     * Set configuration value
     */
    public function set($key, $value)
    {
        $keys = explode('.', $key);
        $config = &$this->config;

        foreach ($keys as $k) {
            if (!isset($config[$k])) {
                $config[$k] = [];
            }
            $config = &$config[$k];
        }

        $config = $value;
    }

    /**
     * Get plugin info
     */
    public function get_plugin_info()
    {
        return $this->get('plugin');
    }

    /**
     * Get database table name
     */
    public function get_table($table)
    {
        global $wpdb;
        $table_name = $this->get("database.tables.{$table}");
        return $wpdb->prefix . $table_name;
    }

    /**
     * Get capability for action
     */
    public function get_capability($action)
    {
        return $this->get("capabilities.{$action}", 'manage_options');
    }

    /**
     * Get nonce action
     */
    public function get_nonce_action($action)
    {
        return $this->get("nonces.{$action}", 'quotemate_admin_action');
    }

    /**
     * Check if feature is enabled
     */
    public function is_enabled($feature)
    {
        return $this->get("security.{$feature}", false);
    }

    /**
     * Get rate limiting settings
     */
    public function get_rate_limiting()
    {
        return $this->get('rate_limiting');
    }

    /**
     * Get email settings
     */
    public function get_email_settings()
    {
        return $this->get('email');
    }

    /**
     * Get debug settings
     */
    public function get_debug_settings()
    {
        return $this->get('debug');
    }

    /**
     * Get all configuration
     */
    public function get_all()
    {
        return $this->config;
    }

    /**
     * Load configuration from database
     */
    public function load_from_database()
    {
        $saved_config = get_option('quotemate_config', []);
        
        if (!empty($saved_config)) {
            $this->config = array_merge($this->config, $saved_config);
        }
    }

    /**
     * Save configuration to database
     */
    public function save_to_database()
    {
        update_option('quotemate_config', $this->config);
    }

    /**
     * Reset configuration to defaults
     */
    public function reset()
    {
        $this->init_config();
        $this->save_to_database();
    }
} 