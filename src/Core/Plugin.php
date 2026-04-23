<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Admin\Admin;
use Dawnsol\Quotemate\Frontend\Frontend;
use Dawnsol\Quotemate\Helpers\CompatibilityHelper;
use Dawnsol\Quotemate\Traits\Singleton;

defined('ABSPATH') || exit;

/**
 * Main Plugin Class
 * 
 * This is the main plugin class that orchestrates the entire plugin.
 * It follows WordPress plugin architecture best practices.
 * 
 * @since 1.0.0
 */
class Plugin
{
    use Singleton;

    /**
     * Plugin version
     */
    const VERSION = QUOTEMATE_VERSION;

    /**
     * Plugin name
     */
    const PLUGIN_NAME = QUOTEMATE_NAME;

    /**
     * Plugin file path
     */
    const PLUGIN_FILE = QUOTEMATE_PLUGIN_FILE;

    /**
     * Plugin directory path
     */
    const PLUGIN_DIR = QUOTEMATE_DIR;

    /**
     * Plugin URL
     */
    const PLUGIN_URL = QUOTEMATE_URL;

    /**
     * @var Loader
     */
    private $loader;

    /**
     * @var Admin
     */
    private $admin;

    /**
     * @var Frontend
     */
    private $frontend;

    /**
     * @var bool
     */
    private $is_initialized = false;

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->init_hooks();
    }

    /**
     * Initialize plugin hooks
     */
    private function init_hooks()
    {
        // Initialize on plugins_loaded to ensure WordPress is fully loaded
        add_action('plugins_loaded', [$this, 'init'], 0);
        
        // Register activation and deactivation hooks
        register_activation_hook(self::PLUGIN_FILE, [$this, 'activate']);
        register_deactivation_hook(self::PLUGIN_FILE, [$this, 'deactivate']);
    }

    /**
     * Initialize the plugin
     */
    public function init()
    {
        if ($this->is_initialized) {
            return;
        }

        // Check system compatibility
        if (!$this->check_compatibility()) {
            return;
        }

        // Load text domain
        $this->load_textdomain();

        // Initialize core components
        $this->init_core();

        // Initialize admin if in admin area
        if (is_admin()) {
            $this->init_admin();
        }

        // Initialize frontend
        $this->init_frontend();

        $this->is_initialized = true;

        // Fire action for other plugins/themes to hook into
        do_action('quotemate_initialized', $this);
    }

    /**
     * Check system compatibility
     */
    private function check_compatibility()
    {
        $requirements = CompatibilityHelper::check_system_requirements();
        
        if (!$requirements['compatible']) {
            add_action('admin_notices', function() use ($requirements) {
                echo '<div class="notice notice-error"><p>';
                echo '<strong>QuoteMate Plugin Error:</strong> ';
                echo 'Your system does not meet the minimum requirements. ';
                echo '<a href="' . admin_url('admin.php?page=quotemate-system-report') . '">View System Report</a>';
                echo '</p></div>';
            });
            return false;
        }

        return true;
    }

    /**
     * Load text domain
     */
    private function load_textdomain()
    {
        load_plugin_textdomain(
            'quotemate',
            false,
            dirname(plugin_basename(self::PLUGIN_FILE)) . '/languages/'
        );
    }

    /**
     * Initialize core components
     */
    private function init_core()
    {
        $this->loader = Loader::getInstance();
    }

    /**
     * Initialize admin components
     */
    private function init_admin()
    {
        $this->admin = Admin::getInstance(self::PLUGIN_NAME, self::VERSION, $this->loader);
    }

    /**
     * Initialize frontend components
     */
    private function init_frontend()
    {
        $this->frontend = Frontend::getInstance(self::PLUGIN_NAME, self::VERSION);
    }

    /**
     * Plugin activation
     */
    public function activate()
    {
        // Check compatibility before activation
        $requirements = CompatibilityHelper::check_system_requirements();
        
        if (!$requirements['compatible']) {
            deactivate_plugins(plugin_basename(self::PLUGIN_FILE));
            wp_die(
                'QuoteMate requires WordPress 5.0+, PHP 7.4+, and MySQL 5.6+. Please upgrade your system.',
                'Plugin Activation Error',
                ['back_link' => true]
            );
        }

        // Run activation
        Activator::getInstance()->activate();

        // Set activation flag
        update_option('quotemate_activated', true);
        update_option('quotemate_version', self::VERSION);

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate()
    {
        Deactivator::getInstance()->deactivate();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Get loader instance
     */
    public function get_loader()
    {
        return $this->loader;
    }

    /**
     * Get admin instance
     */
    public function get_admin()
    {
        return $this->admin;
    }

    /**
     * Get frontend instance
     */
    public function get_frontend()
    {
        return $this->frontend;
    }

    /**
     * Check if plugin is initialized
     */
    public function is_initialized()
    {
        return $this->is_initialized;
    }

    /**
     * Get plugin info
     */
    public static function get_plugin_info()
    {
        return [
            'name' => self::PLUGIN_NAME,
            'version' => self::VERSION,
            'file' => self::PLUGIN_FILE,
            'dir' => self::PLUGIN_DIR,
            'url' => self::PLUGIN_URL,
        ];
    }
} 