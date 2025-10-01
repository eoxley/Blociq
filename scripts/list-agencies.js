const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listAgencies() {
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, name, created_at');

  if (error) {
    console.error('Error fetching agencies:', error);
    return;
  }

  console.log(`\nFound ${agencies.length} agencies:\n`);
  agencies.forEach(agency => {
    console.log(`  - ${agency.name} (ID: ${agency.id})`);
  });
}

listAgencies();
