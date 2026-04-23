# 🔧 Debug Guide: Service Configuration Issues

## 🎯 **Testing Steps:**

### **1. Admin Configure Modal Debug:**

1. **Open Admin Form Builder**
2. **Add a Service Field** to your form
3. **Click the Service Field** to select it
4. **Look at Field Properties Panel** on the right
5. **Click "Configure Advanced Services"**
6. **Open Browser Console** (F12)
7. **Check Console Messages** - Look for:
   ```
   Opening service config for field: field_X
   Field data: {object data}
   Service structure: {array or undefined}
   Legacy services: {array or undefined}
   ```

### **2. Frontend Progressive Selector Debug:**

1. **View the form on frontend** (using shortcode)
2. **Open Browser Console** (F12)  
3. **Look for messages:**
   ```
   Progressive Service Selector: Initializing...
   Found service fields: X
   Checking field: field_X Data: {object}
   ```

---

## 🚨 **Common Issues & Solutions:**

### **Issue 1: "Configure Advanced Services" Button Not Working**

**Symptoms:** Button doesn't open modal, no console messages

**Solutions:**
1. **Check if assets are built:**
   ```bash
   npm run build
   ```

2. **Check if ServiceManager is loaded:**
   - Look for service-manager.scss in compiled CSS
   - Look for ServiceManager import in main.js

### **Issue 2: Modal Opens But No Data Loads**

**Symptoms:** Modal opens but shows "No services configured yet"

**Check Console for:**
- `Field data: {object}` - Should show field properties
- `Service structure: undefined` - Means no saved services

**Solutions:**
1. **Save some services first:**
   - Add categories and services in modal
   - Click "Save Configuration" 
   - Check if data persists

2. **Check form saving:**
   - Make sure form is saved after configuring services
   - Check if formData is properly updated

### **Issue 3: Frontend Progressive Selector Not Appearing**

**Symptoms:** Regular dropdown still shows, no step-by-step interface

**Check Console for:**
- `Progressive Service Selector: Initializing...`
- `Found service fields: 0` - Means no service fields detected

**Solutions:**
1. **Check CSS class:**
   - Form should have `quotemate-frontend-form` class
   - Service container should have `data-field-type="service"`

2. **Check assets loading:**
   - Progressive selector CSS/JS should be enqueued
   - Only loads when form has enhanced services

---

## 🔍 **Manual Debug Steps:**

### **Step 1: Check Form Data Structure**

In admin console, check:
```javascript
// Check if formBuilder exists
console.log('FormBuilder:', window.formBuilder || formBuilder);

// Check form data
console.log('Form Data:', formBuilder.formData);

// Check specific field
const serviceField = formBuilder.formData.fields.find(f => f.type === 'service');
console.log('Service Field:', serviceField);
```

### **Step 2: Check Asset Loading**

In browser console:
```javascript
// Check if progressive selector is loaded
console.log('Progressive Selector:', window.ProgressiveServiceSelector);

// Check if CSS is loaded
console.log('Styles loaded:', document.querySelector('link[href*="progressive-service-selector"]'));
```

### **Step 3: Force Initialize Progressive Selector**

In frontend console:
```javascript
// Force create progressive selector
new ProgressiveServiceSelector();
```

---

## 🎯 **Expected Working Flow:**

### **Admin Side:**
1. ✅ Add service field to form
2. ✅ Click "Configure Advanced Services" 
3. ✅ Modal opens with interface
4. ✅ Add categories (Web Development, Mobile Apps, etc.)
5. ✅ Add services under categories with pricing
6. ✅ Save configuration
7. ✅ See enhanced service display in field properties

### **Frontend Side:**
1. ✅ Form loads with service field
2. ✅ Progressive selector detects enhanced services
3. ✅ Replaces dropdown with step-by-step interface
4. ✅ User selects category → services appear
5. ✅ User selects service → quantity input appears
6. ✅ User enters quantity → price summary appears

---

## 📝 **Report Back:**

Please check the console messages and let me know:

1. **Admin Modal:** What console messages do you see when clicking "Configure Advanced Services"?

2. **Frontend:** What console messages do you see when the form loads?

3. **Assets:** Are you able to run `npm run build` successfully?

This will help me identify exactly where the issue is occurring! 🔍 