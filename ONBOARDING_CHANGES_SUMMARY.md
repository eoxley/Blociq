# Onboarding Template Changes - Summary

## Problem Fixed
The onboarding Excel template included a **Building Setup** tab, but the Supabase schema did not have a `building_setup` table. This caused confusion and errors when trying to seed data.

## Solution Implemented

### 1. Database Migration Created
**File:** `supabase/migrations/20250930000001_merge_building_setup_into_buildings.sql`

Added the following columns to the `buildings` table:
- `structure_type` - Building ownership structure (Freehold, RMC, Tripartite, RTM, Leasehold)
- `client_type` - Type of client managing the building
- `client_name` - Client or management company name
- `client_contact` - Primary contact person
- `client_email` - Client contact email
- `operational_notes` - Operational notes and procedures

### 2. Excel Template Updated
**File:** `scripts/create-simple-onboarding-template.js`

Changes:
- ✅ Removed the separate "Building Setup" sheet
- ✅ Merged all building setup fields into the "Buildings" sheet
- ✅ Added validation notes for constrained fields (structure_type, client_type)
- ✅ Template now has only 4 sheets: Buildings, Units, Leaseholders, Leases

### 3. Import Script Updated
**File:** `scripts/import-onboarding-data.js`

Changes:
- ✅ Updated Buildings import to handle new merged columns
- ✅ Simplified Units import (removed unnecessary fields)
- ✅ Simplified Leaseholders import (removed unnecessary fields)
- ✅ Simplified Leases import to match actual schema
- ✅ Removed Apportionments import (not in simplified template)
- ✅ Removed Compliance import (not in simplified template)
- ✅ Updated statistics to show only: Buildings, Units, Leaseholders, Leases

### 4. Documentation Updated
**File:** `CSV_UPLOAD_GUIDE.md`

Changes:
- ✅ Removed references to Building Setup sheet
- ✅ Updated column documentation to include new building fields
- ✅ Simplified upload order: Buildings → Units → Leaseholders → Leases
- ✅ Updated step numbering (3.1, 3.2, 3.3, 3.4 instead of 3.1-3.5)

## What You Need to Do

### 1. Run the Migration
The migration file has been created but needs to be applied to your Supabase database:

**Option A: Via Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/xqxaatvykmaaynqeoemy/editor
2. Click on "SQL Editor"
3. Create a new query
4. Copy the contents of `supabase/migrations/20250930000001_merge_building_setup_into_buildings.sql`
5. Run the query

**Option B: Via Supabase CLI** (if you have it installed)
```bash
supabase db push
```

### 2. Use the New Template
The updated template is at: `/public/BlocIQ_Onboarding_Template_Simple.xlsx`

**New structure:**
- **Buildings** sheet now includes structure_type, client_type, client_name, client_contact, client_email, operational_notes
- **Units** sheet - simplified to: building_name, unit_number, type, floor
- **Leaseholders** sheet - simplified to: building_name, unit_number, name, email, phone
- **Leases** sheet - simplified to: building_name, unit_number, doc_type, doc_url, start_date, expiry_date, is_headlease

### 3. Import Data
You can now import data in two ways:

**Method A: Using the import script**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xqxaatvykmaaynqeoemy.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_key \
node scripts/import-onboarding-data.js YOUR_FILE.xlsx
```

**Method B: Direct CSV upload to Supabase**
1. Fill the template
2. Save each sheet as CSV
3. Upload to Supabase Table Editor in order:
   - Buildings first
   - Then Units
   - Then Leaseholders
   - Then Leases

## Validation

### Building Structure Type
Must be one of:
- Freehold
- RMC
- Tripartite
- RTM
- Leasehold

### Client Type
Must be one of:
- Freeholder Company
- Board of Directors
- Management Company

### Is Headlease
Must be: `true` or `false`

## Files Changed
1. ✅ `supabase/migrations/20250930000001_merge_building_setup_into_buildings.sql` - NEW migration
2. ✅ `scripts/create-simple-onboarding-template.js` - Template generator updated
3. ✅ `scripts/import-onboarding-data.js` - Import script simplified
4. ✅ `public/BlocIQ_Onboarding_Template_Simple.xlsx` - Regenerated template
5. ✅ `CSV_UPLOAD_GUIDE.md` - Documentation updated

## Testing Checklist
- [ ] Run the migration on Supabase
- [ ] Download the new template
- [ ] Fill in sample data
- [ ] Test import using script OR direct CSV upload
- [ ] Verify data appears correctly in dashboard
- [ ] Confirm no errors about missing columns

## Benefits
✅ No confusion about separate building_setup table
✅ All building data in one place
✅ Simpler template with fewer sheets
✅ Matches actual database schema
✅ Easier CSV upload process
✅ Clearer documentation