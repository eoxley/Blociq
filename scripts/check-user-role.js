const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xqxaatvykmaaynqeoemy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk'
);

async function checkRole() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('email', 'eleanor.oxley@blociq.co.uk')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('User profile:', data);
  console.log('Current role:', data.role);
  console.log('Is super_admin?', data.role === 'super_admin');

  if (data.role !== 'super_admin') {
    console.log('\n❌ User is NOT super_admin, updating to super_admin...');

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('email', 'eleanor.oxley@blociq.co.uk')
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('✅ Role updated to super_admin:', updated);
    }
  } else {
    console.log('\n✅ User is already super_admin');
  }
}

checkRole();
