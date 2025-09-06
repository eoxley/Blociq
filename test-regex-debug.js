#!/usr/bin/env node

/**
 * REGEX DEBUG TEST
 * 
 * Tests the regex patterns to see what's happening
 */

// Test the regex patterns
function testRegexPatterns() {
  console.log('🔍 TESTING REGEX PATTERNS');
  console.log('============================================================');
  
  const testStrings = [
    "Who is the leaseholder of Flat 1 at Ashwood House?",
    "Who is the leaseholder of Flat 2 at Ashwood House",
    "Who is the leaseholder of Flat 3 at Ashwood House.",
    "Who is the leaseholder of Flat 4 at Ashwood House!",
    "Tell me about Ashwood House",
    "Show me all units in Ashwood House"
  ];
  
  const patterns = [
    {
      name: "at pattern (old)",
      regex: /at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?|\.|!)/i
    },
    {
      name: "at pattern (new)",
      regex: /at\s+([a-zA-Z][a-zA-Z0-9\s]*?)(?:\s|$|,|\?|\.|!)/i
    },
    {
      name: "suffix pattern", 
      regex: /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge|building)\b/i
    },
    {
      name: "end pattern",
      regex: /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*$/i
    }
  ];
  
  testStrings.forEach((str, i) => {
    console.log(`\n${i + 1}. Testing: "${str}"`);
    
    patterns.forEach(pattern => {
      const match = str.match(pattern.regex);
      if (match) {
        console.log(`  ✅ ${pattern.name}: "${match[1]}"`);
      } else {
        console.log(`  ❌ ${pattern.name}: No match`);
      }
    });
  });
}

testRegexPatterns();
