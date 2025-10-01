/**
 * Golden Example Test Cases for BlocIQ
 * Ensures consistent leasehold block management responses
 */

export interface GoldenExample {
  query: string;
  expectedKeywords: string[];
  expectedContext: 'leasehold' | 'commercial' | 'ast' | 'general';
  description: string;
}

export const GOLDEN_EXAMPLES: GoldenExample[] = [
  {
    query: "The tenant has asked for a breakdown of service charges",
    expectedKeywords: ["leaseholder", "Section 21", "Section 22", "service charge demand", "LTA 1985"],
    expectedContext: 'leasehold',
    description: "Should convert 'tenant' to 'leaseholder' and reference LTA 1985"
  },
  {
    query: "Tenants are complaining about the service charge increase",
    expectedKeywords: ["leaseholders", "service charge", "LTA 1985", "reasonably incurred"],
    expectedContext: 'leasehold',
    description: "Should convert 'tenants' to 'leaseholders' and apply leasehold law"
  },
  {
    query: "Can we evict this tenant?",
    expectedKeywords: ["not applicable", "outside BlocIQ scope", "leaseholder", "lease terms"],
    expectedContext: 'leasehold',
    description: "Should clarify that eviction doesn't apply to leasehold, suggest lease terms"
  },
  {
    query: "The leaseholder is requesting service charge documentation",
    expectedKeywords: ["Section 21", "Section 22", "supporting documents", "invoices", "receipts"],
    expectedContext: 'leasehold',
    description: "Should reference correct LTA 1985 sections for documentation requests"
  },
  {
    query: "Major works are needed - what consultation is required?",
    expectedKeywords: ["Section 20", "consultation", "£250", "major works", "LTA 1985"],
    expectedContext: 'leasehold',
    description: "Should reference Section 20 consultation requirements"
  },
  {
    query: "What are the building safety requirements?",
    expectedKeywords: ["Building Safety Act 2022", "HRB", "Building Safety Manager", "compliance"],
    expectedContext: 'leasehold',
    description: "Should reference Building Safety Act 2022 requirements"
  },
  {
    query: "The commercial tenant is asking about rent review",
    expectedKeywords: ["commercial", "rent review", "lease terms", "not LTA 1985"],
    expectedContext: 'commercial',
    description: "Should recognise commercial context and not apply residential leasehold law"
  },
  {
    query: "AST tenant wants to end their tenancy early",
    expectedKeywords: ["AST", "assured shorthold", "tenancy", "not leasehold"],
    expectedContext: 'ast',
    description: "Should recognise AST context and not apply leasehold law"
  },
  {
    query: "Write an email response to the leaseholder about service charges",
    expectedKeywords: ["Part 1: Context", "Part 2: Formatted Output", "LTA 1985", "service charge"],
    expectedContext: 'leasehold',
    description: "Should use structured response format for email requests"
  },
  {
    query: "What compliance certificates do we need?",
    expectedKeywords: ["FRA", "EICR", "LOLER", "Asbestos", "Legionella", "compliance"],
    expectedContext: 'leasehold',
    description: "Should list common compliance assets for block management"
  }
];

/**
 * Test a query against golden examples
 */
export function testQueryAgainstGoldenExamples(query: string): {
  matches: GoldenExample[];
  suggestions: string[];
} {
  const matches: GoldenExample[] = [];
  const suggestions: string[] = [];
  
  // Check for direct matches
  for (const example of GOLDEN_EXAMPLES) {
    const queryLower = query.toLowerCase();
    const exampleLower = example.query.toLowerCase();
    
    // Simple similarity check (could be enhanced with fuzzy matching)
    if (queryLower.includes(exampleLower.split(' ')[0]) || 
        exampleLower.includes(queryLower.split(' ')[0])) {
      matches.push(example);
    }
  }
  
  // Generate suggestions based on context
  if (query.toLowerCase().includes('tenant')) {
    suggestions.push('Consider using "leaseholder" instead of "tenant" for block management context');
  }
  
  if (query.toLowerCase().includes('service charge')) {
    suggestions.push('Reference LTA 1985 Sections 21 & 22 for service charge documentation requests');
  }
  
  if (query.toLowerCase().includes('major works')) {
    suggestions.push('Consider Section 20 consultation requirements for major works');
  }
  
  return { matches, suggestions };
}

/**
 * Validate response contains expected keywords
 */
export function validateResponse(response: string, expectedKeywords: string[]): {
  isValid: boolean;
  missingKeywords: string[];
  foundKeywords: string[];
} {
  const responseLower = response.toLowerCase();
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];
  
  for (const keyword of expectedKeywords) {
    if (responseLower.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  }
  
  const isValid = missingKeywords.length === 0;
  
  return {
    isValid,
    missingKeywords,
    foundKeywords
  };
}

/**
 * Run all golden example tests
 */
export async function runGoldenExampleTests(askAIEndpoint: string): Promise<{
  passed: number;
  failed: number;
  results: Array<{
    example: GoldenExample;
    response: string;
    isValid: boolean;
    validation: ReturnType<typeof validateResponse>;
  }>;
}> {
  const results: Array<{
    example: GoldenExample;
    response: string;
    isValid: boolean;
    validation: ReturnType<typeof validateResponse>;
  }> = [];
  
  let passed = 0;
  let failed = 0;
  
  for (const example of GOLDEN_EXAMPLES) {
    try {
      // Call the Ask AI endpoint
      const response = await fetch(askAIEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: example.query,
          contextType: 'general'
        })
      });
      
      const data = await response.json();
      const aiResponse = data.response || data.answer || data.result || '';
      
      // Validate the response
      const validation = validateResponse(aiResponse, example.expectedKeywords);
      
      const result = {
        example,
        response: aiResponse,
        isValid: validation.isValid,
        validation
      };
      
      results.push(result);
      
      if (validation.isValid) {
        passed++;
        console.log(`✅ PASS: ${example.description}`);
      } else {
        failed++;
        console.log(`❌ FAIL: ${example.description}`);
        console.log(`   Missing: ${validation.missingKeywords.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ ERROR testing ${example.description}:`, error);
      failed++;
    }
  }
  
  return { passed, failed, results };
}
