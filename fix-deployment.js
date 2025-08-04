#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing deployment issues...');

// 1. Clean up corrupted files
const corruptedFiles = [
  'r.emailAddress.address).join(\'\')',
  'h origin main',
  'tall -g supabase',
  'and leaseholders display - improve database query and add debugging tools',
  'h',
  'u.building_id',
  'c --noEmit',
  'how 8778c9a2-b42f-4eb6-8217-759699f42c1c --oneline',
  'ter',
  'h origin master'
];

corruptedFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed corrupted file: ${file}`);
    } catch (error) {
      console.log(`⚠️ Could not remove ${file}: ${error.message}`);
    }
  }
});

// 2. Create .env.local template if it doesn't exist
const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Microsoft Outlook Configuration
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_TENANT_ID=your_outlook_tenant_id
OUTLOOK_REDIRECT_URI=http://localhost:3000/api/auth/callback/outlook

# Vercel Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: Google Cloud Vision (for document processing)
GOOGLE_CLOUD_KEY_FILE=path_to_google_cloud_key.json
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id

# Cron Job Security
CRON_SECRET_TOKEN=your_cron_secret_token
`;

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env.local template');
  console.log('⚠️ Please update .env.local with your actual environment variables');
} else {
  console.log('✅ .env.local already exists');
}

// 3. Check for required dependencies
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@supabase/supabase-js',
  'next',
  'react',
  'react-dom',
  'openai'
];

const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
if (missingDeps.length > 0) {
  console.log(`⚠️ Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('Run: npm install');
} else {
  console.log('✅ All required dependencies are present');
}

// 4. Create a simple deployment test
const testDeployment = `
// Test deployment configuration
const testConfig = {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cwd: process.cwd(),
  env: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'
  }
};

console.log('Deployment test config:', JSON.stringify(testConfig, null, 2));
`;

fs.writeFileSync('test-deployment.js', testDeployment);
console.log('✅ Created deployment test script');

// 5. Update package.json scripts for better deployment
const updatedScripts = {
  ...packageJson.scripts,
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "deploy:check": "node test-deployment.js",
  "deploy:vercel": "vercel --prod"
};

packageJson.scripts = updatedScripts;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Updated package.json scripts');

console.log('\n🎉 Deployment fixes completed!');
console.log('\nNext steps:');
console.log('1. Update .env.local with your actual environment variables');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev');
console.log('4. Test deployment with: node test-deployment.js'); 