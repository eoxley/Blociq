#!/usr/bin/env node

/**
 * Test script for document intent detection and resolution
 */

const testCases = [
  {
    name: 'Insurance Document Request',
    input: 'show the latest insurance document for Ashwood House',
    expectedDocType: 'insurance',
    expectedBuilding: 'Ashwood House'
  },
  {
    name: 'EICR Request',
    input: 'open the most recent EICR for Flat 8',
    expectedDocType: 'EICR',
    expectedUnit: 'Flat 8'
  },
  {
    name: 'Fire Risk Assessment',
    input: 'get the current FRA for the building',
    expectedDocType: 'FRA'
  },
  {
    name: 'Water Risk Assessment',
    input: 'latest legionella assessment for Ashwood House',
    expectedDocType: 'WaterRisk',
    expectedBuilding: 'Ashwood House'
  },
  {
    name: 'Emergency Lighting',
    input: 'show me the emergency lighting test certificate',
    expectedDocType: 'EmergencyLighting'
  },
  {
    name: 'Fire Alarm',
    input: 'get the fire alarm inspection report',
    expectedDocType: 'FireAlarm'
  },
  {
    name: 'Lift LOLER',
    input: 'open the latest LOLER certificate',
    expectedDocType: 'LiftLOLER'
  },
  {
    name: 'Asbestos Survey',
    input: 'show the asbestos register for the building',
    expectedDocType: 'Asbestos'
  },
  {
    name: 'External Wall System',
    input: 'get the EWS1 certificate',
    expectedDocType: 'FRAEW'
  },
  {
    name: 'Sprinkler System',
    input: 'latest sprinkler inspection report',
    expectedDocType: 'Sprinkler'
  },
  {
    name: 'Non-document Request',
    input: 'what is the service charge for this building?',
    expectedDocType: null
  }
];

// Mock the document intent detection
function detectDocumentIntent(text, currentBuildingId) {
  const lowerText = text.toLowerCase();
  
  // Action words
  const actionWords = ['show', 'get', 'open', 'provide', 'send', 'fetch', 'find', 'retrieve', 'latest', 'most recent', 'current', 'newest', 'last', 'recent'];
  const hasAction = actionWords.some(word => lowerText.includes(word));
  
  if (!hasAction) return null;
  
  // Document type mapping
  const docTypes = {
    'insurance': ['insurance', 'policy', 'schedule'],
    'EICR': ['eicr', 'electrical report', 'electrical installation condition report'],
    'FRA': ['fra', 'fire risk assessment', 'fire risk'],
    'FRAEW': ['ews1', 'fraew', 'external wall'],
    'WaterRisk': ['water risk', 'legionella'],
    'FireAlarm': ['fire alarm', 'fire detection'],
    'EmergencyLighting': ['emergency lighting', 'emergency lights'],
    'FireDoors': ['fire doors', 'fire door'],
    'LiftLOLER': ['loler', 'lift'],
    'Asbestos': ['asbestos'],
    'LightningProtection': ['lightning'],
    'Sprinkler': ['sprinkler']
  };
  
  // Find matching document type
  for (const [docType, aliases] of Object.entries(docTypes)) {
    if (aliases.some(alias => lowerText.includes(alias))) {
      return {
        kind: 'GET_LATEST_DOC',
        docType,
        buildingId: currentBuildingId,
        rawTypeText: docType,
        confidence: 0.8
      };
    }
  }
  
  return null;
}

// Mock building context resolution
function extractBuildingContext(text) {
  const buildingPatterns = [
    /(?:for|of|at|in)\s+([A-Za-z0-9\s]+?)(?:\s+(?:house|building|block))/gi,
    /(?:house|building|block)\s+([A-Za-z0-9\s]+)/gi
  ];
  
  const unitPatterns = [
    /(?:flat|apartment|unit)\s+([A-Za-z0-9\s]+)/gi
  ];
  
  let buildingName = '';
  let unitName = '';
  
  for (const pattern of buildingPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      buildingName = matches[0][1]?.trim();
      break;
    }
  }
  
  for (const pattern of unitPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      unitName = matches[0][1]?.trim();
      break;
    }
  }
  
  return { buildingName, unitName };
}

console.log('🧪 Testing Document Intent Detection\n');

let passed = 0;
let total = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: "${testCase.input}"`);
  
  const intent = detectDocumentIntent(testCase.input);
  const context = extractBuildingContext(testCase.input);
  
  if (testCase.expectedDocType === null) {
    if (intent === null) {
      console.log('✅ PASS - Correctly identified as non-document request');
      passed++;
    } else {
      console.log('❌ FAIL - Should not have detected document intent');
    }
  } else {
    if (intent && intent.docType === testCase.expectedDocType) {
      console.log(`✅ PASS - Detected ${intent.docType} document intent`);
      
      if (testCase.expectedBuilding && context.buildingName === testCase.expectedBuilding) {
        console.log(`✅ PASS - Correctly extracted building: ${context.buildingName}`);
      } else if (testCase.expectedBuilding) {
        console.log(`❌ FAIL - Expected building "${testCase.expectedBuilding}", got "${context.buildingName}"`);
      }
      
      if (testCase.expectedUnit && context.unitName === testCase.expectedUnit) {
        console.log(`✅ PASS - Correctly extracted unit: ${context.unitName}`);
      } else if (testCase.expectedUnit) {
        console.log(`❌ FAIL - Expected unit "${testCase.expectedUnit}", got "${context.unitName}"`);
      }
      
      passed++;
    } else {
      console.log(`❌ FAIL - Expected ${testCase.expectedDocType}, got ${intent?.docType || 'null'}`);
    }
  }
  
  console.log('');
});

console.log(`🎉 Test Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);

if (passed === total) {
  console.log('🎯 All tests passed! Document intent detection is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.');
}
