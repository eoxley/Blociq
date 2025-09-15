/**
 * BlocIQ Generate Reply - Command Handlers
 * 
 * This file contains the command handlers for the BlocIQ Generate Reply Outlook add-in.
 * It handles the ribbon button click and calls the BlocIQ API to generate draft replies.
 */

// Global variable to track if Office.js is ready
let isOfficeReady = false;

// Initialize Office.js
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    isOfficeReady = true;
    console.log('BlocIQ Generate Reply: Office.js ready');
  }
});

/**
 * Generate Reply Command Handler
 * Called when the "Generate Reply" button is clicked in the Outlook ribbon
 */
function generateReply(event: Office.AddinCommands.Event) {
  console.log('BlocIQ Generate Reply: Button clicked');

  // Ensure Office.js is ready
  if (!isOfficeReady) {
    console.error('BlocIQ Generate Reply: Office.js not ready');
    event.completed({ allowEventOnError: false });
    return;
  }

  // Get the current email item
  const item = Office.context.mailbox.item;
  
  if (!item) {
    console.error('BlocIQ Generate Reply: No email item found');
    event.completed({ allowEventOnError: false });
    return;
  }

  // Show loading state
  showLoadingState();

  // Get email context
  getEmailContext()
    .then(context => {
      console.log('BlocIQ Generate Reply: Email context retrieved', context);
      return callBlocIQAPI(context);
    })
    .then(draftReply => {
      console.log('BlocIQ Generate Reply: Draft received', draftReply);
      return insertDraftIntoEmail(draftReply);
    })
    .then(() => {
      console.log('BlocIQ Generate Reply: Draft inserted successfully');
      showSuccessState();
      event.completed({ allowEventOnError: false });
    })
    .catch(error => {
      console.error('BlocIQ Generate Reply: Error occurred', error);
      showErrorState(error.message);
      event.completed({ allowEventOnError: false });
    });
}

/**
 * Get email context (subject, body, sender info)
 */
async function getEmailContext(): Promise<any> {
  return new Promise((resolve, reject) => {
    const item = Office.context.mailbox.item;
    
    if (!item) {
      reject(new Error('No email item available'));
      return;
    }

    // Get email properties
    const context = {
      subject: item.subject || '',
      body: '',
      sender: '',
      recipient: '',
      timestamp: new Date().toISOString()
    };

    // Get email body
    item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        context.body = result.value || '';
      }

      // Get sender information
      if (item.from) {
        context.sender = item.from.emailAddress || '';
      }

      // Get recipient information
      if (item.to && item.to.length > 0) {
        context.recipient = item.to[0].emailAddress || '';
      }

      resolve(context);
    });
  });
}

/**
 * Call BlocIQ API to generate draft reply
 */
async function callBlocIQAPI(context: any): Promise<string> {
  try {
    const response = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        emailContext: context,
        prompt: `Generate a professional reply to this email about property management. 
                 Subject: ${context.subject}
                 From: ${context.sender}
                 Content: ${context.body}
                 
                 Please provide a concise, professional response that addresses the sender's inquiry.`
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate draft');
    }

    return data.draft || 'Thank you for your email. I will review your inquiry and get back to you shortly.';
  } catch (error) {
    console.error('BlocIQ Generate Reply: API call failed', error);
    throw new Error('Failed to generate AI reply. Please try again.');
  }
}

/**
 * Insert the generated draft into the email body
 */
async function insertDraftIntoEmail(draft: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const item = Office.context.mailbox.item;
    
    if (!item) {
      reject(new Error('No email item available'));
      return;
    }

    // Insert the draft into the email body
    item.body.setAsync(draft, { coercionType: Office.CoercionType.Html }, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve();
      } else {
        reject(new Error('Failed to insert draft into email'));
      }
    });
  });
}

/**
 * Show loading state (optional - could show a notification)
 */
function showLoadingState() {
  // In a real implementation, you might show a notification or update the button state
  console.log('BlocIQ Generate Reply: Generating draft...');
}

/**
 * Show success state (optional - could show a notification)
 */
function showSuccessState() {
  // In a real implementation, you might show a success notification
  console.log('BlocIQ Generate Reply: Draft generated successfully');
}

/**
 * Show error state (optional - could show a notification)
 */
function showErrorState(message: string) {
  // In a real implementation, you might show an error notification
  console.error('BlocIQ Generate Reply: Error -', message);
}

// Make the function globally available
(global as any).generateReply = generateReply;
