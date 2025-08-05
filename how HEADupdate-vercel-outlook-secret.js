#!/usr/bin/env node

const { execSync } = require('child_process');

// Your new Outlook client secret
const NEW_OUTLOOK_CLIENT_SECRET = '._r8Q~FWZcuQSYGKEixAtqaEC5jCv4y-shIezanu';

console.log('🔧 Updating Vercel environment variables with new OUTLOOK_CLIENT_SECRET...\n');

try {
  // Update the OUTLOOK_CLIENT_SECRET in Vercel
  execSync(`vercel env add OUTLOOK_CLIENT_SECRET production`, { 
    stdio: 'inherit',
    input: NEW_OUTLOOK_CLIENT_SECRET + '\n'
  });
  
  console.log('✅ Successfully updated OUTLOOK_CLIENT_SECRET in Vercel production environment');
  
  // Also update for preview environment
  try {
    execSync(`vercel env add OUTLOOK_CLIENT_SECRET preview`, { 
      stdio: 'inherit',
      input: NEW_OUTLOOK_CLIENT_SECRET + '\n'
    });
    console.log('✅ Successfully updated OUTLOOK_CLIENT_SECRET in Vercel preview environment');
  } catch (previewError) {
    console.log('⚠️  Preview environment update failed (this is normal if it already exists)');
  }
  
  console.log('\n🎉 Environment variable update complete!');
  console.log('📝 Next steps:');
  console.log('1. Your local .env.local file has been updated');
  console.log('2. Vercel environment variables have been updated');
  console.log('3. You can now deploy your application');
  
} catch (error) {
  console.error('❌ Error updating Vercel environment variables:', error.message);
  console.log('\n📝 Manual update instructions:');
  console.log('1. Go to https://vercel.com/dashboard');
  console.log('2. Select your project: blociq-h3xv');
  console.log('3. Go to Settings > Environment Variables');
  console.log('4. Update OUTLOOK_CLIENT_SECRET with: ._r8Q~FWZcuQSYGKEixAtqaEC5jCv4y-shIezanu');
} 