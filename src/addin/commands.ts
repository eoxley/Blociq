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
    const item = Office.context.mailbox.item as Office.MessageRead;

    // Collect thread context
    const context = {
      subject: item.subject,
      from: item.from?.emailAddress,
      to: item.to?.map(t => t.emailAddress) || [],
      cc: item.cc?.map(c => c.emailAddress) || [],
      bodyPreview: item.bodyPreview, // short preview
      internetMessageId: item.internetMessageId, // unique thread ID
      intent: "REPLY",
    };

    // Send to existing Ask AI endpoint
    const res = await fetch("/api/ask-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    const { text: draftHtml } = await res.json();

    // Open reply form + inject draft
    await item.displayReplyForm(""); // reply only (swap for replyAll if needed)
    setTimeout(() => {
      (Office.context.mailbox.item as Office.MessageCompose).body.setAsync(
        draftHtml,
        { coercionType: Office.CoercionType.Html },
        () => event.completed()
      );
    }, 300);
  } catch (err) {
    Office.context.mailbox.item.notificationMessages.replaceAsync("bqFail", {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: "Couldn't generate a reply. Please try again.",
      icon: "icon16",
      persistent: false,
    }, () => event.completed());
  }
}

/**
 * Generate AI reply into compose message
 */
export async function onGenerateIntoCompose(event: Office.AddinCommands.Event) {
  try {
    const item = Office.context.mailbox.item as Office.MessageCompose;

    // Get current compose details
    const subject = await new Promise<string>((resolve) => {
      item.subject.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value || '');
        } else {
          resolve('');
        }
      });
    });
    
    const toRecipients = await new Promise<string[]>((resolve) => {
      item.to.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value.map(r => r.emailAddress));
        } else {
          resolve([]);
        }
      });
    });
    
    const ccRecipients = await new Promise<string[]>((resolve) => {
      item.cc.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value.map(r => r.emailAddress));
        } else {
          resolve([]);
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

    // Collect thread context for compose
    const context = {
      subject: subject || 'New message',
      from: 'Compose message',
      to: toRecipients,
      cc: ccRecipients,
      bodyPreview: bodyPreview,
      internetMessageId: null, // No thread ID for new compose
      intent: "REPLY",
    };

    // Send to existing Ask AI endpoint
    const res = await fetch("/api/ask-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    const { text: draftHtml } = await res.json();

    // Insert the reply into the current compose body
    item.body.setAsync(
      draftHtml,
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
    
  } catch (err) {
    Office.context.mailbox.item.notificationMessages.replaceAsync("bqFail", {
      type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
      message: "Couldn't generate a reply. Please try again.",
      icon: "icon16",
      persistent: false,
    }, () => event.completed());
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
