<?php

namespace Dawnsol\Quotemate\Core;

use Dawnsol\Quotemate\Traits\Singleton;

class Loader
{
    use Singleton;

    protected $actions;
    protected $filters;

    protected $dynamic_actions;
    protected $dynamic_filters;

    public function __construct()
    {
        $this->actions = array();
        $this->filters = array();

        $this->dynamic_actions = array();
        $this->dynamic_filters = array();
    }

    public function add_action($hook, $component, $callback, $priority = 10, $accepted_args = 1)
    {
        $this->actions = $this->add($this->actions, $hook, $component, $callback, $priority, $accepted_args);
    }

    public function add_filter($hook, $component, $callback, $priority = 10, $accepted_args = 1)
    {
        $this->filters = $this->add($this->filters, $hook, $component, $callback, $priority, $accepted_args);
    }

    public function add_dynamic_action($hook, $component, $callback, $priority = 10, $accepted_args = 1)
    {
        $this->dynamic_actions = $this->add($this->dynamic_actions, $hook, $component, $callback, $priority, $accepted_args);
    }

    public function add_dynamic_filter($hook, $component, $callback, $priority = 10, $accepted_args = 1)
    {
        $this->dynamic_filters = $this->add($this->dynamic_filters, $hook, $component, $callback, $priority, $accepted_args);
    }

    private function add($hooks, $hook, $component, $callback, $priority, $accepted_args)
    {
        $hooks[] = array(
            'hook'          => $hook,
            'component'     => $component,
            'callback'      => $callback,
            'priority'      => $priority,
            'accepted_args' => $accepted_args
        );

        return $hooks;
    }

    public function run()
    {
        // Debug: Check if hooks are being registered
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('QuoteMate Loader run called. Actions: ' . count($this->actions) . ', Filters: ' . count($this->filters));
        }

        foreach ($this->filters as $hook) {
            add_filter($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
        }

        foreach ($this->actions as $hook) {
            add_action($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
        }
    }

    public function run_dynamic_hooks()
    {
        foreach ($this->dynamic_actions as $hook) {
            add_action($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
        }

        foreach ($this->dynamic_filters as $hook) {
            add_action($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
        }
    }
}
