const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testDocumentModes() {
  console.log('🧪 Testing Document Generation Modes...\n');

  // Test 1: Letter mode
  console.log('1. Testing Letter Mode...');
  try {
    const letterResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Generate a letter about noise complaints',
        mode: 'letter',
        building_id: '1',
        template_hint: 'noise complaint',
        extra_fields: {
          issue_date: '15/01/2024',
          specific_issue: 'Loud music after 11pm'
        }
      })
    });
    
    const letterData = await letterResponse.json();
    console.log('✅ Letter Response:', {
      title: letterData.title,
      template_id: letterData.template_id,
      placeholders_used: letterData.placeholders_used?.length,
      missing_placeholders: letterData.missing_placeholders?.length,
      has_html: !!letterData.html
    });
  } catch (error) {
    console.log('❌ Letter Test Failed:', error.message);
  }

  // Test 2: Minutes mode
  console.log('\n2. Testing Minutes Mode...');
  try {
    const minutesResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Generate meeting minutes',
        mode: 'minutes',
        building_id: '1',
        notes: 'Discussed noise complaints, agreed to send warning letters. Budget review scheduled for next month.',
        attendees: ['John Smith', 'Jane Doe', 'Mike Johnson'],
        date: '15/01/2024'
      })
    });
    
    const minutesData = await minutesResponse.json();
    console.log('✅ Minutes Response:', {
      title: minutesData.title,
      date: minutesData.date,
      attendees_count: minutesData.attendees?.length,
      agenda_count: minutesData.agenda?.length,
      minutes_count: minutesData.minutes?.length,
      has_summary: !!minutesData.summary,
      has_html: !!minutesData.html
    });
  } catch (error) {
    console.log('❌ Minutes Test Failed:', error.message);
  }

  // Test 3: Agenda mode
  console.log('\n3. Testing Agenda Mode...');
  try {
    const agendaResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Create agenda for monthly residents meeting',
        mode: 'agenda',
        building_id: '1',
        timebox_minutes: 60
      })
    });
    
    const agendaData = await agendaResponse.json();
    console.log('✅ Agenda Response:', {
      title: agendaData.title,
      agenda_count: agendaData.agenda?.length,
      timebox_minutes: agendaData.timebox_minutes,
      has_html: !!agendaData.html
    });
  } catch (error) {
    console.log('❌ Agenda Test Failed:', error.message);
  }

  // Test 4: Email mode
  console.log('\n4. Testing Email Mode...');
  try {
    const emailResponse = await fetch(`${BASE_URL}/api/ask-blociq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Generate email about lift maintenance',
        mode: 'email',
        building_id: '1',
        template_hint: 'maintenance notice',
        extra_fields: {
          maintenance_date: '20/01/2024',
          duration: '2 hours'
        }
      })
    });
    
    const emailData = await emailResponse.json();
    console.log('✅ Email Response:', {
      title: emailData.title,
      template_id: emailData.template_id,
      placeholders_used: emailData.placeholders_used?.length,
      missing_placeholders: emailData.missing_placeholders?.length,
      has_html: !!emailData.html,
      proposed_actions: emailData.proposed_actions?.length
    });
  } catch (error) {
    console.log('❌ Email Test Failed:', error.message);
  }

  console.log('\n🎉 Document Generation Mode Tests Complete!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testDocumentModes().catch(console.error);
}

module.exports = { testDocumentModes };
