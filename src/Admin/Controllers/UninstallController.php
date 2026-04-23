<?php

namespace Dawnsol\Quotemate\Admin\Controllers;

use Dawnsol\Quotemate\Helpers\RequestHelper;
use Dawnsol\Quotemate\Traits\Singleton;

class UninstallController
{
    use Singleton;

    private $plugin_name;
    private $version;

    public function __construct($plugin_name, $version)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    /**
     * Add uninstall settings to plugins page
     */
    public function add_plugin_action_links($links, $file)
    {
        if ($file === plugin_basename(QUOTEMATE_PLUGIN_FILE)) {
            $settings_link = sprintf(
                '<a href="%s">%s</a>',
                admin_url('admin.php?page=' . $this->plugin_name . '-uninstall-settings'),
                esc_html__('Uninstall Settings', 'quotemate')
            );
            array_unshift($links, $settings_link);
        }
        return $links;
    }

    /**
     * Display uninstall settings page
     */
    public function uninstall_settings_page()
    {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('You do not have sufficient permissions to access this page.', 'quotemate'));
        }

        $keep_data = get_option('quotemate_keep_data_on_uninstall', false);
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('QuoteMate Uninstall Settings', 'quotemate'); ?></h1>
            
            <?php if (isset($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php esc_html_e('Uninstall settings saved successfully.', 'quotemate'); ?></p>
                </div>
            <?php endif; ?>
            
            <div class="notice notice-warning">
                <p><strong><?php esc_html_e('Important:', 'quotemate'); ?></strong> <?php esc_html_e('These settings determine what happens to your data when QuoteMate is deleted (not just deactivated).', 'quotemate'); ?></p>
            </div>

            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="save_uninstall_settings">
                <?php wp_nonce_field('quotemate_uninstall_settings', 'quotemate_uninstall_nonce'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Data Retention', 'quotemate'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="radio" name="keep_data" value="0" <?php checked($keep_data, false); ?>>
                                    <strong><?php esc_html_e('Remove all data', 'quotemate'); ?></strong>
                                    <p class="description"><?php esc_html_e('Delete all forms, submissions, and plugin settings when uninstalled.', 'quotemate'); ?></p>
                                </label>
                                <br><br>
                                <label>
                                    <input type="radio" name="keep_data" value="1" <?php checked($keep_data, true); ?>>
                                    <strong><?php esc_html_e('Keep form data', 'quotemate'); ?></strong>
                                    <p class="description"><?php esc_html_e('Preserve forms and submissions in the database. You can reinstall QuoteMate later to access this data.', 'quotemate'); ?></p>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                </table>

                <?php submit_button(esc_html__('Save Uninstall Settings', 'quotemate')); ?>
            </form>

            <div class="card">
                <h2><?php esc_html_e('Current Data Summary', 'quotemate'); ?></h2>
                <?php $this->display_data_summary(); ?>
            </div>
        </div>
        <?php
    }

    /**
     * Display current data summary
     */
    private function display_data_summary()
    {
        global $wpdb;
        
        $forms_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}quotemate_forms");
        $submissions_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}quotemate_submissions");
        $templates_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}quotemate_templates");

        ?>
        <ul>
            <li><?php printf(esc_html__('Forms: %d', 'quotemate'), intval($forms_count)); ?></li>
            <li><?php printf(esc_html__('Submissions: %d', 'quotemate'), intval($submissions_count)); ?></li>
            <li><?php printf(esc_html__('Templates: %d', 'quotemate'), intval($templates_count)); ?></li>
        </ul>
        <?php
    }

    /**
     * Handle settings save
     */
    public function handle_settings_save()
    {
        if (!isset($_POST['quotemate_uninstall_nonce']) || 
            !wp_verify_nonce($_POST['quotemate_uninstall_nonce'], 'quotemate_uninstall_settings')) {
            return;
        }

        if (!current_user_can('manage_options')) {
            return;
        }

        $keep_data = isset($_POST['keep_data']) ? (bool)$_POST['keep_data'] : false;
        update_option('quotemate_keep_data_on_uninstall', $keep_data);

        // Redirect back with success message
        $redirect_url = add_query_arg([
            'page' => 'quotemate-uninstall-settings',
            'settings-updated' => 'true'
        ], admin_url('admin.php'));
        
        wp_redirect($redirect_url);
        exit;
    }
} 