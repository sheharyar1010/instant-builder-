<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Admin\Admin;
use Dawnsol\Quotemate\Frontend\Frontend;

use Dawnsol\Quotemate\Traits\Singleton;

class Quotemate
{
    use Singleton;

    protected $loader;
    protected $plugin_name;
    protected $version;

    public function __construct()
    {
        $this->version = QUOTEMATE_VERSION;
        $this->plugin_name = QUOTEMATE_NAME;

        $this->load_dependencies();
        $this->set_locale();
        $this->define_admin_hooks();
        $this->define_frontend_hooks();
    }

    private function load_dependencies()
    {
        $this->loader = Loader::getInstance();
    }

    private function set_locale()
    {
        $this->loader->add_action('plugins_loaded', I18n::getInstance(), 'load_textdomain');
    }

    private function define_admin_hooks()
    {
        $admin = Admin::getInstance($this->plugin_name, $this->version, $this->loader);
        
        $this->loader->add_action('admin_init', $this->loader, 'run_dynamic_hooks');

        $this->loader->add_action('admin_menu', $admin, 'add_admin_menu');
    }

    private function define_frontend_hooks()
    {
        $frontend = Frontend::getInstance($this->plugin_name, $this->version);
        $this->loader->add_action('init', $frontend, 'run');
    }

    public function run()
    {
        $this->loader->run();
    }
}
