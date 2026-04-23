<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class RequestHelper
{
    public static function verify_nonce(string $nonce_key = 'quotemate_nonce', string $action = 'quotemate_admin_action', bool $json_error = true): bool
    {
        $nonce = $_REQUEST[$nonce_key] ?? '';

        if (!$nonce || !wp_verify_nonce($nonce, $action)) {
            if ($json_error) {
                self::json_error('Security verification failed. Please refresh the page and try again.');
            }
            return false;
        }

        return true;
    }

    /**
     * Verify nonce for specific action
     */
    public static function verify_action_nonce(string $action, string $nonce_key = 'quotemate_nonce'): bool
    {
        return self::verify_nonce($nonce_key, $action, false);
    }

    /**
     * Create nonce for specific action
     */
    public static function create_nonce(string $action = 'quotemate_admin_action'): string
    {
        return wp_create_nonce($action);
    }

    public static function input(string $key, $default = '', string $method = 'POST', string $sanitize_type = 'text')
    {
        $source = strtoupper($method) === 'GET' ? $_GET : $_POST;
        $value = $source[$key] ?? $default;

        return SanitizationHelper::sanitize($value, $sanitize_type);
    }

    public static function all(string $method = 'POST'): array
    {
        $source = strtoupper($method) === 'GET' ? $_GET : $_POST;
        return SanitizationHelper::sanitize($source, 'array');
    }

    public static function is_ajax(): bool
    {
        return defined('DOING_AJAX') && DOING_AJAX;
    }

    public static function is_post(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    public static function is_get(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'GET';
    }

    public static function json_success(array $data = [], string $message = 'Success'): void
    {
        self::send_json(true, $message, $data);
    }

    public static function json_error(string $message = 'An error occurred', array $data = []): void
    {
        self::send_json(false, $message, $data);
    }

    private static function send_json(bool $success, string $message = '', array $data = []): void
    {
        $response = array_merge(
            ['success' => $success, 'message' => $message],
            $data
        );

        wp_send_json($response);
    }
}
