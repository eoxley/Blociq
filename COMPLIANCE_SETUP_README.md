# Compliance Setup Page

## Overview

The Compliance Setup page allows building managers to configure which compliance requirements apply to their specific building. This creates a tailored compliance tracking system that helps ensure all necessary legal, safety, and operational requirements are met.

## Features

### 🎯 Core Functionality
- **Asset Selection**: Check/uncheck compliance assets that apply to the building
- **Category Grouping**: Assets are organized into 8 logical categories
- **Real-time Updates**: Changes are saved immediately to the database
- **Navigation**: Seamless flow to the main compliance tracking page

### 📂 Category Organization
1. **Legal & Safety** - Fire, electrical and health legislation
2. **Structural & Condition** - Building structure and condition assessments
3. **Operational & Contracts** - Service contracts and operational requirements
4. **Insurance** - Building and liability insurance requirements
5. **Lease & Documentation** - Lease compliance and documentation requirements
6. **Admin** - Administrative and reporting requirements
7. **Smart Records** - Digital record keeping and smart building systems
8. **Safety** - BSA-specific safety requirements

### 🧠 AI Auto-fill Features
Assets marked with 🧠 AI Auto-fill will be automatically populated when relevant documents are uploaded to the system. These include:
- Fire-related documents (FRA, fire safety plans)
- Gas safety certificates
- Asbestos surveys
- Lift inspection reports
- EICR certificates
- D&O insurance documents
- Insurance certificates

### 💅 Design Features
- **BlocIQ Branding**: Uses the official color scheme (#2BBEB4, #0F5D5D)
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Elements**: Hover effects, smooth transitions, and visual feedback
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Database Schema

### Tables Used
- `compliance_assets` - Master list of all possible compliance requirements
- `building_compliance_assets` - Building-specific compliance selections

### Key Fields
- `building_id` - Links to the specific building
- `asset_id` - References the compliance asset
- `status` - Set to 'active' when asset is selected
- `next_due_date` - When the compliance item is next due
- `notes` - Additional notes for the building-specific requirement

## Setup Instructions

### 1. Seed Compliance Assets
First, populate the database with the master list of compliance assets:

```bash
# Run the TypeScript seed script
npx ts-node scripts/seed-compliance-assets.ts

# Or run the SQL script directly
psql -d your_database -f scripts/seed-compliance-assets.sql
```

### 2. Access the Setup Page
Navigate to: `/buildings/[buildingId]/compliance/setup`

### 3. Configure Building Compliance
1. Review each category of compliance requirements
2. Check the boxes for assets that apply to your building
3. Use the tooltips for additional information about each category
4. Click "Save & Continue" to save your selections

### 4. Monitor Compliance
After setup, navigate to `/buildings/[buildingId]/compliance` to:
- Track compliance status
- Set due dates
- Upload supporting documents
- Monitor upcoming requirements

## Technical Implementation

### File Structure
```
app/buildings/[buildingId]/compliance/setup/
├── page.tsx                    # Server component - data fetching
└── ComplianceSetupClient.tsx   # Client component - UI and interactions
```

### Key Components
- **Server Component**: Handles authentication, data fetching, and building validation
- **Client Component**: Manages state, user interactions, and database updates
- **UI Components**: Uses shadcn/ui components for consistent styling

### State Management
- `selectedAssets`: Set of currently selected asset IDs
- `isSaving`: Loading state during save operations
- `saveStatus`: Success/error feedback for user

### Database Operations
- **Upsert**: Adds new building compliance assets
- **Delete**: Removes deselected assets
- **Validation**: Ensures data integrity and proper relationships

## Customization

### Adding New Categories
1. Update the `categoryConfigs` object in `ComplianceSetupClient.tsx`
2. Add new assets to the seed script
3. Update the category grouping logic if needed

### Modifying Asset Properties
- Edit the seed script to change asset names, descriptions, or categories
- Update the frequency calculation logic in the server component
- Modify the AI auto-fill detection rules

### Styling Changes
- Update the BlocIQ brand colors in the component
- Modify the category color schemes
- Adjust responsive breakpoints for different screen sizes

## Troubleshooting

### Common Issues
1. **Assets not loading**: Check database connection and seed script execution
2. **Save failures**: Verify user permissions and database constraints
3. **Navigation errors**: Ensure building ID is valid and user has access

### Debug Mode
Enable console logging by setting `NODE_ENV=development` to see detailed error messages and database operations.

## Future Enhancements

### Planned Features
- **Bulk Selection**: Select/deselect entire categories at once
- **Template System**: Pre-configured compliance templates for different building types
- **Import/Export**: CSV import/export of compliance configurations
- **Audit Trail**: Track changes to compliance setup over time
- **Integration**: Connect with external compliance databases and APIs

### Performance Optimizations
- **Virtual Scrolling**: For buildings with many compliance requirements
- **Caching**: Cache compliance assets to reduce database queries
- **Lazy Loading**: Load categories on demand for better performance 