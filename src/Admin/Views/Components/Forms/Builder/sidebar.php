<?php

use Dawnsol\Quotemate\Helpers\AssetHelper;

defined('ABSPATH') || exit;

AssetHelper::enqueue_assets('admin/forms/builder/sidebar', true);
?>

<div class="quotemate-panels-sidebar">
    <button class="quotemate-panels-sidebar__button quotemate-panels-sidebar__button--active" data-panel="setup">
        <?= AssetHelper::icon('setup', [
            'class' => 'quotemate-panels-sidebar__icon',
            'fill' => '#bebebe',
        ]); ?>
        <span class="quotemate-panels-sidebar__label">Setup</span>
    </button>

    <button class="quotemate-panels-sidebar__button" data-panel="fields">
        <?= AssetHelper::icon('fields', [
            'class' => 'quotemate-panels-sidebar__icon',
            'fill' => '#bebebe',
        ]); ?>
        <span class="quotemate-panels-sidebar__label">Fields</span>
    </button>

    <button class="quotemate-panels-sidebar__button" data-panel="settings">
        <?= AssetHelper::icon('settings', [
            'class' => 'quotemate-panels-sidebar__icon',
            'fill' => '#bebebe',
        ]); ?>
        <span class="quotemate-panels-sidebar__label">Settings</span>
    </button>
</div>