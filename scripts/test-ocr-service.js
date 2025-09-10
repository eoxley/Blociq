require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing OCR Service Configuration...\n');

const ocrUrl = process.env.RENDER_OCR_URL;
const token = process.env.RENDER_OCR_TOKEN;

console.log('📋 Current Configuration:');
console.log(`✅ RENDER_OCR_URL: ${ocrUrl}`);
console.log(`❌ RENDER_OCR_TOKEN: ${token} (${token?.length || 0} characters)`);

if (token === '1' || token?.length < 10) {
  console.log('\n❌ PROBLEM IDENTIFIED:');
  console.log('The RENDER_OCR_TOKEN appears to be a placeholder value ("1")');
  console.log('This is not a valid authentication token for the Render service');
  
  console.log('\n🔧 SOLUTION:');
  console.log('1. Go to your Render dashboard (render.com)');
  console.log('2. Find your OCR service: ocr-server-2-ykmk');
  console.log('3. Go to Environment tab');
  console.log('4. Look for the RENDER_TOKEN or similar environment variable');
  console.log('5. Copy the actual token value');
  console.log('6. Update your .env.local file with the real token');
  
  console.log('\n📝 Expected token format:');
  console.log('- Should be a long string (20+ characters)');
  console.log('- Usually contains letters, numbers, and special characters');
  console.log('- Example: "rnd_abc123def456ghi789..."');
  
} else {
  console.log('\n✅ Token appears to be properly formatted');
  console.log('Testing authentication...');
  
  // Test the service
  fetch(ocrUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'test=1'
  })
  .then(response => {
    console.log(`📡 Response status: ${response.status}`);
    return response.text();
  })
  .then(data => {
    console.log('📄 Response:', data);
    
    if (response.status === 401) {
      console.log('\n❌ Authentication failed - token is invalid');
    } else if (response.status === 400) {
      console.log('\n✅ Authentication successful (400 is expected for test payload)');
    } else {
      console.log(`\n📊 Service responded with status: ${response.status}`);
    }
  })
  .catch(error => {
    console.error('❌ Network error:', error.message);
  });
}

console.log('\n🔍 Additional Checks:');
console.log('1. Verify the Render service is running and accessible');
console.log('2. Check that the token has not expired');
console.log('3. Ensure the token has the correct permissions');
console.log('4. Verify the service URL is correct');
