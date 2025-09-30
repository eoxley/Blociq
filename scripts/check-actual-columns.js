const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xqxaatvykmaaynqeoemy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk'
);

async function checkColumns() {
  console.log('Checking actual database columns...');
  
  const tables = ['buildings', 'units', 'leaseholders', 'leases', 'unit_apportionments'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error checking ' + table + ':', error.message);
      continue;
    }
    
    console.log('\n' + table + ' table columns:');
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      columns.forEach(col => console.log('  - ' + col));
    } else {
      console.log('  (Table is empty)');
    }
  }
}

checkColumns().catch(console.error);
