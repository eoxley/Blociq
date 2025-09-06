/**
 * Outlook Add-in Command Handlers
 * 
 * Contains all the command functions referenced in the manifest.xml
 * for the BlocIQ Assistant Outlook Add-in.
 */

// Global variables for Office.js
declare const Office: any;

/**
 * Show chat pane for read messages
 */
export function showChatPane(event: any) {
  console.log('Opening chat pane for read message');
  
  // Get the current message context
  Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result: any) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const messageBody = result.value;
      console.log('Message body:', messageBody.substring(0, 200) + '...');
      
      // Open the task pane with chat interface
      Office.ribbon.requestCreateControls([
        {
          id: 'taskpaneChat',
          type: 'TaskPane',
          title: 'BlocIQ Assistant',
          url: 'https://www.blociq.co.uk/addin/taskpane.html'
        }
      ]);
    } else {
      console.error('Failed to get message body:', result.error);
    }
  });
  
  event.completed();
}

/**
 * Show chat pane for compose messages
 */
export function showChatPaneCompose(event: any) {
  console.log('Opening chat pane for compose message');
  
  // Get the current compose context
  Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result: any) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const messageBody = result.value;
      console.log('Compose body:', messageBody.substring(0, 200) + '...');
      
      // Open the task pane with chat interface
      Office.ribbon.requestCreateControls([
        {
          id: 'taskpaneChat',
          type: 'TaskPane',
          title: 'BlocIQ Assistant',
          url: 'https://www.blociq.co.uk/addin/taskpane.html'
        }
      ]);
    } else {
      console.error('Failed to get compose body:', result.error);
    }
  });
  
  event.completed();
}

/**
 * Generate AI reply from read message
 */
export function onGenerateReplyFromRead(event: any) {
  console.log('Generating AI reply from read message');
  
  // Get message context
  const message = Office.context.mailbox.item;
  
  // Extract message details
  const messageContext = {
    from: message.from?.emailAddress?.address,
    subject: message.subject,
    receivedDateTime: message.dateTimeCreated?.toISOString(),
    bodyPreview: message.body?.preview
  };
  
  console.log('Message context:', messageContext);
  
  // Call the AI API to generate reply
  generateAIReply(messageContext)
    .then((reply) => {
      console.log('Generated reply:', reply);
      
      // Create a new compose window with the reply
      Office.context.mailbox.displayNewMessageForm({
        toRecipients: [message.from?.emailAddress?.address],
        subject: `Re: ${message.subject}`,
        htmlBody: reply.bodyHtml,
        attachments: []
      });
    })
    .catch((error) => {
      console.error('Error generating reply:', error);
      // Show error message to user
      Office.context.mailbox.item.notificationMessages.addAsync('replyError', {
        type: 'error',
        message: 'Failed to generate AI reply. Please try again.',
        icon: 'Icon.80x80',
        persistent: true
      });
    })
    .finally(() => {
      event.completed();
    });
}

/**
 * Generate AI reply into compose message
 */
export function onGenerateIntoCompose(event: any) {
  console.log('Generating AI reply into compose message');
  
  // Get compose context
  const item = Office.context.mailbox.item;
  
  // Extract compose details
  const composeContext = {
    to: item.to?.getAsync ? 'Multiple recipients' : 'Compose message',
    subject: item.subject?.getAsync ? 'Compose subject' : 'New message',
    bodyPreview: 'Compose message body'
  };
  
  console.log('Compose context:', composeContext);
  
  // Call the AI API to generate reply
  generateAIReply(composeContext)
    .then((reply) => {
      console.log('Generated reply:', reply);
      
      // Insert the reply into the current compose body
      item.body.setAsync(
        reply.bodyHtml,
        { coercionType: Office.CoercionType.Html },
        (result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Reply inserted into compose body');
          } else {
            console.error('Failed to insert reply:', result.error);
          }
        }
      );
    })
    .catch((error) => {
      console.error('Error generating reply:', error);
      // Show error message to user
      item.notificationMessages.addAsync('replyError', {
        type: 'error',
        message: 'Failed to generate AI reply. Please try again.',
        icon: 'Icon.80x80',
        persistent: true
      });
    })
    .finally(() => {
      event.completed();
    });
}

/**
 * Generate AI reply using the BlocIQ API
 */
async function generateAIReply(context: any): Promise<{ bodyHtml: string; subjectSuggestion: string }> {
  try {
    const response = await fetch('https://www.blociq.co.uk/api/addin/generate-reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInput: 'Generate a professional reply to this email',
        outlookContext: context
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to generate reply');
    }

    return {
      bodyHtml: result.bodyHtml,
      subjectSuggestion: result.subjectSuggestion
    };
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
}

/**
 * Initialize the add-in
 */
export function initializeAddin() {
  console.log('BlocIQ Assistant add-in initialized');
  
  // Set up any global event handlers
  Office.context.mailbox.addHandlerAsync(
    Office.EventType.ItemChanged,
    (event: any) => {
      console.log('Item changed:', event);
    }
  );
}

// Initialize when the add-in loads
if (typeof Office !== 'undefined') {
  initializeAddin();
}
