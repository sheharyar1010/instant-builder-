<?php

namespace Dawnsol\Quotemate\Traits;

trait HasValidation
{
    protected $errors = [];

    protected function addError($field, $message)
    {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }

        $this->errors[$field][] = $message;

        return $this;
    }

    public function getErrors()
    {
        return $this->errors;
    }

    public function getError($field)
    {
        return $this->errors[$field] ?? [];
    }

    public function hasErrors()
    {
        return !empty($this->errors);
    }

    protected function clearErrors()
    {
        $this->errors = [];

        return $this;
    }
}
