// BlocIQ Outlook Add-in Function Handlers
// This file contains the functions referenced by ExecuteFunction actions in manifest.xml

Office.onReady(() => {
  console.log('🔌 BlocIQ function handlers loaded');
  
  try {
    // Register the functions with Office.js - must match manifest.xml function names
    Office.actions.associate("generateAIReply", generateAIReply);
    Office.actions.associate("showInboxTriage", showInboxTriage);
    
    console.log('✅ Functions registered: generateAIReply, showInboxTriage');
  } catch (error) {
    console.error('❌ Error registering functions:', error);
  }
});

/**
 * Opens the AI Reply Generation modal
 * Called when user clicks the "AI Reply" button
 */
function generateAIReply(event) {
  console.log('🚀 Opening AI Reply modal...');
  
  try {
    // Display the AI reply modal in a dialog
    Office.context.ui.displayDialogAsync(
      "https://www.blociq.co.uk/outlook-addin/ai-reply-modal.html",
      {
        height: 600, 
        width: 800, 
        displayInIframe: true
      },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error('❌ Failed to open AI Reply modal:', result.error);
          showError('Failed to open AI Reply modal: ' + (result.error?.message || 'Unknown error'));
        } else {
          console.log('✅ AI Reply modal opened successfully');
          
          const dialog = result.value;
          
          // Handle messages from the dialog
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            try {
              const data = JSON.parse(arg.message);
              
              switch (data.action) {
                case 'insertReply':
                  insertGeneratedReply(data.content);
                  dialog.close();
                  break;
                  
                case 'close':
                  dialog.close();
                  break;
                  
                case 'error':
                  showError(data.message);
                  break;
                  
                default:
                  console.log('Unknown action from dialog:', data.action);
              }
            } catch (error) {
              console.error('Error handling dialog message:', error);
              showError('Error handling dialog response');
            }
          });

          // Handle dialog errors
          dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
            console.log('Dialog event received:', arg);
            if (arg.error) {
              console.error('Dialog error:', arg.error);
              showError('Dialog error occurred');
            }
          });
        }
      }
    );
    
    // Signal that the function has completed
    event.completed();
    
  } catch (error) {
    console.error('❌ Error in generateAIReply:', error);
    showError('Unexpected error: ' + error.message);
    event.completed();
  }
}

/**
 * Opens the Inbox Triage modal
 * Called when user clicks the "Inbox Triage" button
 */
function showInboxTriage(event) {
  console.log('🚀 Opening Inbox Triage modal...');
  
  try {
    // Display the inbox triage modal in a dialog
    Office.context.ui.displayDialogAsync(
      "https://www.blociq.co.uk/outlook-addin/ai-triage-modal.html",
      {
        height: 700, 
        width: 900, 
        displayInIframe: true
      },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          console.error('❌ Failed to open Inbox Triage modal:', result.error);
          showError('Failed to open Inbox Triage modal: ' + (result.error?.message || 'Unknown error'));
        } else {
          console.log('✅ Inbox Triage modal opened successfully');
          
          const dialog = result.value;
          
          // Handle messages from the dialog
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            try {
              const data = JSON.parse(arg.message);
              
              switch (data.action) {
                case 'triageComplete':
                  showSuccess(`Triage complete! Generated ${data.count || 0} draft replies.`);
                  dialog.close();
                  break;
                  
                case 'close':
                  dialog.close();
                  break;
                  
                case 'error':
                  showError(data.message);
                  break;
                  
                default:
                  console.log('Unknown action from triage dialog:', data.action);
              }
            } catch (error) {
              console.error('Error handling triage dialog message:', error);
              showError('Error handling triage dialog response');
            }
          });

          // Handle dialog errors
          dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
            console.log('Triage dialog event received:', arg);
            if (arg.error) {
              console.error('Triage dialog error:', arg.error);
              showError('Triage dialog error occurred');
            }
          });
        }
      }
    );
    
    // Signal that the function has completed
    event.completed();
    
  } catch (error) {
    console.error('❌ Error in showInboxTriage:', error);
    showError('Unexpected error: ' + error.message);
    event.completed();
  }
}

/**
 * Insert the generated reply into the email body
 */
function insertGeneratedReply(content) {
  try {
    console.log('Inserting generated reply');
    
    if (!content || typeof content !== 'string') {
      console.error('Invalid content provided for insertion');
      showError('Invalid reply content');
      return;
    }
    
    // Insert the content into the email body
    Office.context.mailbox.item.body.setAsync(
      content,
      {
        coercionType: Office.CoercionType.Text,
        asyncContext: { action: 'insertReply' }
      },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('Reply inserted successfully');
          showSuccess('AI-generated reply has been inserted into your email.');
        } else {
          console.error('Failed to insert reply:', result.error);
          showError('Failed to insert the generated reply. Please try copying and pasting manually.');
        }
      }
    );
    
  } catch (error) {
    console.error('Error inserting reply:', error);
    showError('Error inserting the generated reply');
  }
}

/**
 * Helper function to get current email context
 * Can be used by other functions if needed
 */
function getCurrentEmailContext() {
  try {
    const item = Office.context.mailbox.item;
    if (!item) {
      console.warn('⚠️ No email item available');
      return null;
    }

    return {
      subject: item.subject || 'No subject',
      from: item.from?.emailAddress || 'Unknown sender',
      to: item.to?.map(recipient => recipient.emailAddress).join(', ') || 'No recipients',
      conversationId: item.conversationId || null,
      itemId: item.itemId || null,
      itemType: item.itemType || 'message'
    };
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

console.log('📁 BlocIQ functions.js loaded successfully');