<?php

use Dawnsol\Quotemate\Helpers\SanitizationHelper;
use Dawnsol\Quotemate\Helpers\DateHelper;
?>

<div class="wrap quotemate-submission-detail">
    <div class="submission-header">
        <div class="header-content">
            <h1 class="wp-heading-inline">
                <span class="submission-icon">📋</span>
                Submission #<?php echo SanitizationHelper::sanitize($submission->id, 'html'); ?>
            </h1>
            <div class="header-actions">
                <a href="<?php echo SanitizationHelper::sanitize(admin_url('admin.php?page=quotemate-submissions&form_id=' . $submission->form_id), 'url'); ?>" class="button button-secondary">
                    ← Back to Submissions
                </a>
            </div>
        </div>
        <hr class="wp-header-end">
    </div>

    <div id="submission-messages"></div>

    <div class="submission-container">
        <!-- Submission Meta Panel -->
        <div class="submission-panel meta-panel">
            <div class="panel-header">
                <h3><span class="panel-icon">ℹ️</span> Submission Details</h3>
                <div class="status-badge <?php echo $submission->viewed ? 'viewed' : 'new'; ?>">
                    <?php echo $submission->viewed ? 'Viewed' : 'New'; ?>
                </div>
            </div>
            <div class="panel-content">
                <div class="meta-grid">
                    <div class="meta-item">
                        <label class="meta-label">Form Name</label>
                        <div class="meta-value form-name">
                            <?php echo SanitizationHelper::sanitize($form->name, 'html'); ?>
                        </div>
                    </div>
                    <div class="meta-item">
                        <label class="meta-label">Date Submitted</label>
                        <div class="meta-value">
                            <time datetime="<?php echo SanitizationHelper::sanitize($submission->created_at, 'attr'); ?>">
                                <?php echo SanitizationHelper::sanitize(DateHelper::format_date($submission->created_at), 'html'); ?>
                            </time>
                        </div>
                    </div>
                    <div class="meta-item price-item">
                        <label class="meta-label" for="submission-price">Quote Price</label>
                        <div class="price-input-group">
                            <span class="price-symbol">$</span>
                            <input type="number" 
                                   id="submission-price" 
                                   name="price" 
                                   value="<?php echo SanitizationHelper::sanitize($submission->price, 'attr'); ?>" 
                                   step="0.01" 
                                   min="0"
                                   class="price-input">
                            <button type="button" id="update-price" class="button button-primary button-small">
                                💾 Update
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Submission Data Panel -->
        <div class="submission-panel data-panel">
            <div class="panel-header">
                <h3><span class="panel-icon">📝</span> Submitted Data</h3>
                <div class="panel-actions">
                    <button type="button" id="toggle-edit-mode" class="button button-secondary">
                        ✏️ Edit Mode
                    </button>
                </div>
            </div>
            <div class="panel-content">
                <div class="fields-container" id="submission-fields">
                    <?php foreach ($submitted_data as $field_id => $field_data) : ?>
                        <div class="field-row" data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>">
                            <div class="field-content">
                                <div class="field-label">
                                    <?php echo SanitizationHelper::sanitize($field_data['label'], 'html'); ?>
                                </div>
                                <div class="field-value-container">
                                    <?php if ($field_data['type'] === 'textarea') : ?>
                                        <div class="field-display">
                                            <?php echo nl2br(SanitizationHelper::sanitize($field_data['value'], 'html')); ?>
                                        </div>
                                        <textarea class="field-value field-edit" 
                                                  data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>"
                                                  placeholder="<?php echo SanitizationHelper::sanitize($field_data['label'], 'attr'); ?>"
                                                  style="display: none;"><?php echo SanitizationHelper::sanitize($field_data['value'], 'textarea'); ?></textarea>
                                    <?php elseif ($field_data['type'] === 'checkbox') : ?>
                                        <div class="field-display">
                                            <span class="checkbox-display <?php echo $field_data['value'] ? 'checked' : ''; ?>">
                                                <?php echo $field_data['value'] ? '✅ Yes' : '❌ No'; ?>
                                            </span>
                                        </div>
                                        <label class="field-edit checkbox-container" style="display: none;">
                                            <input type="checkbox" 
                                                   class="field-value" 
                                                   data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>" 
                                                   <?php checked($field_data['value'], '1'); ?>>
                                            <span class="checkmark"></span>
                                            <span class="checkbox-label"><?php echo SanitizationHelper::sanitize($field_data['label'], 'html'); ?></span>
                                        </label>
                                    <?php elseif (in_array($field_data['type'], ['select', 'radio']) && isset($field_map[$field_id]['options'])) : ?>
                                        <div class="field-display">
                                            <span class="option-display">
                                                <?php echo SanitizationHelper::sanitize($field_data['value'], 'html'); ?>
                                            </span>
                                        </div>
                                        <select class="field-value field-edit" 
                                                data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>"
                                                style="display: none;">
                                            <?php foreach ($field_map[$field_id]['options'] as $option) : ?>
                                                <option value="<?php echo SanitizationHelper::sanitize($option, 'attr'); ?>" 
                                                        <?php selected($field_data['value'], $option); ?>>
                                                    <?php echo SanitizationHelper::sanitize($option, 'html'); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                    <?php elseif ($field_data['type'] === 'service' && is_array($field_data['value'])) : ?>
                                        <div class="field-display">
                                            <div class="service-details">
                                                <div class="service-main">
                                                    <strong><?php echo SanitizationHelper::sanitize($field_data['value']['selected_service'], 'html'); ?></strong>
                                                    <span class="service-price">$<?php echo number_format($field_data['value']['final_price'], 2); ?></span>
                                                </div>
                                                <div class="service-path">
                                                    <small>Path: <?php echo SanitizationHelper::sanitize($field_data['value']['selected_path'], 'html'); ?></small>
                                                </div>
                                                <div class="service-pricing">
                                                    <small>Pricing: <?php echo SanitizationHelper::sanitize($field_data['value']['pricing_type'], 'html'); ?> | Base: $<?php echo number_format($field_data['value']['base_price'], 2); ?></small>
                                                </div>
                                                <?php if (!empty($field_data['value']['dynamic_fields'])): ?>
                                                    <div class="service-dynamic-fields">
                                                        <small><strong>Selection Details:</strong></small>
                                                        <?php foreach ($field_data['value']['dynamic_fields'] as $field_name => $field_value): ?>
                                                            <div class="dynamic-field">
                                                                <small><?php echo ucfirst(str_replace('_', ' ', $field_name)); ?>: <?php echo SanitizationHelper::sanitize($field_value, 'html'); ?></small>
                                                            </div>
                                                        <?php endforeach; ?>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                        <div class="field-edit service-edit" style="display: none;" data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>">
                                            <div class="service-edit-form">
                                                <div class="edit-row">
                                                    <label>Service Name:</label>
                                                    <input type="text" class="service-name-edit" 
                                                           value="<?php echo SanitizationHelper::sanitize($field_data['value']['selected_service'], 'attr'); ?>">
                                                </div>
                                                <div class="edit-row">
                                                    <label>Selection Path:</label>
                                                    <input type="text" class="service-path-edit" 
                                                           value="<?php echo SanitizationHelper::sanitize($field_data['value']['selected_path'], 'attr'); ?>">
                                                </div>
                                                <div class="edit-row">
                                                    <label>Pricing Type:</label>
                                                    <select class="service-pricing-type-edit">
                                                        <option value="fixed" <?php selected($field_data['value']['pricing_type'], 'fixed'); ?>>Fixed Price</option>
                                                        <option value="per_page" <?php selected($field_data['value']['pricing_type'], 'per_page'); ?>>Per Page</option>
                                                        <option value="per_hour" <?php selected($field_data['value']['pricing_type'], 'per_hour'); ?>>Per Hour</option>
                                                        <option value="per_item" <?php selected($field_data['value']['pricing_type'], 'per_item'); ?>>Per Item</option>
                                                    </select>
                                                </div>
                                                <div class="edit-row">
                                                    <label>Base Price:</label>
                                                    <input type="number" class="service-base-price-edit" step="0.01" min="0"
                                                           value="<?php echo SanitizationHelper::sanitize($field_data['value']['base_price'], 'attr'); ?>">
                                                </div>
                                                <div class="edit-row">
                                                    <label>Final Price:</label>
                                                    <input type="number" class="service-final-price-edit" step="0.01" min="0"
                                                           value="<?php echo SanitizationHelper::sanitize($field_data['value']['final_price'], 'attr'); ?>">
                                                </div>
                                            </div>
                                            <!-- Hidden field to store the JSON data -->
                                            <input type="hidden" class="field-value" 
                                                   data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>" 
                                                   value="<?php echo SanitizationHelper::sanitize(json_encode($field_data['value']), 'attr'); ?>">
                                        </div>
                                    <?php else : ?>
                                        <div class="field-display">
                                            <?php echo SanitizationHelper::sanitize($field_data['value'], 'html'); ?>
                                        </div>
                                        <input type="text" 
                                               class="field-value field-edit" 
                                               data-field-id="<?php echo SanitizationHelper::sanitize($field_id, 'attr'); ?>" 
                                               value="<?php echo SanitizationHelper::sanitize($field_data['value'], 'attr'); ?>"
                                               placeholder="<?php echo SanitizationHelper::sanitize($field_data['label'], 'attr'); ?>"
                                               style="display: none;">
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="submission-actions" id="submission-actions" style="display: none;">
                    <button type="button" id="update-submission" class="button button-primary">
                        💾 Save Changes
                    </button>
                    <button type="button" id="cancel-edit" class="button button-secondary">
                        ❌ Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.quotemate-submission-detail {
    max-width: 1200px;
    margin: 0 auto;
}

.submission-header {
    margin-bottom: 2rem;
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.submission-icon {
    margin-right: 0.5rem;
    font-size: 1.2em;
}

.header-actions .button {
    padding: 8px 16px;
    text-decoration: none;
}

.submission-container {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 2rem;
    margin-top: 1rem;
}

@media (max-width: 1024px) {
    .submission-container {
        grid-template-columns: 1fr;
        gap: 1.5rem;
    }
}

.submission-panel {
    background: #fff;
    border: 1px solid #e1e1e1;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    overflow: hidden;
}

.panel-header {
    background: #f8f9fa;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e1e1e1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #2c3e50;
}

.panel-icon {
    margin-right: 0.5rem;
}

.status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
}

.status-badge.new {
    background: #e74c3c;
    color: white;
}

.status-badge.viewed {
    background: #27ae60;
    color: white;
}

.panel-content {
    padding: 1.5rem;
}

.meta-grid {
    display: grid;
    gap: 1.5rem;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.meta-label {
    font-weight: 600;
    color: #555;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.meta-value {
    color: #2c3e50;
    font-size: 1rem;
}

.form-name {
    font-weight: 600;
    color: #3498db;
}

.price-input-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #f8f9fa;
    padding: 0.5rem;
    border-radius: 6px;
    border: 1px solid #e1e1e1;
}

.price-symbol {
    font-weight: bold;
    color: #27ae60;
    font-size: 1.1rem;
}

.price-input {
    border: none;
    background: transparent;
    font-size: 1rem;
    font-weight: 600;
    color: #2c3e50;
    width: 120px;
}

.price-input:focus {
    outline: none;
    box-shadow: none;
}

.fields-container {
    display: grid;
    gap: 1rem;
}

.field-row {
    padding: 1.5rem;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    background: #fafbfc;
    transition: all 0.2s ease;
    margin-bottom: 1rem;
}

.field-row:hover {
    border-color: #3498db;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
    transform: translateY(-1px);
}

.field-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.field-label {
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.75rem;
}

.field-value-container {
    display: flex;
    align-items: flex-start;
    min-height: 2.5rem;
}

.field-display {
    color: #2c3e50;
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.5;
    word-break: break-word;
    width: 100%;
}

.checkbox-display {
    font-weight: 600;
}

.checkbox-display.checked {
    color: #27ae60;
}

.option-display {
    background: #e9ecef;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 500;
}

.field-edit {
    width: 100%;
    padding: 0.5rem;
    border: 2px solid #3498db;
    border-radius: 4px;
    font-size: 0.95rem;
}

.field-edit:focus {
    outline: none;
    border-color: #2980b9;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 6px;
    background: #f8f9fa;
    border: 2px solid transparent;
    transition: all 0.2s ease;
}

.checkbox-container:hover {
    border-color: #3498db;
    background: #e3f2fd;
}

.checkmark {
    width: 22px;
    height: 22px;
    border: 2px solid #3498db;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.checkbox-container input:checked + .checkmark::after {
    content: '✓';
    color: #3498db;
    font-weight: bold;
    font-size: 14px;
}

.checkbox-label {
    font-weight: 500;
    color: #2c3e50;
    font-size: 1rem;
}

.submission-actions {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #e1e1e1;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.panel-actions .button {
    padding: 6px 12px;
    font-size: 0.9rem;
}

/* Loading states */
.button.loading {
    opacity: 0.7;
    pointer-events: none;
}

.button.loading::after {
    content: '⏳';
    margin-left: 0.5rem;
}

/* Success/Error states */
.field-row.success {
    border-color: #27ae60;
    background: #f8fff8;
}

.field-row.error {
    border-color: #e74c3c;
    background: #fff8f8;
}

/* Responsive adjustments */
@media (max-width: 600px) {
    .submission-container {
        gap: 1rem;
    }
    
    .panel-content {
        padding: 1rem;
    }
    
    .price-input-group {
        flex-wrap: wrap;
    }
    
    .submission-actions {
        flex-direction: column;
    }
    
    .submission-actions .button {
        width: 100%;
        justify-content: center;
    }
}

/* Service field styling */
.service-details {
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    padding: 12px;
    background: #f8f9fa;
}

.service-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.service-price {
    color: #0073aa;
    font-weight: bold;
    font-size: 1.1em;
}

.service-path {
    margin-bottom: 4px;
}

.service-pricing {
    color: #666;
}

.service-dynamic-fields {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e1e5e9;
}

.dynamic-field {
    margin-top: 2px;
}

/* Service edit form styling */
.service-edit-form {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 16px;
    background: #f9f9f9;
}

.edit-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    gap: 12px;
}

.edit-row:last-child {
    margin-bottom: 0;
}

.edit-row label {
    min-width: 120px;
    font-weight: 500;
    color: #333;
}

.edit-row input,
.edit-row select {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.edit-row input:focus,
.edit-row select:focus {
    outline: none;
    border-color: #0073aa;
    box-shadow: 0 0 0 1px #0073aa;
}
</style>

<script>
jQuery(document).ready(function($) {
    let editMode = false;
    
    // Toggle edit mode
    $('#toggle-edit-mode').on('click', function() {
        editMode = !editMode;
        toggleEditMode(editMode);
    });
    
    // Cancel edit
    $('#cancel-edit').on('click', function() {
        editMode = false;
        toggleEditMode(false);
        // Reset all field values
        $('.field-edit').each(function() {
            const fieldId = $(this).data('field-id');
            const originalValue = $(this).closest('.field-row').find('.field-display').text().trim();
            if ($(this).is('input[type="text"]')) {
                $(this).val(originalValue);
            } else if ($(this).is('textarea')) {
                $(this).val(originalValue.replace(/<br\s*\/?>/gi, '\n'));
            }
        });
    });
    
    function toggleEditMode(enabled) {
        if (enabled) {
            $('.field-display').hide();
            $('.field-edit').show();
            $('#submission-actions').show();
            $('#toggle-edit-mode').text('👁️ View Mode').removeClass('button-secondary').addClass('button-primary');
        } else {
            $('.field-display').show();
            $('.field-edit').hide();
            $('#submission-actions').hide();
            $('#toggle-edit-mode').text('✏️ Edit Mode').removeClass('button-primary').addClass('button-secondary');
        }
    }
    
    // Update price
    $('#update-price').on('click', function() {
        const button = $(this);
        const priceInput = $('#submission-price');
        const price = priceInput.val();
        
        if (!price || parseFloat(price) < 0) {
            showMessage('Please enter a valid price.', 'error');
            return;
        }
        
        button.addClass('loading');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'update_submission_price',
                submission_id: <?php echo (int) $submission->id; ?>,
                price: price,
                nonce: '<?php echo wp_create_nonce('update_submission_price'); ?>'
            },
            success: function(response) {
                if (response.success) {
                    showMessage('Price updated successfully!', 'success');
                    priceInput.closest('.price-input-group').addClass('success');
                    setTimeout(() => {
                        priceInput.closest('.price-input-group').removeClass('success');
                    }, 2000);
                } else {
                    showMessage(response.data || 'Failed to update price.', 'error');
                }
            },
            error: function() {
                showMessage('An error occurred while updating the price.', 'error');
            },
            complete: function() {
                button.removeClass('loading');
            }
        });
    });
    
    // Update submission data
    $('#update-submission').on('click', function() {
        const button = $(this);
        const submissionData = {};
        
        $('.field-edit').each(function() {
            const fieldId = $(this).data('field-id');
            let value;
            
            if ($(this).is('input[type="checkbox"]')) {
                value = $(this).is(':checked') ? '1' : '0';
            } else if ($(this).hasClass('service-edit')) {
                // Handle service field editing
                const serviceData = {
                    selected_service: $(this).find('.service-name-edit').val(),
                    selected_path: $(this).find('.service-path-edit').val(),
                    pricing_type: $(this).find('.service-pricing-type-edit').val(),
                    base_price: parseFloat($(this).find('.service-base-price-edit').val()) || 0,
                    final_price: parseFloat($(this).find('.service-final-price-edit').val()) || 0
                };
                value = JSON.stringify(serviceData);
            } else {
                value = $(this).val();
            }
            
            submissionData[fieldId] = value;
        });
        
        button.addClass('loading');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'update_submission_data',
                submission_id: <?php echo (int) $submission->id; ?>,
                submission_data: submissionData,
                nonce: '<?php echo wp_create_nonce('update_submission_data'); ?>'
            },
            success: function(response) {
                if (response.success) {
                    showMessage('Submission updated successfully!', 'success');
                    
                    // Update display values
                    $('.field-edit').each(function() {
                        const fieldRow = $(this).closest('.field-row');
                        const display = fieldRow.find('.field-display');
                        
                        if ($(this).is('input[type="checkbox"]')) {
                            const isChecked = $(this).is(':checked');
                            display.html('<span class="checkbox-display ' + (isChecked ? 'checked' : '') + '">' + 
                                       (isChecked ? '✅ Yes' : '❌ No') + '</span>');
                        } else if ($(this).hasClass('service-edit')) {
                            // Update service field display
                            const serviceData = {
                                selected_service: $(this).find('.service-name-edit').val(),
                                selected_path: $(this).find('.service-path-edit').val(),
                                pricing_type: $(this).find('.service-pricing-type-edit').val(),
                                base_price: parseFloat($(this).find('.service-base-price-edit').val()) || 0,
                                final_price: parseFloat($(this).find('.service-final-price-edit').val()) || 0
                            };
                            
                            display.html(`
                                <div class="service-details">
                                    <div class="service-main">
                                        <strong>${serviceData.selected_service}</strong>
                                        <span class="service-price">$${serviceData.final_price.toFixed(2)}</span>
                                    </div>
                                    <div class="service-path">
                                        <small>Path: ${serviceData.selected_path}</small>
                                    </div>
                                    <div class="service-pricing">
                                        <small>Pricing: ${serviceData.pricing_type} | Base: $${serviceData.base_price.toFixed(2)}</small>
                                    </div>
                                </div>
                            `);
                        } else if ($(this).is('textarea')) {
                            display.html($(this).val().replace(/\n/g, '<br>'));
                        } else {
                            display.text($(this).val());
                        }
                        
                        fieldRow.addClass('success');
                        setTimeout(() => {
                            fieldRow.removeClass('success');
                        }, 2000);
                    });
                    
                    // Exit edit mode
                    editMode = false;
                    toggleEditMode(false);
                } else {
                    showMessage(response.data || 'Failed to update submission.', 'error');
                }
            },
            error: function() {
                showMessage('An error occurred while updating the submission.', 'error');
            },
            complete: function() {
                button.removeClass('loading');
            }
        });
    });
    
    function showMessage(message, type) {
        const messageDiv = $('<div class="notice notice-' + type + ' is-dismissible"><p>' + message + '</p></div>');
        $('#submission-messages').html(messageDiv);
        
        // Auto-dismiss success messages
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.fadeOut();
            }, 3000);
        }
        
        // Scroll to message
        $('html, body').animate({
            scrollTop: $('#submission-messages').offset().top - 100
        }, 300);
    }
});
</script>



 