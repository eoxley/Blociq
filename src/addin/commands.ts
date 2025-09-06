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
export async function onGenerateReplyFromRead(event: Office.AddinCommands.Event) {
  try {
    console.log('Generating AI reply from read message');
    
    const item = Office.context.mailbox.item as Office.MessageRead;
    
    // Extract message details
    const context = {
      subject: item.subject,
      from: item.from?.emailAddress?.address,
      to: item.to?.map(t => t.emailAddress) || [],
      cc: item.cc?.map(c => c.emailAddress) || [],
      bodyPreview: item.bodyPreview || '',
      intent: 'REPLY'
    };
    
    console.log('Message context:', context);
    
    // Call the generate-reply API
    const response = await fetch('/api/generate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to generate reply');
    }
    
    console.log('Generated reply:', result);
    
    // Display reply form with suggested subject
    await item.displayReplyAllForm(result.subjectSuggestion || `Re: ${item.subject}`);
    
    // Set the reply body after a short delay to ensure the form is ready
    setTimeout(() => {
      const composeItem = Office.context.mailbox.item as Office.MessageCompose;
      composeItem.body.setAsync(
        result.draftHtml,
        { coercionType: Office.CoercionType.Html },
        () => {
          console.log('Reply body set successfully');
          event.completed();
        }
      );
    }, 300);
    
  } catch (error) {
    console.error('Error generating reply:', error);
    
    // Show error notification
    const item = Office.context.mailbox.item as Office.MessageRead;
    item.notificationMessages.replaceAsync('bqFail', {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: "Couldn't generate a reply. Please try again.",
      icon: 'icon16',
      persistent: false
    }, () => {
      event.completed();
    });
  }
}

/**
 * Generate AI reply into compose message
 */
export async function onGenerateIntoCompose(event: Office.AddinCommands.Event) {
  try {
    console.log('Generating AI reply into compose message');
    
    const item = Office.context.mailbox.item as Office.MessageCompose;
    
    // Get current compose details
    const toRecipients = await new Promise<string[]>((resolve) => {
      item.to.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value.map(r => r.emailAddress));
        } else {
          resolve([]);
        }
      });
    });
    
    const subject = await new Promise<string>((resolve) => {
      item.subject.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value || '');
        } else {
          resolve('');
        }
      });
    });
    
    const bodyPreview = await new Promise<string>((resolve) => {
      item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value?.substring(0, 200) || '');
        } else {
          resolve('');
        }
      });
    });
    
    // Extract compose details
    const context = {
      subject: subject || 'New message',
      from: 'Compose message',
      to: toRecipients,
      cc: [],
      bodyPreview: bodyPreview,
      intent: 'REPLY'
    };
    
    console.log('Compose context:', context);
    
    // Call the generate-reply API
    const response = await fetch('/api/generate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to generate reply');
    }
    
    console.log('Generated reply:', result);
    
    // Insert the reply into the current compose body
    item.body.setAsync(
      result.draftHtml,
      { coercionType: Office.CoercionType.Html },
      (result: any) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('Reply inserted into compose body');
        } else {
          console.error('Failed to insert reply:', result.error);
        }
        event.completed();
      }
    );
    
  } catch (error) {
    console.error('Error generating reply:', error);
    
    // Show error notification
    const item = Office.context.mailbox.item as Office.MessageCompose;
    item.notificationMessages.replaceAsync('bqFail', {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: "Couldn't generate a reply. Please try again.",
      icon: 'icon16',
      persistent: false
    }, () => {
      event.completed();
    });
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
