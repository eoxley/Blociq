// Quick test for the building info handler
import { detectBuildingInfoQuery, generateBuildingInfoResponse } from './lib/ai/buildingInfoHandler.js';

// Test queries
const testQueries = [
  "How many units does Ashwood House have?",
  "What is the unit count for Ashwood House?",
  "How many flats are in Ashwood House?",
  "Tell me about Ashwood House",
  "Who lives in flat 5 Ashwood House?",
  "Show me the units in Ashwood House"
];

console.log('🔍 Testing Building Info Query Detection:\n');

testQueries.forEach((query, index) => {
  console.log(`${index + 1}. Query: "${query}"`);

  const result = detectBuildingInfoQuery(query);

  if (result) {
    console.log(`   ✅ Detected: ${result.type} (confidence: ${result.confidence}%)`);
    console.log(`   🏢 Building: ${result.buildingName}`);
    if (result.unitNumber) console.log(`   🏠 Unit: ${result.unitNumber}`);

    // Mock building info for testing
    const mockBuildingInfo = {
      id: 'test-id',
      name: 'Ashwood House',
      address: '123 Test Street',
      unit_count: 10, // This should be overridden to 31
      building_manager_name: 'Test Manager',
      building_manager_email: 'manager@test.com',
      units: []
    };

    const response = generateBuildingInfoResponse(mockBuildingInfo, result.type, result.unitNumber);
    console.log(`   💬 Response: "${response}"`);
  } else {
    console.log('   ❌ Not detected as building info query');
  }

  console.log('');
});

console.log('🎉 Test completed!');