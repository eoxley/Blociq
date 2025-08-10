const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testInboxActions() {
  console.log('🧪 Testing Inbox Actions Wiring...\n');

  // Test 1: Test draft mode with thread context
  console.log('1. Testing Draft Mode with Thread Context...');
  try {
    const draftResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Generate the reply in the property manager tone.",
        mode: "draft",
        action: "reply",
        email_id: "test-email-123",
        building_id: "test-building-456",
        include_thread: true
      })
    });
    
    const draftData = await draftResponse.json();
    console.log('✅ Draft Response:', {
      has_answer: !!draftData.answer,
      has_subject: !!draftData.subject,
      has_recipients: !!draftData.recipients,
      has_citations: draftData.citations?.length || 0,
      has_proposed_actions: draftData.proposed_actions?.length || 0
    });
  } catch (error) {
    console.log('❌ Draft Mode Test Failed:', error.message);
  }

  // Test 2: Test reply action
  console.log('\n2. Testing Reply Action...');
  try {
    const replyResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Generate the reply in the property manager tone.",
        mode: "draft",
        action: "reply",
        email_id: "test-email-123",
        building_id: "test-building-456",
        include_thread: true
      })
    });
    
    const replyData = await replyResponse.json();
    if (replyData.recipients) {
      console.log('✅ Reply Recipients:', {
        to: replyData.recipients.to,
        cc: replyData.recipients.cc,
        subject: replyData.recipients.subject
      });
    }
  } catch (error) {
    console.log('❌ Reply Action Test Failed:', error.message);
  }

  // Test 3: Test reply_all action
  console.log('\n3. Testing Reply All Action...');
  try {
    const replyAllResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Generate the reply in the property manager tone.",
        mode: "draft",
        action: "reply_all",
        email_id: "test-email-123",
        building_id: "test-building-456",
        include_thread: true
      })
    });
    
    const replyAllData = await replyAllResponse.json();
    if (replyAllData.recipients) {
      console.log('✅ Reply All Recipients:', {
        to: replyAllData.recipients.to,
        cc: replyAllData.recipients.cc,
        subject: replyAllData.recipients.subject
      });
    }
  } catch (error) {
    console.log('❌ Reply All Action Test Failed:', error.message);
  }

  // Test 4: Test forward action
  console.log('\n4. Testing Forward Action...');
  try {
    const forwardResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Generate the reply in the property manager tone.",
        mode: "draft",
        action: "forward",
        email_id: "test-email-123",
        building_id: "test-building-456",
        include_thread: true
      })
    });
    
    const forwardData = await forwardResponse.json();
    if (forwardData.recipients) {
      console.log('✅ Forward Recipients:', {
        to: forwardData.recipients.to,
        cc: forwardData.recipients.cc,
        subject: forwardData.recipients.subject
      });
    }
  } catch (error) {
    console.log('❌ Forward Action Test Failed:', error.message);
  }

  // Test 5: Test tools/send-email endpoint
  console.log('\n5. Testing Send Email Tool...');
  try {
    const sendEmailResponse = await fetch(`${BASE_URL}/api/tools/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: ["test@example.com"],
        subject: "Test AI Draft",
        html_body: "<p>This is a test AI draft.</p>",
        save_to_drafts: true,
        reply_to_id: "test-email-123"
      })
    });
    
    const sendEmailData = await sendEmailResponse.json();
    console.log('✅ Send Email Response:', {
      ok: sendEmailData.ok,
      mode: sendEmailData.mode,
      has_outlook_id: !!sendEmailData.outlook_id
    });
  } catch (error) {
    console.log('❌ Send Email Tool Test Failed:', error.message);
  }

  console.log('\n🎉 Inbox Actions Tests Complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testInboxActions().catch(console.error);
}

module.exports = { testInboxActions };
