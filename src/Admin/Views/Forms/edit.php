<?php

use Dawnsol\Quotemate\Helpers\ViewRenderer;

defined('ABSPATH') || exit;
?>

<div id="create-quotemate-form">
    <div class="quotemate-panels-content__panel quotemate-panels-content__panel--active" data-panel="edit">
        <?= ViewRenderer::component('Forms/Builder/Panels/edit', true, [
            'edit_mode' => true,
            'data' => $data,
        ]); ?>
    </div>
</div>