require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDocumentJobsTable() {
  console.log('🔍 Checking document_jobs table...');
  
  // Check if table exists
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'document_jobs');
  
  if (tablesError) {
    console.error('❌ Error checking tables:', tablesError);
    return;
  }
  
  if (!tables || tables.length === 0) {
    console.log('❌ document_jobs table does not exist');
    return;
  }
  
  console.log('✅ document_jobs table exists');
  
  // Check table structure
  const { data: columns, error: columnsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'document_jobs')
    .order('ordinal_position');
  
  if (columnsError) {
    console.error('❌ Error checking columns:', columnsError);
    return;
  }
  
  console.log('📋 Table structure:');
  columns.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
  });
  
  // Check RLS status
  const { data: rlsStatus, error: rlsError } = await supabase
    .from('pg_tables')
    .select('rowsecurity')
    .eq('tablename', 'document_jobs')
    .eq('schemaname', 'public');
  
  if (rlsError) {
    console.error('❌ Error checking RLS:', rlsError);
  } else {
    console.log('🔒 RLS enabled:', rlsStatus[0]?.rowsecurity || 'unknown');
  }
}

checkDocumentJobsTable();
