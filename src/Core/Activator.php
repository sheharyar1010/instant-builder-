<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Helpers\LogHelper;
use Dawnsol\Quotemate\Traits\Singleton;

class Activator
{
    use Singleton;

    private static $wpdb;
    private static $prefix;
    private static $charset_collate;

    public static function activate()
    {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        global $wpdb;
        self::$wpdb = $wpdb;
        self::$prefix = $wpdb->prefix;
        self::$charset_collate = $wpdb->get_charset_collate();

        self::create_forms_table();
        self::create_submissions_table();
        self::create_templates_table();
        self::create_template_categories_table();
        self::create_settings_table();
    }

    private static function create_forms_table()
    {
        $table_name = self::$prefix . 'quotemate_forms';

        // Check if table exists first
        if (self::$wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name) {
            LogHelper::info("Table {$table_name} already exists, skipping creation.");
            return;
        }

        $sql = "CREATE TABLE {$table_name} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            active TINYINT(1) DEFAULT 0,
            settings LONGTEXT,
            fields LONGTEXT,
            template_id INT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            INDEX active_idx (active),
            INDEX template_id_idx (template_id)
        ) " . self::$charset_collate . ";";

        self::execute_db_delta($sql);
    }

    private static function create_submissions_table()
    {
        $table_name = self::$prefix . 'quotemate_submissions';

        // Check if table exists first
        if (self::$wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name) {
            LogHelper::info("Table {$table_name} already exists, skipping creation.");
            return;
        }

        $sql = "CREATE TABLE {$table_name} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            form_id INT(11) NOT NULL,
            submitted_data LONGTEXT,
            price DECIMAL(10, 2) DEFAULT 0.00,
            viewed TINYINT(1) DEFAULT 0,
            user_email VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY form_id (form_id),
            KEY viewed_idx (viewed),
            KEY email_idx (user_email),
            KEY created_at_idx (created_at),
            FOREIGN KEY (form_id) REFERENCES " . self::$prefix . "quotemate_forms(id) ON DELETE CASCADE
        ) " . self::$charset_collate . ";";

        self::execute_db_delta($sql);
    }

    private static function create_templates_table()
    {
        $table_name = self::$prefix . 'quotemate_templates';

        // Check if table exists first
        if (self::$wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name) {
            LogHelper::info("Table {$table_name} already exists, skipping creation.");
            return;
        }

        $sql = "CREATE TABLE {$table_name} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            category_id INT(11) DEFAULT NULL,
            description TEXT,
            template LONGTEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY category_id (category_id),
            KEY name_idx (name)
        ) " . self::$charset_collate . ";";

        self::execute_db_delta($sql);
    }

    private static function create_template_categories_table()
    {
        $table_name = self::$prefix . 'quotemate_template_categories';

        // Check if table exists first
        if (self::$wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name) {
            LogHelper::info("Table {$table_name} already exists, skipping creation.");
            return;
        }

        $sql = "CREATE TABLE {$table_name} (
            id INT(11) NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY name_unique (name)
        ) " . self::$charset_collate . ";";

        self::execute_db_delta($sql);
    }

    private static function create_settings_table()
    {
        $table_name = self::$prefix . 'quotemate_settings';

        // Check if table exists first
        if (self::$wpdb->get_var("SHOW TABLES LIKE '{$table_name}'") === $table_name) {
            LogHelper::info("Table {$table_name} already exists, skipping creation.");
            return;
        }

        $sql = "CREATE TABLE {$table_name} (
            `key` VARCHAR(191) NOT NULL,
            `value` TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`key`)
        ) " . self::$charset_collate . ";";

        self::execute_db_delta($sql);
    }

    private static function execute_db_delta($sql)
    {
        $result = dbDelta($sql);
        
        if (!empty(self::$wpdb->last_error)) {
            LogHelper::error('Database Error during table creation: ' . self::$wpdb->last_error);
            LogHelper::error('SQL Query: ' . $sql);
            
            // Set admin notice for error
            set_transient('quotemate_activation_error', self::$wpdb->last_error, 300);
            return false;
        }
        
        LogHelper::info('Database operation completed successfully.');
        return $result;
    }
}
