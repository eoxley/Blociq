#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Clearing Next.js cache and rebuilding...');

// Clear Next.js cache directories
const cacheDirs = [
  '.next',
  'node_modules/.cache',
  '.turbo'
];

cacheDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    console.log(`🗑️  Removing ${dir}...`);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ Removed ${dir}`);
    } catch (error) {
      console.log(`⚠️  Could not remove ${dir}:`, error.message);
    }
  }
});

// Clear npm cache
console.log('🧹 Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ npm cache cleared');
} catch (error) {
  console.log('⚠️  Could not clear npm cache:', error.message);
}

// Reinstall dependencies
console.log('📦 Reinstalling dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies reinstalled');
} catch (error) {
  console.log('⚠️  Could not reinstall dependencies:', error.message);
}

// Rebuild the application
console.log('🔨 Rebuilding application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Application rebuilt successfully');
} catch (error) {
  console.log('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('🎉 Cache clearing and rebuild complete!');
console.log('💡 You may need to hard refresh your browser (Ctrl+Shift+R) to see the changes.'); 