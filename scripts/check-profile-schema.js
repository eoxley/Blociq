const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSchema() {
  // Try to select with different column combinations
  const { data: profile1, error: error1 } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'eleanor.oxley@blociq.co.uk')
    .single();

  console.log('Profile with all columns:', profile1);
  console.log('Error:', error1);
}

checkSchema();