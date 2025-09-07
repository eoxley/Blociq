/**
 * Outlook Add-in Command Handlers
 * 
 * Contains all the command functions referenced in the manifest.xml
 * for the BlocIQ Assistant Outlook Add-in.
 */

// Global variables for Office.js
declare const Office: any;

// Import diagnostics
import { diagnostics } from './diagnostics';

/**
 * Show chat pane for read messages
 */
export function showChatPane(event: any) {
  try {
    console.log('[BlocIQ Add-in] showChatPane started');
    
    // Run diagnostics
    diagnostics.printEnvironment();
    diagnostics.probeCapabilities();
    
    // Try to show as taskpane with pinning support
    if (Office.addin && typeof Office.addin.showAsTaskpane === 'function') {
      Office.addin.showAsTaskpane().then(() => {
        console.log('[BlocIQ Add-in] Taskpane shown with pinning');
        event.completed();
      }).catch((error) => {
        console.warn('[BlocIQ Add-in] showAsTaskpane failed, falling back to dialog:', error);
        // Fallback to dialog
        Office.context.ui.displayDialogAsync(
          location.origin + '/addin/taskpane.html', 
          { height: 50, width: 35 }
        ).then(() => {
          console.log('[BlocIQ Add-in] Fallback dialog shown');
          event.completed();
        }).catch((dialogError) => {
          console.error('[BlocIQ Add-in] Dialog fallback failed:', dialogError);
          event.completed();
        });
      });
    } else {
      // Fallback to dialog
      Office.context.ui.displayDialogAsync(
        location.origin + '/addin/taskpane.html', 
        { height: 50, width: 35 }
      ).then(() => {
        console.log('[BlocIQ Add-in] Dialog shown (no taskpane support)');
        event.completed();
      }).catch((dialogError) => {
        console.error('[BlocIQ Add-in] Dialog failed:', dialogError);
        event.completed();
      });
    }
    
  } catch (error) {
    console.error('[BlocIQ Add-in] showChatPane error:', error);
    event.completed();
  }
}

/**
 * Show chat pane for compose messages
 */
export function showChatPaneCompose(event: any) {
  try {
    console.log('[BlocIQ Add-in] showChatPaneCompose started');
    
    // Run diagnostics
    diagnostics.printEnvironment();
    diagnostics.probeCapabilities();
    
    // Try to show as taskpane with pinning support
    if (Office.addin && typeof Office.addin.showAsTaskpane === 'function') {
      Office.addin.showAsTaskpane().then(() => {
        console.log('[BlocIQ Add-in] Compose taskpane shown with pinning');
        event.completed();
      }).catch((error) => {
        console.warn('[BlocIQ Add-in] showAsTaskpane failed, falling back to dialog:', error);
        // Fallback to dialog
        Office.context.ui.displayDialogAsync(
          location.origin + '/addin/taskpane.html', 
          { height: 50, width: 35 }
        ).then(() => {
          console.log('[BlocIQ Add-in] Compose fallback dialog shown');
          event.completed();
        }).catch((dialogError) => {
          console.error('[BlocIQ Add-in] Compose dialog fallback failed:', dialogError);
          event.completed();
        });
      });
    } else {
      // Fallback to dialog
      Office.context.ui.displayDialogAsync(
        location.origin + '/addin/taskpane.html', 
        { height: 50, width: 35 }
      ).then(() => {
        console.log('[BlocIQ Add-in] Compose dialog shown (no taskpane support)');
        event.completed();
      }).catch((dialogError) => {
        console.error('[BlocIQ Add-in] Compose dialog failed:', dialogError);
        event.completed();
      });
    }
    
  } catch (error) {
    console.error('[BlocIQ Add-in] showChatPaneCompose error:', error);
    event.completed();
  }
}

/**
 * Generate AI reply from read message
 */
export async function onGenerateReplyFromRead(event: Office.AddinCommands.Event) {
  try {
    console.log('[BlocIQ Add-in] onGenerateReplyFromRead started');
    
    // Run diagnostics
    diagnostics.printEnvironment();
    diagnostics.probeCapabilities();
    
    const item = Office.context.mailbox.item as Office.MessageRead;
    
    if (!item) {
      throw new Error('No mailbox item available');
    }
    
    // Check if we're in the right context
    if (item.itemType !== 'message') {
      throw new Error('Not in message context');
    }

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
    
    console.log('[BlocIQ Add-in] Context collected:', context);

    // Send to existing Ask AI endpoint
    const res = await fetch("/api/ask-ai", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(context),
    });
    
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('[BlocIQ Add-in] API response received');
    
    if (!data.success) {
      throw new Error(data.error || 'API returned error');
    }
    
    const draftHtml = data.text || data.response || data.answer;
    
    if (!draftHtml) {
      throw new Error('No draft content received');
    }

    // Open reply form
    await item.displayReplyForm("");
    
    // Wait for compose surface to be ready
    await new Promise(resolve => setTimeout(resolve, 350));
    
    // Get the compose item
    const composeItem = Office.context.mailbox.item;
    
    if (!composeItem || !composeItem.body) {
      throw new Error('Compose surface not ready');
    }
    
    // Set the draft content with retry
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          composeItem.body.setAsync(
            draftHtml,
            { coercionType: Office.CoercionType.Html },
            (result) => {
              if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result);
              } else {
                reject(new Error(result.error?.message || 'setAsync failed'));
              }
            }
          );
        });
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }
        console.warn(`[BlocIQ Add-in] setAsync retry ${retryCount}/${maxRetries}:`, error);
        await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
      }
    }
    
    console.log('[BlocIQ Add-in] Draft injected successfully');
    
    // Show success notification
    if (item.notificationMessages) {
      item.notificationMessages.replaceAsync("bqSuccess", {
        type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
        message: "AI reply generated successfully",
        icon: "icon16",
        persistent: false,
      });
    }
    
  } catch (err) {
    console.error('[BlocIQ Add-in] onGenerateReplyFromRead error:', err);
    
    // Show error notification
    if (Office.context.mailbox.item?.notificationMessages) {
      Office.context.mailbox.item.notificationMessages.replaceAsync("bqError", {
        type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
        message: "Failed to generate reply. Please try again.",
        icon: "icon16",
        persistent: false,
      });
    }
  } finally {
    // Always complete the event
    if (event && typeof event.completed === 'function') {
      event.completed();
    }
  }
}

/**
 * Generate AI reply into compose message
 */
export async function onGenerateIntoCompose(event: Office.AddinCommands.Event) {
  try {
    console.log('[BlocIQ Add-in] onGenerateIntoCompose started');
    
    // Run diagnostics
    diagnostics.printEnvironment();
    diagnostics.probeCapabilities();
    
    const item = Office.context.mailbox.item as Office.MessageCompose;
    
    if (!item) {
      throw new Error('No mailbox item available');
    }
    
    // Check if we're in compose context
    if (item.itemType !== 'message' || !item.body) {
      throw new Error('Not in compose context');
    }

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
    
    console.log('[BlocIQ Add-in] Compose context collected');

    // Send to existing Ask AI endpoint
    const res = await fetch("/api/ask-ai", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(context),
    });
    
    if (!res.ok) {
      throw new Error(`API request failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('[BlocIQ Add-in] API response received');
    
    if (!data.success) {
      throw new Error(data.error || 'API returned error');
    }
    
    const draftHtml = data.text || data.response || data.answer;
    
    if (!draftHtml) {
      throw new Error('No draft content received');
    }

    // Set the draft content with retry
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        await new Promise((resolve, reject) => {
          item.body.setAsync(
            draftHtml,
            { coercionType: Office.CoercionType.Html },
            (result) => {
              if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result);
              } else {
                reject(new Error(result.error?.message || 'setAsync failed'));
              }
            }
          );
        });
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount > maxRetries) {
          throw error;
        }
        console.warn(`[BlocIQ Add-in] setAsync retry ${retryCount}/${maxRetries}:`, error);
        await new Promise(resolve => setTimeout(resolve, 200 * retryCount));
      }
    }
    
    console.log('[BlocIQ Add-in] Draft injected successfully');
    
    // Show success notification
    if (item.notificationMessages) {
      item.notificationMessages.replaceAsync("bqSuccess", {
        type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
        message: "AI content generated successfully",
        icon: "icon16",
        persistent: false,
      });
    }
    
  } catch (err) {
    console.error('[BlocIQ Add-in] onGenerateIntoCompose error:', err);
    
    // Show error notification
    if (Office.context.mailbox.item?.notificationMessages) {
      Office.context.mailbox.item.notificationMessages.replaceAsync("bqError", {
        type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
        message: "Failed to generate content. Please try again.",
        icon: "icon16",
        persistent: false,
      });
    }
  } finally {
    // Always complete the event
    if (event && typeof event.completed === 'function') {
      event.completed();
    }
  }
}


/**
 * Initialize the add-in
 */
export function initializeAddin() {
  console.log('[BlocIQ Add-in] Initialized');
  
  // Run initial diagnostics
  diagnostics.printEnvironment();
  diagnostics.probeCapabilities();
  
  // Set up any global event handlers
  Office.context.mailbox.addHandlerAsync(
    Office.EventType.ItemChanged,
    (event: any) => {
      console.log('[BlocIQ Add-in] Item changed:', event);
    }
  );
}

// Bind functions to window for Outlook to find them
// @ts-ignore
(window as any).onGenerateReplyFromRead = onGenerateReplyFromRead;
// @ts-ignore
(window as any).onGenerateIntoCompose = onGenerateIntoCompose;
// @ts-ignore
(window as any).showChatPane = showChatPane;
// @ts-ignore
(window as any).showChatPaneCompose = showChatPaneCompose;

// Initialize when the add-in loads
if (typeof Office !== 'undefined') {
  initializeAddin();
}

console.log('[BlocIQ Add-in] Commands loaded and bound to window');
