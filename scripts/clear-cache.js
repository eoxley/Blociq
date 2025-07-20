#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing Next.js cache and rebuilding...\n');

try {
  // Remove .next directory
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    console.log('📁 Removing .next directory...');
    fs.rmSync(nextDir, { recursive: true, force: true });
  }

  // Clear npm cache
  console.log('🗑️  Clearing npm cache...');
  execSync('npm cache clean --force', { stdio: 'inherit' });

  // Reinstall dependencies
  console.log('📦 Reinstalling dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Rebuild the project
  console.log('🔨 Rebuilding project...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('\n✅ Cache cleared and project rebuilt successfully!');
  console.log('🚀 You can now start the development server with: npm run dev');
} catch (error) {
  console.error('\n❌ Error during cache clearing:', error.message);
  process.exit(1);
} 