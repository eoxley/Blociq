#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 BlocIQ Deployment Check\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'vercel.json',
  'app/login/page.tsx',
  'app/home/page.tsx',
  'utils/supabase/index.ts'
];

console.log('📁 Checking required files...');
let missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('\n❌ Missing required files. Please ensure all files are present before deployment.');
  process.exit(1);
}

// Check environment variables
console.log('\n🔐 Checking environment variables...');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

let missingEnvVars = [];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar} - Set`);
  } else {
    console.log(`⚠️  ${envVar} - Not set (required for deployment)`);
    missingEnvVars.push(envVar);
  }
});

if (process.env.OPENAI_API_KEY) {
  console.log('✅ OPENAI_API_KEY - Set');
} else {
  console.log('⚠️  OPENAI_API_KEY - Not set (required for some features)');
}

// Test build
console.log('\n🔨 Testing build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful!');
} catch (error) {
  console.log('❌ Build failed. Please fix build errors before deployment.');
  process.exit(1);
}

// Summary
console.log('\n📋 Deployment Summary:');
console.log('✅ All required files present');
console.log('✅ Build successful');

if (missingEnvVars.length > 0) {
  console.log('\n⚠️  Environment Variables Required for Deployment:');
  missingEnvVars.forEach(envVar => {
    console.log(`   - ${envVar}`);
  });
  console.log('\n📖 See DEPLOYMENT.md for setup instructions.');
} else {
  console.log('✅ Environment variables configured');
}

console.log('\n🎉 Ready for deployment!');
console.log('Run: npm run deploy');