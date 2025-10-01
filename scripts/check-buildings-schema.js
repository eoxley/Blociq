const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xqxaatvykmaaynqeoemy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk'
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Buildings table columns:');
    console.log(Object.keys(data[0]));
    console.log('\nSample building:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No buildings found in database');
  }
}

checkSchema();
