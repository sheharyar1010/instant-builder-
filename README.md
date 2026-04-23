# QuoteMate - WordPress Quote Form Builder

**QuoteMate** is a powerful and flexible "Request a Quote" form builder plugin for WordPress.  
Easily create dynamic, multi-step quote forms with drag-and-drop fields, real-time pricing, conditional logic, and customizable templates—no coding required.

## 🚀 Features

- **Drag & Drop Form Builder** - Intuitive visual form builder with field library
- **Multi-Step Forms** - Create professional multi-page quote forms
- **Conditional Logic** - Show/hide fields based on user responses
- **Real-time Pricing** - Dynamic pricing calculations
- **Email Notifications** - Automatic admin and customer notifications
- **Form Templates** - Pre-built templates for quick setup
- **Submission Management** - View and manage all quote requests
- **Responsive Design** - Works perfectly on all devices
- **Translation Ready** - Full internationalization support

## 📋 Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher
- MySQL 5.6 or higher
- Modern web browser with JavaScript enabled

## 🛠️ Installation

### Method 1: WordPress Admin (Recommended)

1. Download the QuoteMate plugin ZIP file
2. Go to **WordPress Admin → Plugins → Add New**
3. Click **Upload Plugin** and select the ZIP file
4. Click **Install Now** and then **Activate Plugin**

### Method 2: Manual Installation

1. Extract the plugin files to `/wp-content/plugins/quotemate/`
2. Go to **WordPress Admin → Plugins**
3. Find "QuoteMate" and click **Activate**

## ⚙️ Configuration

### Initial Setup

1. After activation, go to **QuoteMate** in your WordPress admin menu
2. Click **Create Form** to build your first quote form
3. Use the drag-and-drop builder to add fields
4. Configure form settings and conditional logic
5. Save and publish your form

### Uninstall Settings

Before uninstalling QuoteMate, you can configure data retention:

1. Go to **QuoteMate → Uninstall Settings**
2. Choose whether to keep or remove your data when uninstalling
3. Save your preferences

## 📝 Usage

### Creating Forms

1. **Navigate to QuoteMate** in your WordPress admin
2. Click **Create Form**
3. **Add Fields** using the drag-and-drop interface
4. **Configure Field Properties** (validation, pricing, etc.)
5. **Set up Conditional Logic** (optional)
6. **Save and Publish** your form

### Displaying Forms

Use the shortcode to display your form on any page or post:

```
[quotemate_form id="1"]
```

Replace `1` with your actual form ID.

### Managing Submissions

1. Go to **QuoteMate → Submissions**
2. View all incoming quote requests
3. Mark submissions as viewed
4. Update pricing and data as needed
5. Export data if required

## 🔧 Advanced Features

### Conditional Logic

Set up rules to show/hide fields based on user responses:

1. Select a field in the form builder
2. Enable conditional logic
3. Add conditions (e.g., "Show this field if 'Service Type' equals 'Premium'")
4. Save and test

### Custom Styling

Add custom CSS to match your theme:

```css
.quotemate-form {
    /* Your custom styles */
}
```

### Email Templates

Customize email notifications by editing the templates in:
`/wp-content/plugins/quotemate/public/partials/emails/`

## 🛡️ Security Features

- **Nonce Verification** - All forms and AJAX requests are protected
- **Input Sanitization** - All user input is properly sanitized
- **Capability Checks** - Admin functions require proper permissions
- **Rate Limiting** - Prevents form spam and abuse
- **SQL Injection Protection** - Prepared statements for all database queries

## 🌐 Internationalization

QuoteMate is fully translation-ready:

1. Copy `/languages/quotemate.pot` to your language
2. Translate the strings using Poedit or similar tool
3. Save as `/languages/quotemate-{locale}.po` and `.mo`
4. Upload to `/wp-content/languages/plugins/`

## 🔍 Troubleshooting

### Common Issues

**Form not displaying:**
- Check if the form is published and active
- Verify the shortcode syntax
- Ensure JavaScript is enabled

**Submissions not saving:**
- Check database permissions
- Verify form validation rules
- Check error logs for details

**Email notifications not sending:**
- Verify WordPress mail configuration
- Check spam filters
- Test with a simple email plugin

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// Add to wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### Log Files

QuoteMate logs are stored in:
`/wp-content/uploads/quotemate-logs/quotemate.log`

## 📞 Support

- **Documentation**: [Coming Soon]
- **Support Forum**: [Coming Soon]
- **Email**: admin@dawnsol.com
- **Website**: http://dawnsol.com

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This plugin is licensed under the GPL v2 or later.

## 🆕 Changelog

### Version 1.0.0
- Initial release
- Drag & drop form builder
- Multi-step forms
- Conditional logic
- Email notifications
- Submission management
- Security improvements
- WordPress standards compliance

## 🙏 Credits

Developed by [Dawnsol](http://dawnsol.com)

---

**Note**: This plugin requires proper server configuration and may not work on all hosting environments. Please test thoroughly before using in production.
