# BlocIQ Client Onboarding Templates

This directory contains CSV templates for onboarding new BlocIQ clients. Each CSV file corresponds to a table in the Supabase database and can be used to bulk import initial client data.

## Files Included

### Core Property Management
- **buildings.csv** - Main building information and details
- **units.csv** - Individual units within buildings
- **leaseholders.csv** - Leaseholder contact information
- **leases.csv** - Lease agreements and terms
- **occupiers.csv** - Current and former occupiers/tenants

### Compliance Management
- **building_compliance_assets.csv** - Building-specific compliance requirements and status

### Document Management
- **building_documents.csv** - Building-related documents and files

## Important Instructions

### Data Entry Guidelines

1. **ID Fields**: Leave blank for auto-generation by Supabase (UUID fields)
2. **Date Format**: Use DD/MM/YYYY format for all dates
3. **Boolean Fields**: Use TRUE/FALSE (case sensitive)
4. **Relationship Fields**: Use matching IDs from related sheets after import

### Import Order

Due to foreign key relationships, import in this specific order:

1. **buildings.csv** (first - no dependencies)
2. **units.csv** (requires building_id from step 1)
3. **leaseholders.csv** (requires unit_id from step 2)
4. **leases.csv** (requires building_id and unit_id)
5. **occupiers.csv** (requires unit_id)
6. **building_compliance_assets.csv** (requires building_id and asset_id from compliance_assets table)
7. **building_documents.csv** (requires building_id, optional unit_id/leaseholder_id)

### Before Import

1. Ensure compliance_assets table is populated with standard compliance categories
2. Update relationship IDs after each import step
3. Verify date formats match your system locale
4. Check that building_id, unit_id, etc. match the UUIDs generated during import

### Field Notes

#### Buildings Table
- `unit_count`: Total number of units in the building
- `is_hrb`: Boolean for High Rise Building status
- `demo_ready`: Set to FALSE for live clients

#### Units Table
- `leaseholder_id`: Link to leaseholders table (populate after leaseholder import)
- `floor`: Text field (e.g., "Ground Floor", "First Floor", "Penthouse")

#### Leaseholders Table
- `unit_id`: Link to units table (populate after unit import)
- Each leaseholder should correspond to a unit

#### Leases Table
- `is_headlease`: TRUE for building head leases, FALSE for individual unit leases
- `start_date/expiry_date`: Use realistic lease terms (usually 99-999 years for leasehold)

#### Building_Compliance_Assets Table
- `asset_id`: Must reference existing compliance_assets table entries
- `status`: Use "pending", "active", "overdue", "completed", or "expired"
- `next_due_date`: Calculate based on compliance frequency requirements

### Example Workflow

1. Import buildings.csv and note the generated building IDs
2. Update units.csv with the correct building_id values
3. Import units.csv and note the generated unit IDs
4. Update leaseholders.csv with the correct unit_id values
5. Continue this pattern for remaining files

### Support

For questions about the template structure or import process, refer to the complete Supabase schema documentation or contact the development team.