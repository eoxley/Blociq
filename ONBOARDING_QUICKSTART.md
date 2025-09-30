# 🚀 BlocIQ Onboarding Quick Start

## ✅ Prerequisites Complete

Your BlocIQ instance is ready for live data:
- ✅ User profile: eleanor.oxley@blociq.co.uk (Ellie Oxley)
- ✅ Agency: BlocIQ
- ✅ Database: Clean slate (Ashwood House removed)
- ✅ All systems operational

## 📊 Excel Template Created

**Location**: `/BlocIQ_Onboarding_Template.xlsx`

This comprehensive template includes:

### Required Sheets:
1. **Buildings** - Your property portfolio
2. **Units** - Individual flats/properties
3. **Leaseholders** - Property owners
4. **Leases** - Lease agreements
5. **Apportionments** - Service charge splits

### Optional Sheets:
6. **Compliance** - Current compliance status (can add later)

## 📝 How to Use

### Step 1: Open the Template
```bash
open BlocIQ_Onboarding_Template.xlsx
```

### Step 2: Read Instructions
- First sheet: "READ ME FIRST" - Complete instructions
- Example data provided in all sheets
- Field descriptions and validation rules included

### Step 3: Fill in Your Data
- Start with **Buildings** sheet
- Then **Units** (linked to buildings)
- Then **Leaseholders** (linked to units)
- Then **Leases** (linked to units)
- Then **Apportionments** (service charge splits)
- Optional: **Compliance** status

**Important**:
- Fields marked with * are required
- Delete example rows before import
- Keep building and unit names consistent across sheets
- Use dates in format: YYYY-MM-DD
- Use Yes/No for boolean fields

### Step 4: Import Your Data
```bash
# Set environment variables (if not already set)
export NEXT_PUBLIC_SUPABASE_URL=https://xqxaatvykmaaynqeoemy.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the import
node scripts/import-onboarding-data.js BlocIQ_Onboarding_Template.xlsx
```

### Step 5: Verify Import
The script will show:
- ✅ Success messages for each record
- ❌ Error messages if anything fails
- 📊 Final summary with counts

## 🔧 Import Script Features

**What it does**:
- Validates all data before import
- Creates proper relationships between tables
- Handles Yes/No, dates, and numbers automatically
- Shows detailed progress and errors
- Provides complete import summary

**Safety**:
- All data scoped to your agency
- Foreign key constraints enforced
- Duplicate prevention
- Validation before insert

## 📚 Field Reference

### Building Types
- `residential` - Residential building
- `commercial` - Commercial property
- `mixed_use` - Mixed residential/commercial

### Unit Types
- `flat` - Apartment/flat
- `maisonette` - Maisonette
- `house` - House
- `commercial` - Commercial unit
- `parking` - Parking space
- `storage` - Storage unit

### Apportionment Types
- `service_charge` - Service charge split
- `reserve_fund` - Reserve fund contribution
- `ground_rent` - Ground rent share
- `insurance` - Insurance premium split

### Compliance Status
- `compliant` - Up to date
- `due_soon` - Due within 30 days
- `overdue` - Past due date
- `pending` - Not yet completed
- `non_compliant` - Failed inspection

### Contact Preferences
- `email` - Email preferred
- `phone` - Phone preferred
- `post` - Post/mail preferred

## 💡 Tips for Success

1. **Start Small**: Import one building first to test
2. **Check Percentages**: Service charge % should total 100% per building
3. **Verify Emails**: Used for leaseholder portal access
4. **Keep Names Consistent**: Building/unit names must match exactly
5. **Use Examples**: Provided data shows correct formatting

## 📞 Need Help?

**Documentation**:
- Full schema: `/docs/systems/ONBOARDING_SCHEMA.md`
- SQL migration: `/supabase/migrations/0006_onboarding_schema.sql`

**Support**:
- Email: support@blociq.co.uk
- Check script output for detailed error messages

## ✨ After Import

Once imported, you can:
- View all data in the BlocIQ dashboard
- Add compliance certificates and documents
- Track maintenance and communications
- Generate reports and statements
- Enable leaseholder portal access

Your data is fully integrated and ready to use! 🎉