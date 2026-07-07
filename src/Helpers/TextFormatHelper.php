<?php

namespace Dawnsol\Quotemate\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Title Case and brand-aware labels for frontend form display.
 */
class TextFormatHelper
{
    private const BRAND_NAMES = [
        'wordpress' => 'WordPress',
        'woocommerce' => 'WooCommerce',
        'shopify' => 'Shopify',
        'react' => 'React',
        'next.js' => 'Next.js',
        'nextjs' => 'Next.js',
        'node.js' => 'Node.js',
        'nodejs' => 'Node.js',
        'laravel' => 'Laravel',
        'vue' => 'Vue.js',
        'vuejs' => 'Vue.js',
        'angular' => 'Angular',
        'javascript' => 'JavaScript',
        'typescript' => 'TypeScript',
        'php' => 'PHP',
        'html' => 'HTML',
        'css' => 'CSS',
        'mysql' => 'MySQL',
        'postgresql' => 'PostgreSQL',
        'mongodb' => 'MongoDB',
        'aws' => 'AWS',
        'seo' => 'SEO',
        'api' => 'API',
        'ui' => 'UI',
        'ux' => 'UX',
        'ios' => 'iOS',
        'android' => 'Android',
    ];

    public static function to_title_case(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        $value = preg_replace('/\s+/u', ' ', trim($text));
        if ($value === '') {
            return '';
        }

        $phrases = [
            '/\bnext\s*\.?\s*js\b/i' => 'Next.js',
            '/\bnode\s*\.?\s*js\b/i' => 'Node.js',
            '/\bwoo\s*commerce\b/i' => 'WooCommerce',
            '/\bword\s*press\b/i' => 'WordPress',
        ];

        foreach ($phrases as $pattern => $replacement) {
            $value = preg_replace($pattern, $replacement, $value);
        }

        $parts = preg_split('/(\s+|-)/u', $value, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (!is_array($parts)) {
            return $value;
        }

        $out = '';
        foreach ($parts as $part) {
            if ($part === '' || preg_match('/^\s+$/u', $part)) {
                $out .= $part;
                continue;
            }
            if ($part === '-') {
                $out .= '-';
                continue;
            }
            $out .= self::format_token($part);
        }

        return $out;
    }

    public static function format_choose_placeholder(?string $subject = '', string $fallback_kind = 'option'): string
    {
        $formatted = self::to_title_case($subject ?? '');
        if ($formatted !== '') {
            return 'Choose ' . $formatted;
        }

        $defaults = [
            'category' => 'Category',
            'service' => 'Service',
            'option' => 'Option',
        ];
        $fallback = $defaults[$fallback_kind] ?? $defaults['option'];

        return 'Choose ' . $fallback;
    }

    public static function format_display_name(?string $text): string
    {
        return self::to_title_case($text);
    }

    public static function format_choose_number_placeholder(?string $unit_plural): string
    {
        $unit = self::to_title_case($unit_plural ?? 'Items');

        return 'Choose Number of ' . $unit;
    }

    public static function format_quantity_option(int $count, string $unit_plural): string
    {
        $plural = self::to_title_case($unit_plural);
        $singular = preg_match('/s$/i', $plural) ? substr($plural, 0, -1) : $plural;

        return $count === 1 ? "{$count} {$singular}" : "{$count} {$plural}";
    }

    private static function format_token(string $token): string
    {
        if ($token === '') {
            return '';
        }

        if (preg_match('/^\d+$/', $token)) {
            return $token;
        }

        $key = strtolower(preg_replace('/[^a-z0-9.+]/i', '', $token) ?? '');
        if ($key !== '' && isset(self::BRAND_NAMES[$key])) {
            return self::BRAND_NAMES[$key];
        }

        $lower = strtolower($token);
        if (isset(self::BRAND_NAMES[$lower])) {
            return self::BRAND_NAMES[$lower];
        }

        if (strlen($token) <= 4 && $token === strtoupper($token) && preg_match('/[A-Z]/', $token)) {
            return $token;
        }

        return ucfirst($lower);
    }
}
