# Compliance System Setup Guide

## Overview
This guide explains how to set up the complete compliance asset management system to fix the 400 errors you're experiencing.

## What Was Created

### 1. Database Schema (`database/compliance-schema.sql`)
- **compliance_assets**: Main table for tracking compliance items
- **compliance_inspections**: Historical inspection records
- **building_compliance_config**: Building-specific settings
- **compliance_templates**: Predefined asset types
- **compliance_notifications**: Automated reminders

### 2. API Endpoints
- **`/api/compliance/overview`**: Dashboard data for all buildings
- **`/api/buildings/[id]/compliance`**: Building-specific compliance data
- **`/api/compliance/templates`**: Asset type templates
- **`/api/compliance/assets`**: CRUD operations for compliance assets

### 3. Supabase Migration (`supabase/migrations/20250123_compliance_schema.sql`)
- Complete database setup with RLS policies
- Automatic status updates based on due dates
- User access control functions

## Setup Steps

### Step 1: Run the Database Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250123_compliance_schema.sql`
4. Click "Run" to execute the schema

### Step 2: Verify the Tables
Run this query to confirm the tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'compliance%';
```

### Step 3: Check Default Templates
Verify the templates were inserted:
```sql
SELECT * FROM compliance_templates ORDER BY category, asset_name;
```

## How This Fixes Your 400 Errors

### Before (What Was Happening)
- Your compliance page was trying to fetch data from non-existent endpoints
- The database didn't have the required compliance tables
- API calls were failing with 400/404 errors

### After (What This Provides)
- **Real API endpoints** that match your frontend calls
- **Actual database tables** with proper relationships
- **RLS policies** for secure data access
- **Default data** to get started immediately

## Testing the System

### 1. Test the Overview API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-project.supabase.co/rest/v1/rpc/get_user_compliance_overview
```

### 2. Test Building Compliance
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-project.supabase.co/rest/v1/compliance_assets?building_id=YOUR_BUILDING_ID
```

### 3. Test Templates
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-project.supabase.co/rest/v1/compliance_templates
```

## Adding Compliance Assets

### Method 1: Via API
```bash
curl -X POST /api/compliance/assets \
  -H "Content-Type: application/json" \
  -d '{
    "building_id": "your-building-id",
    "asset_type": "fire_alarm_system",
    "asset_name": "Fire Alarm System",
    "category": "fire_safety",
    "description": "Main building fire alarm system",
    "inspection_frequency": "annual",
    "next_due_date": "2025-12-31"
  }'
```

### Method 2: Via Supabase Dashboard
1. Go to Table Editor
2. Select `compliance_assets`
3. Click "Insert Row"
4. Fill in the required fields

## Next Steps

### 1. Update Your Frontend
Your compliance page should now work with these endpoints:
- Replace any hardcoded data with calls to `/api/compliance/overview`
- Use `/api/buildings/[id]/compliance` for building-specific views
- Implement asset management using `/api/compliance/assets`

### 2. Add Sample Data
Create a few sample compliance assets to test the system:
```sql
INSERT INTO compliance_assets (
  building_id, 
  user_id, 
  asset_type, 
  asset_name, 
  category, 
  description,
  next_due_date
) VALUES (
  'your-building-id',
  'your-user-id',
  'fire_alarm_system',
  'Fire Alarm System',
  'fire_safety',
  'Main building fire alarm system',
  '2025-12-31'
);
```

### 3. Test the Full Flow
1. Navigate to your compliance page
2. Verify no more 400 errors
3. Check that data loads properly
4. Test adding/editing compliance assets

## Troubleshooting

### Common Issues

#### 1. "Function get_user_compliance_overview does not exist"
- Make sure you ran the complete migration file
- Check that the function was created in Supabase

#### 2. "Table compliance_assets does not exist"
- Verify the migration ran successfully
- Check the table list in Supabase dashboard

#### 3. "Permission denied" errors
- Ensure RLS policies are enabled
- Check that your user has access to the buildings

#### 4. Still getting 400 errors
- Verify your frontend is calling the correct API endpoints
- Check the browser network tab for the exact error
- Ensure your Supabase client is properly configured

### Debug Commands
```sql
-- Check if tables exist
\dt compliance_*

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'compliance%';

-- Test the overview function
SELECT * FROM get_user_compliance_overview('your-user-id');
```

## Support
If you continue to experience issues:
1. Check the Supabase logs for detailed error messages
2. Verify your API endpoints are accessible
3. Test with a simple curl command first
4. Ensure your authentication is working properly

The compliance system is now fully set up and should eliminate your 400 errors!
