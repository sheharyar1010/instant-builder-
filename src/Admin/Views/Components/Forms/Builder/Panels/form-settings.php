<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Form Settings System</title>
    <style>
        .form-title-input:hover {
            background: #f1f5f9;
        }

        .form-title-input:focus {
            outline: 2px solid #3b82f6;
            background: white;
        }

        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 500;
        }

        .status-active {
            background: #10b981;
            color: white;
        }

        .status-draft {
            background: #f59e0b;
            color: white;
        }

        .header-right {
            display: flex;
            gap: 0.75rem;
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: 500;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
        }

        .btn-secondary:hover {
            background: #e2e8f0;
        }

        .btn-primary {
            background: #3b82f6;
            color: white;
        }

        .btn-primary:hover {
            background: #2563eb;
        }

        .btn-settings {
            background: #8b5cf6;
            color: white;
        }

        .btn-settings:hover {
            background: #7c3aed;
        }

        /* Main Content */
        .form-builder-main {
            flex: 1;
            padding: 6rem 2rem 2rem;
            overflow-y: auto;
        }

        .form-canvas {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .form-preview {
            padding: 2rem;
        }

        .form-header {
            margin-bottom: 2rem;
            text-align: center;
        }

        .form-title {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .form-description {
            color: #64748b;
            font-size: 1.125rem;
        }

        /* Settings Modal */
        .settings-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 1000;
            backdrop-filter: blur(4px);
        }

        .settings-modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .settings-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 900px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid #e2e8f0;
        }

        .settings-title {
            font-size: 1.5rem;
            font-weight: 600;
        }

        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
        }

        .close-btn:hover {
            background: #f1f5f9;
        }

        .settings-tabs {
            display: flex;
            border-bottom: 1px solid #e2e8f0;
        }

        .settings-tab {
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            cursor: pointer;
            font-weight: 500;
            color: #64748b;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .settings-tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
        }

        .settings-tab:hover {
            color: #3b82f6;
        }

        .settings-body {
            padding: 2rem;
            overflow-y: auto;
            max-height: 60vh;
        }

        .settings-section {
            margin-bottom: 2rem;
        }

        .settings-section h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #1e293b;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #374151;
        }

        .form-input,
        .form-textarea,
        .form-select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 1rem;
            transition: border-color 0.2s;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
            min-height: 120px;
            resize: vertical;
        }

        .color-picker-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .color-picker {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .color-input {
            width: 60px;
            height: 40px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            cursor: pointer;
            padding: 0;
        }

        .radio-group {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }

        .radio-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
        }

        .radio-option input[type="radio"] {
            margin: 0;
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
        }

        .checkbox-group input[type="checkbox"] {
            margin: 0;
        }

        .preview-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 1rem;
        }

        .preview-form {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .email-template-vars {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 1rem;
            margin-top: 0.5rem;
        }

        .email-template-vars h4 {
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #475569;
        }

        .template-vars {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .template-var {
            background: #e2e8f0;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-family: monospace;
            cursor: pointer;
            transition: background 0.2s;
        }

        .template-var:hover {
            background: #cbd5e1;
        }

        .settings-footer {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            padding: 1.5rem 2rem;
            border-top: 1px solid #e2e8f0;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 2000;
            transform: translateX(100%);
            transition: transform 0.3s ease-in-out;
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification.success {
            background: #10b981;
        }

        .notification.error {
            background: #ef4444;
        }

        .divider {
            height: 1px;
            background: #e2e8f0;
            margin: 1.5rem 0;
        }
    </style>
</head>

<body>

    <!-- Settings Modal -->
    <div class="settings-modal" id="settingsModal">
        <div class="settings-content">
            <div class="settings-header">
                <h2 class="settings-title">Form Settings</h2>
                <button class="close-btn" id="closeSettings">×</button>
            </div>

            <div class="settings-tabs">
                <button class="settings-tab active" data-tab="general">General</button>
                <button class="settings-tab" data-tab="email">Email Templates</button>
                <button class="settings-tab" data-tab="redirect">Redirect & Messages</button>
                <button class="settings-tab" data-tab="design">Design</button>
                <button class="settings-tab" data-tab="advanced">Advanced</button>
            </div>

            <div class="settings-body">
                <!-- General Settings -->
                <div class="tab-content active" id="general">
                    <div class="settings-section">
                        <h3>Form Information</h3>
                        <div class="form-group">
                            <label class="form-label">Form Name</label>
                            <input type="text" class="form-input" id="formName" value="Quote Request Form">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Form Title</label>
                            <input type="text" class="form-input" id="formTitle" value="Quote Request Form">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Form Description</label>
                            <textarea class="form-textarea" id="formDescription">Please fill out this form to receive a quote for our services.</textarea>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-group">
                                <input type="checkbox" id="formActive" checked>
                                <span>Form is active</span>
                            </label>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Submission Settings</h3>
                        <div class="form-group">
                            <label class="checkbox-group">
                                <input type="checkbox" id="enableCaptcha">
                                <span>Enable reCAPTCHA</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-group">
                                <input type="checkbox" id="enableSubmissionLimit">
                                <span>Limit submissions per user</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Maximum Submissions</label>
                            <input type="number" class="form-input" id="maxSubmissions" value="1" min="1">
                        </div>
                    </div>
                </div>

                <!-- Email Templates -->
                <div class="tab-content" id="email">
                    <div class="settings-section">
                        <h3>Admin Notification</h3>
                        <div class="form-group">
                            <label class="checkbox-group">
                                <input type="checkbox" id="enableAdminEmail" checked>
                                <span>Send admin notification</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Admin Email</label>
                            <input type="email" class="form-input" id="adminEmail" value="admin@example.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Admin Email Subject</label>
                            <input type="text" class="form-input" id="adminSubject" value="New Quote Request - {form_name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Admin Email Body</label>
                            <textarea class="form-textarea" id="adminBody">A new quote request has been submitted:

Form: {form_name}
Submitted: {submission_date}
User Email: {user_email}

Details:
{all_fields}

---
This is an automated message from {site_name}</textarea>
                        </div>
                        <div class="email-template-vars">
                            <h4>Available Variables:</h4>
                            <div class="template-vars">
                                <span class="template-var">{form_name}</span>
                                <span class="template-var">{user_email}</span>
                                <span class="template-var">{submission_date}</span>
                                <span class="template-var">{all_fields}</span>
                                <span class="template-var">{site_name}</span>
                                <span class="template-var">{site_url}</span>
                            </div>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Customer Confirmation</h3>
                        <div class="form-group">
                            <label class="checkbox-group">
                                <input type="checkbox" id="enableCustomerEmail" checked>
                                <span>Send customer confirmation</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">From Email</label>
                            <input type="email" class="form-input" id="fromEmail" value="noreply@example.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">From Name</label>
                            <input type="text" class="form-input" id="fromName" value="Quote System">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customer Email Subject</label>
                            <input type="text" class="form-input" id="customerSubject" value="Quote Request Confirmation - {site_name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Customer Email Body</label>
                            <textarea class="form-textarea" id="customerBody">Thank you for your quote request!

We have received your information and will get back to you within 24 hours.

Your submitted information:
{all_fields}

If you have any questions, please don't hesitate to contact us.

Best regards,
{site_name} Team</textarea>
                        </div>
                    </div>
                </div>

                <!-- Redirect & Messages -->
                <div class="tab-content" id="redirect">
                    <div class="settings-section">
                        <h3>After Submission</h3>
                        <div class="form-group">
                            <label class="form-label">Action after submission</label>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="afterSubmission" value="message" checked>
                                    <span>Show message</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="afterSubmission" value="redirect">
                                    <span>Redirect to page</span>
                                </label>
                            </div>
                        </div>
                        <div class="form-group" id="successMessageGroup">
                            <label class="form-label">Success Message</label>
                            <textarea class="form-textarea" id="successMessage">Thank you for your quote request! We will get back to you soon.</textarea>
                        </div>
                        <div class="form-group" id="redirectUrlGroup" style="display: none;">
                            <label class="form-label">Redirect URL</label>
                            <input type="url" class="form-input" id="redirectUrl" placeholder="https://example.com/thank-you">
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Error Messages</h3>
                        <div class="form-group">
                            <label class="form-label">General Error Message</label>
                            <textarea class="form-textarea" id="errorMessage">An error occurred while processing your request. Please try again.</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Validation Error Message</label>
                            <textarea class="form-textarea" id="validationMessage">Please fill in all required fields correctly.</textarea>
                        </div>
                    </div>
                </div>

                <!-- Design Settings -->
                <div class="tab-content" id="design">
                    <div class="settings-section">
                        <h3>Form Colors</h3>
                        <div class="color-picker-group">
                            <div class="color-picker">
                                <input type="color" class="color-input" id="formBgColor" value="#ffffff">
                                <label class="form-label">Form Background</label>
                            </div>
                            <div class="color-picker">
                                <input type="color" class="color-input" id="headerColor" value="#1e293b">
                                <label class="form-label">Header Color</label>
                            </div>
                            <div class="color-picker">
                                <input type="color" class="color-input" id="labelColor" value="#374151">
                                <label class="form-label">Label Color</label>
                            </div>
                            <div class="color-picker">
                                <input type="color" class="color-input" id="buttonColor" value="#3b82f6">
                                <label class="form-label">Button Color</label>
                            </div>
                            <div class="color-picker">
                                <input type="color" class="color-input" id="borderColor" value="#d1d5db">
                                <label class="form-label">Border Color</label>
                            </div>
                            <div class="color-picker">
                                <input type="color" class="color-input" id="focusColor" value="#3b82f6">
                                <label class="form-label">Focus Color</label>
                            </div>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Typography</h3>
                        <div class="form-group">
                            <label class="form-label">Font Family</label>
                            <select class="form-select" id="fontFamily">
                                <option value="system">System Default</option>
                                <option value="arial">Arial</option>
                                <option value="helvetica">Helvetica</option>
                                <option value="georgia">Georgia</option>
                                <option value="times">Times New Roman</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Base Font Size</label>
                            <input type="range" class="form-input" id="fontSize" min="12" max="20" value="16">
                            <span id="fontSizeValue">16px</span>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Layout</h3>
                        <div class="form-group">
                            <label class="form-label">Form Width</label>
                            <select class="form-select" id="formWidth">
                                <option value="full">Full Width</option>
                                <option value="container" selected>Container</option>
                                <option value="narrow">Narrow</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Field Spacing</label>
                            <input type="range" class="form-input" id="fieldSpacing" min="0.5" max="3" step="0.5" value="1.5">
                            <span id="fieldSpacingValue">1.5rem</span>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Preview</h3>
                        <div class="preview-section">
                            <div class="preview-form" id="designPreview">
                                <h3>Sample Form Preview</h3>
                                <div style="margin: 1rem 0;">
                                    <label style="display: block; margin-bottom: 0.5rem;">Name</label>
                                    <input type="text" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;" placeholder="Enter your name">
                                </div>
                                <div style="margin: 1rem 0;">
                                    <label style="display: block; margin-bottom: 0.5rem;">Email</label>
                                    <input type="email" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;" placeholder="Enter your email">
                                </div>
                                <button style="background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; cursor: pointer;">Submit</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Advanced Settings -->
                <div class="tab-content" id="advanced">
                    <div class="settings-section">
                        <h3>Custom CSS</h3>
                        <div class="form-group">
                            <label class="form-label">Custom CSS</label>
                            <textarea class="form-textarea" id="customCss" placeholder="Enter your custom CSS here..." style="font-family: monospace; min-height: 150px;"></textarea>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>JavaScript</h3>
                        <div class="form-group">
                            <label class="form-label">Custom JavaScript</label>
                            <textarea class="form-textarea" id="customJs" placeholder="Enter your custom JavaScript here..." style="font-family: monospace; min-height: 150px;"></textarea>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="settings-section">
                        <h3>Tracking & Analytics</h3>
                        <div class="form-group">
                            <label class="form-label">Google Analytics Event</label>
                            <input type="text" class="form-input" id="gaEvent" placeholder="form_submit">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Facebook Pixel Event</label>
                            <input type="text" class="form-input" id="fbEvent" placeholder="Lead">
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-footer">
                <button class="btn btn-secondary" id="cancelSettings">Cancel</button>
                <button class="btn btn-primary" id="saveSettings">Save Settings</button>
            </div>
        </div>
    </div>


</body>

</html>