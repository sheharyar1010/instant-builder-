<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Traits\Singleton;

class Deactivator
{
    use Singleton;

    public static function deactivate()
    {
        // Clear any scheduled cron jobs
        wp_clear_scheduled_hook('quotemate_cleanup_submissions');
        
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Show admin notice about data retention
        self::show_deactivation_notice();
    }
    
    /**
     * Show admin notice about data retention options
     */
    private static function show_deactivation_notice()
    {
        // Only show if not already set
        if (!get_option('quotemate_deactivation_notice_shown', false)) {
            set_transient('quotemate_deactivation_notice', true, 300); // 5 minutes
            update_option('quotemate_deactivation_notice_shown', true);
        }
    }
    
    /**
     * Display deactivation notice
     */
    public static function display_deactivation_notice()
    {
        if (get_transient('quotemate_deactivation_notice')) {
            ?>
            <div class="notice notice-info is-dismissible" id="quotemate-deactivation-notice">
                <p><strong><?php esc_html_e('QuoteMate has been deactivated.', 'quotemate'); ?></strong></p>
                <p><?php esc_html_e('Your forms and submissions are still saved. If you plan to delete the plugin, you can choose to keep or remove your data on the plugins page.', 'quotemate'); ?></p>
            </div>
            <script>
            jQuery(document).ready(function($) {
                $('#quotemate-deactivation-notice').on('click', '.notice-dismiss', function() {
                    $.post(ajaxurl, {
                        action: 'quotemate_dismiss_deactivation_notice',
                        nonce: '<?php echo wp_create_nonce('quotemate_dismiss_notice'); ?>'
                    });
                });
            });
            </script>
            <?php
            delete_transient('quotemate_deactivation_notice');
        }
    }
}
