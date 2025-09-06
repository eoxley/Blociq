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

    // Grab minimal context
    const context = {
      subject: item.subject,
      from: item.from?.emailAddress,
      bodyPreview: item.bodyPreview,
      intent: "REPLY",
    };

    // Call your existing Ask BlocIQ AI
    const res = await fetch("/api/ask-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
    const { text: draftHtml } = await res.json();

    // Open a reply form and inject the draft
    await item.displayReplyForm(""); // reply (not reply-all)
    setTimeout(() => {
      (Office.context.mailbox.item as Office.MessageCompose).body.setAsync(
        draftHtml,
        { coercionType: Office.CoercionType.Html },
        () => event.completed()
      );
    }, 300);
  } catch (e) {
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
    
    const bodyPreview = await new Promise<string>((resolve) => {
      item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value?.substring(0, 200) || '');
        } else {
          resolve('');
        }
      });
    });

    // Grab minimal context
    const context = {
      subject: subject || 'New message',
      from: 'Compose message',
      bodyPreview: bodyPreview,
      intent: "REPLY",
    };

    // Call your existing Ask BlocIQ AI
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
    
  } catch (e) {
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
