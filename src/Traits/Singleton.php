<?php

namespace Dawnsol\Quotemate\Traits;

trait Singleton
{
    private static $instance = null;

    private function __construct() {}

    private function __clone() {}

    public static function getInstance(...$args)
    {
        if (!isset(static::$instance)) {
            static::$instance = new static(...$args);
        }
        return static::$instance;
    }
}
