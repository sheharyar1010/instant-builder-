<?php

namespace Dawnsol\Quotemate\Helpers;

class LogHelper
{
    protected static $logDir = null;

    protected static $logFile = 'quotemate.log';

    protected static function initLogDir()
    {
        if (self::$logDir === null) {
            $upload_dir = wp_upload_dir();
            self::$logDir = trailingslashit($upload_dir['basedir']) . 'quotemate-logs/';

            if (!file_exists(self::$logDir)) {
                wp_mkdir_p(self::$logDir);

                // Create security files
                file_put_contents(self::$logDir . '.htaccess', 'deny from all');
                file_put_contents(self::$logDir . 'index.php', '<?php // Silence is golden.');
            }
        }
    }

    public static function log($message, $level = 'info')
    {
        self::initLogDir();

        $date = DateHelper::now();
        $log_entry = "[{$date}] [{$level}] {$message}" . PHP_EOL;

        return file_put_contents(self::$logDir . self::$logFile, $log_entry, FILE_APPEND);
    }

    public static function info($message)
    {
        return self::log($message, 'info');
    }

    public static function error($message)
    {
        return self::log($message, 'error');
    }

    public static function debug($message)
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            return self::log($message, 'debug');
        }

        return true;
    }
}
