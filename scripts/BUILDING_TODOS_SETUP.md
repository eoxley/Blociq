# Building Todos Setup Guide

## 🎯 Problem
The `building_todos` table doesn't exist in the database, causing "Error fetching todos" in the BuildingTodoPanel component.

## ✅ Solution
Create the `building_todos` table using one of the provided SQL scripts.

## 📋 Files Created

### 1. `scripts/create_building_todos.sql` (Recommended)
Complete SQL script that creates the `building_todos` table with:
- ✅ All required columns (id, building_id, title, description, status, etc.)
- ✅ Proper data types and constraints
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) with simplified policies
- ✅ Automatic updated_at trigger
- ✅ Sample data for testing

### 2. `scripts/create_building_todos_no_rls.sql` (Alternative)
Same table structure but without Row Level Security for simpler setup.

### 3. `scripts/create_building_todos_simple.js`
Node.js script that:
- ✅ Checks if the table exists
- ✅ Attempts to create sample todos
- ✅ Provides clear error messages and next steps

## 🔧 How to Create the Table

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to SQL Editor
4. Copy and paste the contents of `scripts/create_building_todos.sql` (or `create_building_todos_no_rls.sql` if you prefer no RLS)
5. Execute the SQL script

### Option 2: Command Line (if you have Supabase CLI)
```bash
supabase db push
```

## 📊 Table Schema

```sql
CREATE TABLE building_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_complete BOOLEAN DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assigned_to TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Security Features

### With RLS (create_building_todos.sql):
- Row Level Security enabled with simplified policies
- All authenticated users can access todos (filtering done in application)
- Proper policies for SELECT, INSERT, UPDATE, DELETE operations

### Without RLS (create_building_todos_no_rls.sql):
- No Row Level Security (simpler setup)
- Access control handled entirely in the application layer

## 📝 Sample Data Included
The SQL script includes 5 sample todos:
1. Heating System Maintenance (pending, High priority)
2. Fire Safety Check (in_progress, Medium priority)
3. Electrical Inspection (completed, Low priority)
4. Gas Safety Certificate (pending, High priority)
5. Energy Performance Assessment (in_progress, Medium priority)

## 🧪 Testing

### 1. Run the verification script:
```bash
node scripts/create_building_todos_simple.js
```

### 2. Test the web interface:
- Go to http://localhost:3000/buildings
- Navigate to any building page
- Check if the todos are displayed correctly

### 3. Test the API endpoints:
- `/api/tasks?building_id=[BUILDING_ID]`
- BuildingTodoPanel component should work without errors

## 🔗 Related Components
- `components/BuildingTodoPanel.tsx` - Main todos component
- `app/api/tasks/route.ts` - API endpoint for todos
- `app/(dashboard)/buildings/page.tsx` - Buildings page

## ✅ Expected Results
After creating the table:
- ✅ "Error fetching todos" should be resolved
- ✅ BuildingTodoPanel should display todos correctly
- ✅ Users can create, edit, and delete todos
- ✅ Todos are filtered by building
- ✅ Status and priority filtering works

## 🚨 Troubleshooting

### If you get "relation does not exist" error:
1. Make sure you executed the SQL script in Supabase dashboard
2. Check that the table was created successfully
3. Verify the table name is exactly `building_todos`

### If you get "relation 'profiles' does not exist" error:
- Use `scripts/create_building_todos_no_rls.sql` instead
- This version doesn't reference the profiles table

### If RLS policies don't work:
1. Use the no-RLS version if you don't need database-level security
2. Check that the user is authenticated
3. Verify the RLS policies in Supabase dashboard

### If sample data doesn't appear:
1. Check that buildings exist in the database
2. Verify the building_id foreign key relationship
3. Check the console for any error messages

## 📞 Next Steps
1. Choose the appropriate SQL script (with or without RLS)
2. Execute the SQL script in Supabase dashboard
3. Run the verification script
4. Test the web interface
5. Report any remaining issues

## 🔗 Useful Links
- Supabase Dashboard: https://supabase.com/dashboard
- SQL Editor: https://supabase.com/dashboard/project/[PROJECT_ID]/editor
- Table Editor: https://supabase.com/dashboard/project/[PROJECT_ID]/editor 