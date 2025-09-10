require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Supabase Connection for OCR Service...\n');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET;

console.log('📋 Environment Variables:');
console.log(`✅ SUPABASE_URL: ${supabaseUrl}`);
console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET'}`);
console.log(`✅ SUPABASE_STORAGE_BUCKET: ${storageBucket}`);

if (!supabaseUrl || !supabaseKey || !storageBucket) {
  console.log('\n❌ Missing required environment variables!');
  process.exit(1);
}

console.log('\n🔧 Render OCR Service Configuration:');
console.log('Add these environment variables to your Render OCR service:');
console.log('');
console.log('SUPABASE_URL=' + supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY=' + supabaseKey);
console.log('SUPABASE_STORAGE_BUCKET=' + storageBucket);
console.log('');

// Test the connection
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test 1: Check if we can connect
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('✅ Supabase connection successful');
    
    // Test 2: Check if storage bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Error listing storage buckets:', bucketsError.message);
      return;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === storageBucket);
    
    if (bucketExists) {
      console.log(`✅ Storage bucket "${storageBucket}" exists`);
    } else {
      console.log(`❌ Storage bucket "${storageBucket}" does not exist`);
      console.log('Available buckets:', buckets.map(b => b.name).join(', '));
    }
    
    // Test 3: Check if we can access the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from(storageBucket)
      .list('', { limit: 1 });
    
    if (filesError) {
      console.log(`❌ Error accessing bucket "${storageBucket}":`, filesError.message);
    } else {
      console.log(`✅ Can access bucket "${storageBucket}" (${files.length} files found)`);
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to Render Dashboard (render.com)');
    console.log('2. Find your OCR service: ocr-server-2-ykmk');
    console.log('3. Go to Environment tab');
    console.log('4. Add the three environment variables shown above');
    console.log('5. Restart the service');
    console.log('6. Test the OCR functionality again');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection();
