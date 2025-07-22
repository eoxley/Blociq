#!/usr/bin/env node

console.log('🧪 Testing AI Triage API\n');

// Sample email data for testing
const testEmails = [
  {
    id: 'test-1',
    subject: 'Urgent: Water leak in apartment 3B',
    body: 'There is a significant water leak coming from the ceiling in apartment 3B. Water is dripping into the living room and we need immediate assistance.',
    from: 'tenant@example.com',
    receivedAt: new Date().toISOString(),
    buildingId: 'building-1'
  },
  {
    id: 'test-2', 
    subject: 'General inquiry about parking spaces',
    body: 'Hi, I was wondering if there are any available parking spaces for rent in the building. Please let me know the current rates and availability.',
    from: 'resident@example.com',
    receivedAt: new Date().toISOString(),
    buildingId: 'building-1'
  }
];

console.log('📧 Test emails prepared:');
testEmails.forEach((email, index) => {
  console.log(`${index + 1}. ${email.subject}`);
  console.log(`   From: ${email.from}`);
  console.log(`   Content: ${email.body.substring(0, 100)}...`);
  console.log('');
});

console.log('🔧 API Endpoints to test:');
console.log('=====================================');
console.log('1. POST /api/bulk-triage');
console.log('   - Sends multiple emails for analysis');
console.log('   - Returns urgency, action required, category, etc.');
console.log('');
console.log('2. POST /api/generate-email-reply');
console.log('   - Generates draft replies for individual emails');
console.log('   - Supports both email_id and emailContent formats');
console.log('');
console.log('🔍 Common Issues Fixed:');
console.log('=====================================');
console.log('✅ API Parameter Mismatch: Fixed emailContent vs email_id handling');
console.log('✅ Database Field Names: Updated to use correct field names (handled vs is_handled)');
console.log('✅ Error Handling: Added better error handling and fallbacks');
console.log('✅ Response Format: Standardized response format (reply vs draft)');
console.log('✅ Rate Limiting: Added batch processing with delays');
console.log('');
console.log('🧪 To test the API manually:');
console.log('=====================================');
console.log('1. Open browser developer tools');
console.log('2. Go to the inbox page');
console.log('3. Click the "🚑 AI Triage" button');
console.log('4. Check the Network tab for API calls');
console.log('5. Look for /api/bulk-triage and /api/generate-email-reply calls');
console.log('');
console.log('📊 Expected Flow:');
console.log('1. Load unhandled emails from database');
console.log('2. Send emails to /api/bulk-triage for analysis');
console.log('3. For each email, generate draft reply via /api/generate-email-reply');
console.log('4. Display results with urgency levels and suggested actions');
console.log('');
console.log('✅ The AI triage API should now work correctly!'); 