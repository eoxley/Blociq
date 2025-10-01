const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xqxaatvykmaaynqeoemy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk'
);

async function checkSchemas() {
  const tables = ['leaseholders', 'leases', 'unit_apportionments', 'budgets', 'ar_demand_headers'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);

    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`✅ ${table}: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`⚠️  ${table}: exists but no data`);
    }
  }
}

checkSchemas();
