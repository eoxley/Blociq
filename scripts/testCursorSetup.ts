// File: scripts/testCursorSetup.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testCursorSetup() {
  try {
    console.log('🧪 Running Supabase + Cursor environment test...\n');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Environment variables are missing.');
      return;
    }
    console.log('✅ Environment variables loaded.');

    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name, demo_ready')
      .limit(3);

    if (error) {
      console.error('❌ Supabase query failed:', error.message);
      return;
    }

    if (!buildings || buildings.length === 0) {
      console.warn('⚠️ Supabase connected, but no buildings returned.');
    } else {
      console.log('✅ Supabase returned building data:');
      buildings.forEach(b =>
        console.log(` - ${b.name} (${b.demo_ready ? 'Ready' : 'Coming Soon'})`)
      );
    }

    console.log('\n✅ Cursor + Supabase test complete.');
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message || err);
  }
}

testCursorSetup();
