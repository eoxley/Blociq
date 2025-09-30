# BlocIQ Data Import Guide - Direct CSV Upload to Supabase

This guide shows you how to upload your data directly to Supabase without needing to run any scripts or migrations.

## Step 1: Download and Fill the Template

1. Download the template: **BlocIQ_Onboarding_Template_Simple.xlsx** (located in `/public` folder)
2. Open it in Excel or Google Sheets
3. Fill in your data in each sheet:
   - **Buildings** - Your building information (includes structure type and client details)
   - **Units** - Unit numbers and details
   - **Leaseholders** - Resident information
   - **Leases** - Lease documents (optional)

4. **IMPORTANT**: Delete all example rows! Only keep the header row with column names.

## Step 2: Save Each Sheet as CSV

For each sheet you filled in:

1. Select the sheet tab (e.g., "Buildings")
2. File > Save As > Choose "CSV (Comma delimited)" format
3. Save with names like:
   - `buildings.csv`
   - `units.csv`
   - `leaseholders.csv`
   - `leases.csv`

## Step 3: Upload to Supabase (IN ORDER!)

**IMPORTANT**: Upload in this order because of database relationships:

### 3.1 Upload Buildings First

1. Go to: https://supabase.com/dashboard/project/xqxaatvykmaaynqeoemy/editor
2. Click on the **buildings** table
3. Click **Insert** > **Insert rows via spreadsheet**
4. Upload `buildings.csv`
5. Wait for success message

### 3.2 Upload Units

1. Click on the **units** table
2. Click **Insert** > **Insert rows via spreadsheet**
3. Upload `units.csv`
4. Wait for success message

**NOTE**: The system will automatically link units to buildings by matching the building_name you provided.

### 3.3 Upload Leaseholders

1. Click on the **leaseholders** table
2. Click **Insert** > **Insert rows via spreadsheet**
3. Upload `leaseholders.csv`
4. Wait for success message

**NOTE**: The system will automatically link leaseholders to units by matching building_name and unit_number.

### 3.4 Upload Leases (Optional)

1. Click on the **leases** table
2. Click **Insert** > **Insert rows via spreadsheet**
3. Upload `leases.csv`
4. Wait for success message

## Step 4: Verify Your Data

1. Go to https://www.blociq.co.uk/buildings
2. Log in with your account
3. Check that all your buildings appear
4. Click into a building to verify units and leaseholders

## Column Reference

### Buildings Table Columns

The template uses exact database column names:

- `name` - Building name (required)
- `address` - Full address
- `unit_count` - Number of units
- `access_notes` - Access instructions
- `sites_staff` - On-site staff details
- `parking_info` - Parking information
- `council_borough` - Local council
- `building_manager_name` - Manager name
- `building_manager_email` - Manager email
- `building_manager_phone` - Manager phone
- `emergency_contact_name` - Emergency contact
- `emergency_contact_phone` - Emergency phone
- `structure_type` - Must be: Freehold, RMC, Tripartite, RTM, or Leasehold
- `client_type` - Must be: Freeholder Company, Board of Directors, or Management Company
- `client_name` - Client/company name
- `client_contact` - Contact person
- `client_email` - Contact email
- `operational_notes` - Operational notes and procedures
- `building_age` - Year built or age
- `construction_type` - Building construction
- `total_floors` - Number of floors
- `lift_available` - Yes/No
- `heating_type` - Type of heating
- `hot_water_type` - Hot water system
- `waste_collection_day` - Collection day
- `recycling_info` - Recycling details
- `building_insurance_provider` - Insurance company
- `building_insurance_expiry` - Expiry date (YYYY-MM-DD)
- `fire_safety_status` - Fire safety status
- `asbestos_status` - Asbestos status
- `energy_rating` - Energy rating (A-G)
- `service_charge_frequency` - Billing frequency
- `ground_rent_amount` - Amount in pounds
- `ground_rent_frequency` - Frequency
- `notes` - General notes
- `key_access_notes` - Key access details
- `entry_code` - Entry code
- `fire_panel_location` - Fire panel location

### Units Table Columns

- `building_name` - Must match from Buildings sheet (required)
- `unit_number` - Unit number/name (required)
- `type` - Unit type (e.g., Residential, Commercial)
- `floor` - Floor number or name

### Leaseholders Table Columns

- `building_name` - Must match from Buildings sheet (required)
- `unit_number` - Must match from Units sheet (required)
- `name` - Leaseholder name
- `email` - Email address
- `phone` - Phone number

### Leases Table Columns

- `building_name` - Must match from Buildings sheet (required)
- `unit_number` - Must match from Units sheet (required)
- `doc_type` - Document type
- `doc_url` - URL to document
- `start_date` - Lease start (YYYY-MM-DD)
- `expiry_date` - Lease expiry (YYYY-MM-DD)
- `is_headlease` - true or false

## Tips

- **Empty fields**: Just leave them blank in your CSV
- **Dates**: Use format YYYY-MM-DD (e.g., 2024-03-15)
- **Numbers**: No currency symbols, just the number (e.g., 350 not £350)
- **Boolean fields**: Use lowercase true or false
- **Matching names**: Make sure building_name and unit_number match EXACTLY between sheets

## Troubleshooting

### "Column not found" error
- Make sure you're using the exact column names from the template
- Check you didn't accidentally change the header row

### "Foreign key violation" error
- You uploaded sheets in the wrong order
- Make sure building_name matches exactly between sheets
- Buildings must be uploaded before units
- Units must be uploaded before leaseholders

### "Duplicate key" error
- You're trying to upload the same data twice
- Check if the data already exists in the table

## Need Help?

Contact support or check the existing data in Supabase to see what's already there before uploading.