#!/usr/bin/env node

/**
 * Test Industry Knowledge Import
 * 
 * This script tests the bulk import functionality with sample data
 * Run this to verify your setup is working correctly
 */

const fs = require('fs');
const path = require('path');

// Test data
const testData = {
  standards: [
    {
      name: "Test Standard 1",
      category: "Fire & Life Safety",
      description: "This is a test standard for verification",
      requirements: ["Test requirement 1", "Test requirement 2"],
      frequency: "Annual",
      legal_basis: "Test legislation",
      guidance_notes: "This is a test standard"
    }
  ],
  guidance: [
    {
      category: "Fire & Life Safety",
      title: "Test Guidance Document",
      description: "Test guidance for verification",
      content: "This is test content for the guidance document. It contains information about fire safety testing and verification procedures.",
      source: "Test Source",
      version: "Test",
      relevance_score: 85,
      tags: ["test", "fire safety", "verification"]
    }
  ]
};

// Create test JSON file
const testFilePath = path.join(__dirname, 'test-data.json');
fs.writeFileSync(testFilePath, JSON.stringify(testData, null, 2));

console.log('🧪 Test Industry Knowledge Import');
console.log('================================\n');

console.log('✅ Test data created at:', testFilePath);
console.log('📊 Test data includes:');
console.log('   - 1 test standard');
console.log('   - 1 test guidance document');
console.log('\n🚀 To test the import, run:');
console.log(`   node scripts/bulk-import-industry-knowledge.js --type=json --file=${testFilePath}`);
console.log('\n🔍 Or test the API endpoint:');
console.log('   POST /api/industry/bulk-import');
console.log('   with the test data');

console.log('\n📝 Test data preview:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n✨ Test setup complete!');
