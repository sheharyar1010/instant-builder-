# QuoteMate Plugin Structure Documentation

## 📁 **Directory Structure Overview**

```
quotemate/
├── 📄 quotemate.php                 # Main plugin file
├── 📄 uninstall.php                 # Uninstall handler
├── 📄 composer.json                 # Composer configuration
├── 📄 package.json                  # NPM configuration
├── 📄 vite.config.js               # Build configuration
├── 📄 README.md                    # Plugin documentation
├── 📄 SECURITY_IMPROVEMENTS.md     # Security improvements log
├── 📄 STRUCTURE.md                 # This file
│
├── 📁 src/                         # Source code (PSR-4 autoloaded)
│   ├── 📁 Core/                    # Core plugin classes
│   │   ├── 📄 Plugin.php           # Main plugin orchestrator
│   │   ├── 📄 Config.php           # Configuration management
│   │   ├── 📄 Activator.php        # Plugin activation
│   │   ├── 📄 Deactivator.php      # Plugin deactivation
│   │   ├── 📄 Loader.php           # Hook loader
│   │   ├── 📄 I18n.php             # Internationalization
│   │   └── 📄 Quotemate.php        # Legacy main class
│   │
│   ├── 📁 Admin/                   # Admin functionality
│   │   ├── 📄 Admin.php            # Admin initialization
│   │   ├── 📁 Controllers/         # Admin controllers
│   │   │   ├── 📄 FormsController.php
│   │   │   ├── 📄 SubmissionsController.php
│   │   │   ├── 📄 FormDisplayController.php
│   │   │   └── 📄 UninstallController.php
│   │   ├── 📁 Models/              # Database models
│   │   │   ├── 📄 Form.php
│   │   │   └── 📄 Submission.php
│   │   ├── 📁 Views/               # Admin views
│   │   │   ├── 📁 Forms/
│   │   │   ├── 📁 Submissions/
│   │   │   ├── 📁 Components/
│   │   │   └── 📁 Layouts/
│   │   └── 📁 Includes/            # Admin includes
│   │       └── 📁 Tables/
│   │
│   ├── 📁 Frontend/                # Frontend functionality
│   │   ├── 📄 Frontend.php         # Frontend initialization
│   │   ├── 📁 Services/            # Frontend services
│   │   └── 📁 Views/               # Frontend views
│   │       └── 📁 Templates/
│   │
│   ├── 📁 Services/                # Business logic services
│   │   └── 📄 EmailService.php     # Email handling
│   │
│   ├── 📁 Helpers/                 # Utility classes
│   │   ├── 📄 AssetHelper.php      # Asset management
│   │   ├── 📄 CompatibilityHelper.php
│   │   ├── 📄 DateHelper.php       # Date utilities
│   │   ├── 📄 FormHelper.php       # Form utilities
│   │   ├── 📄 LogHelper.php        # Logging
│   │   ├── 📄 RequestHelper.php    # Request handling
│   │   ├── 📄 SanitizationHelper.php
│   │   └── 📄 ViewRenderer.php     # View rendering
│   │
│   ├── 📁 Traits/                  # PHP traits
│   │   ├── 📄 HasValidation.php
│   │   └── 📄 Singleton.php
│   │
│   └── 📁 Interfaces/              # PHP interfaces
│       ├── 📄 Arrayable.php
│       └── 📄 JsonSerializable.php
│
├── 📁 assets/                      # Compiled assets
│   ├── 📁 css/
│   ├── 📁 js/
│   ├── 📁 icons/
│   ├── 📁 images/
│   └── 📁 thumbnails/
│
├── 📁 resources/                   # Source assets
│   ├── 📁 js/                      # JavaScript source
│   └── 📁 scss/                    # SCSS source
│
├── 📁 languages/                   # Translation files
│   ├── 📄 quotemate.pot            # Translation template
│   └── 📄 index.php                # Security file
│
├── 📁 vendor/                      # Composer dependencies
├── 📁 node_modules/                # NPM dependencies
└── 📁 .vite/                       # Vite build cache
```

## 🏗️ **Architecture Patterns**

### **1. Main Plugin Architecture**
- **Plugin.php**: Main orchestrator class following WordPress best practices
- **Config.php**: Centralized configuration management
- **Proper initialization**: Uses `plugins_loaded` hook for proper timing

### **2. MVC Pattern Implementation**
- **Models**: Database interaction (`Form.php`, `Submission.php`)
- **Views**: Template files in organized directories
- **Controllers**: Business logic and request handling

### **3. Service Layer**
- **EmailService**: Dedicated email handling
- **Separation of Concerns**: Business logic separated from controllers

### **4. Helper Classes**
- **Utility Functions**: Organized into specific helper classes
- **Reusable Code**: Common functionality centralized

## 🔧 **Key Structural Improvements**

### **1. PSR-4 Autoloading**
```php
// composer.json
"autoload": {
    "psr-4": {
        "Dawnsol\\Quotemate\\": "src/"
    }
}
```

### **2. Modern Build System**
- **Vite**: Fast build tool for assets
- **SCSS**: Modern CSS preprocessing
- **ES6+**: Modern JavaScript support

### **3. Configuration Management**
```php
// Centralized configuration
$config = Config::getInstance();
$table_name = $config->get_table('forms');
$capability = $config->get_capability('manage_forms');
```

### **4. Proper Hook Management**
```php
// Loader class for hook management
$this->loader->add_action('admin_menu', $admin, 'add_admin_menu');
$this->loader->add_filter('plugin_action_links', $controller, 'method');
```

## 📋 **File Organization Best Practices**

### **1. Namespace Structure**
```
Dawnsol\Quotemate\
├── Core\           # Core plugin functionality
├── Admin\          # Admin-specific code
├── Frontend\       # Frontend-specific code
├── Services\       # Business logic services
├── Helpers\        # Utility classes
├── Traits\         # PHP traits
└── Interfaces\     # PHP interfaces
```

### **2. View Organization**
```
Views/
├── Forms/          # Form-related views
├── Submissions/    # Submission-related views
├── Components/     # Reusable components
└── Layouts/        # Layout templates
```

### **3. Asset Organization**
```
assets/             # Compiled assets (production)
resources/          # Source assets (development)
├── js/            # JavaScript source
└── scss/          # SCSS source
```

## 🛡️ **Security Structure**

### **1. Capability Checks**
```php
// Centralized capability management
if (!current_user_can(Config::getInstance()->get_capability('manage_forms'))) {
    wp_die(__('Insufficient permissions.', 'quotemate'));
}
```

### **2. Nonce Management**
```php
// Centralized nonce actions
$nonce_action = Config::getInstance()->get_nonce_action('save_form');
wp_nonce_field($nonce_action, 'quotemate_nonce');
```

### **3. Input Sanitization**
```php
// Dedicated sanitization helper
$clean_data = SanitizationHelper::sanitize($input, 'email');
```

## 🌐 **Internationalization Structure**

### **1. Translation Files**
```
languages/
├── quotemate.pot   # Translation template
├── quotemate-en_US.po  # English translations
├── quotemate-en_US.mo  # Compiled translations
└── index.php       # Security file
```

### **2. Text Domain Usage**
```php
// Consistent text domain usage
esc_html__('Form saved successfully.', 'quotemate')
```

## 🔄 **Build Process Structure**

### **1. Development**
```bash
npm run dev          # Start development server
```

### **2. Production**
```bash
npm run build       # Build for production
```

### **3. Asset Pipeline**
```
resources/ → Vite → assets/ → WordPress
```

## 📊 **Database Structure**

### **1. Table Organization**
```php
// Centralized table names
$forms_table = Config::getInstance()->get_table('forms');
$submissions_table = Config::getInstance()->get_table('submissions');
```

### **2. Model Structure**
```php
// PSR-4 autoloaded models
namespace Dawnsol\Quotemate\Admin\Models;
```

## 🎯 **Benefits of This Structure**

### **1. Maintainability**
- Clear separation of concerns
- Easy to locate and modify code
- Consistent naming conventions

### **2. Scalability**
- Modular architecture
- Easy to add new features
- Extensible design

### **3. Security**
- Centralized security controls
- Consistent validation patterns
- Proper capability management

### **4. Performance**
- Efficient autoloading
- Optimized asset delivery
- Minimal database queries

### **5. Developer Experience**
- Modern development tools
- Clear documentation
- Consistent coding standards

## 🚀 **WordPress Standards Compliance**

### **✅ Plugin Header**
- Complete plugin information
- Proper version requirements
- License information

### **✅ Hook System**
- Proper WordPress hooks usage
- Action and filter implementation
- Priority management

### **✅ Database Operations**
- WordPress database API usage
- Proper table creation
- Error handling

### **✅ Asset Management**
- Proper script/style enqueuing
- Dependency management
- Version control

### **✅ Security**
- Nonce verification
- Capability checks
- Input sanitization

This structure follows WordPress plugin development best practices and modern PHP development standards, making the plugin maintainable, secure, and scalable. 


quotemate/
├── .git/                          # Git repository
├── .gitignore                     # Git ignore file
├── .vite/                         # Vite build cache
│   └── deps/                      # Vite dependencies
├── admin/                         # Legacy admin directory (mostly empty)
│   ├── includes/
│   │   └── tables/                # Empty
│   └── views/
│       ├── forms/                 # Empty
│       └── layouts/
│           └── forms/             # Empty
├── assets/                        # Compiled assets
│   ├── css/
│   │   ├── admin/
│   │   │   ├── forms/
│   │   │   │   └── builder/
│   │   │   │       ├── panels/    # Empty
│   │   │   │       └── form-tabs.css
│   │   │   └── submissions.css
│   │   ├── form/                  # Empty
│   │   └── frontend/              # Empty
│   ├── icons/
│   │   ├── close.svg
│   │   ├── fields.svg
│   │   ├── help.svg
│   │   ├── settings.svg
│   │   └── setup.svg
│   ├── images/
│   │   └── quotemate-logo.png
│   ├── js/
│   │   └── admin/
│   │       ├── forms/
│   │       │   └── builder/
│   │       │       ├── form/
│   │       │       │   └── builder/
│   │       │       │       └── save/  # Empty
│   │       │       └── panels/
│   │       │           └── form/      # Empty
│   │       └── submissions/
│   │           └── view.js
│   └── thumbnails/
│       └── templates/
│           ├── multi-step-form.jpg
│           └── single-step-form.jpg
├── composer.json                  # PHP dependencies
├── composer.lock                  # PHP lock file
├── DEBUG_SERVICE_CONFIG.md        # Debug documentation
├── docs/
│   └── conditional-logic.md       # Documentation
├── includes/                      # Legacy includes (empty)
│   └── models/                    # Empty
├── languages/
│   ├── index.php
│   └── quotemate.pot              # Translation template
├── migrations/                    # Database migrations (empty)
├── node_modules/                  # Node.js dependencies
├── package.json                   # Node.js dependencies
├── package-lock.json              # Node.js lock file
├── post-build-cleanup.js          # Build script
├── public/                        # Public assets
│   ├── css/
│   │   └── progressive-service-selector.css
│   ├── js/
│   │   ├── conditional-logic.js
│   │   ├── progressive-service-selector.js
│   │   └── quote-calculation.js
│   └── partials/
│       └── emails/                # Empty
├── quotemate.php                  # Main plugin file
├── README.md                      # Plugin documentation
├── resources/                     # Source files
│   ├── js/
│   │   ├── admin/
│   │   │   └── forms/
│   │   │       ├── builder/
│   │   │       │   ├── form_builder/
│   │   │       │   │   ├── calculation-engine.js
│   │   │       │   │   ├── drag-drop-handler.js
│   │   │       │   │   ├── enhanced-service-manager.js
│   │   │       │   │   ├── field-properties.js
│   │   │       │   │   ├── form-preview.js
│   │   │       │   │   ├── form-settings.js
│   │   │       │   │   ├── main.js
│   │   │       │   │   ├── save_form.js
│   │   │       │   │   └── service-manager.js
│   │   │       │   ├── panels/
│   │   │       │   │   ├── form_builder.js
│   │   │       │   │   └── setup.js
│   │   │       │   ├── builder.js
│   │   │       │   ├── sidebar.js
│   │   │       │   └── toolbar.js
│   │   │       ├── create.js
│   │   │       ├── delete-confirmation.js
│   │   │       └── edit.js
│   │   └── frontend/              # Empty
│   └── scss/
│       ├── admin/
│       │   └── forms/
│       │       ├── builder/
│       │       │   ├── panels/
│       │       │   │   ├── form_builder.scss
│       │       │   │   └── setup.scss
│       │       │   ├── builder.scss
│       │       │   ├── conditional-logic.scss
│       │       │   ├── enhanced-service-manager.scss
│       │       │   ├── service-manager.scss
│       │       │   ├── sidebar.scss
│       │       │   └── toolbar.scss
│       │       └── create.scss
│       ├── frontend/              # Empty
│       └── global/
│           ├── _base.scss
│           └── _variables.scss
├── SECURITY_IMPROVEMENTS.md       # Security documentation
├── src/                           # Main PHP source code
│   ├── Admin/                     # Admin functionality
│   │   ├── Admin.php
│   │   ├── Controllers/
│   │   │   ├── FormDisplayController.php
│   │   │   ├── FormsController.php
│   │   │   ├── SubmissionsController.php
│   │   │   └── UninstallController.php
│   │   ├── Includes/
│   │   │   └── Tables/
│   │   │       ├── FormsListTable.php
│   │   │       └── SubmissionsListTable.php
│   │   ├── Models/
│   │   │   ├── Form.php
│   │   │   └── Submission.php
│   │   └── Views/
│   │       ├── Components/
│   │       │   └── Forms/
│   │       │       └── Builder/
│   │       │           ├── Panels/
│   │       │           │   ├── edit.php
│   │       │           │   ├── form-settings.php
│   │       │           │   └── setup.php
│   │       │           ├── sidebar.php
│   │       │           └── toolbar.php
│   │       ├── Forms/
│   │       │   ├── create.php
│   │       │   ├── edit.php
│   │       │   └── index.php
│   │       ├── Layouts/
│   │       │   └── Forms/
│   │       │       └── builder.php
│   │       └── Submissions/
│   │           ├── index.php
│   │           └── view.php
│   ├── Core/                      # Core plugin functionality
│   │   ├── Activator.php
│   │   ├── Config.php
│   │   ├── Deactivator.php
│   │   ├── I18n.php
│   │   ├── Loader.php
│   │   ├── Plugin.php
│   │   └── Quotemate.php
│   ├── Frontend/                  # Frontend functionality
│   │   ├── Frontend.php
│   │   ├── Services/              # Empty
│   │   └── Views/
│   │       └── Templates/
│   │           ├── form-view.php
│   │           ├── partials/       # Empty
│   │           └── scripts/        # Empty
│   ├── Helpers/                   # Helper classes
│   │   ├── AssetHelper.php
│   │   ├── CompatibilityHelper.php
│   │   ├── DateHelper.php
│   │   ├── FormHelper.php
│   │   ├── LogHelper.php
│   │   │   ├── RequestHelper.php
│   │   ├── SanitizationHelper.php
│   │   └── ViewRenderer.php
│   ├── Interfaces/                # PHP interfaces
│   │   ├── Arrayable.php
│   │   └── JsonSerializable.php
│   ├── Services/                  # Service classes
│   │   └── EmailService.php
│   └── Traits/                    # PHP traits
│       ├── HasValidation.php
│       └── Singleton.php
├── STRUCTURE.md                   # Project structure documentation
├── uninstall.php                  # Plugin uninstall script
├── vendor/                        # Composer dependencies
│   ├── composer/
│   └── autoload.php
└── vite.config.js                 # Vite build configuration