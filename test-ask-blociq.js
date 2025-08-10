// Test script for Ask BlocIQ implementation
// Run with: node test-ask-blociq.js

const BASE_URL = 'http://localhost:3000';

async function testAskBlocIQ() {
  console.log('🧪 Testing Ask BlocIQ Implementation...\n');

  // Test 1: Admin embed chunks endpoint
  console.log('1. Testing /api/admin/embed-chunks...');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/embed-chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': 'blociq-admin-2024'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${data.embedded} chunks embedded`);
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 2: Ask BlocIQ draft mode
  console.log('\n2. Testing /api/ask-blociq mode:"draft"...');
  try {
    const response = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Generate a professional email reply to a leaseholder complaint about noise',
        mode: 'draft',
        building_id: 'test-building-123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success: Draft generated');
      console.log(`   Subject: ${data.subject}`);
      console.log(`   Answer length: ${data.answer?.length || 0} chars`);
      console.log(`   Citations: ${data.citations?.length || 0}`);
      console.log(`   Proposed actions: ${data.proposed_actions?.length || 0}`);
    } else {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 3: Ask BlocIQ triage mode
  console.log('\n3. Testing /api/ask-blociq mode:"triage"...');
  try {
    const response = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Triage this inbox thread about a maintenance request',
        mode: 'triage',
        building_id: 'test-building-123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success: Triage completed');
      console.log(`   Answer: ${data.answer?.substring(0, 100)}...`);
      console.log(`   Citations: ${data.citations?.length || 0}`);
      console.log(`   Proposed actions: ${data.proposed_actions?.length || 0}`);
    } else {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 4: Create task tool
  console.log('\n4. Testing /api/tools/create-task...');
  try {
    const response = await fetch(`${BASE_URL}/api/tools/create-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        building_id: 'test-building-123',
        title: 'Test task from AI',
        description: 'This is a test task created by the AI system',
        priority: 'Medium'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success: Task created');
      console.log(`   Task ID: ${data.id}`);
      console.log(`   Title: ${data.title}`);
    } else {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Test 5: Send email tool
  console.log('\n5. Testing /api/tools/send-email...');
  try {
    const response = await fetch(`${BASE_URL}/api/tools/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: ['test@example.com'],
        subject: 'Test email from AI',
        html_body: '<p>This is a test email created by the AI system.</p>',
        save_to_drafts: true
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success: Email draft created');
      console.log(`   Mode: ${data.mode}`);
      console.log(`   Outlook ID: ${data.outlook_id}`);
    } else {
      const error = await response.text();
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n🎉 Test completed!');
}

// Run the test
testAskBlocIQ().catch(console.error);
