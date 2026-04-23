<?php

/**
 * QuoteMate - WordPress Quote Form Builder
 *
 * @link              http://dawnsol.com
 * @since             1.0.0
 * @package           Quotemate
 *
 * @wordpress-plugin
 * Plugin Name:       QuoteMate
 * Plugin URI:        http://dawnsol.com/
 * Description:       A powerful and flexible "Request a Quote" form builder for WordPress. QuoteMate lets you create custom, multi-step quote forms with dynamic pricing, drag-and-drop fields, conditional logic, and email notifications. Easily manage form submissions, generate PDF quotes, and customize frontend templates—all with zero coding.
 * Version:           1.0.2
 * Author:            Dawnsol
 * Author URI:        http://dawnsol.com/
 * License:           GPL-2.0+
 * License URI:        http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       quotemate
 * Domain Path:       /languages
 * Requires at least: 5.0
 * Tested up to:      6.4
 * Requires PHP:      7.4
 * Network:           false
 */

// If this file is called directly, abort.
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('QUOTEMATE_NAME', 'quotemate');
define('QUOTEMATE_VERSION', '1.0.2');
define('QUOTEMATE_PLUGIN_FILE', __FILE__);
define('QUOTEMATE_DIR', plugin_dir_path(__FILE__));
define('QUOTEMATE_URL', plugin_dir_url(__FILE__));
define('QUOTEMATE_BASENAME', plugin_basename(__FILE__));

// Load Composer autoloader
if (file_exists(QUOTEMATE_DIR . 'vendor/autoload.php')) {
    require_once QUOTEMATE_DIR . 'vendor/autoload.php';
} else {
    // Fallback autoloader for development
    spl_autoload_register(function ($class) {
        // Only handle our namespace
        if (strpos($class, 'Dawnsol\\Quotemate\\') !== 0) {
            return;
        }

        // Convert namespace to file path
        $file = QUOTEMATE_DIR . 'src/' . str_replace('Dawnsol\\Quotemate\\', '', $class) . '.php';
        $file = str_replace('\\', '/', $file);

        if (file_exists($file)) {
            require_once $file;
        }
    });
}

// Initialize the plugin using the working Quotemate class
use Dawnsol\Quotemate\Core\Activator;
use Dawnsol\Quotemate\Core\Deactivator;
use Dawnsol\Quotemate\Core\Quotemate;

// Register activation and deactivation hooks
register_activation_hook(__FILE__, [Activator::getInstance(), 'activate']);
register_deactivation_hook(__FILE__, [Deactivator::getInstance(), 'deactivate']);

// Initialize the plugin
Quotemate::getInstance()->run();
