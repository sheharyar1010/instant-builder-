# Enhanced Pricing Tiers System

The QuoteMate plugin now supports advanced pricing tiers with dynamic pricing units and custom pricing types. This system allows you to create sophisticated pricing structures for different service types.

## Features

### 1. Dynamic Pricing Units
Support for various pricing units:
- **Fixed Price**: One-time service pricing
- **Per Page**: Website pages, documents
- **Per Hour**: Consulting, development work
- **Per Item**: Products, deliverables
- **Per Month**: Subscription services
- **Per Year**: Annual services
- **Per User**: Multi-user services
- **Per Feature**: Feature-based pricing
- **Per Backlink**: SEO services
- **Per Post**: Content creation
- **Per Campaign**: Marketing campaigns
- **Per Project**: Project-based pricing

### 2. Custom Pricing Types
Admins can create custom pricing types dynamically:
- Add custom labels (e.g., "Per Article", "Per Video")
- Define custom units (e.g., "articles", "videos")
- Use in service configurations

### 3. Pricing Tiers
Create multiple pricing tiers for quantity-based discounts:

#### Example: Web Design Services
```
Tier 1: 1-5 pages
- Price: $200 per page
- Delivery: 7 days

Tier 2: 6-10 pages  
- Price: $180 per page
- Delivery: 10 days

Tier 3: 11+ pages
- Price: $150 per page
- Delivery: 14 days
```

#### Example: Social Media Marketing
```
Tier 1: 1-3 months
- Price: $500 per month
- Delivery: 1 day

Tier 2: 4-6 months
- Price: $450 per month
- Delivery: 1 day

Tier 3: 7+ months
- Price: $400 per month
- Delivery: 1 day
```

## How to Use

### 1. Access Enhanced Service Configuration
1. Go to Forms → Edit Form
2. Find a service selection field
3. Click "Configure Enhanced Services"

### 2. Create Service Structure
1. **Add Categories**: Organize services into categories
2. **Add Services**: Create individual services within categories
3. **Set Pricing Type**: Choose from default or custom pricing types
4. **Configure Base Price**: Set the default price

### 3. Add Pricing Tiers
1. Select a service
2. Click "Add Tier" in the Pricing Tiers section
3. Configure:
   - **Min Quantity**: Minimum quantity for this tier
   - **Max Quantity**: Maximum quantity (leave empty for unlimited)
   - **Price**: Price per unit for this tier
   - **Delivery Time**: Delivery timeframe for this tier

### 4. Create Custom Pricing Types
1. Go to the "Pricing Types" tab
2. Click "Add Custom Type"
3. Enter:
   - **Label**: Display name (e.g., "Per Article")
   - **Unit**: Unit name (e.g., "articles")

## Real-World Examples

### Digital Marketing Agency
```
Category: Social Media Marketing
├── Service: Instagram Management
│   ├── Pricing Type: Per Month
│   ├── Base Price: $500
│   └── Tiers:
│       ├── 1-3 months: $500/month
│       ├── 4-6 months: $450/month
│       └── 7+ months: $400/month
└── Service: Content Creation
    ├── Pricing Type: Per Post
    ├── Base Price: $150
    └── Tiers:
        ├── 1-10 posts: $150/post
        ├── 11-20 posts: $130/post
        └── 21+ posts: $100/post
```

### Web Development Company
```
Category: Website Development
├── Service: Business Website
│   ├── Pricing Type: Per Page
│   ├── Base Price: $200
│   └── Tiers:
│       ├── 1-5 pages: $200/page
│       ├── 6-10 pages: $180/page
│       └── 11+ pages: $150/page
└── Service: E-commerce Store
    ├── Pricing Type: Fixed Price
    ├── Base Price: $3000
    └── Tiers:
        └── 1 project: $3000
```

### SEO Services
```
Category: Search Engine Optimization
├── Service: Backlink Building
│   ├── Pricing Type: Per Backlink
│   ├── Base Price: $50
│   └── Tiers:
│       ├── 1-10 backlinks: $50/link
│       ├── 11-25 backlinks: $45/link
│       └── 26+ backlinks: $40/link
└── Service: Technical SEO Audit
    ├── Pricing Type: Fixed Price
    ├── Base Price: $350
    └── Tiers:
        └── 1 audit: $350
```

## Frontend Behavior

### Automatic Price Calculation
- Frontend automatically calculates prices based on selected quantity
- Applies appropriate tier pricing
- Shows tier-specific delivery times
- Updates pricing in real-time as quantity changes

### Progressive Selection
- Users select service category
- Choose specific service
- Enter quantity (or select from predefined options)
- See calculated price with tier discounts applied

### Form Submission
- Final price includes tier-based calculations
- Delivery time reflects tier-specific timeframe
- All pricing information is captured for quote generation

## Technical Implementation

### Data Structure
```json
{
  "name": "Web Design",
  "type": "service",
  "pricingType": "per_page",
  "basePrice": 200,
  "pricingTiers": [
    {
      "minQuantity": 1,
      "maxQuantity": 5,
      "price": 200,
      "deliveryTime": 7
    },
    {
      "minQuantity": 6,
      "maxQuantity": 10,
      "price": 180,
      "deliveryTime": 10
    },
    {
      "minQuantity": 11,
      "maxQuantity": null,
      "price": 150,
      "deliveryTime": 14
    }
  ]
}
```

### Backend Validation
- All pricing tiers are validated for logical consistency
- Min/max quantities are checked for proper ranges
- Prices are validated as positive numbers
- Delivery times are validated as positive integers

This enhanced system provides maximum flexibility for creating sophisticated pricing structures while maintaining ease of use for both administrators and end users. 