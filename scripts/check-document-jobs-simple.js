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
  
  try {
    // Try to query the table directly
    const { data, error } = await supabase
      .from('document_jobs')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ document_jobs table does not exist');
        console.log('📝 Need to create the table');
        return;
      } else {
        console.error('❌ Error querying table:', error);
        return;
      }
    }
    
    console.log('✅ document_jobs table exists');
    console.log('📊 Sample data:', data);
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

checkDocumentJobsTable();
