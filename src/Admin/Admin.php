<?php

namespace Dawnsol\Quotemate\Admin;

use Dawnsol\Quotemate\Admin\Controllers\FormsController;
use Dawnsol\Quotemate\Admin\Controllers\SubmissionsController;
use Dawnsol\Quotemate\Admin\Controllers\UninstallController;
use Dawnsol\Quotemate\Core\Deactivator;
use Dawnsol\Quotemate\Helpers\CompatibilityHelper;
use Dawnsol\Quotemate\Traits\Singleton;

class Admin
{
    use Singleton;

    private $loader;
    private $plugin_name;
    private $version;

    private $forms_controller;
    private $submissions_controller;
    private $uninstall_controller;

    public function __construct($plugin_name, $version, $loader)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        $this->loader = $loader;

       

        $this->register_form_controller_hooks();
        $this->register_submissions_controller_hooks();
        $this->register_uninstall_controller_hooks();
        $this->register_general_hooks();
    }

    private function register_form_controller_hooks()
    {
        $this->forms_controller = FormsController::getInstance($this->plugin_name, $this->version, $this->loader);

        $this->loader->add_filter('set-screen-option', $this->forms_controller, 'set_screen_option', 10, 3);
        
        // Register AJAX handlers for both create and update
        $this->loader->add_action('wp_ajax_create_form', $this->forms_controller, 'store');
        $this->loader->add_action('wp_ajax_update_form', $this->forms_controller, 'store');
    }

    private function register_submissions_controller_hooks()
    {
        $this->submissions_controller = SubmissionsController::getInstance($this->plugin_name, $this->version, $this->loader);

        $this->loader->add_filter('set-screen-option', $this->submissions_controller, 'set_screen_option', 10, 3);
    }

    private function register_uninstall_controller_hooks()
    {
        $this->uninstall_controller = UninstallController::getInstance($this->plugin_name, $this->version);

        $this->loader->add_filter('plugin_action_links', $this->uninstall_controller, 'add_plugin_action_links', 10, 2);
        $this->loader->add_action('admin_post_save_uninstall_settings', $this->uninstall_controller, 'handle_settings_save');
    }

    private function register_general_hooks()
    {
        // Add deactivation notice
        $this->loader->add_action('admin_notices', Deactivator::getInstance(), 'display_deactivation_notice');
        
        // AJAX handler for dismissing notices
        $this->loader->add_action('wp_ajax_quotemate_dismiss_deactivation_notice', $this, 'dismiss_deactivation_notice');
    }

    public function dismiss_deactivation_notice()
    {
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'quotemate_dismiss_notice')) {
            wp_die('Security check failed');
        }
        
        delete_transient('quotemate_deactivation_notice');
        wp_die('OK');
    }

    public function add_admin_menu()
    {
        // Remove the test menu and restore original
        $hook_suffix = add_menu_page(
            ucfirst($this->plugin_name),
            ucfirst($this->plugin_name),
            'manage_options',
            $this->plugin_name,
            [$this->forms_controller, 'index'],
            'dashicons-feedback',
            25
        );

        $this->loader->add_dynamic_action("load-$hook_suffix", $this->forms_controller, 'add_screen_options');

        // Simplified submenus - let's start with just the main ones
        $submenus = [
            [
                'page_title' => 'All Forms',
                'menu_title' => 'All Forms',
                'menu_slug'  => $this->plugin_name,
                'callback'   => [$this->forms_controller, 'index'],
            ],
            [
                'page_title' => 'Create Form',
                'menu_title' => 'Create Form',
                'menu_slug'  => $this->plugin_name . '-new-form',
                'callback'   => [$this->forms_controller, 'create'],
                'hidden'     => true,
            ],
            [
                'page_title' => 'Edit Form',
                'menu_title' => 'Edit Form',
                'menu_slug'  => $this->plugin_name . '-edit-form',
                'callback'   => [$this->forms_controller, 'edit'],
                'hidden'     => true,
            ],
            [
                'page_title' => 'Submissions',
                'menu_title' => 'Submissions',
                'menu_slug'  => $this->plugin_name . '-submissions',
                'callback'   => [$this->submissions_controller, 'index'],
                'hidden'     => true,
            ],
            [
                'page_title' => 'View Submission',
                'menu_title' => 'View Submission',
                'menu_slug'  => $this->plugin_name . '-view-submission',
                'callback'   => [$this->submissions_controller, 'view'],
                'hidden'     => true,
            ],
            [
                'page_title' => 'Templates',
                'menu_title' => 'Templates',
                'menu_slug'  => $this->plugin_name . '-templates',
                'callback'   => function() {
                    echo '<div class="wrap"><h1>Templates</h1><p>Coming soon...</p></div>';
                },
            ],
            [
                'page_title' => 'Tools',
                'menu_title' => 'Tools',
                'menu_slug'  => $this->plugin_name . '-tools',
                'callback'   => function() {
                    echo '<div class="wrap"><h1>Tools</h1><p>Coming soon...</p></div>';
                },
            ],
            [
                'page_title' => 'Settings',
                'menu_title' => 'Settings',
                'menu_slug'  => $this->plugin_name . '-settings',
                'callback'   => function() {
                    echo '<div class="wrap"><h1>Settings</h1><p>Coming soon...</p></div>';
                },
            ],
        ];

        foreach ($submenus as $menu) {
            $parent_slug = isset($menu['hidden']) && $menu['hidden'] ? "options.php" : $this->plugin_name;
            $hook = add_submenu_page(
                $parent_slug,
                $menu['page_title'],
                $menu['menu_title'],
                'manage_options',
                $menu['menu_slug'],
                $menu['callback']
            );

            // Add screen options for submissions list
            if ($menu['menu_slug'] === $this->plugin_name . '-submissions') {
                $this->loader->add_dynamic_action("load-$hook", $this->submissions_controller, 'add_screen_options');
            }
        }

        // Add the uninstall and system report pages separately to avoid issues
        add_submenu_page(
            'options.php',
            'Uninstall Settings',
            'Uninstall Settings',
            'manage_options',
            $this->plugin_name . '-uninstall-settings',
            [$this->uninstall_controller, 'uninstall_settings_page']
        );

        add_submenu_page(
            'options.php',
            'System Report',
            'System Report',
            'manage_options',
            $this->plugin_name . '-system-report',
            [CompatibilityHelper::class, 'display_compatibility_report']
        );
    }

    public function enqueue_scripts($hook)
    {
        // Get current screen
        $screen = get_current_screen();
        if (!$screen) return;

        // Base URL for assets
        $base_url = QUOTEMATE_URL;

        // Common admin scripts
        wp_enqueue_script(
            'quotemate-admin',
            $base_url . 'assets/js/admin/admin.js',
            ['jquery'],
            QUOTEMATE_VERSION,
            true
        );

        // Forms list page
        if ($screen->id === 'quotemate_page_quotemate-forms') {
            wp_enqueue_script(
                'quotemate-delete-confirmation',
                $base_url . 'assets/js/admin/forms/delete-confirmation.js',
                [],
                QUOTEMATE_VERSION,
                true
            );
        }

        // Form builder page
        if ($screen->id === 'quotemate_page_quotemate-forms-edit') {
            // ... existing form builder scripts ...
        }
    }
}