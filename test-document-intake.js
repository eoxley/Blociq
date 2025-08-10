const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDocumentIntake() {
  console.log('🧪 Testing Document Intake System...\n');

  // Test 1: Process document
  console.log('1. Testing Document Processing...');
  try {
    const processResponse = await fetch(`${BASE_URL}/api/documents/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: 'test-document.pdf',
        building_id: '1',
        unit_id: '2',
        leaseholder_id: '3'
      })
    });
    
    const processData = await processResponse.json();
    console.log('✅ Process Response:', {
      document_id: processData.document_id,
      file_name: processData.file_name,
      type: processData.type,
      confidence: processData.confidence,
      ocr_used: processData.ocr_used,
      is_unlinked: processData.is_unlinked
    });

    // Test 2: Confirm document
    console.log('\n2. Testing Document Confirmation...');
    const confirmResponse = await fetch(`${BASE_URL}/api/documents/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: processData.document_id,
        accepted: true,
        override: {
          building_id: '1',
          unit_id: '2'
        },
        apply_actions: ['update_compliance_dates', 'create_task']
      })
    });
    
    const confirmData = await confirmResponse.json();
    console.log('✅ Confirm Response:', {
      document_id: confirmData.document_id,
      linked: confirmData.linked,
      compliance_updated: confirmData.updates_summary.compliance_updated,
      tasks_created: confirmData.updates_summary.tasks_created,
      actions_executed: confirmData.updates_summary.actions_executed
    });

  } catch (error) {
    console.log('❌ Document Intake Test Failed:', error.message);
  }

  // Test 3: Test ingest mode directly
  console.log('\n3. Testing Ingest Mode...');
  try {
    const ingestResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'ingest',
        message: 'Analyse this document for classification, key dates, and actions.',
        file_text: 'Fire Safety Certificate issued by ABC Fire Safety Ltd. Certificate number: FS-2024-001. Issued: 15/01/2024. Expires: 15/01/2025. Amount: £500.00',
        building_id: '1'
      })
    });
    
    const ingestData = await ingestResponse.json();
    console.log('✅ Ingest Response:', {
      classification: ingestData.classification,
      confidence: ingestData.confidence,
      has_guesses: !!ingestData.guesses,
      has_extracted_fields: !!ingestData.extracted_fields,
      suggested_actions: ingestData.proposed_actions?.length
    });
  } catch (error) {
    console.log('❌ Ingest Mode Test Failed:', error.message);
  }

  console.log('\n🎉 Document Intake Tests Complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDocumentIntake().catch(console.error);
}

module.exports = { testDocumentIntake };
