<?php

use Dawnsol\Quotemate\Helpers\ViewRenderer;

defined('ABSPATH') || exit;
?>

<div id="create-quotemate-form">
    <div class="quotemate-panels-content__panel quotemate-panels-content__panel--active" data-panel="setup">
        <?= ViewRenderer::component('Forms/Builder/Panels/setup', true, [
            'edit_mode' => false
        ]); ?>
    </div>
</div>