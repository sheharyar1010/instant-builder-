<?php

use Dawnsol\Quotemate\Helpers\AssetHelper;
use Dawnsol\Quotemate\Helpers\SanitizationHelper;

defined('ABSPATH') || exit;

AssetHelper::enqueue_assets('admin/forms/builder/toolbar');
?>

<div class="quotemate-toolbar">
    <div class="quotemate-toolbar__left">
        <?= AssetHelper::image('images/quotemate-logo.png', 'Quotemate Logo', [
            'class' => 'quotemate-toolbar__logo',
            'width' => '100%',
            'height' => '100%',
        ]); ?>
    </div>

    <div class="quotemate-toolbar__center">
        <h1 class="quotemate-toolbar__title"><?= $data['title'] ?></h1>

        <div class="quotemate-toolbar__actions">
            <a href="https://docs.quotemate.com" target="_blank" class="quotemate-help-link">
                <?= AssetHelper::icon('help', [
                    'class' => 'quotemate-help-link__icon',
                ]); ?>
                <span class="quotemate-help-link__text">Help</span>
            </a>
        </div>
    </div>

    <div class="quotemate-toolbar__right">
        <a href="<?= SanitizationHelper::sanitize(admin_url('admin.php?page=quotemate'), 'url'); ?>" class="quotemate-toolbar__close-button">
            <?= AssetHelper::icon('close', [
                'class' => 'quotemate-toolbar__close-icon',
                'fill' => '#636363',
            ]); ?>
        </a>
    </div>
</div>