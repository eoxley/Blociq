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
  console.log('🔧 Creating document_jobs table manually...');
  
  // SQL to create the table
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
    // Try to create the table using a direct SQL query
    const { data, error } = await supabase.rpc('exec', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Error creating table:', error);
      console.log('📝 Please run this SQL manually in your Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(createTableSQL);
      console.log('='.repeat(80));
      return;
    }
    
    console.log('✅ document_jobs table created');
    
    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec', { 
      sql: 'ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;' 
    });
    
    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled');
    }
    
    // Create RLS policies
    const policiesSQL = `
      CREATE POLICY "Users can view their own jobs" ON public.document_jobs
        FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can insert their own jobs" ON public.document_jobs
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY "Users can update their own jobs" ON public.document_jobs
        FOR UPDATE USING (auth.uid() = user_id);
    `;
    
    const { error: policiesError } = await supabase.rpc('exec', { sql: policiesSQL });
    
    if (policiesError) {
      console.error('❌ Error creating policies:', policiesError);
    } else {
      console.log('✅ RLS policies created');
    }
    
    // Create indexes
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_document_jobs_user_id ON public.document_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_agency_id ON public.document_jobs(agency_id);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_status ON public.document_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_document_jobs_created_at ON public.document_jobs(created_at);
    `;
    
    const { error: indexesError } = await supabase.rpc('exec', { sql: indexesSQL });
    
    if (indexesError) {
      console.error('❌ Error creating indexes:', indexesError);
    } else {
      console.log('✅ Indexes created');
    }
    
    console.log('🎉 document_jobs table setup complete!');
    
  } catch (err) {
    console.error('❌ Exception:', err);
    console.log('📝 Please run this SQL manually in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(80));
    console.log(createTableSQL);
    console.log('ALTER TABLE public.document_jobs ENABLE ROW LEVEL SECURITY;');
    console.log(policiesSQL);
    console.log(indexesSQL);
    console.log('='.repeat(80));
  }
}

createDocumentJobsTable();
