<?php

namespace Dawnsol\Quotemate\Helpers;

class DateHelper
{
    /**
     * Format a date according to WordPress settings
     *
     * @param string $date The date to format
     * @param string $format Optional format to use (defaults to WordPress date_format + time_format)
     * @return string Formatted date
     */
    public static function format_date($date, $format = '')
    {
        if (empty($date)) {
            return '';
        }

        if (empty($format)) {
            $format = get_option('date_format') . ' ' . get_option('time_format');
        }

        $timestamp = strtotime($date);
        return date_i18n($format, $timestamp);
    }

    /**
     * Get a human-readable time difference (e.g., "2 days ago")
     *
     * @param string $date The date to compare
     * @return string Human-readable time difference
     */
    public static function time_ago($date)
    {
        if (empty($date)) {
            return '';
        }

        $timestamp = strtotime($date);
        return human_time_diff($timestamp, current_time('timestamp')) . ' ' . __('ago', 'quotemate');
    }

    /**
     * Check if a date is today
     *
     * @param string $date The date to check
     * @return boolean True if the date is today
     */
    public static function is_today($date)
    {
        if (empty($date)) {
            return false;
        }

        $timestamp = strtotime($date);
        return date('Y-m-d', $timestamp) === date('Y-m-d', current_time('timestamp'));
    }

    public static function format($date, $format = 'Y-m-d H:i:s', $default = '')
    {
        if (!self::isValid($date)) {
            return $default;
        }

        return date_i18n($format, strtotime($date));
    }

    public static function now($format = 'Y-m-d H:i:s')
    {
        return date_i18n($format, current_time('timestamp'));
    }

    public static function isValid($date)
    {
        return strtotime($date) !== false;
    }

    public static function timeAgo($from, $to = '')
    {
        if (empty($to)) {
            $to = current_time('mysql');
        }

        return human_time_diff(strtotime($from), strtotime($to));
    }
}
