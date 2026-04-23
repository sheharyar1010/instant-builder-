<?php

namespace Dawnsol\Quotemate\Helpers;

defined('ABSPATH') || exit;

class ViewRenderer
{
    public static function render(string $view, bool $is_admin = true, array $data = [], string $layout = null): void
    {
        $view_file = QUOTEMATE_DIR . 'src/' . ($is_admin ? 'Admin' : 'Frontend') . '/Views/' . $view . '.php';

        if (!file_exists($view_file)) {
            LogHelper::error("Template not found: {$view}");
            echo "<!-- View not found: $view -->";
            return;
        }

        extract($data);

        if ($layout) {
            $layout_file = QUOTEMATE_DIR . 'src/' . ($is_admin ? 'Admin' : 'Frontend') . '/Views/Layouts/' . $layout . '.php';
            if (file_exists($layout_file)) {
                include $layout_file;
            } else {
                echo "<!-- Layout not found: $layout -->";
            }
        } else {
            include $view_file;
        }
    }

    public static function component(string $name, bool $is_admin = true, array $data = []): string
    {
        $file = QUOTEMATE_DIR . 'src/' . ($is_admin ? 'Admin' : 'Frontend') . '/Views/Components/' . $name . '.php';

        if (!file_exists($file)) {
            LogHelper::error("Component not found: {$name}");
            return "<!-- Component not found: $name -->";
        }

        ob_start();
        extract($data);
        include $file;
        return ob_get_clean();
    }
}
