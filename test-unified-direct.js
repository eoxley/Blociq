#!/usr/bin/env node

/**
 * Direct Unified System Test
 * 
 * This script tests the unified AI system directly without going through
 * the API endpoints to see if it works.
 */

// Mock the environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
process.env.OPENAI_API_KEY = 'your-openai-key';

async function testUnifiedSystem() {
  try {
    console.log('🔍 Testing Unified System Directly...');
    
    // Import the unified system
    const { UnifiedAIProcessor } = await import('./lib/ai/unifiedDataAccess.ts');
    
    console.log('✅ Unified system imported successfully');
    
    // Test with a simple query
    const result = await UnifiedAIProcessor.processQuery(
      "Who is the leaseholder of unit 8 at Ashwood House?",
      'test-user-id',
      undefined,
      'general'
    );
    
    console.log('✅ Unified system processed query successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing unified system:', error);
    console.error('Stack:', error.stack);
  }
}

testUnifiedSystem();
