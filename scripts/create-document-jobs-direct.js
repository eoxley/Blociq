require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function createDocumentJobsTable() {
  console.log('🔧 Creating document_jobs table via direct SQL...');
  
  // First, let's try to create the table using a direct SQL query
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.document_jobs (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      filename text NOT NULL,
      status text NOT NULL DEFAULT 'QUEUED',
      size_bytes bigint,
      mime text,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
      linked_building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
      linked_unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
      extracted_text text,
      summary_json jsonb,
      error_message text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );
  `;
  
  try {
    // Try to execute the SQL directly
    const { data, error } = await supabase
      .from('document_jobs')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('📝 Table does not exist, need to create it manually');
      console.log('🔧 Please run this SQL in your Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(createTableSQL);
      console.log('='.repeat(80));
      console.log('\nThen run:');
      console.log('ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;');
      console.log('\nAnd create these policies:');
      console.log(`
CREATE POLICY "Users can view their own jobs" ON public.document_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON public.document_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON public.document_jobs
  FOR UPDATE USING (auth.uid() = user_id);
      `);
      return;
    }
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('✅ document_jobs table exists and is accessible');
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

createDocumentJobsTable();
