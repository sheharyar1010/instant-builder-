<?php
if (!defined('ABSPATH')) {
    exit;
}

use Dawnsol\Quotemate\Helpers\FormHelper;
use Dawnsol\Quotemate\Helpers\HeadingHelper;
use Dawnsol\Quotemate\Helpers\TextFormatHelper;

/** @var array $field */
/** @var array $fields */

$field_style = FormHelper::get_field_style_attr($field);
$field_size_class = FormHelper::get_field_size_class($field);
$content_block_types = ['heading', 'paragraph', 'html', 'divider'];
$is_content_block = in_array($field['type'] ?? '', $content_block_types, true);
$form_group_class = trim($field_size_class . ($is_content_block ? ' form-group--content-block' : ''));
?>
                                    <div class="form-group <?php echo esc_attr($form_group_class); ?>" data-field-id="<?php echo esc_attr($field['id']); ?>" data-field-type="<?php echo esc_attr($field['type']); ?>"<?php echo $field_style !== '' ? ' style="' . $field_style . '"' : ''; ?>>
                                        <?php if (!empty($field['label']) && !in_array($field['type'], ['service', 'service_options', 'heading', 'paragraph', 'html', 'divider'], true)): ?>
                                            <label for="<?php echo esc_attr($field['id']); ?>" class="field-label">
                                                <?php echo esc_html(TextFormatHelper::to_title_case($field['label'])); ?>
                                                <?php if (!empty($field['required'])) echo '<span class="required">*</span>'; ?>
                                            </label>
                                        <?php endif; ?>

                                        <div class="field-input">
                                            <?php
                                            switch ($field['type']) {
                                                case 'text':
                                                case 'name':
                                                case 'company':
                                                case 'address':
                                                case 'city':
                                                    ?>
                                                    <input type="text"
                                                        id="<?php echo esc_attr($field['id']); ?>"
                                                        name="<?php echo esc_attr($field['id']); ?>"
                                                        placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>"
                                                        class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                        <?php if (!empty($field['required'])) echo 'required'; ?> />
                                                    <?php
                                                    break;

                                                case 'email':
                                                    ?>
                                                    <input type="email"
                                                        id="<?php echo esc_attr($field['id']); ?>"
                                                        name="<?php echo esc_attr($field['id']); ?>"
                                                        placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>"
                                                        class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                        <?php if (!empty($field['required'])) echo 'required'; ?> />
                                                    <?php
                                                    break;

                                                case 'phone':
                                                    ?>
                                                    <input type="tel"
                                                        id="<?php echo esc_attr($field['id']); ?>"
                                                        name="<?php echo esc_attr($field['id']); ?>"
                                                        placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>"
                                                        class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                        <?php if (!empty($field['required'])) echo 'required'; ?> />
                                                    <?php
                                                    break;

                                                case 'textarea':
                                                    ?>
                                                    <textarea id="<?php echo esc_attr($field['id']); ?>"
                                                              name="<?php echo esc_attr($field['id']); ?>"
                                                              placeholder="<?php echo esc_attr($field['placeholder'] ?? ''); ?>"
                                                              class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                              rows="4"
                                                              <?php if (!empty($field['required'])) echo 'required'; ?>></textarea>
                                                    <?php
                                                    break;

                                                case 'select':
                                                    $choice_add_price = !empty($field['addPrice']);
                                                    $choice_option_prices = is_array($field['optionPrices'] ?? null) ? $field['optionPrices'] : [];
                                                    ?>
                                                    <select id="<?php echo esc_attr($field['id']); ?>"
                                                            name="<?php echo esc_attr($field['id']); ?>"
                                                            class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                            <?php if (!empty($field['required'])) echo 'required'; ?>>
                                                        <option value=""><?php echo esc_html(TextFormatHelper::format_choose_placeholder($field['label'] ?? '', 'option')); ?></option>
                                                        <?php
                                                        if (!empty($field['options']) && is_array($field['options'])) {
                                                            foreach ($field['options'] as $option) {
                                                                $price_attrs = '';
                                                                if ($choice_add_price) {
                                                                    $option_price = isset($choice_option_prices[$option]) ? (float) $choice_option_prices[$option] : 0;
                                                                    $price_attrs = ' data-option-price="' . esc_attr((string) $option_price) . '" data-option-label="' . esc_attr($option) . '"';
                                                                }
                                                                echo '<option value="' . esc_attr($option) . '"' . $price_attrs . '>' . esc_html(TextFormatHelper::format_display_name($option)) . '</option>';
                                                            }
                                                        }
                                                        ?>
                                                    </select>
                                                    <?php
                                                    break;

                                                case 'checkbox':
                                                    $choice_add_price = !empty($field['addPrice']);
                                                    $choice_show_price = $choice_add_price && (!array_key_exists('showPrice', $field) || !empty($field['showPrice']));
                                                    $choice_add_description = !empty($field['addDescription']);
                                                    $choice_option_prices = is_array($field['optionPrices'] ?? null) ? $field['optionPrices'] : [];
                                                    $choice_option_descriptions = $choice_add_description && is_array($field['optionDescriptions'] ?? null)
                                                        ? $field['optionDescriptions']
                                                        : [];
                                                    if (!empty($field['options']) && is_array($field['options'])):
                                                        $choice_layout = (($field['optionLayout'] ?? 'vertical') === 'horizontal') ? 'horizontal' : 'vertical';
                                                        $choice_layout_class = $choice_layout === 'horizontal' ? ' checkbox-group--horizontal' : '';
                                                        $choice_option_style = $field['optionStyle'] ?? 'default';
                                                        $choice_style_class = in_array($choice_option_style, ['standard', 'modern'], true)
                                                            ? ' checkbox-group--style-' . $choice_option_style
                                                            : '';
                                                        echo '<div class="checkbox-group' . $choice_layout_class . $choice_style_class . '">';
                                                        foreach ($field['options'] as $option):
                                                            $option_price = $choice_add_price && isset($choice_option_prices[$option])
                                                                ? (float) $choice_option_prices[$option]
                                                                : 0;
                                                            $price_attrs = '';
                                                            if ($choice_add_price) {
                                                                $price_attrs = ' data-option-price="' . esc_attr((string) $option_price) . '" data-option-label="' . esc_attr($option) . '"';
                                                            }
                                                            $option_description = isset($choice_option_descriptions[$option])
                                                                ? trim((string) $choice_option_descriptions[$option])
                                                                : '';
                                                            $option_label_lines = preg_split('/\r\n|\r|\n/', (string) $option) ?: [(string) $option];
                                                            $option_label_html = implode("\n", array_map([TextFormatHelper::class, 'format_display_name'], $option_label_lines));
                                                            $option_price_html = '';
                                                            if ($choice_show_price) {
                                                                $option_price_html = ' <span class="choice-option-price">(+$' . esc_html((string) $option_price) . ')</span>';
                                                            }
                                                            ?>
                                                            <div class="checkbox-wrapper">
                                                                <input type="checkbox"
                                                                    id="<?php echo esc_attr($field['id'] . '_' . sanitize_title($option)); ?>"
                                                                    name="<?php echo esc_attr($field['id']); ?>[]"
                                                                    value="<?php echo esc_attr($option); ?>"
                                                                    class="form-checkbox <?php echo esc_attr($field['cssClass'] ?? ''); ?>"<?php echo $price_attrs; ?> />
                                                                <label for="<?php echo esc_attr($field['id'] . '_' . sanitize_title($option)); ?>" class="checkbox-label">
                                                                    <span class="choice-option-label"><?php echo esc_html($option_label_html); ?><?php echo $option_price_html; ?></span>
                                                                    <?php if ($choice_add_description && $option_description !== ''): ?>
                                                                        <span class="choice-option-description"><?php echo esc_html($option_description); ?></span>
                                                                    <?php endif; ?>
                                                                </label>
                                                            </div>
                                                        <?php endforeach;
                                                        echo '</div>';
                                                    else:
                                                    ?>
                                                    <div class="checkbox-wrapper">
                                                        <input type="checkbox"
                                                            id="<?php echo esc_attr($field['id']); ?>"
                                                            name="<?php echo esc_attr($field['id']); ?>"
                                                            value="1"
                                                            class="form-checkbox <?php echo esc_attr($field['cssClass'] ?? ''); ?>" />
                                                        <label for="<?php echo esc_attr($field['id']); ?>" class="checkbox-label">
                                                            <?php echo esc_html($field['label'] ?? ''); ?>
                                                        </label>
                                                    </div>
                                                    <?php
                                                    endif;
                                                    break;

                                                case 'radio':
                                                    if (!empty($field['options']) && is_array($field['options'])):
                                                        $choice_add_price = !empty($field['addPrice']);
                                                        $choice_show_price = $choice_add_price && (!array_key_exists('showPrice', $field) || !empty($field['showPrice']));
                                                        $choice_add_description = !empty($field['addDescription']);
                                                        $choice_option_prices = is_array($field['optionPrices'] ?? null) ? $field['optionPrices'] : [];
                                                        $choice_option_descriptions = $choice_add_description && is_array($field['optionDescriptions'] ?? null)
                                                            ? $field['optionDescriptions']
                                                            : [];
                                                        $choice_layout = (($field['optionLayout'] ?? 'vertical') === 'horizontal') ? 'horizontal' : 'vertical';
                                                        $choice_layout_class = $choice_layout === 'horizontal' ? ' radio-group--horizontal' : '';
                                                        $choice_option_style = $field['optionStyle'] ?? 'default';
                                                        $choice_style_class = in_array($choice_option_style, ['standard', 'modern'], true)
                                                            ? ' radio-group--style-' . $choice_option_style
                                                            : '';
                                                        echo '<div class="radio-group' . $choice_layout_class . $choice_style_class . '">';
                                                        foreach ($field['options'] as $option):
                                                            $option_price = $choice_add_price && isset($choice_option_prices[$option])
                                                                ? (float) $choice_option_prices[$option]
                                                                : 0;
                                                            $price_attrs = '';
                                                            if ($choice_add_price) {
                                                                $price_attrs = ' data-option-price="' . esc_attr((string) $option_price) . '" data-option-label="' . esc_attr($option) . '"';
                                                            }
                                                            $option_description = isset($choice_option_descriptions[$option])
                                                                ? trim((string) $choice_option_descriptions[$option])
                                                                : '';
                                                            $option_label_lines = preg_split('/\r\n|\r|\n/', (string) $option) ?: [(string) $option];
                                                            $option_label_html = implode("\n", array_map([TextFormatHelper::class, 'format_display_name'], $option_label_lines));
                                                            $option_price_html = '';
                                                            if ($choice_show_price) {
                                                                $option_price_html = ' <span class="choice-option-price">(+$' . esc_html((string) $option_price) . ')</span>';
                                                            }
                                                            ?>
                                                            <div class="radio-wrapper">
                                                                <input type="radio"
                                                                    id="<?php echo esc_attr($field['id'] . '_' . sanitize_title($option)); ?>"
                                                                    name="<?php echo esc_attr($field['id']); ?>"
                                                                    value="<?php echo esc_attr($option); ?>"
                                                                    class="form-radio"
                                                                    <?php if (!empty($field['required'])) echo 'required'; ?><?php echo $price_attrs; ?> />
                                                                <label for="<?php echo esc_attr($field['id'] . '_' . sanitize_title($option)); ?>" class="radio-label">
                                                                    <span class="choice-option-label"><?php echo esc_html($option_label_html); ?><?php echo $option_price_html; ?></span>
                                                                    <?php if ($choice_add_description && $option_description !== ''): ?>
                                                                        <span class="choice-option-description"><?php echo esc_html($option_description); ?></span>
                                                                    <?php endif; ?>
                                                                </label>
                                                            </div>
                                                        <?php endforeach;
                                                        echo '</div>';
                                                    endif;
                                                    break;

                                                case 'project_type':
                                                    ?>
                                                    <select id="<?php echo esc_attr($field['id']); ?>"
                                                            name="<?php echo esc_attr($field['id']); ?>"
                                                            class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                            <?php if (!empty($field['required'])) echo 'required'; ?>>
                                                        <option value=""><?php echo esc_html(TextFormatHelper::format_choose_placeholder($field['label'] ?? 'Project Type', 'option')); ?></option>
                                                        <?php
                                                        if (!empty($field['options']) && is_array($field['options'])) {
                                                            foreach ($field['options'] as $option) {
                                                                echo '<option value="' . esc_attr($option) . '">' . esc_html(TextFormatHelper::format_display_name($option)) . '</option>';
                                                            }
                                                        }
                                                        ?>
                                                    </select>
                                                    <?php
                                                    break;

                                                case 'service':
                                                case 'service_options':
                                                    ?>
                                                    <?php
                                                    // Get enhanced service structure from field data
                                                    $enhanced_service_structure = !empty($field['enhancedServiceStructure']) ? $field['enhancedServiceStructure'] : [];
                                                    
                                                    // Check if we should use progressive selector (unlimited nesting support)
                                                    // Use progressive selector for enhanced service structure with quantity support
                                                    $use_progressive_selector = !empty($enhanced_service_structure) && is_array($enhanced_service_structure);
                                                    ?>
                                                    
                                                    <div class="service-field-container" 
                                                         data-field-type="service" 
                                                         data-field-id="<?php echo esc_attr($field['id']); ?>"
                                                         data-field-data="<?php echo esc_attr(json_encode($field)); ?>"
                                                         data-enhanced-structure="<?php echo esc_attr(json_encode($enhanced_service_structure)); ?>">
                                                        
                                                    <!-- Default select dropdown (Starting point for Progressive JS) -->
                                                    <select id="<?php echo esc_attr($field['id']); ?>"
                                                            name="<?php echo esc_attr($field['id']); ?>"
                                                            class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                            data-original-required="<?php echo !empty($field['required']) ? 'true' : 'false'; ?>"
                                                            <?php if (!empty($field['required'])) echo 'required'; ?>>
                                                        <option value=""><?php echo esc_html(TextFormatHelper::format_choose_placeholder($field['label'] ?? 'Service', 'service')); ?></option>
                                                        <?php
                                                        // Check for enhanced service structure first
                                                        if (!empty($field['enhancedServiceStructure']) && is_array($field['enhancedServiceStructure'])) {
                                                            // Function to render enhanced service structure
                                                            FormHelper::render_enhanced_services($field['enhancedServiceStructure']);
                                                        }
                                                        // Check for legacy service structure
                                                        elseif (!empty($field['serviceStructure']) && is_array($field['serviceStructure'])) {
                                                            foreach ($field['serviceStructure'] as $category) {
                                                                if (!empty($category['children']) && is_array($category['children'])) {
                                                                    $categoryName = esc_html(TextFormatHelper::format_display_name($category['name'] ?? 'Services'));
                                                                    echo '<optgroup label="' . $categoryName . '">';
                                                                    
                                                                    foreach ($category['children'] as $service) {
                                                                        $serviceName = esc_html(TextFormatHelper::format_display_name($service['name'] ?? ''));
                                                                        echo '<option value="' . esc_attr($service['name'] ?? '') . '">' . $serviceName . '</option>';
                                                                    }
                                                                    echo '</optgroup>';
                                                                }
                                                            }
                                                        } 
                                                        // Fallback to legacy services structure
                                                        elseif (!empty($field['services']) && is_array($field['services'])) {
                                                            foreach ($field['services'] as $service) {
                                                                $serviceName = esc_html(TextFormatHelper::format_display_name($service['name'] ?? ''));
                                                                $servicePrice = isset($service['price']) ? ' ($' . number_format((float)$service['price'], 2) . ')' : '';
                                                                echo '<option value="' . esc_attr($service['name'] ?? '') . '">' . $serviceName . $servicePrice . '</option>';
                                                            }
                                                        }
                                                        ?>
                                                    </select>
                                                    </div>
                                                    
                                                    <!-- Auto-generated quantity field for services with maxQuantity -->
                                                    <?php if (!empty($field['enhancedServiceStructure'])): ?>
                                                        <?php
                                                        // Check if any service in this field has maxQuantity
                                                        if (FormHelper::has_service_with_max_quantity($field['enhancedServiceStructure'])):
                                                        ?>
                                                        <div class="form-group auto-quantity-field" style="margin-top: 20px; display: none;">
                                                            <label class="field-label">
                                                                Number of Pages
                                                                <span class="required">*</span>
                                                            </label>
                                                            <div class="field-input">
                                                                <select id="field_9_quantity"
                                                                        name="field_9_quantity"
                                                                        class="form-control quantity-select"
                                                                        data-related-service="field_9"
                                                                        required>
                                                                    <option value=""><?php echo esc_html(TextFormatHelper::format_choose_number_placeholder('pages')); ?></option>
                                                                    <?php for ($i = 1; $i <= 8; $i++): ?>
                                                                        <option value="<?php echo $i; ?>"><?php echo esc_html(TextFormatHelper::format_quantity_option($i, 'pages')); ?></option>
                                                                    <?php endfor; ?>
                                                                </select>
                                                                <div class="quantity-price-display" style="display: none; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007cba;">
                                                                    <div class="price-breakdown">
                                                                        <div class="price-line">
                                                                            <span>Unit Price:</span>
                                                                            <span class="unit-price">$0.00</span>
                                                                        </div>
                                                                        <div class="price-line">
                                                                            <span>Quantity:</span>
                                                                            <span class="quantity-value">0</span>
                                                                        </div>
                                                                        <div class="price-line total-line">
                                                                            <span>Total:</span>
                                                                            <span class="total-price">$0.00</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <?php endif; ?>
                                                    <?php endif; ?>
                                                    
                                                    <?php
                                                    break;

                                                case 'quantity':
                                                    // Check if this quantity field is related to a service field
                                                    $relatedServiceField = null;
                                                    $maxQuantity = null;
                                                    $pricingType = null;
                                                    
                                                    // Look for service fields in the same form
                                                    foreach ($fields as $formField) {
                                                        if (($formField['type'] === 'service' || $formField['type'] === 'service_options') && 
                                                            !empty($formField['enhancedServiceStructure'])) {
                                                            // Check if this quantity field might be related to this service
                                                            $relatedServiceField = $formField;
                                                            break;
                                                        }
                                                    }
                                                    
                                                    // If we found a related service field, get its max quantity
                                                    if ($relatedServiceField && !empty($relatedServiceField['enhancedServiceStructure'])) {
                                                        // Recursively search through the enhanced service structure
                                                        $serviceWithMaxQuantity = FormHelper::find_service_with_max_quantity($relatedServiceField['enhancedServiceStructure']);
                                                        if ($serviceWithMaxQuantity) {
                                                            $maxQuantity = $serviceWithMaxQuantity['maxQuantity'];
                                                            $pricingType = $serviceWithMaxQuantity['pricingType'] ?? 'per_item';
                                                        }
                                                    }
                                                    
                                                    // If we have a max quantity, create a dropdown
                                                    if ($maxQuantity && $maxQuantity > 1):
                                                        $unitLabel = 'items';
                                                        switch ($pricingType) {
                                                            case 'per_page':
                                                                $unitLabel = 'pages';
                                                                break;
                                                            case 'per_hour':
                                                                $unitLabel = 'hours';
                                                                break;
                                                            case 'per_month':
                                                                $unitLabel = 'months';
                                                                break;
                                                            case 'per_year':
                                                                $unitLabel = 'years';
                                                                break;
                                                            case 'per_user':
                                                                $unitLabel = 'users';
                                                                break;
                                                            case 'per_feature':
                                                                $unitLabel = 'features';
                                                                break;
                                                            case 'per_backlink':
                                                                $unitLabel = 'backlinks';
                                                                break;
                                                            case 'per_post':
                                                                $unitLabel = 'posts';
                                                                break;
                                                            case 'per_campaign':
                                                                $unitLabel = 'campaigns';
                                                                break;
                                                            case 'per_project':
                                                                $unitLabel = 'projects';
                                                                break;
                                                        }
                                                        ?>
                                                        <select id="<?php echo esc_attr($field['id']); ?>"
                                                                name="<?php echo esc_attr($field['id']); ?>"
                                                                class="form-control quantity-select <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                                data-related-service="<?php echo esc_attr($relatedServiceField['id'] ?? ''); ?>"
                                                                <?php if (!empty($field['required'])) echo 'required'; ?>>
                                                            <option value=""><?php echo esc_html(TextFormatHelper::format_choose_number_placeholder($unitLabel)); ?></option>
                                                            <?php for ($i = 1; $i <= $maxQuantity; $i++): ?>
                                                                <option value="<?php echo $i; ?>"><?php echo esc_html(TextFormatHelper::format_quantity_option($i, $unitLabel)); ?></option>
                                                            <?php endfor; ?>
                                                        </select>
                                                        <div class="quantity-price-display" style="display: none; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #007cba;">
                                                            <div class="price-breakdown">
                                                                <div class="price-line">
                                                                    <span>Unit Price:</span>
                                                                    <span class="unit-price">$0.00</span>
                                                                </div>
                                                                <div class="price-line">
                                                                    <span>Quantity:</span>
                                                                    <span class="quantity-value">0</span>
                                                                </div>
                                                                <div class="price-line total-line">
                                                                    <span>Total:</span>
                                                                    <span class="total-price">$0.00</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    <?php else: ?>
                                                        <!-- Fallback to regular number input -->
                                                        <input type="number"
                                                            id="<?php echo esc_attr($field['id']); ?>"
                                                            name="<?php echo esc_attr($field['id']); ?>"
                                                            placeholder="<?php echo esc_attr($field['placeholder'] ?? 'Enter quantity'); ?>"
                                                            class="form-control <?php echo esc_attr($field['cssClass'] ?? ''); ?>"
                                                            min="1"
                                                            step="1"
                                                            <?php if (!empty($field['required'])) echo 'required'; ?> />
                                                    <?php endif; ?>
                                                    <?php
                                                    break;

                                                case 'form_summary':
                                                    $summary_settings = wp_parse_args($field, [
                                                        'summaryTitle' => 'Quote Summary',
                                                        'showSubtotal' => true,
                                                        'currencyCode' => 'USD',
                                                        'currencySymbol' => '$',
                                                        'showQuantity' => true,
                                                        'showPricingType' => true,
                                                        'showPath' => true,
                                                        'serviceDisplayMode' => 'final_only',
                                                        'showTax' => false,
                                                        'taxRate' => 0,
                                                        'taxMode' => 'exclusive',
                                                        'showDiscount' => false,
                                                        'discountType' => 'percent',
                                                        'discountValue' => 0,
                                                        'showGrandTotal' => true,
                                                        'submitButtonText' => 'Submit Quote Request',
                                                        'emptyStateMessage' => 'Complete the steps above to see your quote summary.',
                                                        'showTermsCheckbox' => false,
                                                        'termsText' => 'I agree to the terms and conditions.',
                                                        'termsRequired' => true,
                                                        'disclaimerText' => '',
                                                        'layoutStyle' => 'detailed',
                                                        'showDeliveryTime' => true,
                                                        'showPrintButton' => true,
                                                        'showSavingsHighlight' => true,
                                                    ]);
                                                    ?>
                                                    <div class="quotemate-form-summary"
                                                         data-field-id="<?php echo esc_attr($field['id']); ?>"
                                                         data-summary-settings="<?php echo esc_attr(wp_json_encode($summary_settings)); ?>">
                                                        <h3 class="quotemate-form-summary__title"><?php echo esc_html($summary_settings['summaryTitle']); ?></h3>
                                                        <div class="quotemate-form-summary__body">
                                                            <div class="quotemate-summary-empty"><?php echo esc_html($summary_settings['emptyStateMessage']); ?></div>
                                                        </div>
                                                        <input type="hidden" class="quotemate-form-summary__total-input" name="<?php echo esc_attr($field['id']); ?>" value="0">
                                                        <input type="hidden" class="quotemate-form-summary__snapshot-input" name="<?php echo esc_attr($field['id']); ?>_snapshot" value="">
                                                    </div>
                                                    <?php
                                                    break;

                                                case 'quote_total':
                                                    ?>
                                                    <div class="quote-total-display" id="<?php echo esc_attr($field['id']); ?>">
                                                        <div class="total-header">
                                                            <h4>Quote Summary</h4>
                                                        </div>
                                                        <div class="total-content">
                                                            <div class="service-summary" style="display: none;">
                                                                <div class="service-item">
                                                                    <span class="service-name"></span>
                                                                    <span class="service-price"></span>
                                                                </div>
                                                            </div>
                                                            <div class="total-line">
                                                                <span class="total-label">Total:</span>
                                                                <span class="total-value" data-field-id="<?php echo esc_attr($field['id']); ?>">$0.00</span>
                                                            </div>
                                                        </div>
                                                        <input type="hidden" name="<?php echo esc_attr($field['id']); ?>" value="0" />
                                                    </div>
                                                    <?php
                                                    break;

                                                case 'heading':
                                                    $heading_tag = HeadingHelper::resolve_heading_tag($field);
                                                    $heading_text = $field['label'] ?? '';
                                                    $heading_class = trim(
                                                        'quotemate-form-heading quotemate-form-heading--' . $heading_tag . ' '
                                                        . HeadingHelper::get_heading_align_class($field) . ' '
                                                        . ($field['cssClass'] ?? '')
                                                    );
                                                    echo '<' . $heading_tag . ' class="' . esc_attr($heading_class) . '">';
                                                    echo HeadingHelper::format_heading_text($heading_text);
                                                    echo '</' . $heading_tag . '>';
                                                    break;

                                                case 'paragraph':
                                                    ?>
                                                    <div class="quotemate-form-paragraph <?php echo esc_attr($field['cssClass'] ?? ''); ?>">
                                                        <?php echo esc_html($field['paragraph_content'] ?? $field['label'] ?? ''); ?>
                                                    </div>
                                                    <?php
                                                    break;

                                                default:
                                                    echo '<p>Unsupported field type: ' . esc_html($field['type']) . '</p>';
                                                    break;
                                            }
                                            ?>
                                        </div>

                                        <?php if (!empty($field['description'])): ?>
                                            <div class="field-description"><?php echo esc_html($field['description']); ?></div>
                                        <?php endif; ?>
                                    </div>
