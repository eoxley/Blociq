require('dotenv').config({ path: '.env.local' });

console.log('🔍 OCR Service Troubleshooting Guide...\n');

console.log('📊 Current Service Status:');
console.log('✅ Service is running');
console.log('✅ Tesseract OCR available');
console.log('✅ Google Vision available');
console.log('❌ Supabase connection failing');
console.log('✅ Environment variables configured');
console.log('');

console.log('🔧 Possible Issues:');
console.log('1. **Network connectivity** - Render service can\'t reach Supabase');
console.log('2. **Authentication** - Service role key might be invalid or expired');
console.log('3. **Service restart needed** - Environment variables not loaded');
console.log('4. **Supabase project issues** - Project might be paused or have restrictions');
console.log('');

console.log('🎯 Troubleshooting Steps:');
console.log('');
console.log('**Step 1: Check Render Service Logs**');
console.log('1. Go to Render Dashboard (render.com)');
console.log('2. Find your OCR service: ocr-server-2-ykmk');
console.log('3. Go to "Logs" tab');
console.log('4. Look for Supabase connection errors');
console.log('5. Check for any authentication or network errors');
console.log('');

console.log('**Step 2: Restart the Service**');
console.log('1. In Render Dashboard, go to "Manual Deploy" tab');
console.log('2. Click "Deploy latest commit"');
console.log('3. Wait for deployment to complete (2-3 minutes)');
console.log('4. Check health endpoint again');
console.log('');

console.log('**Step 3: Verify Supabase Project Status**');
console.log('1. Go to Supabase Dashboard (supabase.com)');
console.log('2. Check if project is active (not paused)');
console.log('3. Verify the service role key is still valid');
console.log('4. Check if there are any API rate limits or restrictions');
console.log('');

console.log('**Step 4: Test with a Simple File**');
console.log('1. Try uploading a small PDF (under 1MB)');
console.log('2. Check if the error is consistent');
console.log('3. Look at the specific error message');
console.log('');

console.log('**Step 5: Alternative Solutions**');
console.log('1. **Use different Supabase key** - Try the anon key instead of service role');
console.log('2. **Check storage bucket permissions** - Ensure the service role has access');
console.log('3. **Contact Render support** - If logs show network issues');
console.log('');

console.log('🔍 Quick Test Commands:');
console.log('curl -s "https://ocr-server-2-ykmk.onrender.com/health" | jq .');
console.log('curl -s "https://xqxaatvykmaaynqeoemy.supabase.co/rest/v1/" -H "apikey: YOUR_ANON_KEY"');
console.log('');

console.log('📞 If all else fails:');
console.log('1. Check Render service logs for specific error messages');
console.log('2. Try regenerating the Supabase service role key');
console.log('3. Consider using the anon key temporarily for testing');
console.log('4. Contact Render support if it\'s a network connectivity issue');
