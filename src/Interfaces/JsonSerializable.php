<?php

namespace Dawnsol\Quotemate\Interfaces;

interface JsonSerializable extends \JsonSerializable
{
    public function jsonSerialize(): mixed;
}
