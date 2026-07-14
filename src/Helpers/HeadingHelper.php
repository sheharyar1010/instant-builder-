<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class HeadingHelper
{
    /**
     * Parse heading tags: [br], [color=#hex]text[/color], and literal newlines.
     */
    public static function format_heading_text(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $out = '';
        $len = strlen($text);
        $i = 0;

        while ($i < $len) {
            $rest = substr($text, $i);

            if (stripos($rest, '[br]') === 0) {
                $out .= '<br>';
                $i += 4;
                continue;
            }

            if (preg_match('/^\[color=([^\]]+)\]/i', $rest, $open_match)) {
                $open_len = strlen($open_match[0]);
                $close_tag = '[/color]';
                $inner_start = $i + $open_len;
                $close_pos = stripos($text, $close_tag, $inner_start);

                if ($close_pos !== false) {
                    $inner = substr($text, $inner_start, $close_pos - $inner_start);
                    $color = self::sanitize_heading_color($open_match[1]);

                    if ($color) {
                        $out .= '<span class="quotemate-form-heading__accent" style="color:' . esc_attr($color) . '">';
                        $out .= self::format_heading_text($inner);
                        $out .= '</span>';
                    } else {
                        $out .= esc_html(substr($text, $i, $close_pos + strlen($close_tag) - $i));
                    }

                    $i = $close_pos + strlen($close_tag);
                    continue;
                }
            }

            $next = $i;
            while ($next < $len) {
                $ch = $text[$next];
                if ($ch === '[' || $ch === "\n" || $ch === "\r") {
                    break;
                }
                $next++;
            }

            if ($next > $i) {
                $out .= esc_html(substr($text, $i, $next - $i));
                $i = $next;
                continue;
            }

            if ($text[$i] === "\r" && isset($text[$i + 1]) && $text[$i + 1] === "\n") {
                $out .= '<br>';
                $i += 2;
            } elseif ($text[$i] === "\n" || $text[$i] === "\r") {
                $out .= '<br>';
                $i += 1;
            } else {
                $out .= esc_html($text[$i]);
                $i += 1;
            }
        }

        return $out;
    }

    private static function sanitize_heading_color(string $color): ?string
    {
        $color = trim($color);

        if (preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $color)) {
            return $color;
        }

        if (preg_match('/^rgba?\(\s*[\d.%\s,]+\)$/i', $color)) {
            return $color;
        }

        if (preg_match('/^hsla?\(\s*[\d.%deg,\s]+\)$/i', $color)) {
            return $color;
        }

        if (preg_match('/^[a-zA-Z]{3,20}$/', $color)) {
            return strtolower($color);
        }

        return null;
    }

    /**
     * Resolve a safe heading tag from stored field data.
     */
    public static function resolve_heading_tag(array $field): string
    {
        $allowed = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        $level = $field['heading_level'] ?? 'h2';

        return in_array($level, $allowed, true) ? $level : 'h2';
    }

    /**
     * Resolve heading horizontal alignment (left, center, right).
     */
    public static function resolve_heading_align(array $field): string
    {
        $align = $field['heading_align'] ?? 'center';

        return in_array($align, ['left', 'center', 'right'], true) ? $align : 'center';
    }

    /**
     * CSS class for heading alignment.
     */
    public static function get_heading_align_class(array $field): string
    {
        $align = self::resolve_heading_align($field);

        return 'quotemate-form-heading--align-' . $align . ' quotemate-form-field__heading--align-' . $align;
    }
}
