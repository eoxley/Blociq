#!/usr/bin/env node

/**
 * Test script for compliance regex map functionality
 * This script tests the core regex map functions without Jest
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Mock the regex map functions for testing
function normalizeUKDate(dateStr) {
  if (!dateStr) return null;

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const pattern1 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const match1 = dateStr.match(pattern1);
  if (match1) {
    const [, day, month, year] = match1;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Pattern 2: DD Month YYYY
  const monthMap = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  const pattern2 = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/;
  const match2 = dateStr.match(pattern2);
  if (match2) {
    const [, day, month, year] = match2;
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

function loadRegexMap() {
  const configPath = path.join(process.cwd(), 'config', 'compliance', 'regex-map.v1.yaml');
  const fileContents = fs.readFileSync(configPath, 'utf8');
  return yaml.load(fileContents);
}

function applyPatterns(patterns, text, flags = 'gim') {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const results = [];

  patternArray.forEach(pattern => {
    try {
      const regex = new RegExp(pattern, flags);
      const matches = text.matchAll(regex);
      
      for (const match of matches) {
        if (match[0]) {
          results.push({ match: match[0], page: 1 });
        }
      }
    } catch (error) {
      console.warn(`Invalid regex pattern: ${pattern}`, error);
    }
  });

  return results;
}

function detectDocType(pageText) {
  const config = loadRegexMap();
  const text = Array.isArray(pageText) ? pageText.map(p => p.text).join('\n') : pageText;
  
  let bestMatch = { type: 'Unknown', score: 0 };

  Object.entries(config.types).forEach(([typeName, typeConfig]) => {
    let score = 0;
    
    // Check detection patterns
    typeConfig.detect.forEach(pattern => {
      const matches = applyPatterns(pattern, text);
      score += matches.length * 0.5;
    });

    // Check main fields (inspection_date is usually present)
    if (typeConfig.fields.inspection_date) {
      const dateMatches = applyPatterns(typeConfig.fields.inspection_date, text);
      score += dateMatches.length * 1.0;
    }

    // Check other key fields
    Object.entries(typeConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldName !== 'inspection_date') {
        const fieldMatches = applyPatterns(fieldConfig.patterns, text);
        score += fieldMatches.length * 0.3;
      }
    });

    if (score > bestMatch.score) {
      bestMatch = { type: typeName, score };
    }
  });

  return bestMatch;
}

// Test cases
const testCases = [
  {
    name: 'EICR Document',
    text: 'Electrical Installation Condition Report\nInspection Date: 15/07/2023\nProperty: Ashwood House\nBS 7671:2018\nSatisfactory\nNo Category 1 issues',
    expectedType: 'EICR'
  },
  {
    name: 'FRA Document',
    text: 'Fire Risk Assessment\nInspection Date: 20/08/2023\nRisk Rating: Moderate\nReview due: 20/08/2024',
    expectedType: 'FRA'
  },
  {
    name: 'EWS1 Document',
    text: 'EWS1 Certificate\nExternal Wall System Assessment\nClass: A1\nInspection Date: 10/09/2023',
    expectedType: 'FRAEW_EWS1'
  },
  {
    name: 'Emergency Lighting Document',
    text: 'Emergency Lighting Test Certificate\nMonthly Function Test\nInspection Date: 5/10/2023\nAnnual Duration Test',
    expectedType: 'EmergencyLighting'
  },
  {
    name: 'Insurance Document',
    text: 'Schedule of Insurance\nPolicy Number: ABC123/2024\nInsured By: Property Management Ltd\nPeriod From: 1/1/2024\nPeriod To: 31/12/2024\nBuildings Sum Insured: £500,000',
    expectedType: 'Insurance'
  },
  {
    name: 'Unknown Document',
    text: 'This is just some random text with no compliance markers.',
    expectedType: 'Unknown'
  }
];

// Date normalization tests
const dateTests = [
  { input: '15/07/2023', expected: '2023-07-15' },
  { input: '1/1/2024', expected: '2024-01-01' },
  { input: '31/12/2022', expected: '2022-12-31' },
  { input: '15-07-2023', expected: '2023-07-15' },
  { input: '15 July 2023', expected: '2023-07-15' },
  { input: '1 Jan 2024', expected: '2024-01-01' },
  { input: '15/07/23', expected: '2023-07-15' },
  { input: 'invalid', expected: null }
];

console.log('🧪 Testing Compliance Regex Map System\n');

// Test date normalization
console.log('📅 Testing date normalization...');
let datePassed = 0;
dateTests.forEach(test => {
  const result = normalizeUKDate(test.input);
  const passed = result === test.expected;
  console.log(`  ${passed ? '✅' : '❌'} ${test.input} → ${result} (expected: ${test.expected})`);
  if (passed) datePassed++;
});
console.log(`📅 Date normalization: ${datePassed}/${dateTests.length} tests passed\n`);

// Test document type detection
console.log('🔍 Testing document type detection...');
let detectionPassed = 0;
testCases.forEach(test => {
  const result = detectDocType(test.text);
  const passed = result.type === test.expectedType;
  console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${result.type} (score: ${result.score.toFixed(2)}) (expected: ${test.expectedType})`);
  if (passed) detectionPassed++;
});
console.log(`🔍 Document detection: ${detectionPassed}/${testCases.length} tests passed\n`);

// Test regex map loading
console.log('📋 Testing regex map loading...');
try {
  const config = loadRegexMap();
  console.log(`  ✅ Loaded regex map v${config.version} with ${Object.keys(config.types).length} document types`);
  console.log(`  📊 Document types: ${Object.keys(config.types).join(', ')}`);
} catch (error) {
  console.log(`  ❌ Failed to load regex map: ${error.message}`);
}

console.log('\n🎉 Regex Map System Test Complete!');
console.log(`📊 Overall: ${datePassed + detectionPassed}/${dateTests.length + testCases.length} tests passed`);
