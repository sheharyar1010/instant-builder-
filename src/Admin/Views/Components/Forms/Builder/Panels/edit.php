<?php

use Dawnsol\Quotemate\Helpers\AssetHelper;
use Dawnsol\Quotemate\Helpers\DesignHelper;
use Dawnsol\Quotemate\Helpers\ThemeHelper;
use Dawnsol\Quotemate\Helpers\ViewRenderer;
defined('ABSPATH') || exit;

$nonce_action = 'quotemate_save_form';
$form_nonce = wp_create_nonce($nonce_action);
$settings_nonce_action = 'quotemate_save_form_settings';
$form_settings_nonce = wp_create_nonce($settings_nonce_action);
$form_id = isset($_GET['form_id']) ? intval($_GET['form_id']) : '';



// Ensure we have form data or provide a fallback
$form_data = $data['form'] ?? null;
if (!$form_data) {
  
    $form_data = (object) [
        'id' => $form_id,
        'name' => 'Untitled Form',
        'active' => '0',
        'settings' => json_encode(['title' => 'Quote Request Form', 'description' => 'Please fill out this form to receive a quote for our services.']),
        'fields' => json_encode([])
    ];
}

$main_js_localize = [
    'ajaxUrl' => admin_url('admin-ajax.php'),
    'nonce' => $form_nonce,
    'quotemate_nonce' => $form_settings_nonce,
    'edit_mode' => $data['edit_mode'] ?? false,
    'form_id' => $form_id,
    'quotemate_form_data' => $form_data
];

AssetHelper::enqueue_assets('admin/forms/builder/form/builder/main', true, $main_js_localize);
AssetHelper::enqueue_assets('admin/forms/builder/form/builder/form-settings', true, $main_js_localize);

// Enqueue all necessary CSS files for the form builder
wp_enqueue_style('quotemate-form-tabs', QUOTEMATE_URL . 'assets/css/admin/forms/builder/form-tabs.css', [], QUOTEMATE_VERSION);
wp_enqueue_style('quotemate-builder-main', QUOTEMATE_URL . 'assets/css/admin/forms/builder/builder.css', [], QUOTEMATE_VERSION);
wp_enqueue_style('quotemate-builder-toolbar', QUOTEMATE_URL . 'assets/css/admin/forms/builder/toolbar.css', [], QUOTEMATE_VERSION);
wp_enqueue_style('quotemate-builder-sidebar', QUOTEMATE_URL . 'assets/css/admin/forms/builder/sidebar.css', [], QUOTEMATE_VERSION);
wp_enqueue_style('quotemate-builder-panels-setup', QUOTEMATE_URL . 'assets/css/admin/forms/builder/panels/setup.css', [], QUOTEMATE_VERSION);
wp_enqueue_style('quotemate-builder-form-main', QUOTEMATE_URL . 'assets/css/admin/forms/builder/form/builder/main.css', [], QUOTEMATE_VERSION);
$form_builder_css = QUOTEMATE_DIR . 'assets/css/form/builder.css';
wp_enqueue_style('quotemate-builder-panels-form-builder', QUOTEMATE_URL . 'assets/css/form/builder.css', [], file_exists($form_builder_css) ? filemtime($form_builder_css) : QUOTEMATE_VERSION);

$form_settings_decoded = json_decode($form_data->settings ?? '{}', true) ?: [];
$form_design = DesignHelper::resolve($form_settings_decoded);
$builder_theme_id = $form_design['themeId'] ?? ThemeHelper::THEME_CLASSIC;
$form_design_style = DesignHelper::get_css_vars_style($form_design);
$form_width_class = DesignHelper::get_width_class($form_design);
$form_title = $form_settings_decoded['title'] ?? 'Quote Request Form';
$form_description = $form_settings_decoded['description'] ?? 'Please fill out this form to receive a quote for our services.';

wp_enqueue_style(
    'quotemate-form-layout',
    QUOTEMATE_URL . 'public/css/form-layout.css',
    [],
    QUOTEMATE_VERSION
);
foreach (ThemeHelper::get_ids() as $theme_id) {
    wp_enqueue_style(
        'quotemate-theme-' . $theme_id,
        ThemeHelper::get_css_url($theme_id),
        ['quotemate-form-layout'],
        QUOTEMATE_VERSION
    );
}
wp_enqueue_style(
    'quotemate-form-navigation',
    QUOTEMATE_URL . 'public/css/form-navigation.css',
    [],
    QUOTEMATE_VERSION
);

// Add critical inline CSS for form builder
$field_search_style = '
.quotemate-form-builder__field-search {
    padding-left: 40px !important;
}
';
wp_add_inline_style('quotemate-builder-panels-form-builder', $field_search_style);

?>
<script>
window.Quotemate = window.Quotemate || {};
window.Quotemate["admin_forms_builder_form_builder_main"] = <?php echo json_encode($main_js_localize); ?>;

// Add fallback for when form data is not available
if (!window.Quotemate["admin_forms_builder_form_builder_main"].quotemate_form_data) {
    console.warn('QuoteMate Debug - No form data available, using defaults');
    window.Quotemate["admin_forms_builder_form_builder_main"].quotemate_form_data = null;
}
</script>
<div id="quotemate-form-builder" class="quotemate-form-builder">
    <!-- Header Section -->
    <div class="quotemate-form-builder__header">
        <div class="quotemate-form-builder__header-left">
            <input type="text" id="form-name" name="form_name" class="quotemate-form-input quotemate-form-builder__title-input" value='<?= $data['form_data']['name'] ?>' placeholder="Untitled Quote Form" required>

            <?php if ($form_data->active === '1') { ?>
                <span class="quotemate-form-builder__status">Active</span>
            <?php } else { ?>
                <span class="quotemate-form-builder__status">Draft</span>
            <?php } ?>

        </div>
        <div class="quotemate-form-builder__header-right">
        <button class="btn btn-settings" id="openSettings">
                    ⚙️ Settings
                </button>
            <button type="button" class="quotemate-btn quotemate-btn--secondary" id="preview-form">Preview</button>
            <button type="button" class="quotemate-btn quotemate-btn--primary" id="save-form">Save Form</button>
        </div>
    </div>

    <div class="quotemate-form-builder__container">
        <!-- Main Form Builder Area -->
        <div class="quotemate-form-builder__main">
            <div class="quotemate-form-builder__canvas">
                <div
                    class="quotemate-form-wrapper quotemate-form quotemate-form-builder__form-preview <?= esc_attr($form_width_class) ?> quotemate-theme-<?= esc_attr($builder_theme_id) ?>"
                    id="builder-form-preview"
                    style="<?= esc_attr($form_design_style) ?>"
                    data-qm-theme="<?= esc_attr($builder_theme_id) ?>"
                    data-qm-header-style="<?= esc_attr($form_design['headerStyle']) ?>"
                    data-qm-button-style="<?= esc_attr($form_design['buttonStyle']) ?>"
                    data-qm-multistep="false"
                >
                    <div class="form-header quotemate-form-builder__form-header">
                        <h2 class="form-title quotemate-form-builder__form-title" contenteditable="true"><?= esc_html($form_title) ?></h2>
                        <p class="form-description quotemate-form-builder__form-description" contenteditable="true"><?= esc_html($form_description) ?></p>
                    </div>
                    <form class="quotemate-form quotemate-form-builder__preview-form single-step-form" onsubmit="return false;">
                        <div class="step-progress quotemate-form-builder__step-progress" id="builder-step-progress" hidden>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: 50%;"></div>
                            </div>
                            <div class="step-indicators" id="builder-step-indicators"></div>
                        </div>
                        <div class="form-content quotemate-form-builder__form-content">
                            <div class="quotemate-form-builder__drop-zone" id="form-drop-zone">
                                <div class="quotemate-form-builder__drop-placeholder">
                                    <div class="quotemate-form-builder__drop-placeholder-content">
                                        <span class="quotemate-form-builder__drop-placeholder-icon">⬇️</span>
                                        <h3>Drag fields here to build your quote form</h3>
                                        <p>Select any field from the list on the left and drag it into this area.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="form-navigation quotemate-form-builder__form-footer">
                                <button type="button" class="btn btn-primary quotemate-form-builder__submit-btn">Get Quote</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Right sidebar with tabs for Fields and Field Settings -->
        <div class="quotemate-form-builder__sidebar">
            <div class="quotemate-form-builder__tabs">
                <button type="button" class="quotemate-form-builder__tab active" data-tab="form-fields">Add fields</button>
                <button type="button" class="quotemate-form-builder__tab" data-tab="field-settings">Field Settings</button>
                <button type="button" class="quotemate-form-builder__tab" data-tab="structure">Structure</button>
            </div>
            
            <!-- Form Fields Tab Content -->
            <div class="quotemate-form-builder__tab-content active" id="form-fields-content">
                <div class="quotemate-form-builder__sidebar-header">
                    <h3>Elements</h3>
                    <input type="text" class="quotemate-form-input quotemate-form-builder__field-search" placeholder="Search fields...">
                </div>
                <div class="quotemate-form-builder__field-categories-scroll">
                <div class="quotemate-form-builder__field-categories">
                    <!-- Layout (Elementor-style) -->
                    <div class="quotemate-form-builder__field-category quotemate-form-builder__layout-section">
                        <h4 class="quotemate-form-builder__category-title">Layout</h4>
                        <div class="quotemate-form-builder__layout-buttons">
                            <button type="button" class="quotemate-form-builder__layout-item" id="quotemate-add-row-from-layout" title="Add a new row (container) to the form">
                                <span class="quotemate-form-builder__layout-icon">▭</span>
                                <span class="quotemate-form-builder__layout-label">Row</span>
                            </button>
                            <button type="button" class="quotemate-form-builder__layout-item" title="Form is built with rows and columns – add fields from below">
                                <span class="quotemate-form-builder__layout-icon">⊞</span>
                                <span class="quotemate-form-builder__layout-label">Columns</span>
                            </button>
                        </div>
                    </div>

                    <!-- Form Structure -->
                    <div class="quotemate-form-builder__field-category">
                        <h4 class="quotemate-form-builder__category-title">Form Structure</h4>
                        <div class="quotemate-form-builder__field-list">
                            <div class="quotemate-form-builder__field-item" data-field-type="heading" draggable="true">
                                <span class="quotemate-form-builder__field-icon">H</span>
                                <span class="quotemate-form-builder__field-label">Heading</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="paragraph" draggable="true">
                                <span class="quotemate-form-builder__field-icon">¶</span>
                                <span class="quotemate-form-builder__field-label">Paragraph</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="section_break" draggable="true">
                                <span class="quotemate-form-builder__field-icon">⏸️</span>
                                <span class="quotemate-form-builder__field-label">Section Break</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="page_break" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📄</span>
                                <span class="quotemate-form-builder__field-label">Page Break</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="html" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📋</span>
                                <span class="quotemate-form-builder__field-label">HTML Block</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="divider" draggable="true">
                                <span class="quotemate-form-builder__field-icon">➖</span>
                                <span class="quotemate-form-builder__field-label">Divider</span>
                            </div>
                        </div>
                    </div>

                    <!-- Standard Fields -->
                    <div class="quotemate-form-builder__field-category">
                        <h4 class="quotemate-form-builder__category-title">Standard Fields</h4>
                        <div class="quotemate-form-builder__field-list">
                            <div class="quotemate-form-builder__field-item" data-field-type="text" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📝</span>
                                <span class="quotemate-form-builder__field-label">Single Line Text</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="textarea" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📄</span>
                                <span class="quotemate-form-builder__field-label">Paragraph Text</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="select" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📋</span>
                                <span class="quotemate-form-builder__field-label">Drop Down</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="radio" draggable="true">
                                <span class="quotemate-form-builder__field-icon">⚪</span>
                                <span class="quotemate-form-builder__field-label">Multiple Choice</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="checkbox" draggable="true">
                                <span class="quotemate-form-builder__field-icon">☑️</span>
                                <span class="quotemate-form-builder__field-label">Checkboxes</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="file" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📎</span>
                                <span class="quotemate-form-builder__field-label">File Upload</span>
                            </div>
                        </div>
                    </div>

                    <!-- Customer Information -->
                    <div class="quotemate-form-builder__field-category">
                        <h4 class="quotemate-form-builder__category-title">Customer Information</h4>
                        <div class="quotemate-form-builder__field-list">
                            <div class="quotemate-form-builder__field-item" data-field-type="name" draggable="true">
                                <span class="quotemate-form-builder__field-icon">👤</span>
                                <span class="quotemate-form-builder__field-label">Full Name</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="company" draggable="true">
                                <span class="quotemate-form-builder__field-icon">🏢</span>
                                <span class="quotemate-form-builder__field-label">Company Name</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="email" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📧</span>
                                <span class="quotemate-form-builder__field-label">Email Address</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="phone" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📞</span>
                                <span class="quotemate-form-builder__field-label">Phone Number</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="address" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📍</span>
                                <span class="quotemate-form-builder__field-label">Address</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="city" draggable="true">
                                <span class="quotemate-form-builder__field-icon">🏙️</span>
                                <span class="quotemate-form-builder__field-label">City</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="state_province" draggable="true">
                                <span class="quotemate-form-builder__field-icon">🗺️</span>
                                <span class="quotemate-form-builder__field-label">State/Province</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="zip_postal" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📮</span>
                                <span class="quotemate-form-builder__field-label">ZIP/Postal Code</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Project Details -->
                    <div class="quotemate-form-builder__field-category">
                        <h4 class="quotemate-form-builder__category-title">Project Details</h4>
                        <div class="quotemate-form-builder__field-list">
                            <div class="quotemate-form-builder__field-item" data-field-type="service" draggable="true">
                                <span class="quotemate-form-builder__field-icon">🛠️</span>
                                <span class="quotemate-form-builder__field-label">Service Selection</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="start_date" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📅</span>
                                <span class="quotemate-form-builder__field-label">Start Date</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="completion_timeline" draggable="true">
                                <span class="quotemate-form-builder__field-icon">⏱️</span>
                                <span class="quotemate-form-builder__field-label">Completion Timeline</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="urgency_level" draggable="true">
                                <span class="quotemate-form-builder__field-icon">⚡</span>
                                <span class="quotemate-form-builder__field-label">Urgency Level</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="budget_range" draggable="true">
                                <span class="quotemate-form-builder__field-icon">💰</span>
                                <span class="quotemate-form-builder__field-label">Budget Range</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Estimation / Pricing -->
                    <div class="quotemate-form-builder__field-category">
                        <h4 class="quotemate-form-builder__category-title">Estimation / Pricing</h4>
                        <div class="quotemate-form-builder__field-list">
                            <div class="quotemate-form-builder__field-item" data-field-type="quantity" draggable="true">
                                <span class="quotemate-form-builder__field-icon">🔢</span>
                                <span class="quotemate-form-builder__field-label">Quantity</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="unit_type" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📐</span>
                                <span class="quotemate-form-builder__field-label">Unit Type</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="area_size" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📏</span>
                                <span class="quotemate-form-builder__field-label">Area Size (sq ft)</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="material_type" draggable="true">
                                <span class="quotemate-form-builder__field-icon">🧱</span>
                                <span class="quotemate-form-builder__field-label">Material Type</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="additional_options" draggable="true">
                                <span class="quotemate-form-builder__field-icon">☑️</span>
                                <span class="quotemate-form-builder__field-label">Additional Options</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="addons" draggable="true">
                                <span class="quotemate-form-builder__field-icon">➕</span>
                                <span class="quotemate-form-builder__field-label">Add-ons</span>
                            </div>
                            <div class="quotemate-form-builder__field-item" data-field-type="form_summary" draggable="true">
                                <span class="quotemate-form-builder__field-icon">📋</span>
                                <span class="quotemate-form-builder__field-label">Form Summary</span>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            
            <!-- Field Settings Tab Content -->
            <div class="quotemate-form-builder__tab-content" id="field-settings-content">
                <div class="quotemate-form-builder__properties-header">
                    <h3>Field Settings</h3>
                </div>
                <div class="quotemate-form-builder__sub-tabs">
                    <button type="button" class="quotemate-form-builder__sub-tab active" data-sub-tab="general">General</button>
                    <button type="button" class="quotemate-form-builder__sub-tab" data-sub-tab="advance">Advance</button>
                    <button type="button" class="quotemate-form-builder__sub-tab" data-sub-tab="style">Style</button>
                </div>
                <div class="quotemate-form-builder__sub-tab-content active" id="field-settings-general">
                    <div class="quotemate-form-builder__properties-content">
                        <div class="quotemate-form-builder__no-field-selected">
                            <p>Select a field to edit its properties</p>
                        </div>
                    </div>
                </div>
                <div class="quotemate-form-builder__sub-tab-content" id="field-settings-advance">
                    <div class="quotemate-form-builder__advance-properties-content">
                        <p class="quotemate-form-builder__advance-placeholder">Select a field and switch to Advance to edit conditional logic and CSS class.</p>
                    </div>
                </div>
                <div class="quotemate-form-builder__sub-tab-content" id="field-settings-style">
                    <div class="quotemate-form-builder__style-properties-content">
                        <p class="quotemate-form-builder__advance-placeholder">Select a field and switch to Style to customize label color, text color, border, etc.</p>
                    </div>
                </div>
            </div>

            <!-- Structure Tab Content (Elementor-style hierarchy) -->
            <div class="quotemate-form-builder__tab-content" id="structure-content">
                <div class="quotemate-form-builder__structure-header">
                    <h3>Structure</h3>
                </div>
                <div class="quotemate-form-builder__structure-tree" id="structure-tree">
                    <p class="quotemate-form-builder__structure-empty">Rows and fields will appear here. Add a row from Layout, then drag fields into the canvas.</p>
                </div>
            </div>
        </div>
    </div>
    <!-- Hidden Form for Saving -->
    <form id="quotemate-form-setup" style="display: none;">
        <input type="hidden" name="form_id" value="<?= $form_id ?>">
        <input type="hidden" name="action" value="update_form">
        <input type="hidden" name="nonce" value="<?= esc_attr($form_nonce) ?>">
        <input type="hidden" name="form_data" id="form-data">
    </form>
    <?= ViewRenderer::component('Forms/Builder/Panels/form-settings', true, [
        'edit_mode' => true,
        'data' => $data,
    ]); ?>
</div>
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Initialize global variables for the form builder
    window.quotemateFormBuilder = {
        ajaxUrl: '<?php echo admin_url('admin-ajax.php'); ?>',
        nonce: '<?php echo $form_nonce; ?>',
        quotemate_nonce: '<?php echo $form_settings_nonce; ?>',
        formId: '<?php echo $form_id; ?>',
        editMode: <?php echo ($data['edit_mode'] ?? false) ? 'true' : 'false'; ?>,
        formData: <?php echo json_encode($data['form']); ?>
    };

    // Wait for all scripts to load before initializing
    setTimeout(() => {
        // Initialize the settings manager if the class is available
        if (typeof FormSettingsManager !== 'undefined') {
            if (!window.formSettingsManager) {
                window.formSettingsManager = new FormSettingsManager();
            }

            // Update settings if form data is available
            if (window.quotemateFormBuilder?.formData?.settings) {
                try {
                    const settings = window.quotemateFormBuilder.formData.settings;
                    if (typeof settings === 'string') {
                        window.formSettingsManager.updateSettings(JSON.parse(settings));
                    } else if (typeof settings === 'object') {
                        window.formSettingsManager.updateSettings(settings);
                    }
                } catch (error) {
                    console.warn('Error loading form settings:', error);
                }
            } else if (window.QuotemateDesign?.applyToBuilder && window.formSettingsManager) {
                window.QuotemateDesign.applyToBuilder(window.formSettingsManager.settings.design || {});
            }
        }
        
        // Handle settings button click
        const openSettingsBtn = document.getElementById('openSettings');
        if (openSettingsBtn) {
            openSettingsBtn.addEventListener('click', function() {
                // Ensure the settings manager is initialized
                if (!window.formSettingsManager && typeof FormSettingsManager !== 'undefined') {
                    window.formSettingsManager = new FormSettingsManager();
                }
                // Show the settings modal using the .active class
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    settingsModal.classList.add('active');
                }
                // Also call openModal if available (for consistency)
                if (window.formSettingsManager && typeof window.formSettingsManager.openModal === 'function') {
                    window.formSettingsManager.openModal();
                }
            });
        }
        
        // Handle tab switching
        const tabs = document.querySelectorAll('.quotemate-form-builder__tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Hide all tab content
                document.querySelectorAll('.quotemate-form-builder__tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Show the selected tab content
                const tabId = this.getAttribute('data-tab');
                const contentEl = document.getElementById(tabId + '-content');
                if (contentEl) contentEl.classList.add('active');
            });
        });

        // Field Settings sub-tabs (General / Advance)
        const subTabs = document.querySelectorAll('.quotemate-form-builder__sub-tab');
        subTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const container = this.closest('#field-settings-content');
                if (!container) return;
                if (window.formBuilder?.syncPropertiesFromPanel) {
                    window.formBuilder.syncPropertiesFromPanel();
                }
                container.querySelectorAll('.quotemate-form-builder__sub-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const subTabId = this.getAttribute('data-sub-tab');
                container.querySelectorAll('.quotemate-form-builder__sub-tab-content').forEach(c => c.classList.remove('active'));
                const subContent = container.querySelector('#field-settings-' + subTabId);
                if (subContent) subContent.classList.add('active');
            });
        });
    }, 500);
});
</script>