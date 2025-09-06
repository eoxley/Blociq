// Simple script to apply database fixes
// Run this with: node apply-database-fix.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDatabaseFix() {
  try {
    console.log('🔧 Applying database fix for joined_at column...');
    
    // Add joined_at column if it doesn't exist
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          -- Check if joined_at column exists
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'agency_members' 
            AND column_name = 'joined_at'
            AND table_schema = 'public'
          ) THEN
            -- Add the column with default value
            ALTER TABLE public.agency_members 
            ADD COLUMN joined_at timestamptz NOT NULL DEFAULT now();
            
            -- Update existing rows to have joined_at = created_at if created_at exists
            IF EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'agency_members' 
              AND column_name = 'created_at'
              AND table_schema = 'public'
            ) THEN
              UPDATE public.agency_members 
              SET joined_at = created_at 
              WHERE joined_at IS NULL;
            END IF;
            
            RAISE NOTICE 'Added joined_at column to agency_members table';
          ELSE
            RAISE NOTICE 'joined_at column already exists in agency_members table';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('❌ Error applying database fix:', error);
    } else {
      console.log('✅ Database fix applied successfully');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyDatabaseFix();
