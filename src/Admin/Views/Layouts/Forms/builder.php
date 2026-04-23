<?php

use Dawnsol\Quotemate\Helpers\AssetHelper;
use Dawnsol\Quotemate\Helpers\ViewRenderer;

defined('ABSPATH') || exit;

AssetHelper::enqueue_assets('admin/forms/builder/form/builder');
?>

<div id="quotemate-builder" class="quotemate-admin-page">
    <?= ViewRenderer::component('Forms/Builder/toolbar', true, [
        'title' => $data["title"],
    ]) ?>

    <div class="quotemate-content">
       

        <div class="quotemate-panels-content">
            <?php include $view_file; ?>
        </div>
    </div>
</div>