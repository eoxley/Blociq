// BlocIQ Reply Add-in Function Handlers
// This file contains the functions for the reply generation add-in only

Office.onReady(() => {
  console.log('🔌 BlocIQ Reply function handlers loaded');
  
  try {
    // Register the reply function with Office.js
    Office.actions.associate("generateBlocIQReply", generateBlocIQReply);
    console.log('✅ Reply function registered: generateBlocIQReply');
  } catch (error) {
    console.error('❌ Error registering reply function:', error);
  }
});

/**
 * Generate contextual reply using BlocIQ AI and insert into compose window
 * Called when user clicks the "Generate Reply" button in compose window
 */
function generateBlocIQReply(event) {
  console.log('🤖 BlocIQ Reply: Starting AI reply generation...');

  try {
    // Get user email from Outlook context
    const userEmail = Office.context.mailbox.userProfile.emailAddress;

    if (!userEmail) {
      console.error('❌ No user email available from Office context');
      showError('Unable to get user email. Please ensure you are signed into Outlook.');
      event.completed();
      return;
    }

    console.log('👤 User email:', userEmail);

    // Get current email context for better AI responses
    const emailContext = getCurrentEmailContext();
    console.log('📧 Email context:', emailContext);

    // Prepare the question for the AI
    let question = "Generate a professional property management email reply";

    // Add context if available
    if (emailContext && emailContext.subject) {
      question += ` for email with subject: "${emailContext.subject}"`;
    }

    // Show loading state
    console.log('🔄 Calling BlocIQ AI API...');

    // Call the BlocIQ AI API
    fetch('https://www.blociq.co.uk/api/ask-ai-outlook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail
      },
      body: JSON.stringify({
        question: question,
        contextType: 'outlook_reply',
        is_outlook_addin: true,
        emailContext: emailContext
      })
    })
    .then(response => {
      console.log('📥 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      return response.json();
    })
    .then(data => {
      console.log('📥 API Response data:', data);

      if (data.ok && data.answer) {
        console.log('✅ AI reply generated successfully');

        // Insert the AI-generated reply into the email body
        Office.context.mailbox.item.body.setSelectedDataAsync(
          data.answer,
          {
            coercionType: Office.CoercionType.Html,
            asyncContext: { action: 'insertBlocIQReply' }
          },
          (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              console.log('✅ BlocIQ reply inserted successfully');
              showSuccess('BlocIQ AI reply has been inserted into your email.');
            } else {
              console.error('❌ Failed to insert BlocIQ reply:', result.error);
              showError('Failed to insert the generated reply. You can copy and paste it manually: ' + data.answer);
            }
          }
        );

      } else {
        console.error('❌ Invalid API response:', data);
        showError(data.error || 'Failed to generate AI reply. Please try again.');
      }
    })
    .catch(error => {
      console.error('❌ BlocIQ API call failed:', error);

      // Provide specific error messages
      if (error.message.includes('401')) {
        showError('Authentication failed. Please ensure you have access to BlocIQ.');
      } else if (error.message.includes('403')) {
        showError('Access denied. Please check your BlocIQ account permissions.');
      } else if (error.message.includes('500') || error.message.includes('503')) {
        showError('BlocIQ service temporarily unavailable. Please try again in a few moments.');
      } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        showError('Network connection failed. Please check your internet connection.');
      } else {
        showError('Failed to generate reply: ' + error.message + '. Please try again.');
      }
    })
    .finally(() => {
      // Always complete the event
      event.completed();
    });

  } catch (error) {
    console.error('❌ Error in generateBlocIQReply:', error);
    showError('Unexpected error generating reply: ' + error.message);
    event.completed();
  }
}

/**
 * Helper function to get current email context
 */
function getCurrentEmailContext() {
  try {
    const item = Office.context.mailbox.item;
    if (!item) {
      console.warn('⚠️ No email item available');
      return null;
    }

    const context = {
      subject: item.subject || 'No subject',
      itemId: item.itemId || null,
      itemType: item.itemType || 'message',
    };

    // Get sender information
    if (item.from) {
      context.from = {
        email: item.from.emailAddress || 'Unknown',
        name: item.from.displayName || 'Unknown sender'
      };
    }

    // Get recipient information
    if (item.to && Array.isArray(item.to)) {
      context.to = item.to.map(recipient => ({
        email: recipient.emailAddress || recipient,
        name: recipient.displayName || recipient
      }));
    }

    // Get CC recipients if available
    if (item.cc && Array.isArray(item.cc)) {
      context.cc = item.cc.map(recipient => ({
        email: recipient.emailAddress || recipient,
        name: recipient.displayName || recipient
      }));
    }

    // Get email body if available
    if (item.body) {
      try {
        const bodyData = new Promise((resolve, reject) => {
          item.body.getAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve(result.value);
            } else {
              reject(result.error);
            }
          });
        });
        context.body = bodyData;
      } catch (bodyError) {
        console.warn('Could not get email body:', bodyError);
      }
    }

    return context;

  } catch (error) {
    console.error('❌ Error getting email context:', error);
    return null;
  }
}

/**
 * Helper function to show success notification
 */
function showSuccess(message) {
  try {
    console.log('✅ Success:', message);
    // For now, just log - could implement toast notifications later
  } catch (error) {
    console.error('❌ Error showing success message:', error);
  }
}

/**
 * Helper function to show error notification
 */
function showError(message) {
  try {
    console.error('❌ Error:', message);
    // For now, just log - could implement toast notifications later
  } catch (error) {
    console.error('❌ Error showing error message:', error);
  }
}

console.log('📁 BlocIQ functions-reply.js loaded successfully');
