<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class SanitizationHelper
{
    public static function sanitize($value, string $type)
    {
        switch ($type) {
            case 'email':
                return self::sanitizeEmail($value);
            case 'url':
                return self::sanitizeUrl($value);
            case 'attr':
                return self::sanitizeAttribute($value);
            case 'html':
                return self::sanitizeHtml($value);
            case 'textarea':
                return self::sanitizeTextarea($value);
            case 'int':
                return self::sanitizeInt($value);
            case 'float':
                return self::sanitizeFloat($value);
            case 'bool':
                return self::sanitizeBool($value);
            case 'array':
                return self::sanitizeArray($value);
            case 'json':
                return self::decodeJson($value);
            case 'storable':
                return self::sanitizeStorableData($value);
            default:
                return self::sanitizeText($value);
        }
    }

    private static function sanitizeText($text)
    {
        return sanitize_text_field($text);
    }

    private static function sanitizeEmail($email)
    {
        return sanitize_email($email);
    }

    private static function sanitizeUrl($url)
    {
        return esc_url_raw($url);
    }

    private static function sanitizeAttribute($attribute)
    {
        return esc_attr($attribute);
    }

    private static function sanitizeHtml($html)
    {
        return esc_html($html);
    }

    private static function sanitizeTextarea($text)
    {
        return sanitize_textarea_field($text);
    }

    private static function sanitizeInt($int)
    {
        return (int) $int;
    }

    private static function sanitizeFloat($float)
    {
        return (float) $float;
    }

    private static function sanitizeBool($bool)
    {
        return (bool) $bool;
    }

    private static function sanitizeStorableData($data)
    {
        if (is_array($data) || is_object($data)) {
            return wp_json_encode(self::sanitizeArray($data));
        }

        return sanitize_text_field((string) $data);
    }

    private static function decodeJson($value, bool $as_array = true)
    {
        if (!is_string($value)) {
            LogHelper::error('decodeJson: Non-string value passed for decoding.');
            return $as_array ? [] : null;
        }

        $decoded = json_decode($value, $as_array);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $error_message = json_last_error_msg();
            LogHelper::error("decodeJson: Failed to decode JSON. Error: {$error_message}. Input: " . substr($value, 0, 300));
            return $as_array ? [] : null;
        }

        return $decoded;
    }

    private static function sanitizeArray($array)
    {
        if (!is_array($array)) {
            return [];
        }

        $result = [];

        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $result[$key] = self::sanitizeArray($value);
            } elseif (is_string($value)) {
                $result[$key] = sanitize_text_field($value);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }
}
