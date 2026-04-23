# Enhanced Dynamic Pricing System

## Overview

The Enhanced Dynamic Pricing System allows administrators to create custom pricing types beyond the default options, making the service configuration completely flexible and adaptable to any business model.

## Key Features

### 1. Dynamic Pricing Type Selection
- **Default Pricing Types**: 12 pre-configured pricing types (Fixed Price, Per Hour, Per Item, etc.)
- **Custom Pricing Types**: Unlimited custom pricing types (up to 20 per form for performance)
- **Organized Display**: Pricing types are grouped into "Custom" and "Default" sections
- **Real-time Preview**: See how pricing will appear to customers

### 2. Service Type Management
- **Immediate UI Updates**: Service configuration fields appear instantly when changing from category to service
- **Smart Property Management**: Automatically adds/removes relevant properties based on service type
- **Visual Feedback**: Clear distinction between categories and services
- **Accordion Interface**: Collapsible categories for better organization and navigation

### 3. Enhanced Custom Pricing Types
- **Rich Information**: Each custom pricing type includes name, unit, and description
- **Validation**: Prevents deletion of pricing types currently in use
- **Quick Edit**: Edit custom pricing types directly from service configuration
- **Visual Indicators**: Clear badges and styling to distinguish custom from default types

## How to Use

### Managing Service Structure with Accordion Interface

1. **Category Navigation**
   - Click the arrow icon next to any category to expand/collapse it
   - Use "Expand All" and "Collapse All" buttons for quick navigation
   - Categories automatically expand when you add new items to them

2. **Visual Indicators**
   - Categories show item counts (e.g., "3 items", "0 items")
   - Collapsed categories hide all child items for cleaner interface
   - Empty categories show helpful messages when expanded

3. **Efficient Workflow**
   - Collapse completed categories to focus on active ones
   - Use the accordion to manage large service structures
   - Parent categories automatically expand when adding children

### Creating Custom Pricing Types

1. **Open Service Configuration**
   - Click "Configure Enhanced Services" on any service field
   - Navigate to the "Pricing Types" tab

2. **Add Custom Pricing Type**
   - Click "Add Custom Type" button
   - Fill in the required information:
     - **Pricing Type Name**: e.g., "Per Square Foot", "Per Word", "Per Design"
     - **Unit Name**: e.g., "sq ft", "words", "designs"
     - **Description**: Optional explanation of the pricing model

3. **Save Configuration**
   - Custom pricing types are automatically saved with the service configuration
   - They become available immediately in the pricing type dropdown

### Using Custom Pricing Types

1. **Select in Service Configuration**
   - When configuring a service, choose your custom pricing type from the dropdown
   - Custom types appear at the top of the list for easy access

2. **Set Pricing Details**
   - Enter the base price per unit
   - Configure quantity constraints (min/max)
   - Set delivery time expectations

3. **Add Pricing Tiers** (Optional)
   - Create tiered pricing for different quantity ranges
   - Each tier can have different prices and delivery times

### Managing Custom Pricing Types

#### Editing
- Click "Edit Type" button next to any custom pricing type in service configuration
- This automatically switches to the Pricing Types tab and highlights the type
- Make changes and save the configuration

#### Deleting
- Custom pricing types can only be deleted if they're not currently used by any services
- The system will show an error message if you try to delete a type in use
- Change all services using that pricing type first, then delete

## Default Pricing Types

The system includes 12 default pricing types with descriptions:

| Type | Unit | Description |
|------|------|-------------|
| Fixed Price | service | One-time payment for the complete service |
| Per Hour | hours | Billed based on time spent working |
| Per Item | items | Billed for each individual item delivered |
| Per Page | pages | Billed for each page of content created |
| Per Month | months | Recurring monthly subscription |
| Per Year | years | Annual subscription or service |
| Per User | users | Billed per user account or license |
| Per Feature | features | Billed for each feature or functionality |
| Per Backlink | backlinks | Billed for each backlink acquired |
| Per Post | posts | Billed for each blog post or content piece |
| Per Campaign | campaigns | Billed for each marketing campaign |
| Per Project | projects | Billed per complete project |

## Best Practices

### Naming Conventions
- Use clear, descriptive names for custom pricing types
- Include the unit in the name for clarity (e.g., "Per Square Foot" not just "Square Foot")
- Keep descriptions concise but informative

### Organization
- Group related services under categories
- Use consistent pricing types across similar services
- Consider creating pricing tiers for volume discounts
- Use the accordion interface to collapse categories when not working on them
- Use "Expand All" and "Collapse All" buttons for quick navigation

### Performance
- Limit custom pricing types to 20 per form for optimal performance
- Delete unused pricing types to keep the interface clean
- Use default types when possible to reduce complexity

## Technical Implementation

### Data Structure
```javascript
// Custom Pricing Type Structure
{
  key: "custom_per_square_foot",
  label: "Per Square Foot",
  unit: "sq ft",
  description: "Billed based on total square footage"
}

// Service with Custom Pricing
{
  name: "Kitchen Remodeling",
  type: "service",
  pricingType: "custom_per_square_foot",
  basePrice: 150.00,
  minQuantity: 50,
  maxQuantity: 1000,
  deliveryTime: 30
}
```

### Frontend Integration
- Custom pricing types are automatically included in form dropdowns
- Progressive service selector supports all pricing types
- Quote calculation engine handles custom pricing logic

## Troubleshooting

### Common Issues

1. **Pricing Type Not Appearing**
   - Ensure the custom pricing type is saved in the service configuration
   - Check that the field configuration is saved to the form

2. **Cannot Delete Pricing Type**
   - The pricing type is currently used by one or more services
   - Change those services to use a different pricing type first

3. **Service Fields Not Showing**
   - Make sure the service type is set to "service" not "category"
   - The UI should update immediately when changing the type

### Performance Optimization
- Keep custom pricing types under 20 per form
- Use descriptive names to avoid confusion
- Regularly clean up unused pricing types

## Future Enhancements

Planned improvements include:
- Bulk import/export of pricing types
- Pricing type templates for common industries
- Advanced pricing rules and conditions
- Integration with external pricing APIs
- Multi-currency support 