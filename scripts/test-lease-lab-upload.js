require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLeaseLabUpload() {
  console.log('🔍 Testing lease lab upload endpoint...');
  
  try {
    // Test the jobs endpoint first
    console.log('📋 Testing /api/lease-lab/jobs endpoint...');
    const jobsResponse = await fetch('http://localhost:3000/api/lease-lab/jobs', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📋 Jobs API response status:', jobsResponse.status);
    
    if (!jobsResponse.ok) {
      const errorText = await jobsResponse.text();
      console.log('❌ Jobs API error:', errorText);
    } else {
      const jobsData = await jobsResponse.json();
      console.log('✅ Jobs API success:', jobsData.success);
      console.log('📋 Jobs count:', jobsData.jobs?.length || 0);
    }
    
    // Test the upload endpoint (without actually uploading a file)
    console.log('📤 Testing /api/lease-lab/upload endpoint...');
    const uploadResponse = await fetch('http://localhost:3000/api/lease-lab/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📤 Upload API response status:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload API error:', errorText);
    } else {
      const uploadData = await uploadResponse.json();
      console.log('📤 Upload API response:', uploadData);
    }
    
  } catch (error) {
    console.error('❌ Error testing lease lab APIs:', error);
  }
}

testLeaseLabUpload();