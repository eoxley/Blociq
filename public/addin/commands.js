/**
 * BlocIQ Outlook Add-in Commands
 * This file is loaded by functions.html and contains all command handlers
 */

// Global error handling
window.addEventListener('error', (event) => {
    console.error('[BlocIQ Add-in] Global error:', event.error);
});

// Initialize diagnostics
let diagnostics = null;

// Load diagnostics module
(async function loadDiagnostics() {
    try {
        // Try to load diagnostics from the main app
        const diagnosticsModule = await import('https://www.blociq.co.uk/addin/diagnostics.js');
        diagnostics = diagnosticsModule.diagnostics;
        console.log('[BlocIQ Add-in] Diagnostics loaded');
    } catch (error) {
        console.warn('[BlocIQ Add-in] Diagnostics not available:', error);
        // Create a minimal diagnostics object
        diagnostics = {
            report: (status, data) => console.log(`[BlocIQ Add-in] ${status}`, data),
            printEnvironment: () => console.log('[BlocIQ Add-in] Environment check'),
            probeCapabilities: () => console.log('[BlocIQ Add-in] Capabilities check')
        };
    }
})();

// Command handlers
async function onGenerateReplyFromRead(event) {
    try {
        console.log('[BlocIQ Add-in] onGenerateReplyFromRead started');
        
        // Run diagnostics
        if (diagnostics) {
            diagnostics.printEnvironment();
            diagnostics.probeCapabilities();
        }
        
        const item = Office.context.mailbox.item;
        
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
            bodyPreview: item.bodyPreview,
            internetMessageId: item.internetMessageId,
            intent: "REPLY",
        };
        
        console.log('[BlocIQ Add-in] Context collected:', context);
        
        // Send to Ask AI endpoint
        const response = await fetch("/api/ask-ai", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(context),
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
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
        
    } catch (error) {
        console.error('[BlocIQ Add-in] onGenerateReplyFromRead error:', error);
        
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

async function onGenerateIntoCompose(event) {
    try {
        console.log('[BlocIQ Add-in] onGenerateIntoCompose started');
        
        // Run diagnostics
        if (diagnostics) {
            diagnostics.printEnvironment();
            diagnostics.probeCapabilities();
        }
        
        const item = Office.context.mailbox.item;
        
        if (!item) {
            throw new Error('No mailbox item available');
        }
        
        // Check if we're in compose context
        if (item.itemType !== 'message' || !item.body) {
            throw new Error('Not in compose context');
        }
        
        // Collect compose context
        const context = {
            subject: item.subject,
            to: item.to?.map(t => t.emailAddress) || [],
            cc: item.cc?.map(c => c.emailAddress) || [],
            body: item.body.getAsync(Office.CoercionType.Text, (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    return result.value;
                }
                return '';
            }),
            intent: "COMPOSE",
        };
        
        console.log('[BlocIQ Add-in] Compose context collected');
        
        // Send to Ask AI endpoint
        const response = await fetch("/api/ask-ai", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(context),
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
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
        
    } catch (error) {
        console.error('[BlocIQ Add-in] onGenerateIntoCompose error:', error);
        
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

// Task pane handlers (for pinned chat)
function showChatPane(event) {
    try {
        console.log('[BlocIQ Add-in] showChatPane started');
        
        // Run diagnostics
        if (diagnostics) {
            diagnostics.printEnvironment();
            diagnostics.probeCapabilities();
        }
        
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

function showChatPaneCompose(event) {
    try {
        console.log('[BlocIQ Add-in] showChatPaneCompose started');
        
        // Run diagnostics
        if (diagnostics) {
            diagnostics.printEnvironment();
            diagnostics.probeCapabilities();
        }
        
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

// Bind functions to window for Outlook to find them
window.onGenerateReplyFromRead = onGenerateReplyFromRead;
window.onGenerateIntoCompose = onGenerateIntoCompose;
window.showChatPane = showChatPane;
window.showChatPaneCompose = showChatPaneCompose;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        onGenerateReplyFromRead,
        onGenerateIntoCompose,
        showChatPane,
        showChatPaneCompose
    };
}

console.log('[BlocIQ Add-in] Commands loaded and bound to window');
