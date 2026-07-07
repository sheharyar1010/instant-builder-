<?php
// Updated form-view.php template with modern design and conditional step display
if (!defined('ABSPATH')) {
    exit;
}

use Dawnsol\Quotemate\Helpers\FormHelper;
use Dawnsol\Quotemate\Helpers\DesignHelper;
use Dawnsol\Quotemate\Helpers\HeadingHelper;
use Dawnsol\Quotemate\Helpers\TextFormatHelper;

/** @var $form  object */
/** @var $fields array */
/** @var $settings array */

$steps = FormHelper::group_fields_by_pages($fields);
$step_labels = FormHelper::get_step_labels_from_fields($fields);
$hasMultipleSteps = count($steps) > 1;
$form_layout = FormHelper::resolve_layout($settings, $fields);
$form_design = DesignHelper::resolve($settings);
$form_design_style = DesignHelper::get_css_vars_style($form_design);
$form_width_class = DesignHelper::get_width_class($form_design);
?>

<div class="quotemate-form-wrapper quotemate-form quotemate-theme-<?php echo esc_attr($form_design['themeId']); ?> <?php echo esc_attr($form_width_class); ?>" id="quotemate-form-<?php echo esc_attr($form->id); ?>" style="<?php echo esc_attr($form_design_style); ?>" data-qm-theme="<?php echo esc_attr($form_design['themeId']); ?>" data-qm-header-style="<?php echo esc_attr($form_design['headerStyle']); ?>" data-qm-button-style="<?php echo esc_attr($form_design['buttonStyle']); ?>">
    <div class="form-messages" style="display: none;"></div>

    <form method="post" action="javascript:void(0);" class="quotemate-form quotemate-frontend-form <?php echo $hasMultipleSteps ? 'multi-step-form' : 'single-step-form'; ?>" id="quotemate-form-<?php echo esc_attr($form->id); ?>-form">
        <input type="hidden" name="quotemate_nonce" value="<?php echo wp_create_nonce('quotemate_submit_form'); ?>" />
        <input type="hidden" name="form_id" value="<?php echo esc_attr($form->id); ?>">
        <input type="hidden" name="action" value="quotemate_submit_form">

        <!-- Step Progress (only show if multiple steps) -->
        <?php if ($hasMultipleSteps): ?>
            <div class="step-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: <?php echo 100 / count($steps); ?>%"></div>
                </div>
                <div class="step-indicators">
                    <?php foreach ($steps as $stepIndex => $step): ?>
                        <div class="step-indicator <?php echo $stepIndex === 0 ? 'active' : ''; ?>" data-step="<?php echo $stepIndex; ?>">
                            <div class="step-number"><?php echo $stepIndex + 1; ?></div>
                            <div class="step-label"><?php echo esc_html($step_labels[$stepIndex] ?? ('Step ' . ($stepIndex + 1))); ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>

        <!-- Form Content -->
        <div class="form-content">
            <?php foreach ($steps as $stepIndex => $step): ?>
                <div class="form-step <?php echo $hasMultipleSteps ? '' : 'single-step'; ?>" data-step="<?php echo $stepIndex; ?>" style="<?php echo $stepIndex === 0 ? '' : 'display:none;'; ?>">

                    <?php foreach ($step['sections'] as $section): ?>
                        <div class="form-section">
                            <?php if ($section['title']): ?>
                                <h3 class="section-title"><?php echo esc_html(TextFormatHelper::to_title_case($section['title'])); ?></h3>
                            <?php endif; ?>

                                            <?php
                            $section_layout = FormHelper::organize_section_fields_by_layout($section['fields'], $form_layout);
                            $section_fields_class = 'section-fields' . ($section_layout['has_layout'] ? ' section-fields--layout' : '');
                            $field_group_partial = QUOTEMATE_DIR . 'src/Frontend/Views/Templates/partials/field-group.php';
                            ?>
                            <div class="<?php echo esc_attr($section_fields_class); ?>">
                                <?php if ($section_layout['has_layout']) : ?>
                                    <?php foreach ($section_layout['rows'] as $layout_row) : ?>
                                        <div class="quotemate-form-row" style="--qm-row-columns: <?php echo (int) $layout_row['column_count']; ?>">
                                            <?php foreach ($layout_row['columns'] as $layout_column) : ?>
                                                <div class="quotemate-form-column">
                                                    <?php foreach ($layout_column['fields'] as $field) : ?>
                                                        <?php include $field_group_partial; ?>
                                                    <?php endforeach; ?>
                                                    </div>
                                            <?php endforeach; ?>
                                                            </div>
                                    <?php endforeach; ?>
                                <?php else : ?>
                                    <?php foreach ($section['fields'] as $field) : ?>
                                        <?php include $field_group_partial; ?>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                                                    </div>
                                                                        </div>
                    <?php endforeach; ?>

                    <!-- Navigation (only show if multiple steps) -->
                    <?php if ($hasMultipleSteps): ?>
                                                    <?php
                        $page_break_nav = $step['page_break_after'] ?? null;
                        $page_break_index = (int) ($step['page_break_index'] ?? 0);
                        $has_nav_row = $page_break_nav && $page_break_index > 0;
                        $show_prev_button = $has_nav_row
                            && $stepIndex > 0
                            && FormHelper::should_show_page_break_previous($page_break_nav);
                        $is_last_step = $stepIndex >= count($steps) - 1;
                        $next_btn_label = $page_break_nav && !empty($page_break_nav['page_title'])
                            ? $page_break_nav['page_title']
                            : __('Continue', 'quotemate');
                        $prev_btn_label = $page_break_nav && !empty($page_break_nav['page_prev_title'])
                            ? $page_break_nav['page_prev_title']
                            : __('Previous', 'quotemate');
                        $next_btn_style = (!$is_last_step && $page_break_nav)
                            ? FormHelper::get_page_break_button_spacing_style($page_break_nav, 'next')
                            : '';
                        $prev_btn_style = ($show_prev_button && $page_break_nav)
                            ? FormHelper::get_page_break_button_spacing_style($page_break_nav, 'prev')
                            : '';
                        if (!$is_last_step && $page_break_nav) {
                            $next_btn_style = trim($next_btn_style . ';background:' . FormHelper::resolve_page_break_button_background($page_break_nav, $form_design), ';');
                        }
                        if ($show_prev_button && $page_break_nav) {
                            $prev_bg = FormHelper::resolve_page_break_prev_button_background($page_break_nav, $form_design);
                            $prev_btn_style = trim($prev_btn_style . ';background:' . $prev_bg . ';color:' . ($form_design['secondaryBtnText'] ?? '#1a1a1a'), ';');
                            if (!empty($form_design['secondaryBtnBorder'])) {
                                $prev_btn_style .= ';border:1px solid ' . esc_attr($form_design['secondaryBtnBorder']);
                            }
                        }
                        $nav_spacing_style = $page_break_nav ? FormHelper::get_field_style_attr($page_break_nav) : '';
                        $nav_classes = 'form-navigation' . ($page_break_nav ? ' quotemate-form-navigation--has-page-break' : '');
                        if ($has_nav_row) {
                            $nav_classes .= ' quotemate-form-navigation--dual';
                            $nav_classes .= ' ' . FormHelper::get_page_break_nav_align_class($page_break_nav['page_break_align'] ?? 'center');
                            if (!$show_prev_button) {
                                $nav_classes .= ' quotemate-form-navigation--prev-hidden';
                            }
                        } elseif ($page_break_nav) {
                            $nav_classes .= ' ' . FormHelper::get_page_break_nav_align_class($page_break_nav['page_break_align'] ?? 'center');
                        } else {
                            $nav_classes .= ' quotemate-form-navigation--align-center';
                        }
                        $nav_inline_style = $nav_spacing_style;
                        ?>
                        <div class="<?php echo esc_attr($nav_classes); ?>"<?php echo $nav_inline_style !== '' ? ' style="' . esc_attr($nav_inline_style) . '"' : ''; ?>>
                            <?php if ($page_break_nav && !empty($page_break_nav['page_description'])) : ?>
                                <p class="quotemate-form-field__page-break-desc"><?php echo esc_html($page_break_nav['page_description']); ?></p>
                                                    <?php endif; ?>
                            <?php if ($has_nav_row && $page_break_nav && !empty($page_break_nav['page_prev_description'])) : ?>
                                <p class="quotemate-form-field__page-break-desc quotemate-form-field__page-break-desc--prev"><?php echo esc_html($page_break_nav['page_prev_description']); ?></p>
                            <?php endif; ?>
                            <?php if ($has_nav_row) : ?>
                                                    <?php
                                $nav_row_class = 'quotemate-form-page-break-nav';
                                if (!$show_prev_button) {
                                    $nav_row_class .= ' quotemate-form-page-break-nav--prev-hidden';
                                }
                                ?>
                                <div class="<?php echo esc_attr($nav_row_class); ?>">
                                    <?php if (!$is_last_step) : ?>
                                        <div class="quotemate-form-page-break-nav__slot quotemate-form-page-break-nav__slot--next quotemate-form-page-break-nav__slot--<?php echo esc_attr(FormHelper::resolve_page_break_align($page_break_nav['page_break_align'] ?? 'left')); ?>">
                                            <button type="button" class="btn btn-primary next-step"<?php echo $next_btn_style !== '' ? ' style="' . esc_attr($next_btn_style) . '"' : ''; ?>><?php echo esc_html($next_btn_label); ?></button>
                                        </div>
                                        <?php endif; ?>
                                    <?php if ($show_prev_button) : ?>
                                        <div class="quotemate-form-page-break-nav__slot quotemate-form-page-break-nav__slot--prev quotemate-form-page-break-nav__slot--<?php echo esc_attr(FormHelper::resolve_page_break_align($page_break_nav['page_break_prev_align'] ?? 'right')); ?>">
                                            <button type="button" class="btn btn-secondary prev-step"<?php echo $prev_btn_style !== '' ? ' style="' . esc_attr($prev_btn_style) . '"' : ''; ?>><?php echo esc_html($prev_btn_label); ?></button>
                                    </div>
                            <?php endif; ?>
                                </div>
                            <?php else : ?>
                            <?php if (!$is_last_step): ?>
                                <button type="button" class="btn btn-primary next-step"<?php echo $next_btn_style !== '' ? ' style="' . esc_attr($next_btn_style) . '"' : ''; ?>><?php echo esc_html($next_btn_label); ?></button>
                            <?php else: ?>
                                <button type="submit" class="btn btn-primary submit-btn">
                                    <span class="btn-text">Submit Quote Request</span>
                                    <span class="btn-spinner" style="display: none;">
                                        <svg class="spinner" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                            </circle>
                                        </svg>
                                        Submitting...
                                    </span>
                                </button>
                            <?php endif; ?>
                            <?php if (!$has_nav_row && $stepIndex > 0): ?>
                                <button type="button" class="btn btn-secondary prev-step">Previous</button>
                            <?php endif; ?>
                            <?php endif; ?>
                        </div>
                    <?php else: ?>
                        <!-- Single step form - submit button -->
                        <div class="form-navigation">
                            <button type="submit" class="btn btn-primary submit-btn">
                                <span class="btn-text">Submit Quote Request</span>
                                <span class="btn-spinner" style="display: none;">
                                    <svg class="spinner" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                                        </circle>
                                    </svg>
                                    Submitting...
                                </span>
                            </button>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </form>
</div>

<style>
/* Modern Form Styles — driven by --qm-* CSS variables from Design settings */
.quotemate-form-wrapper {
    max-width: var(--qm-form-max-width, 1248px);
    margin: 0 auto;
    font-family: var(--qm-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--qm-font-size, 16px);
    line-height: 1.6;
    color: var(--qm-text-color, #333);
    background-color: var(--qm-form-bg, #ffffff);
    padding-left: 40px;
    padding-right: 40px;
    box-sizing: border-box;
    border: var(--qm-form-border-width, 0) solid var(--qm-form-border-color, transparent);
    border-radius: var(--qm-form-border-radius, 12px);
}

.quotemate-form-width-full {
    max-width: 100%;
}

.form-header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 2rem 0;
    background: linear-gradient(
        135deg,
        var(--qm-header-color, #667eea) 0%,
        var(--qm-header-color-end, #764ba2) 100%
    );
    color: var(--qm-header-text, #ffffff);
    border-radius: 12px;
    margin-bottom: 2rem;
}

.quotemate-form-wrapper[data-qm-header-style="solid"] .form-header {
    background: var(--qm-header-color, #667eea);
}

.form-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-description {
    font-size: 1.1rem;
    opacity: 0.9;
    margin: 0;
    max-width: 600px;
    margin: 0 auto;
}

/* Step Progress */
.step-progress {
    margin-bottom: 2rem;
}

.progress-bar {
    height: 6px;
    background: var(--qm-progress-track, #e9ecef);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 1rem;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(
        90deg,
        var(--qm-button-color, #667eea) 0%,
        var(--qm-button-color-end, #764ba2) 100%
    );
    transition: width 0.3s ease;
}

.quotemate-form-wrapper[data-qm-button-style="solid"] .progress-fill {
    background: var(--qm-button-color, #667eea);
}

.step-indicators {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Form step progress — keep number circles visible (not service selector labels) */
.quotemate-form-wrapper .step-progress .step-indicator > .step-number,
.quotemate-form-wrapper .unified-step-progress .step-indicator > .step-number,
.quotemate-form-wrapper .service-cascade-step-progress .step-indicator > .step-number {
    display: inline-flex !important;
}

.step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    opacity: 0.5;
    transition: all 0.3s ease;
}

.step-indicator.active {
    opacity: 1;
}

.step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--qm-progress-track, #e9ecef);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--qm-text-muted, #6c757d);
    transition: all 0.3s ease;
}

.quotemate-form-wrapper:not([data-qm-theme="numbered"]) .step-indicator.active .step-number {
    background: linear-gradient(
        135deg,
        var(--qm-button-color, #667eea) 0%,
        var(--qm-button-color-end, #764ba2) 100%
    );
    color: var(--qm-button-text, #ffffff);
    box-shadow: 0 4px 12px var(--qm-step-shadow, rgba(102, 126, 234, 0.4));
}

.quotemate-form-wrapper[data-qm-button-style="solid"]:not([data-qm-theme="numbered"]) .step-indicator.active .step-number {
    background: var(--qm-button-color, #667eea);
}

.step-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--qm-text-muted, #6c757d);
}

.step-indicator.active .step-label {
    color: var(--qm-text-color, #333);
    font-weight: 600;
}

/* Form Content — flat by default; minimal theme adds card styling */
.form-content {
    background: transparent;
    border-radius: 0;
    box-shadow: none;
    border: none;
    overflow: visible;
}

.form-step {
    padding: 2rem;
}

.form-step.single-step {
    padding: 2rem;
}

/* Form Sections */
.form-section {
    margin-bottom: 2rem;
}

.section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--qm-text-color, #333);
    margin: 0 0 1.5rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #f8f9fa;
}

.section-fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    align-items: start;
}

/* Form Groups */
.form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: all 0.3s ease;
    margin-bottom: var(--qm-field-spacing, 1.5rem);
}

.section-fields > .form-group:last-child {
    margin-bottom: 0;
}

.form-group[data-hidden-by-logic="true"] {
    display: none !important;
}

.field-label {
    font-weight: 600;
    color: var(--qm-label-color, #495057);
    font-size: 0.95rem;
}

/* Per-field style vars (typography, colors from builder) */
.form-group[style*="--qm-label-color"] .field-label { color: var(--qm-label-color); }
.form-group[style*="--qm-label-size"] .field-label { font-size: var(--qm-label-size); }
.form-group[style*="--qm-label-font-family"] .field-label { font-family: var(--qm-label-font-family); }
.form-group[style*="--qm-label-font-weight"] .field-label { font-weight: var(--qm-label-font-weight); }
.form-group[style*="--qm-label-text-transform"] .field-label { text-transform: var(--qm-label-text-transform); }
.form-group[style*="--qm-label-font-style"] .field-label { font-style: var(--qm-label-font-style); }
.form-group[style*="--qm-label-text-decoration"] .field-label { text-decoration: var(--qm-label-text-decoration); }
.form-group[style*="--qm-label-line-height"] .field-label { line-height: var(--qm-label-line-height); }
.form-group[style*="--qm-label-letter-spacing"] .field-label { letter-spacing: var(--qm-label-letter-spacing); }
.form-group[style*="--qm-label-word-spacing"] .field-label { word-spacing: var(--qm-label-word-spacing); }
.form-group[style*="--qm-input-color"] .form-control,
.form-group[style*="--qm-input-color"] .radio-label,
.form-group[style*="--qm-input-color"] .checkbox-label { color: var(--qm-input-color); }
.form-group[style*="--qm-input-font-family"] .form-control,
.form-group[style*="--qm-input-font-family"] .radio-label,
.form-group[style*="--qm-input-font-family"] .checkbox-label { font-family: var(--qm-input-font-family); }
.form-group[style*="--qm-input-font-size"] .form-control,
.form-group[style*="--qm-input-font-size"] .radio-label,
.form-group[style*="--qm-input-font-size"] .checkbox-label { font-size: var(--qm-input-font-size); }
.form-group[style*="--qm-input-font-weight"] .form-control,
.form-group[style*="--qm-input-font-weight"] .radio-label,
.form-group[style*="--qm-input-font-weight"] .checkbox-label { font-weight: var(--qm-input-font-weight); }
.form-group[style*="--qm-input-bg"] .form-control { background-color: var(--qm-input-bg); }
.form-group[style*="--qm-border-width"] .form-control { border-width: var(--qm-border-width); }
.form-group[style*="--qm-border-color"] .form-control { border-color: var(--qm-border-color); }
.form-group[style*="--qm-border-radius-tl"] .form-control {
  border-top-left-radius: var(--qm-border-radius-tl);
  border-top-right-radius: var(--qm-border-radius-tr);
  border-bottom-right-radius: var(--qm-border-radius-br);
  border-bottom-left-radius: var(--qm-border-radius-bl);
}
.form-group[style*="--qm-input-padding"] .form-control { padding: var(--qm-input-padding); }

.required {
    color: #dc3545;
    margin-left: 0.25rem;
}

.field-input {
    position: relative;
}

.field-description {
    font-size: 0.875rem;
    color: var(--qm-text-muted, #6c757d);
    margin-top: 0.25rem;
}

/* Form Controls */
.form-control {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--qm-border-color, #ced4da);
    border-radius: 0.375rem;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--qm-label-color, #495057);
    background-color: #fff;
    background-clip: padding-box;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    box-sizing: border-box;
}

.form-control:focus {
    color: var(--qm-label-color, #495057);
    background-color: #fff;
    border-color: var(--qm-focus-color, #667eea);
    outline: 0;
    box-shadow: 0 0 0 0.2rem var(--qm-focus-ring, rgba(102, 126, 234, 0.25));
}

.form-control::placeholder {
    color: var(--qm-text-muted, #6c757d);
    opacity: 1;
}

/* Checkbox and Radio */
.checkbox-wrapper, .radio-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
}

.radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.form-checkbox, .form-radio {
    width: 18px;
    height: 18px;
    accent-color: var(--qm-accent-color, #667eea);
}

.checkbox-label, .radio-label {
    font-weight: 500;
    color: var(--qm-label-color, #495057);
    cursor: pointer;
}

/* Quote Total Display */
.quote-total-display {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid #dee2e6;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.total-header h4 {
    margin: 0 0 1rem 0;
    color: #495057;
    font-size: 1.25rem;
    font-weight: 600;
}

.total-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.service-summary {
    border-bottom: 1px solid #dee2e6;
    padding-bottom: 1rem;
}

.service-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
}

.service-name {
    font-weight: 500;
    color: #495057;
}

.service-price {
    font-weight: 600;
    color: var(--qm-accent-color, #667eea);
}

.total-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 2px solid #dee2e6;
    font-size: 1.25rem;
    font-weight: 700;
}

.total-label {
    color: #495057;
}

.total-value {
    color: var(--qm-accent-color, #667eea);
    font-size: 1.5rem;
}

/* Progressive Service Selector */
.progressive-service-selector {
    margin-bottom: 1rem;
}

.progressive-selector-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.progressive-dropdown-level {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    border: 2px solid #e9ecef;
    border-radius: 10px;
    background: #f8f9fa;
    transition: all 0.3s ease;
}

.progressive-dropdown-level.active {
    border-color: var(--qm-accent-color, #667eea);
    background: color-mix(in srgb, var(--qm-accent-color, #667eea) 8%, #ffffff);
}

.progressive-dropdown-level .level-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--qm-label-color, #495057);
    margin-bottom: 0.5rem;
}

.progressive-dropdown-level select {
    padding: 0.75rem 1rem;
    border: 2px solid var(--qm-border-color, #e9ecef);
    border-radius: 8px;
    font-size: 1rem;
    background: white;
    transition: all 0.3s ease;
}

.progressive-dropdown-level select:focus {
    outline: none;
    border-color: var(--qm-focus-color, #667eea);
    box-shadow: 0 0 0 3px var(--qm-focus-ring, rgba(102, 126, 234, 0.1));
}

.progressive-dropdown-level.completed {
    border-color: #28a745;
    background: #f8fff9;
}

.progressive-dropdown-level.completed .level-label::after {
    content: " ✓";
    color: #28a745;
    font-weight: bold;
}

/* Quantity Dropdown Level Styles */
.progressive-dropdown-level.quantity-dropdown-level {
    border-color: var(--qm-accent-color, #667eea);
    background: color-mix(in srgb, var(--qm-accent-color, #667eea) 10%, #ffffff);
}

.progressive-dropdown-level.quantity-dropdown-level.completed {
    border-color: #28a745;
    background: #d4edda;
}

.progressive-dropdown-level.quantity-dropdown-level .level-label {
    color: var(--qm-accent-color, #667eea);
}

.progressive-dropdown-level.quantity-dropdown-level select {
    border-color: var(--qm-accent-color, #667eea);
}

.progressive-dropdown-level.quantity-dropdown-level select:focus {
    border-color: var(--qm-focus-color, #667eea);
    box-shadow: 0 0 0 3px var(--qm-focus-ring, rgba(102, 126, 234, 0.1));
}

/* Form Messages */
.form-messages {
    margin-bottom: 1.5rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
}

.form-messages.success {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    color: #155724;
    border: 1px solid #c3e6cb;
}

.form-messages.error {
    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
    color: #721c24;
    border: 1px solid #f5c6cb;
}

/* Form Navigation */
.form-navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 1.25rem;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #f8f9fa;
}

.form-navigation.quotemate-form-navigation--align-left {
    justify-content: flex-start;
}

.form-navigation.quotemate-form-navigation--align-right {
    justify-content: flex-end;
}

.form-navigation.unified-form-navigation.quotemate-form-navigation--align-left {
    justify-content: flex-start;
}

.form-navigation.unified-form-navigation.quotemate-form-navigation--align-right {
    justify-content: flex-end;
}

.form-navigation.quotemate-form-navigation--dual {
    gap: 0.75rem;
}

.form-navigation.quotemate-form-navigation--dual .quotemate-form-page-break-nav,
.form-navigation.quotemate-form-navigation--dual .quotemate-form-nav-button-group {
    gap: 0;
}

.form-navigation.quotemate-form-navigation--dual .quotemate-form-page-break-nav .btn + .btn,
.form-navigation.quotemate-form-navigation--dual .quotemate-form-nav-button-group .btn + .btn {
    margin-left: 0;
}

.form-navigation.quotemate-form-navigation--dual .next-step:not(:only-child) {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
}

.form-navigation.quotemate-form-navigation--dual .prev-step {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    margin-left: -1px;
}

.form-navigation.unified-form-navigation.quotemate-form-navigation--dual {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
}

.form-navigation.unified-form-navigation {
    gap: 1.25rem;
    justify-content: center;
}

.form-navigation.unified-form-navigation.nav-has-prev {
    justify-content: center;
}

.form-navigation.unified-form-navigation.nav-has-prev.quotemate-form-navigation--align-left {
    justify-content: flex-start;
}

.form-navigation.unified-form-navigation.nav-has-prev.quotemate-form-navigation--align-right {
    justify-content: flex-end;
}

.form-navigation .btn {
    flex-shrink: 0;
    white-space: nowrap;
    min-width: 120px;
    justify-content: center;
}

.form-navigation .btn + .btn {
    margin-left: 0;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: linear-gradient(
        135deg,
        var(--qm-button-color, #667eea) 0%,
        var(--qm-button-color-end, #764ba2) 100%
    );
    color: var(--qm-button-text, #ffffff);
    box-shadow: 0 4px 12px var(--qm-accent-shadow, rgba(102, 126, 234, 0.3));
}

.quotemate-form-wrapper[data-qm-button-style="solid"] .btn-primary {
    background: var(--qm-button-color, #667eea);
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--qm-accent-shadow-hover, rgba(102, 126, 234, 0.4));
}

.btn-secondary {
    background: var(--qm-secondary-btn-bg, #faf8f4);
    color: var(--qm-secondary-btn-text, #1a1a1a);
    border: 1px solid var(--qm-secondary-btn-border, #e8e4dc);
    box-shadow: none;
    font-weight: 700;
}

.btn-secondary:hover:not(:disabled) {
    background: var(--qm-secondary-btn-hover, #f0ebe3);
    color: var(--qm-secondary-btn-text, #1a1a1a);
    border-color: var(--qm-secondary-btn-border, #e8e4dc);
    transform: none;
}

.btn-icon {
    width: 18px;
    height: 18px;
}

.spinner {
    width: 18px;
    height: 18px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
    .quotemate-form-wrapper {
        padding-left: 20px;
        padding-right: 20px;
    }
    
    .form-title {
        font-size: 2rem;
    }
    
    .form-step {
        padding: 1.5rem;
    }
    
    .step-indicators {
        flex-direction: column;
        gap: 1rem;
    }
    
    .form-navigation {
        flex-direction: column;
        gap: 1rem;
    }
    
    .btn {
        width: 100%;
        justify-content: center;
    }
}

/* Enhanced Quantity Field Styles */
.auto-quantity-field {
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(-10px);
}

.auto-quantity-field[style*="display: block"] {
    opacity: 1;
    transform: translateY(0);
}

.quantity-select {
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 16px;
    transition: all 0.3s ease;
    cursor: pointer;
}

.quantity-select:focus {
    outline: none;
    border-color: var(--qm-focus-color, #667eea);
    box-shadow: 0 0 0 3px var(--qm-focus-ring, rgba(102, 126, 234, 0.1));
}

.quantity-price-display {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid #dee2e6;
    border-radius: 12px;
    padding: 20px;
    margin-top: 15px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #007cba;
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.price-breakdown {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.price-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #dee2e6;
}

.price-line:last-child {
    border-bottom: none;
}

.price-line.total-line {
    border-top: 2px solid #007cba;
    border-bottom: none;
    padding-top: 12px;
    margin-top: 8px;
    font-size: 18px;
    font-weight: bold;
    color: #007cba;
}

.price-line span:first-child {
    font-weight: 500;
    color: #495057;
}

.price-line .unit-price,
.price-line .quantity-value,
.price-line .total-price {
    font-weight: 600;
    color: #28a745;
}

.price-line .total-price {
    font-size: 20px;
    color: #007cba;
}

/* Responsive adjustments for quantity fields */
@media (max-width: 768px) {
    .quantity-price-display {
        padding: 15px;
        margin-top: 10px;
    }
    
    .price-line {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
    
    .price-line.total-line {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
}
</style>

<script type="application/json" id="quotemate-form-fields-json"><?php echo wp_json_encode($fields); ?></script>

<script>
document.addEventListener("DOMContentLoaded", function () {
    const qmText = window.QuoteMateTextFormat || {};
    const qmFormatDisplay = (text) => (qmText.formatDisplayName ? qmText.formatDisplayName(text) : text);
    const qmFormatChoose = (subject, kind) => (
        qmText.formatChoosePlaceholder
            ? qmText.formatChoosePlaceholder(subject, kind)
            : `Choose ${subject || 'Option'}`
    );
    const qmFormatChooseNumber = (unit) => (
        qmText.formatChooseNumberPlaceholder
            ? qmText.formatChooseNumberPlaceholder(unit)
            : `Choose Number of ${unit}`
    );
    const qmFormatQtyOption = (count, unit) => (
        qmText.formatQuantityOption
            ? qmText.formatQuantityOption(count, unit)
            : `${count} ${unit}`
    );

    const formWrapper = document.getElementById('quotemate-form-<?php echo esc_attr($form->id); ?>');
    const form = formWrapper.querySelector('.quotemate-form');
    const steps = formWrapper.querySelectorAll(".form-step");
    const stepIndicators = formWrapper.querySelectorAll(".step-indicator");
    const progressFill = formWrapper.querySelector(".progress-fill");
    const messagesDiv = formWrapper.querySelector('.form-messages');

    let currentStep = 0;
    const totalSteps = steps.length;
    const hasMultipleSteps = <?php echo $hasMultipleSteps ? 'true' : 'false'; ?>;

    function showStep(index) {
        if (form.classList.contains('unified-multi-step-form')) {
            return;
        }
        steps.forEach((step, i) => step.style.display = i === index ? '' : 'none');
        stepIndicators.forEach((indicator, i) => {
            indicator.classList.toggle("active", i === index);
            indicator.classList.toggle("completed", i < index);
        });
        
        // Update progress bar
        if (progressFill) {
            const progressPercentage = ((index + 1) / totalSteps) * 100;
            progressFill.style.width = progressPercentage + '%';
        }
        
        currentStep = index;
    }

    function showMessage(message, type) {
        if (!messagesDiv) {
            alert(message); // Fallback to alert
            return;
        }
        
        try {
            messagesDiv.textContent = message;
            messagesDiv.className = `form-messages ${type}`;
            messagesDiv.style.display = 'block';
            messagesDiv.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            alert(message); // Fallback to alert
        }
    }

    function hideMessage() {
        messagesDiv.style.display = 'none';
    }

    // Step navigation
    formWrapper.querySelectorAll(".next-step").forEach(btn =>
        btn.addEventListener("click", () => {
            if (validateCurrentStep()) {
                hideMessage();
                showStep(currentStep + 1);
            }
        })
    );

    formWrapper.querySelectorAll(".prev-step").forEach(btn =>
        btn.addEventListener("click", () => {
            hideMessage();
            showStep(currentStep - 1);
        })
    );

    // Step indicator clicks (only for multi-step forms)
    if (stepIndicators.length > 0) {
        stepIndicators.forEach((indicator, i) => indicator.addEventListener("click", () => {
            if (form.classList.contains('unified-multi-step-form')) return;
            hideMessage();
            showStep(i);
        }));
    }

    function validateCurrentStep() {
        const currentStepDiv = steps[currentStep];
        const requiredFields = currentStepDiv.querySelectorAll('[required]');
        
        for (let field of requiredFields) {
            if (!field.value.trim()) {
                field.focus();
                showMessage('Please fill in all required fields before proceeding.', 'error');
                return false;
            }
        }
        return true;
    }

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateCurrentStep()) {
            return;
        }

        const submitBtn = form.querySelector('.submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');
        
        // Disable submit button and show loading
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';

        const formData = new FormData(form);

        fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success === true) {
                const message = data.data && data.data.message ? data.data.message : 'Your quote request has been submitted successfully!';
                showMessage(message, 'success');
                
                // Reset form to initial state
                form.reset();
                
                // Reset step navigation if multi-step
                if (hasMultipleSteps) {
                    currentStep = 0;
                    showStep(0);
                    updateStepProgress();
                }
                
                // Reset service selectors
                resetServiceSelectors();
                
                // Reset quote total
                const totalField = form.querySelector('[data-field-type="quote_total"] .total-value');
                if (totalField) {
                    totalField.textContent = '$0.00';
                }
                
                // Reset all hidden inputs
                resetHiddenInputs();
                
            } else {
                const errorMessage = data.data && data.data.message ? data.data.message : 'There was an error submitting your request. Please try again.';
                showMessage(errorMessage, 'error');
            }
        })
        .catch(error => {
            showMessage('There was an error submitting your request. Please try again.', 'error');
        })
        .finally(() => {
            // Re-enable submit button
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
        });
    });

    setTimeout(() => {
        if (!form.classList.contains('unified-multi-step-form')) {
            showStep(currentStep);
        }
    }, 0);

    // Initialize Progressive Service Selectors
    initializeProgressiveServiceSelectors();
});

// Reset functions
function resetServiceSelectors() {
    // Reset progressive service selectors
    const serviceSelectors = document.querySelectorAll('.progressive-service-selector');
    serviceSelectors.forEach(selector => {
        // Reset all dropdowns
        const dropdowns = selector.querySelectorAll('.progressive-select');
        dropdowns.forEach(dropdown => {
            dropdown.value = '';
            dropdown.disabled = false;
        });
        
        // Remove all dropdown levels except the first
        const levels = selector.querySelectorAll('.progressive-dropdown-level');
        levels.forEach((level, index) => {
            if (index > 0) {
                level.remove();
            }
        });
        
        // Reset the first dropdown
        const firstDropdown = selector.querySelector('.progressive-dropdown-level:first-child .progressive-select');
        if (firstDropdown) {
            firstDropdown.value = '';
            firstDropdown.disabled = false;
        }
        
        // Hide pricing display
        const pricingDisplay = selector.querySelector('.service-pricing-display');
        if (pricingDisplay) {
            pricingDisplay.style.display = 'none';
        }
        
        // Remove completed classes
        selector.querySelectorAll('.progressive-dropdown-level').forEach(level => {
            level.classList.remove('completed');
        });
    });
    
    // Reset regular service selects
    const serviceSelects = document.querySelectorAll('select[name*="field_"][name$="_service"]');
    serviceSelects.forEach(select => {
        select.value = '';
        select.disabled = false;
    });
}

function resetHiddenInputs() {
    // Reset all dynamic hidden inputs
    const dynamicInputs = document.querySelectorAll('.dynamic-step-input, input[name*="_pricing_type"], input[name*="_base_price"], input[name*="_final_price"], input[name*="_selected_path"]');
    dynamicInputs.forEach(input => {
        input.value = '';
    });
    
    // Reset main service value inputs
    const serviceInputs = document.querySelectorAll('input[name*="field_"][name$="_service"]');
    serviceInputs.forEach(input => {
        input.value = '';
    });
}

function updateStepProgress() {
    const unifiedForm = document.querySelector('.quotemate-frontend-form.unified-multi-step-form');
    if (unifiedForm) return;

    if (typeof hasMultipleSteps === 'undefined' || !hasMultipleSteps) return;
    
    const progressFill = document.querySelector('.step-progress:not(.unified-step-progress) .progress-fill');
    const stepIndicators = document.querySelectorAll(
      '.step-progress:not(.unified-step-progress) .step-indicator'
    );
    
    if (progressFill) {
        const progressPercentage = ((currentStep + 1) / steps.length) * 100;
        progressFill.style.width = progressPercentage + '%';
    }
    
    stepIndicators.forEach((indicator, index) => {
        indicator.classList.remove('active', 'completed');
        if (index === currentStep) {
            indicator.classList.add('active');
        } else if (index < currentStep) {
            indicator.classList.add('completed');
        }
    });
}

// Progressive Service Selector Logic
function initializeProgressiveServiceSelectors() {
    const serviceContainers = document.querySelectorAll('.progressive-service-selector');
    
    serviceContainers.forEach(container => {
        // New progressive-service-selector.js already built .progressive-steps UI
        if (container.querySelector('.progressive-steps')) {
            return;
        }

        const fieldId = container.dataset.fieldId;
        const serviceContainer = container.closest('.service-field-container');
        const enhancedStructureData = serviceContainer.dataset.enhancedStructure;
        
        if (enhancedStructureData) {
            try {
                const enhancedStructure = JSON.parse(enhancedStructureData);
                if (enhancedStructure && enhancedStructure.length > 0) {
                  
                    initializeProgressiveSelector(container, enhancedStructure, fieldId);
                }
            } catch (e) {
              
            }
        }
    });
}

    // Enhanced quantity field handling with tier-based pricing
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.querySelector('#quotemate-form-<?php echo esc_attr($form->id); ?>');
        if (!form) return;

        // Handle service field changes to show/hide quantity field
        const serviceFields = form.querySelectorAll('select[name="field_9"]');
       
        serviceFields.forEach(serviceField => {
         
            serviceField.addEventListener('change', function() {
                const selectedService = this.value;
                const quantityField = form.querySelector(`[name="field_9_quantity"]`);
          
                
                if (quantityField && selectedService) {
                    // Get service data to check if it has maxQuantity
                    const serviceData = getServiceData('field_9', selectedService);
                   
                    if (serviceData && serviceData.maxQuantity && serviceData.maxQuantity > 0) {
                        // Show quantity field and update options
                        const autoQuantityField = quantityField.closest('.auto-quantity-field');
                   
                        if (autoQuantityField) {
                            autoQuantityField.style.display = 'block';
                            updateQuantityOptions(quantityField, serviceData);
                           
                        } else {
                           
                        }
                    } else {
                        // Hide quantity field if service doesn't need quantity
                        const autoQuantityField = quantityField.closest('.auto-quantity-field');
                        if (autoQuantityField) {
                            autoQuantityField.style.display = 'none';
                        }
                       
                    }
                } else {
                    // Hide quantity field if no service selected
                    if (quantityField) {
                        const autoQuantityField = quantityField.closest('.auto-quantity-field');
                        if (autoQuantityField) {
                            autoQuantityField.style.display = 'none';
                        }
                       
                    }
                }
            });
        });

        // Handle quantity selects with dynamic pricing
        const quantitySelects = form.querySelectorAll('.quantity-select');
        quantitySelects.forEach(select => {
            select.addEventListener('change', function() {
                const quantity = parseInt(this.value) || 0;
                const relatedServiceId = this.dataset.relatedService;
                const priceDisplay = this.parentNode.querySelector('.quantity-price-display');
                
                if (quantity > 0 && relatedServiceId) {
                    // Find the related service field
                    const serviceField = form.querySelector(`[name="${relatedServiceId}"]`);
                    if (serviceField && serviceField.value) {
                        // Get service data from the selected option
                        const serviceData = getServiceData(relatedServiceId, serviceField.value);
                        if (serviceData) {
                            updateQuantityPriceDisplay(priceDisplay, serviceData, quantity);
                        }
                    }
                } else {
                    // Hide price display if no quantity selected
                    if (priceDisplay) {
                        priceDisplay.style.display = 'none';
                    }
                }
            });
        });

        // Function to update quantity options based on service data
        function updateQuantityOptions(quantityField, serviceData) {
            const maxQuantity = serviceData.maxQuantity || 1;
            const pricingType = serviceData.pricingType || 'per_item';
            
            // Get unit label
            const unitLabel = getUnitLabel(pricingType);
            
            // Clear existing options
            quantityField.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = qmFormatChooseNumber(unitLabel);
            quantityField.appendChild(defaultOption);
            
            // Add quantity options
            for (let i = 1; i <= maxQuantity; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = qmFormatQtyOption(i, unitLabel);
                quantityField.appendChild(option);
            }
            
            // Update the label
            const label = quantityField.parentNode.parentNode.querySelector('.field-label');
            if (label) {
                label.innerHTML = `Number of ${qmFormatDisplay(unitLabel)}<span class="required">*</span>`;
            }
        }

        // Function to get unit label from pricing type
        function getUnitLabel(pricingType) {
            const units = {
                'per_page': 'pages',
                'per_hour': 'hours',
                'per_month': 'months',
                'per_year': 'years',
                'per_user': 'users',
                'per_feature': 'features',
                'per_backlink': 'backlinks',
                'per_post': 'posts',
                'per_campaign': 'campaigns',
                'per_project': 'projects',
                'per_item': 'items',
                'fixed': 'service'
            };
            return units[pricingType] || 'items';
        }

        // Function to get service data from selected option
        function getServiceData(serviceFieldId, selectedService) {
            const serviceField = form.querySelector(`[name="${serviceFieldId}"]`);
           
            if (serviceField) {
                const selectedOption = serviceField.querySelector(`option[value="${selectedService}"]`);
              
                if (selectedOption && selectedOption.dataset.service) {
                    try {
                        const serviceData = JSON.parse(selectedOption.dataset.service);
                        
                        return serviceData;
                    } catch (e) {
                   
                    }
                } else {
                   
                    // Log all options to debug
                    const allOptions = serviceField.querySelectorAll('option');
                   
                    allOptions.forEach((option, index) => {
                       
                    });
                }
            } else {
               
            }
            return null;
        }

        // Function to update price display with tier-based pricing
        function updateQuantityPriceDisplay(priceDisplay, serviceData, quantity) {
            if (!priceDisplay || !serviceData) return;

            // Calculate price based on tiers
            let unitPrice = parseFloat(serviceData.basePrice) || 0;
            let totalPrice = unitPrice * quantity;
            let deliveryTime = serviceData.deliveryTime;

            // Check for pricing tiers
            if (serviceData.pricingTiers && serviceData.pricingTiers.length > 0) {
                const applicableTier = findApplicableTier(serviceData.pricingTiers, quantity);
                if (applicableTier) {
                    unitPrice = parseFloat(applicableTier.price) || 0;
                    totalPrice = serviceData.pricingType === 'fixed' ? unitPrice : unitPrice * quantity;
                    deliveryTime = applicableTier.deliveryTime || serviceData.deliveryTime;
                }
            }

            // Update display
            const unitPriceElement = priceDisplay.querySelector('.unit-price');
            const quantityElement = priceDisplay.querySelector('.quantity-value');
            const totalPriceElement = priceDisplay.querySelector('.total-price');

            if (unitPriceElement) unitPriceElement.textContent = `$${unitPrice.toFixed(2)}`;
            if (quantityElement) quantityElement.textContent = quantity;
            if (totalPriceElement) totalPriceElement.textContent = `$${totalPrice.toFixed(2)}`;

            // Show the price display
            priceDisplay.style.display = 'block';

            // Update any quote total fields
            updateQuoteTotals();
        }

        // Function to find applicable pricing tier
        function findApplicableTier(pricingTiers, quantity) {
            const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);
            
            for (let i = sortedTiers.length - 1; i >= 0; i--) {
                const tier = sortedTiers[i];
                const minQty = parseInt(tier.minQuantity) || 1;
                const maxQty = tier.maxQuantity ? parseInt(tier.maxQuantity) : Infinity;
                
                if (quantity >= minQty && quantity <= maxQty) {
                    return tier;
                }
            }
            
            return sortedTiers.length > 0 ? sortedTiers[0] : null;
        }

        // Function to update quote totals
        function updateQuoteTotals() {
            const quoteTotalDisplays = form.querySelectorAll('.quote-total-display');
            quoteTotalDisplays.forEach(display => {
                let total = 0;
                
                // Calculate total from all quantity fields
                const quantitySelects = form.querySelectorAll('.quantity-select');
                quantitySelects.forEach(select => {
                    const quantity = parseInt(select.value) || 0;
                    const priceDisplay = select.parentNode.querySelector('.quantity-price-display');
                    if (priceDisplay && priceDisplay.style.display !== 'none') {
                        const totalPriceElement = priceDisplay.querySelector('.total-price');
                        if (totalPriceElement) {
                            const price = parseFloat(totalPriceElement.textContent.replace('$', '')) || 0;
                            total += price;
                        }
                    }
                });

                // Update the quote total display
                const totalValueElement = display.querySelector('.total-value');
                const hiddenInput = display.querySelector('input[type="hidden"]');
                
                if (totalValueElement) totalValueElement.textContent = `$${total.toFixed(2)}`;
                if (hiddenInput) hiddenInput.value = total;
            });
        }
    });

    function initializeProgressiveSelector(container, serviceStructure, fieldId) {
    const selectorContainer = container.querySelector('.progressive-selector-container');
    const pricingDisplay = container.querySelector('.service-pricing-display');
    const hiddenInput = container.querySelector(`input[name="${fieldId}"]`);
    const pricingTypeInput = container.querySelector(`input[name="${fieldId}_pricing_type"]`);
    const basePriceInput = container.querySelector(`input[name="${fieldId}_base_price"]`);
    const selectedPathInput = container.querySelector(`input[name="${fieldId}_selected_path"]`);
    
    let currentLevel = 0;
    let selectedPath = [];
    let currentData = serviceStructure;
    
    // Create the first dropdown level
    createDropdownLevel(selectorContainer, currentData, 0, []);
    
    function createDropdownLevel(parentContainer, data, level, path) {
        // Remove any dropdowns beyond this level
        const existingLevels = parentContainer.querySelectorAll('.progressive-dropdown-level');
        existingLevels.forEach((levelEl, index) => {
            if (index > level) {
                levelEl.remove();
            }
        });
        
        // Clear pricing display if we're going backwards
        if (level < selectedPath.length) {
            hidePricingDisplay();
            selectedPath = selectedPath.slice(0, level);
            updateHiddenInputs('', '', '', '');
        }
        
        if (!data || data.length === 0) {
            return;
        }
        
        const levelContainer = document.createElement('div');
        levelContainer.className = 'progressive-dropdown-level';
        levelContainer.dataset.level = level;
        
        const levelLabel = createLevelLabel(level, path);
        const dropdown = createDropdown(data, level, path);
        
        levelContainer.appendChild(levelLabel);
        levelContainer.appendChild(dropdown);
        
        parentContainer.appendChild(levelContainer);
        
        // Add event listener for this dropdown
        dropdown.addEventListener('change', function() {
            handleDropdownChange(this, data, level, path);
        });
    }
    
    function createQuantityLevel(parentContainer, service, level, path) {
        // Remove any existing quantity levels
        const existingQuantityLevels = parentContainer.querySelectorAll('.quantity-dropdown-level');
        existingQuantityLevels.forEach(levelEl => levelEl.remove());
        
        const levelContainer = document.createElement('div');
        levelContainer.className = 'progressive-dropdown-level quantity-dropdown-level';
        levelContainer.dataset.level = level;
        
        // Create label based on pricing type
        const pricingType = service.pricingType || 'per_item';
        const unitLabel = getUnitLabel(pricingType);
        
        const levelLabel = document.createElement('div');
        levelLabel.className = 'level-label';
        levelLabel.textContent = `${qmFormatChooseNumber(unitLabel)}:`;
        
        // Create quantity dropdown
        const dropdown = document.createElement('select');
        dropdown.className = 'progressive-select quantity-select';
        dropdown.dataset.level = level;
        dropdown.dataset.serviceData = JSON.stringify(service);
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = qmFormatChooseNumber(unitLabel);
        dropdown.appendChild(defaultOption);
        
        // Add quantity options
        const maxQuantity = service.maxQuantity || 1;
        for (let i = 1; i <= maxQuantity; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} ${i === 1 ? unitLabel.slice(0, -1) : unitLabel}`;
            dropdown.appendChild(option);
        }
        
        levelContainer.appendChild(levelLabel);
        levelContainer.appendChild(dropdown);
        
        parentContainer.appendChild(levelContainer);
        
        // Add event listener for quantity selection
        dropdown.addEventListener('change', function() {
            handleQuantityChange(this, service, path);
        });
    }
    
    function getUnitLabel(pricingType) {
        const units = {
            'per_page': 'pages',
            'per_hour': 'hours',
            'per_month': 'months',
            'per_year': 'years',
            'per_user': 'users',
            'per_feature': 'features',
            'per_backlink': 'backlinks',
            'per_post': 'posts',
            'per_campaign': 'campaigns',
            'per_project': 'projects',
            'per_item': 'items',
            'fixed': 'service'
        };
        return units[pricingType] || 'items';
    }
    

    
    function createLevelLabel(level, path) {
        const label = document.createElement('div');
        label.className = 'level-label';
        
        const levelNames = ['Category', 'Subcategory', 'Service Type', 'Service', 'Option'];
        const levelName = levelNames[level] || `Level ${level + 1}`;
        
        label.textContent = `${qmFormatChoose(levelName, 'option')}:`;
        return label;
    }
    
    function createDropdown(data, level, path) {
        const select = document.createElement('select');
        select.className = 'progressive-select';
        select.dataset.level = level;
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = qmFormatChoose('Option', 'option');
        select.appendChild(defaultOption);
        
        // Add options from data
        data.forEach((item, index) => {
            // Skip page breaks
            if (item.type === 'page_break' || item.type === 'page-break') {
                return;
            }

            const option = document.createElement('option');
            option.value = index;
            option.textContent = qmFormatDisplay(item.name || 'Unnamed Item');
            option.dataset.itemData = JSON.stringify(item);
            select.appendChild(option);
        });
        
        return select;
    }
    
    function handleDropdownChange(dropdown, data, level, path) {
        const selectedIndex = dropdown.value;
        
       
        // Reset all child levels and pricing display when parent changes
        const allLevels = selectorContainer.querySelectorAll('.progressive-dropdown-level');
        allLevels.forEach((levelEl, index) => {
            if (index > level) {
                levelEl.remove();
            }
        });
        
        // Hide pricing display when any parent changes
        hidePricingDisplay();
        
        if (selectedIndex === '') {
            // Clear everything after this level and reset path
            selectedPath = selectedPath.slice(0, level);
            updateHiddenInputs('', '', '', '');
            
            // Remove completed class from current level
            const levelContainer = dropdown.closest('.progressive-dropdown-level');
            levelContainer.classList.remove('completed');
            return;
        }
        
        const selectedItem = data[parseInt(selectedIndex)];
        const newPath = [...path, selectedItem.name];
       
        // Update selected path
        selectedPath = newPath;
        
        // Mark this level as completed
        const levelContainer = dropdown.closest('.progressive-dropdown-level');
        levelContainer.classList.add('completed');
        
        if (selectedItem.type === 'service') {
            // Check if this service has maxQuantity - if so, show quantity selection
            if (selectedItem.maxQuantity && selectedItem.maxQuantity > 0) {
               
                createQuantityLevel(selectorContainer, selectedItem, level + 1, newPath);
            } else {
               
                showPricingDisplay(selectedItem, newPath);
                updateHiddenInputs(selectedItem.name, selectedItem.pricingType, selectedItem.basePrice, newPath.join(' → '));
            }
        } else if (selectedItem.type === 'category' && selectedItem.children && selectedItem.children.length > 0) {
           
            createDropdownLevel(selectorContainer, selectedItem.children, level + 1, newPath);
        } else {
            
        }
    }
    
    function showPricingDisplay(service, path) {
        // Update the quote total field instead of showing separate pricing display
        updateQuoteTotal(service, path);
    }
    
    function hidePricingDisplay() {
        // Clear the quote total field
        updateQuoteTotal(null, []);
    }
    
    function handleQuantityChange(dropdown, service, path) {
        const quantity = parseInt(dropdown.value) || 0;
      
        if (quantity > 0) {
            // Calculate price based on quantity and pricing tiers
            const calculatedPrice = calculateServicePrice(service, quantity);
            
            // Show pricing display with quantity
            showPricingDisplayWithQuantity(service, path, quantity, calculatedPrice);
            
            // Update hidden inputs
            updateHiddenInputs(service.name, service.pricingType, calculatedPrice.totalPrice, path.join(' → '));
            
            // Mark this level as completed
            const levelContainer = dropdown.closest('.progressive-dropdown-level');
            levelContainer.classList.add('completed');
        } else {
            // Hide pricing display if no quantity selected
            hidePricingDisplay();
            updateHiddenInputs('', '', '', '');
            
            // Remove completed class from current level
            const levelContainer = dropdown.closest('.progressive-dropdown-level');
            levelContainer.classList.remove('completed');
        }
    }
    
    function calculateServicePrice(service, quantity) {
        let unitPrice = parseFloat(service.basePrice) || 0;
        let totalPrice = unitPrice * quantity;
        let deliveryTime = service.deliveryTime || 0;
        let isTierDeal = false;
        let applicableTier = null;
        
        // Check for pricing tiers (deal pricing)
        if (service.pricingTiers && service.pricingTiers.length > 0) {
            applicableTier = findApplicableTier(service.pricingTiers, quantity);
            if (applicableTier) {
                // Tier price is a deal price for the entire quantity
                totalPrice = parseFloat(applicableTier.price) || 0;
                unitPrice = totalPrice / quantity; // Calculate effective unit price for display
                deliveryTime = applicableTier.deliveryTime || service.deliveryTime;
                isTierDeal = true;
               
            } else {
               
            }
        }
        
        return {
            unitPrice: unitPrice,
            totalPrice: totalPrice,
            quantity: quantity,
            deliveryTime: deliveryTime,
            isTierDeal: isTierDeal,
            applicableTier: applicableTier
        };
    }
    
    function findApplicableTier(pricingTiers, quantity) {
        const sortedTiers = [...pricingTiers].sort((a, b) => a.minQuantity - b.minQuantity);
        
        for (let i = 0; i < sortedTiers.length; i++) {
            const tier = sortedTiers[i];
            const minQty = parseInt(tier.minQuantity) || 1;
            const maxQty = tier.maxQuantity ? parseInt(tier.maxQuantity) : Infinity;
            
           
            if (quantity >= minQty && quantity <= maxQty) {
              
                return tier;
            }
        }
     
        return null;
    }
    
    function showPricingDisplayWithQuantity(service, path, quantity, calculatedPrice) {
        const totalDisplays = document.querySelectorAll('.quote-total-display');
        
        totalDisplays.forEach(totalDisplay => {
            const serviceSummary = totalDisplay.querySelector('.service-summary');
            const serviceName = totalDisplay.querySelector('.service-name');
            const servicePrice = totalDisplay.querySelector('.service-price');
            const totalValue = totalDisplay.querySelector('.total-value');
            const hiddenInput = totalDisplay.querySelector('input[type="hidden"]');
            
            if (service) {
                // Show service information with quantity
                serviceSummary.style.display = 'block';
                serviceName.textContent = `${service.name} (${quantity} ${getUnitLabel(service.pricingType)})`;
                
                const pricingType = service.pricingType ? service.pricingType.replace('_', ' ') : 'fixed';
                
                if (calculatedPrice.isTierDeal && calculatedPrice.applicableTier) {
                    // Show deal pricing
                    const basePrice = parseFloat(service.basePrice) || 0;
                    const regularPrice = basePrice * quantity;
                    const savings = regularPrice - calculatedPrice.totalPrice;
                    const tier = calculatedPrice.applicableTier;
                    const tierRange = tier.maxQuantity ? `${tier.minQuantity}-${tier.maxQuantity}` : `${tier.minQuantity}+`;
                    
                    servicePrice.innerHTML = `
                        <span style="text-decoration: line-through; color: #6c757d;">Regular: $${regularPrice.toFixed(2)}</span><br>
                        <span style="color: #28a745; font-weight: bold;">Deal Price: $${calculatedPrice.totalPrice.toFixed(2)}</span>
                        <span style="color: #007cba; font-size: 0.9em;"> (${tierRange} ${getUnitLabel(service.pricingType)} deal)</span>
                        ${savings > 0 ? `<br><span style="color: #28a745; font-size: 0.9em;">Save $${savings.toFixed(2)}</span>` : ''}
                    `;
                } else {
                    // Show regular pricing
                    servicePrice.textContent = `$${calculatedPrice.unitPrice.toFixed(2)} per ${pricingType} × ${quantity} = $${calculatedPrice.totalPrice.toFixed(2)}`;
                }
                
                // Update total
                totalValue.textContent = `$${calculatedPrice.totalPrice.toFixed(2)}`;
                if (hiddenInput) hiddenInput.value = calculatedPrice.totalPrice;
            }
        });
    }
    
    function updateQuoteTotal(service, path) {
        const totalDisplays = document.querySelectorAll('.quote-total-display');
        
        totalDisplays.forEach(totalDisplay => {
            const serviceSummary = totalDisplay.querySelector('.service-summary');
            const serviceName = totalDisplay.querySelector('.service-name');
            const servicePrice = totalDisplay.querySelector('.service-price');
            const totalValue = totalDisplay.querySelector('.total-value');
            const hiddenInput = totalDisplay.querySelector('input[type="hidden"]');
            
            if (service) {
                // Show service information
                serviceSummary.style.display = 'block';
                serviceName.textContent = service.name || 'Unknown Service';
                
                const pricingType = service.pricingType ? service.pricingType.replace('_', ' ') : 'fixed';
                const basePrice = service.basePrice || 0;
                servicePrice.textContent = `$${basePrice.toFixed(2)} (${pricingType})`;
                
                // Update total
                totalValue.textContent = `$${basePrice.toFixed(2)}`;
                if (hiddenInput) hiddenInput.value = basePrice;
            } else {
                // Hide service information and reset total
                serviceSummary.style.display = 'none';
                totalValue.textContent = '$0.00';
                if (hiddenInput) hiddenInput.value = '0';
            }
        });
    }
    
    function updateHiddenInputs(serviceName, pricingType, basePrice, selectedPath) {
        if (hiddenInput) hiddenInput.value = serviceName;
        if (pricingTypeInput) pricingTypeInput.value = pricingType || '';
        if (basePriceInput) basePriceInput.value = basePrice || '';
        if (selectedPathInput) selectedPathInput.value = selectedPath || '';
        
        // Trigger change event for form validation and calculation engines
        if (hiddenInput) {
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

// Initialize conditional logic and calculation engines
function initializeQuoteMateEngines() {
    let fields = [];
    const fieldsJsonEl = document.getElementById('quotemate-form-fields-json');
    if (fieldsJsonEl) {
        try {
            fields = JSON.parse(fieldsJsonEl.textContent || '[]');
        } catch (e) {
            console.error('[QuoteMate] Could not parse form fields JSON:', e);
        }
    }

    window.quoteMateFormData = { fields };

    document.dispatchEvent(new CustomEvent('quotemate-form-data-ready'));

    if (window.quotemateProgressiveSelector && !window.quotemateUnifiedSteps) {
        window.quotemateProgressiveSelector.initUnifiedSteps();
    }

    let initialized = false;

    // Initialize conditional logic
    if (typeof QuoteMateConditionalLogic !== 'undefined') {
        window.quoteMateConditionalLogic = new QuoteMateConditionalLogic(window.quoteMateFormData);
       
        initialized = true;
    }

    // Initialize calculation engine
    if (typeof QuoteMateCalculation !== 'undefined') {
        window.quoteMateCalculation = new QuoteMateCalculation(window.quoteMateFormData);
       
        initialized = true;
    }

    return initialized;
}

// Try to initialize immediately
if (!initializeQuoteMateEngines()) {
    // If not available, wait for script to load
    document.addEventListener('DOMContentLoaded', function() {
        // Try again after a short delay
        setTimeout(initializeQuoteMateEngines, 100);
    });
}

// Also try when window loads (fallback)
window.addEventListener('load', function() {
    if (!window.quoteMateConditionalLogic || !window.quoteMateCalculation) {
        initializeQuoteMateEngines();
    }
});
</script>
