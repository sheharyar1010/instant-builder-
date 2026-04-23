# QuoteMate Conditional Logic

Conditional Logic allows you to show or hide form fields based on user input, creating dynamic forms that adapt to user responses.

## Overview

Similar to Gravity Forms, QuoteMate's conditional logic system allows you to:
- Show or hide fields based on other field values
- Use **AND** (all conditions must match) or **OR** (any condition must match) operators
- Create complex conditional rules with multiple conditions
- Support all field types including text, select, radio, and checkbox fields

## How to Set Up Conditional Logic

### 1. Access Field Settings
1. Open your form in the Form Builder
2. Click on any field you want to apply conditional logic to
3. In the right sidebar, click the **"Field Settings"** tab
4. Scroll down to the **"Conditional Logic"** section

### 2. Enable Conditional Logic
1. Check the **"Enable conditional logic for this field"** checkbox
2. The conditional logic settings will appear

### 3. Configure Logic Settings

#### Logic Type
Choose how the field should behave:
- **Show this field if** - Field will be hidden by default and shown when conditions are met
- **Hide this field if** - Field will be visible by default and hidden when conditions are met

#### Operator (AND/OR Logic)
Choose how multiple conditions are evaluated:
- **ALL of the following match (AND)** - All conditions must be true
- **ANY of the following match (OR)** - At least one condition must be true

### 4. Add Conditional Rules

Click **"Add Rule"** to create a new condition. Each rule consists of:

#### Field Selection
Choose which field to monitor for changes. You can select from any field in your form except:
- The current field (to prevent circular references)
- Page breaks and section breaks
- HTML content fields

#### Operators
Choose how to compare the field value:

**Exact Comparison:**
- **is** - Exact match
- **is not** - Not an exact match

**Text Comparison:**
- **contains** - Field value contains the specified text
- **starts with** - Field value begins with the specified text
- **ends with** - Field value ends with the specified text

**Numeric Comparison:**
- **greater than** - For number fields, value is greater than specified
- **less than** - For number fields, value is less than specified

**Empty/Not Empty:**
- **is empty** - Field has no value or only whitespace
- **is not empty** - Field has any value

#### Value
Specify the value to compare against. The input type will change based on the selected field:
- **Text fields**: Text input
- **Select/Radio/Checkbox fields**: Dropdown with available options
- **Empty/Not Empty operators**: No value input (automatically hidden)

## Examples

### Example 1: Show Additional Fields Based on Service Type

**Scenario**: Show a "Project Details" field only when "Website Development" is selected from a "Service Type" dropdown.

**Setup**:
1. Create a "Service Type" dropdown field with options: "Website Development", "Graphic Design", "Marketing"
2. Create a "Project Details" text field
3. In "Project Details" field settings:
   - Enable conditional logic
   - Logic Type: **Show this field if**
   - Operator: **ALL of the following match**
   - Rule: Service Type **is** "Website Development"

### Example 2: Hide Budget Field for Small Projects

**Scenario**: Hide the budget field when project type is "Small" or "Consultation".

**Setup**:
1. Create a "Project Type" radio field with options: "Small", "Medium", "Large", "Consultation"
2. Create a "Budget" field
3. In "Budget" field settings:
   - Enable conditional logic
   - Logic Type: **Hide this field if**
   - Operator: **ANY of the following match**
   - Rule 1: Project Type **is** "Small"
   - Rule 2: Project Type **is** "Consultation"

### Example 3: Complex Multi-Condition Logic

**Scenario**: Show a "Rush Fee" field only when:
- Deadline is less than 7 days AND Budget is greater than $1000
- OR Project Type is "Emergency"

**Setup**:
1. Create fields: "Deadline" (number), "Budget" (number), "Project Type" (select)
2. Create a "Rush Fee" field
3. Since we need mixed AND/OR logic, create two separate fields or use multiple conditional fields

**Note**: For complex mixed AND/OR logic, you may need to create intermediate fields or restructure your conditions.

## Field Types and Conditional Logic

### Text Fields (text, email, textarea)
- Compare against text values
- Use text-based operators (is, contains, starts with, etc.)
- Case-insensitive comparison

### Select Dropdowns
- Compare against selected option values
- Conditional value input shows dropdown with available options
- Use exact match operators (is, is not)

### Radio Buttons
- Compare against selected value
- Only one value can be selected at a time
- Use exact match operators

### Checkboxes
- Compare against checked values
- Multiple values can be selected
- Values are comma-separated when multiple items are checked

### Number Fields
- Supports numeric comparison (greater than, less than)
- Can also use text-based comparison for exact matches

## Best Practices

### 1. Keep It Simple
- Start with simple conditions and build complexity gradually
- Test your logic thoroughly before publishing

### 2. Logical Field Order
- Place fields that trigger conditions before the conditional fields
- Users should encounter trigger fields before dependent fields

### 3. User Experience
- Don't hide required information behind too many conditions
- Provide clear labels and instructions for trigger fields
- Consider showing field descriptions to explain why fields appear/disappear

### 4. Testing
- Test all possible combinations of your conditional logic
- Check both desktop and mobile experiences
- Verify that form validation works correctly with hidden fields

### 5. Performance
- Avoid overly complex nested conditions
- Limit the number of conditional fields per form for optimal performance

## Technical Details

### Frontend Implementation
- Conditional logic runs in real-time as users interact with the form
- Uses JavaScript to monitor field changes and show/hide fields
- Disabled fields are excluded from form validation and submission
- Hidden fields maintain their values but are not required

### Data Storage
- Conditional logic rules are stored in the form's JSON data structure
- Rules are validated and sanitized on the backend
- Compatible with form import/export functionality

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Gracefully degrades in older browsers (all fields remain visible)
- No external dependencies required

## Troubleshooting

### Field Not Showing/Hiding
1. Check that the trigger field has the correct value
2. Verify the condition operator and value are correct
3. Ensure the field order is logical (trigger before conditional)
4. Check browser console for JavaScript errors

### Validation Issues
1. Hidden required fields are automatically made non-required
2. Clear any validation errors when fields become hidden
3. Re-validate when fields become visible

### Performance Issues
1. Reduce the number of conditional fields
2. Simplify complex condition logic
3. Consider using field groups or multi-step forms

### Getting Support
If you encounter issues with conditional logic:
1. Check the browser console for errors
2. Verify your form data structure
3. Test in different browsers
4. Contact support with specific examples and error messages

## Advanced Usage

### Custom Events
The conditional logic system triggers custom events that you can listen to:

```javascript
document.addEventListener('quotemateConditionalLogic', function(event) {
    const { fieldId, visible } = event.detail;
    console.log(`Field ${fieldId} is now ${visible ? 'visible' : 'hidden'}`);
});
```

### Manual Refresh
You can manually trigger a conditional logic evaluation:

```javascript
if (window.quoteMateConditionalLogic) {
    window.quoteMateConditionalLogic.refresh();
}
```

### Dynamic Form Updates
For forms that change dynamically, update the conditional logic engine:

```javascript
window.quoteMateConditionalLogic.updateFormData(newFormData);
``` 