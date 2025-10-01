const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xqxaatvykmaaynqeoemy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk'
);

async function testQueries() {
  console.log('\n1. Testing basic query without joins:');
  const { data: basic, error: basicError } = await supabase
    .from('onboarding_raw')
    .select('*')
    .limit(5);

  if (basicError) {
    console.error('❌ Basic query failed:', basicError);
  } else {
    console.log('✅ Basic query succeeded:', basic.length, 'rows');
  }

  console.log('\n2. Testing query with profile join:');
  const { data: withProfile, error: profileError } = await supabase
    .from('onboarding_raw')
    .select(`
      *,
      uploader:profiles!onboarding_raw_uploader_id_fkey(full_name)
    `)
    .limit(5);

  if (profileError) {
    console.error('❌ Profile join failed:', {
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
      code: profileError.code
    });
  } else {
    console.log('✅ Profile join succeeded:', withProfile.length, 'rows');
  }

  console.log('\n3. Testing query with batch join:');
  const { data: withBatch, error: batchError } = await supabase
    .from('onboarding_raw')
    .select(`
      *,
      batch:onboarding_batches!onboarding_raw_batch_id_fkey(batch_name, status)
    `)
    .limit(5);

  if (batchError) {
    console.error('❌ Batch join failed:', {
      message: batchError.message,
      details: batchError.details,
      hint: batchError.hint,
      code: batchError.code
    });
  } else {
    console.log('✅ Batch join succeeded:', withBatch.length, 'rows');
  }

  console.log('\n4. Testing full query with both joins:');
  const { data: full, error: fullError } = await supabase
    .from('onboarding_raw')
    .select(`
      *,
      uploader:profiles!onboarding_raw_uploader_id_fkey(full_name),
      batch:onboarding_batches!onboarding_raw_batch_id_fkey(batch_name, status)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (fullError) {
    console.error('❌ Full query failed:', {
      message: fullError.message,
      details: fullError.details,
      hint: fullError.hint,
      code: fullError.code
    });
  } else {
    console.log('✅ Full query succeeded:', full.length, 'rows');
    console.log('Sample data:', JSON.stringify(full[0], null, 2));
  }
}

testQueries();
