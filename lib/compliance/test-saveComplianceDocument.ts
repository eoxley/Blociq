/**
 * Test file demonstrating usage of saveComplianceDocument function
 * 
 * This file shows various ways to use the saveComplianceDocument function
 * and includes error handling examples.
 */

import { saveComplianceDocument, saveComplianceDocumentUpsert } from './saveComplianceDocument';

// Example 1: Basic usage with valid data
export async function testBasicUsage() {
  try {
    await saveComplianceDocument({
      buildingId: 123,
      complianceAssetId: 'eicr-certificate',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/eicr-2024.pdf',
      title: 'Electrical Installation Condition Report',
      summary: 'Annual EICR inspection completed with satisfactory results. All electrical systems are in good condition.',
      lastRenewedDate: '2024-06-15',
      nextDueDate: '2029-06-15'
    });
    
    console.log('✅ Basic test passed');
  } catch (error) {
    console.error('❌ Basic test failed:', error);
  }
}

// Example 2: Using upsert for potential re-uploads
export async function testUpsertUsage() {
  try {
    await saveComplianceDocumentUpsert({
      buildingId: 123,
      complianceAssetId: 'fire-safety-assessment',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/fire-assessment-2024.pdf',
      title: 'Fire Safety Assessment Report',
      summary: 'Comprehensive fire safety assessment with recommendations for improvements.',
      lastRenewedDate: '2024-03-20',
      nextDueDate: '2025-03-20'
    });
    
    console.log('✅ Upsert test passed');
  } catch (error) {
    console.error('❌ Upsert test failed:', error);
  }
}

// Example 3: Testing with null next due date
export async function testWithNullNextDueDate() {
  try {
    await saveComplianceDocument({
      buildingId: 123,
      complianceAssetId: 'asbestos-survey',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/asbestos-survey-2024.pdf',
      title: 'Asbestos Survey Report',
      summary: 'Asbestos survey completed. No asbestos found in the building.',
      lastRenewedDate: '2024-01-10',
      nextDueDate: null // No next due date for asbestos surveys
    });
    
    console.log('✅ Null next due date test passed');
  } catch (error) {
    console.error('❌ Null next due date test failed:', error);
  }
}

// Example 4: Testing error handling with invalid data
export async function testErrorHandling() {
  const testCases = [
    {
      name: 'Missing buildingId',
      data: {
        buildingId: 0, // Invalid
        complianceAssetId: 'test-asset',
        fileUrl: 'https://example.com/test.pdf',
        title: 'Test Document',
        summary: 'Test summary',
        lastRenewedDate: '2024-01-01',
        nextDueDate: '2025-01-01'
      }
    },
    {
      name: 'Invalid date format',
      data: {
        buildingId: 123,
        complianceAssetId: 'test-asset',
        fileUrl: 'https://example.com/test.pdf',
        title: 'Test Document',
        summary: 'Test summary',
        lastRenewedDate: 'invalid-date', // Invalid format
        nextDueDate: '2025-01-01'
      }
    },
    {
      name: 'Missing required fields',
      data: {
        buildingId: 123,
        complianceAssetId: '', // Empty string
        fileUrl: 'https://example.com/test.pdf',
        title: 'Test Document',
        summary: 'Test summary',
        lastRenewedDate: '2024-01-01',
        nextDueDate: '2025-01-01'
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      await saveComplianceDocument(testCase.data as any);
      console.log(`❌ ${testCase.name} should have failed but didn't`);
    } catch (error) {
      console.log(`✅ ${testCase.name} correctly failed with error:`, error instanceof Error ? error.message : error);
    }
  }
}

// Example 5: Integration with AI extraction results
export async function testWithAIExtraction() {
  // Simulate AI extraction results
  const aiExtractionResult = {
    title: 'Gas Safety Certificate',
    summary: 'Annual gas safety inspection completed. All gas appliances are safe and compliant.',
    last_renewed_date: '2024-05-12',
    next_due_date: '2025-05-12',
    compliance_issues: 'None found'
  };

  try {
    await saveComplianceDocument({
      buildingId: 123,
      complianceAssetId: 'gas-safety-certificate',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/gas-safety-2024.pdf',
      title: aiExtractionResult.title,
      summary: aiExtractionResult.summary,
      lastRenewedDate: aiExtractionResult.last_renewed_date,
      nextDueDate: aiExtractionResult.next_due_date
    });
    
    console.log('✅ AI extraction integration test passed');
  } catch (error) {
    console.error('❌ AI extraction integration test failed:', error);
  }
}

// Example 6: Batch processing multiple documents
export async function testBatchProcessing() {
  const documents = [
    {
      buildingId: 123,
      complianceAssetId: 'eicr-certificate',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/eicr-2024.pdf',
      title: 'Electrical Installation Condition Report',
      summary: 'EICR inspection completed',
      lastRenewedDate: '2024-06-15',
      nextDueDate: '2029-06-15'
    },
    {
      buildingId: 123,
      complianceAssetId: 'fire-safety-assessment',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/fire-assessment-2024.pdf',
      title: 'Fire Safety Assessment',
      summary: 'Fire safety assessment completed',
      lastRenewedDate: '2024-03-20',
      nextDueDate: '2025-03-20'
    },
    {
      buildingId: 123,
      complianceAssetId: 'gas-safety-certificate',
      fileUrl: 'https://supabase.co/storage/v1/object/public/documents/gas-safety-2024.pdf',
      title: 'Gas Safety Certificate',
      summary: 'Gas safety inspection completed',
      lastRenewedDate: '2024-05-12',
      nextDueDate: '2025-05-12'
    }
  ];

  const results = [];
  
  for (const doc of documents) {
    try {
      await saveComplianceDocument(doc);
      results.push({ success: true, assetId: doc.complianceAssetId });
    } catch (error) {
      results.push({ 
        success: false, 
        assetId: doc.complianceAssetId, 
        error: error instanceof Error ? error.message : error 
      });
    }
  }

  console.log('Batch processing results:', results);
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Batch processing completed: ${successCount} successful, ${failureCount} failed`);
}

// Run all tests
export async function runAllTests() {
  console.log('🧪 Starting saveComplianceDocument tests...\n');
  
  await testBasicUsage();
  await testUpsertUsage();
  await testWithNullNextDueDate();
  await testErrorHandling();
  await testWithAIExtraction();
  await testBatchProcessing();
  
  console.log('\n🏁 All tests completed');
}

// Uncomment to run tests
// runAllTests().catch(console.error); 