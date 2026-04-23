<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class CompatibilityHelper
{
    /**
     * Check if the system meets minimum requirements
     */
    public static function check_system_requirements()
    {
        $errors = [];
        $warnings = [];

        // Check WordPress version
        if (version_compare(get_bloginfo('version'), '5.0', '<')) {
            $errors[] = 'WordPress 5.0 or higher is required. Current version: ' . get_bloginfo('version');
        }

        // Check PHP version
        if (version_compare(PHP_VERSION, '7.4', '<')) {
            $errors[] = 'PHP 7.4 or higher is required. Current version: ' . PHP_VERSION;
        }

        // Check MySQL version
        global $wpdb;
        $mysql_version = $wpdb->db_version();
        if (version_compare($mysql_version, '5.6', '<')) {
            $warnings[] = 'MySQL 5.6 or higher is recommended. Current version: ' . $mysql_version;
        }

        // Check required PHP extensions
        $required_extensions = ['json', 'mbstring', 'pdo', 'pdo_mysql'];
        foreach ($required_extensions as $ext) {
            if (!extension_loaded($ext)) {
                $errors[] = "PHP extension '{$ext}' is required but not installed.";
            }
        }

        // Check recommended PHP extensions
        $recommended_extensions = ['curl', 'openssl', 'zip'];
        foreach ($recommended_extensions as $ext) {
            if (!extension_loaded($ext)) {
                $warnings[] = "PHP extension '{$ext}' is recommended but not installed.";
            }
        }

        // Check file permissions
        $upload_dir = wp_upload_dir();
        $log_dir = $upload_dir['basedir'] . '/quotemate-logs/';
        
        if (!is_dir($log_dir)) {
            wp_mkdir_p($log_dir);
        }
        
        if (!is_writable($log_dir)) {
            $warnings[] = 'Log directory is not writable: ' . $log_dir;
        }

        return [
            'errors' => $errors,
            'warnings' => $warnings,
            'compatible' => empty($errors)
        ];
    }

    /**
     * Check security settings
     */
    public static function check_security_settings()
    {
        $issues = [];

        // Check if debug mode is enabled in production
        if (defined('WP_DEBUG') && WP_DEBUG && !defined('WP_DEBUG_DISPLAY')) {
            $issues[] = 'Debug mode is enabled. Consider disabling in production.';
        }

        // Check if file editing is disabled
        if (defined('DISALLOW_FILE_EDIT') && !DISALLOW_FILE_EDIT) {
            $issues[] = 'File editing is enabled in admin. Consider disabling for security.';
        }

        // Check if file modifications are disabled
        if (defined('DISALLOW_FILE_MODS') && !DISALLOW_FILE_MODS) {
            $issues[] = 'File modifications are enabled. Consider disabling for security.';
        }

        return $issues;
    }

    /**
     * Check database connectivity and permissions
     */
    public static function check_database_health()
    {
        global $wpdb;
        $issues = [];

        // Test database connection
        $result = $wpdb->get_var("SELECT 1");
        if ($result !== '1') {
            $issues[] = 'Database connection failed: ' . $wpdb->last_error;
            return $issues;
        }

        // Check if tables exist
        $tables = [
            $wpdb->prefix . 'quotemate_forms',
            $wpdb->prefix . 'quotemate_submissions',
            $wpdb->prefix . 'quotemate_templates',
            $wpdb->prefix . 'quotemate_template_categories',
            $wpdb->prefix . 'quotemate_settings'
        ];

        foreach ($tables as $table) {
            $exists = $wpdb->get_var("SHOW TABLES LIKE '{$table}'") === $table;
            if (!$exists) {
                $issues[] = "Required table '{$table}' does not exist.";
            }
        }

        return $issues;
    }

    /**
     * Display compatibility report
     */
    public static function display_compatibility_report()
    {
        $requirements = self::check_system_requirements();
        $security = self::check_security_settings();
        $database = self::check_database_health();

        ?>
        <div class="wrap">
            <h1><?php esc_html_e('QuoteMate System Compatibility Report', 'quotemate'); ?></h1>
            
            <?php if (!empty($requirements['errors'])): ?>
                <div class="notice notice-error">
                    <h3><?php esc_html_e('Critical Issues:', 'quotemate'); ?></h3>
                    <ul>
                        <?php foreach ($requirements['errors'] as $error): ?>
                            <li><?php echo esc_html($error); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php if (!empty($requirements['warnings'])): ?>
                <div class="notice notice-warning">
                    <h3><?php esc_html_e('Warnings:', 'quotemate'); ?></h3>
                    <ul>
                        <?php foreach ($requirements['warnings'] as $warning): ?>
                            <li><?php echo esc_html($warning); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php if (!empty($security)): ?>
                <div class="notice notice-warning">
                    <h3><?php esc_html_e('Security Recommendations:', 'quotemate'); ?></h3>
                    <ul>
                        <?php foreach ($security as $issue): ?>
                            <li><?php echo esc_html($issue); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php if (!empty($database)): ?>
                <div class="notice notice-error">
                    <h3><?php esc_html_e('Database Issues:', 'quotemate'); ?></h3>
                    <ul>
                        <?php foreach ($database as $issue): ?>
                            <li><?php echo esc_html($issue); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <?php if (empty($requirements['errors']) && empty($database)): ?>
                <div class="notice notice-success">
                    <p><strong><?php esc_html_e('✅ All systems are compatible!', 'quotemate'); ?></strong></p>
                    <p><?php esc_html_e('QuoteMate should work properly on your system.', 'quotemate'); ?></p>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Get system information for debugging
     */
    public static function get_system_info()
    {
        global $wpdb;
        
        return [
            'wordpress_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'mysql_version' => $wpdb->db_version(),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'wp_debug' => defined('WP_DEBUG') && WP_DEBUG,
            'wp_debug_log' => defined('WP_DEBUG_LOG') && WP_DEBUG_LOG,
            'wp_debug_display' => defined('WP_DEBUG_DISPLAY') && WP_DEBUG_DISPLAY,
            'active_theme' => get_template(),
            'active_plugins' => get_option('active_plugins'),
        ];
    }
} 