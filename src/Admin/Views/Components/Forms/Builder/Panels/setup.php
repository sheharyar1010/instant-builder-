<?php

use Dawnsol\Quotemate\Helpers\AssetHelper;
use Dawnsol\Quotemate\Helpers\ThemeHelper;

defined('ABSPATH') || exit;

$themes = ThemeHelper::get_all();

// Generate nonce for form creation
$form_nonce = wp_create_nonce('quotemate_save_form');

// Debug: Log the data being passed
$localize_data = [
    'ajaxUrl'   => admin_url('admin-ajax.php'),
    'nonce' => $form_nonce,
    'edit_mode' => $data['edit_mode'],
];

// Debug output
error_log('QuoteMate Setup - Localize data: ' . print_r($localize_data, true));

AssetHelper::enqueue_assets('admin/forms/builder/panels/setup', true, $localize_data);
?>

<!-- Debug output for browser console -->
<script>
console.log('QuoteMate Setup - PHP Debug:', {
    ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
    nonce: '<?php echo $form_nonce; ?>',
    edit_mode: <?php echo $data['edit_mode'] ? 'true' : 'false'; ?>,
    windowQuotemate: window.Quotemate
});

// Fallback: Ensure data is available
window.Quotemate = window.Quotemate || {};
window.Quotemate.admin_forms_builder_panels_setup = {
    ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
    nonce: '<?php echo $form_nonce; ?>',
    edit_mode: <?php echo $data['edit_mode'] ? 'true' : 'false'; ?>
};

console.log('QuoteMate Setup - Fallback data set:', window.Quotemate.admin_forms_builder_panels_setup);
</script>

<form id="quotemate-form-setup" class="quotemate-form-setup">
    <div class="quotemate-form-setup__header">
        <h2 class="quotemate-form-setup__title">Name Your Form</h2>
        <input type="text" id="form-name" name="form_name" class="quotemate-form-input quotemate-form-setup__title-input" placeholder="Enter your form name here..." required>
        <?php if ($data['edit_mode']): ?>
            <input type="hidden" name="form_id" value="<?= esc_attr($data['form_id']) ?>">
            <input type="hidden" name="action" value="update_form">
        <?php else: ?>
            <input type="hidden" name="action" value="create_form">
        <?php endif; ?>
        <input type="hidden" name="nonce" value="<?= $form_nonce ?>">
        <input type="hidden" name="template_id">
        <input type="hidden" name="theme_id" value="<?= esc_attr(ThemeHelper::THEME_CLASSIC) ?>">
    </div>

    <div class="quotemate-form-setup__body">
        <div class="quotemate-form-setup__description">
            <h3 class="quotemate-form-setup__description-title">Choose a Theme</h3>
            <p class="quotemate-form-setup__description-text">Pick how your form looks and navigates between steps. You can customize colors later in the Design settings.</p>
        </div>

        <div class="quotemate-form-setup__theme-selection">
            <?php foreach ($themes as $theme) :
                $theme_design = ThemeHelper::get_default_design($theme['id']);
                $accent = $theme_design['buttonColor'];
                $accent_end = $theme_design['buttonColorEnd'] ?? $accent;
                $is_classic = $theme['id'] === ThemeHelper::THEME_CLASSIC;
                $swatch_style = ($theme_design['buttonStyle'] ?? 'solid') === 'gradient'
                    ? 'background: linear-gradient(135deg, ' . esc_attr($accent) . ' 0%, ' . esc_attr($accent_end) . ' 100%);'
                    : 'background: ' . esc_attr($accent) . ';';
            ?>
            <button
                type="button"
                class="quotemate-form-setup__theme-item<?= $is_classic ? ' quotemate-form-setup__theme-item--active' : '' ?>"
                data-theme-id="<?= esc_attr($theme['id']) ?>"
                aria-pressed="<?= $is_classic ? 'true' : 'false' ?>"
            >
                <span class="quotemate-form-setup__theme-swatch" style="<?= esc_attr($swatch_style) ?>"></span>
                <span class="quotemate-form-setup__theme-name"><?= esc_html($theme['name']) ?></span>
                <span class="quotemate-form-setup__theme-desc"><?= esc_html($theme['description']) ?></span>
            </button>
            <?php endforeach; ?>
        </div>

        <div class="quotemate-form-setup__description quotemate-form-setup__description--templates">
            <h3 class="quotemate-form-setup__description-title">Select a Template</h3>
            <p class="quotemate-form-setup__description-text">Choose a template to define how your form will look on your site. You can change it later if needed.</p>
        </div>

        <div class="quotemate-form-setup__template-selection">
            <div class="quotemate-form-setup__templates-sidebar">
                <input type="text" id="template-search" class="quotemate-form-input quotemate-form-template-search" placeholder="Search templates...">
                <ul class="quotemate-form-setup__template-categories-list">
                    <li class="quotemate-form-setup__template-category-item quotemate-form-setup__template-category-item--active" data-category-id="0">All Templates <span class="quotemate-form-setup__template-categories-count">2</span></li>
                    <li class="quotemate-form-setup__template-category-item" data-category-id="2">Single Step Forms <span class="quotemate-form-setup__template-categories-count">1</span></li>
                    <li class="quotemate-form-setup__template-category-item" data-category-id="3">Multi-Step Forms <span class="quotemate-form-setup__template-categories-count">1</span></li>
                </ul>
            </div>

            <div class="quotemate-form-setup__templates-content">
                <div class="quotemate-form-setup__templates-list">
                    <div class="quotemate-form-setup__template-item" data-category-id="2" data-template-id="1">
                        <div class="quotemate-form-setup__template-image-wrapper">
                            <?= AssetHelper::image('thumbnails/templates/single-step-form.jpg', "Single Step Form", [
                                'class' => 'quotemate-form-setup__template-image',
                                'width' => '100%',
                                'height' => '100%',
                            ]) ?>
                        </div>
                        <div class="quotemate-form-setup__template-body">
                            <div class="quotemate-form-setup__template-content">
                                <h4 class="quotemate-form-setup__template-title">Single Step Form</h4>
                                <p class="quotemate-form-setup__template-description">A clean and modern single-step form template.</p>
                            </div>
                            <div class="quotemate-form-setup__template-actions">
                                <button type="button" class="quotemate-form-setup__template-button quotemate-form-setup__template-button--use">Use Template</button>
                                <button type="button" class="quotemate-form-setup__template-button quotemate-form-setup__template-button--demo">View Demo</button>
                            </div>
                        </div>
                    </div>
                    <div class="quotemate-form-setup__template-item" data-category-id="3" data-template-id="2">
                        <div class="quotemate-form-setup__template-image-wrapper">
                            <?= AssetHelper::image('thumbnails/templates/multi-step-form.jpg', "Multi Step Form", [
                                'class' => 'quotemate-form-setup__template-image',
                                'width' => '100%',
                                'height' => '100%',
                            ]) ?>
                        </div>
                        <div class="quotemate-form-setup__template-body">
                            <div class="quotemate-form-setup__template-content">
                                <h4 class="quotemate-form-setup__template-title">Multi Step Form</h4>
                                <p class="quotemate-form-setup__template-description">A multi-step form that guides users through the process.</p>
                            </div>
                            <div class="quotemate-form-setup__template-actions">
                                <button type="button" class="quotemate-form-setup__template-button quotemate-form-setup__template-button--use">Use Template</button>
                                <button type="button" class="quotemate-form-setup__template-button quotemate-form-setup__template-button--demo">View Demo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>