<?php

namespace Dawnsol\Quotemate\Frontend;

use Dawnsol\Quotemate\Traits\Singleton;
use Dawnsol\Quotemate\Admin\Controllers\FormDisplayController;

class Frontend
{
    use Singleton;

    private $plugin_name;
    private $version;
    private $form_display_controller;

    public function __construct($plugin_name, $version)
    {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    public function run()
    {
       
        // Initialize the FormDisplayController early to register AJAX handlers
        $this->form_display_controller = FormDisplayController::getInstance();
       
        // Register shortcodes
        $this->register_shortcodes();
       
    }

    private function register_shortcodes()
    {
        add_shortcode(
            'quotemate_form',
            [$this->form_display_controller, 'render_form_shortcode']
        );
    }
}