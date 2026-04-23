<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Traits\Singleton;

class I18n
{
    use Singleton;

    public function load_textdomain()
    {
        $domain = 'quotemate';
        $locale = apply_filters('plugin_locale', get_locale(), $domain);
        
        // Try loading from WordPress languages directory first
        $wordpress_lang_file = WP_LANG_DIR . '/plugins/' . $domain . '-' . $locale . '.mo';
        if (file_exists($wordpress_lang_file)) {
            load_textdomain($domain, $wordpress_lang_file);
            return;
        }
        
        // Fall back to plugin languages directory
        $plugin_lang_dir = QUOTEMATE_DIR . 'languages/';
        load_plugin_textdomain($domain, false, basename(QUOTEMATE_DIR) . '/languages/');
        
        // Log if languages directory doesn't exist
        if (!is_dir($plugin_lang_dir)) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('QuoteMate: Languages directory not found at ' . $plugin_lang_dir);
            }
        }
    }
}
