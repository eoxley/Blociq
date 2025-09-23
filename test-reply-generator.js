// Test script for BlocIQ Reply Generator
const testReplyGenerator = async () => {
  try {
    const testPayload = {
      question: "Generate a professional property management email reply regarding maintenance/repair issues for building \"Ashwood House\" unit \"Flat 13\". Address the concerns raised and provide clear next steps with timelines.",
      building: "Ashwood House",
      unit: "Flat 13",
      contextType: "outlook_reply",
      is_outlook_addin: true,
      email_subject: "Cleaning Complaint",
      email_body: "Hello, The communal hallways at Ashwood House have not been cleaned properly for several weeks. Please can you confirm when the cleaner is next scheduled to attend? Many thanks, Mia Garcia Flat 13",
      sender_info: {
        name: "Mia Garcia",
        email: "mia.garcia@example.com",
        is_leaseholder: true
      },
      recipient_info: {
        to: [{ name: "Eleanor Oxley", email: "eleanor.oxley@blociq.co.uk" }]
      },
      compliance_context: true,
      leaseholder_context: true,
      diary_context: true
    };

    console.log('Testing BlocIQ Reply Generator...');
    console.log('Test scenario: Mia Garcia cleaning complaint for Flat 13, Ashwood House');

    const response = await fetch('http://localhost:3001/api/ask-ai-outlook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': 'eleanor.oxley@blociq.co.uk'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();

    console.log('\n=== RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Success:', result.ok);

    if (result.ok && result.answer) {
      console.log('\n=== GENERATED REPLY ===');
      console.log(result.answer);

      console.log('\n=== VALIDATION CHECKS ===');

      // Check for proper salutation
      if (result.answer.includes('Dear Mia,')) {
        console.log('✅ GOOD: Proper salutation "Dear Mia," found');
      } else if (result.answer.includes('Dear [')) {
        console.log('❌ PROBLEM: Still using placeholder "[Resident\'s Name]"');
      } else {
        console.log('⚠️ WARNING: Unexpected salutation format');
      }

      // Check for subject line in body
      if (result.answer.includes('Subject:')) {
        console.log('❌ PROBLEM: Subject line appears in body');
      } else {
        console.log('✅ GOOD: No subject line in body');
      }

      // Check for proper closing
      if (result.answer.includes('Ellie')) {
        console.log('✅ GOOD: Proper sign-off with "Ellie" found');
      } else if (result.answer.includes('[Your Name]')) {
        console.log('❌ PROBLEM: Still using placeholder "[Your Name]"');
      } else {
        console.log('⚠️ WARNING: Unexpected closing format');
      }

      // Check for placeholders
      const placeholders = ['[Your Position]', '[Property Management Company]', '[Your Contact Information]'];
      const foundPlaceholders = placeholders.filter(p => result.answer.includes(p));
      if (foundPlaceholders.length > 0) {
        console.log('❌ PROBLEM: Found placeholders:', foundPlaceholders);
      } else {
        console.log('✅ GOOD: No unwanted placeholders found');
      }

      // Check for thank you opening
      if (result.answer.includes('Thank you for your email regarding')) {
        console.log('✅ GOOD: Proper thank you opening found');
      } else {
        console.log('⚠️ WARNING: Missing expected thank you opening');
      }

    } else {
      console.log('❌ Error:', result.error);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testReplyGenerator();