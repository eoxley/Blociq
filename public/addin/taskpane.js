// BlocIQ Assistant - Clean Chat Interface
// This provides a focused chat experience with full database access

let messages = [];
let isProcessing = false;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const inputField = document.getElementById('inputField');
const sendButton = document.getElementById('sendButton');

// Initialize add-in
Office.onReady(() => {
  console.log('BlocIQ Assistant loaded successfully');
  setupEventListeners();
  setupEmailCapture(); // Add email capture functionality
});

// Setup event listeners
function setupEventListeners() {
  // Send button click
  sendButton.onclick = handleSendMessage;
  
  // Enter key in input field
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // Input field changes
  inputField.addEventListener('input', () => {
    sendButton.disabled = !inputField.value.trim();
    adjustTextareaHeight();
  });
}

// Setup automatic email capture
function setupEmailCapture() {
  try {
    // Listen for email sends
    Office.context.mailbox.addHandlerAsync(Office.EventType.ItemSend, handleItemSend);
    
    // Listen for email changes (for reply/forward detection)
    Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged, handleItemChanged);
    
    console.log('✅ Email capture system activated');
    
    // Add status indicator
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
      statusIndicator.innerHTML = `
        <span class="status-dot"></span>
        Connected to BlocIQ • Email capture active • Ready to assist
      `;
    }
    
  } catch (error) {
    console.error('Error setting up email capture:', error);
  }
}

// Handle email send events
async function handleItemSend(event) {
  try {
    console.log('📧 Email send event detected');
    
    // Get email context
    const emailContext = await getCurrentEmailContext();
    if (!emailContext) {
      console.log('No email context available for logging');
      return;
    }
    
    // Log the outgoing email to communications log
    await logOutgoingEmail(emailContext);
    
    console.log('✅ Outgoing email logged successfully');
    
  } catch (error) {
    console.error('Error logging outgoing email:', error);
  }
}

// Handle email changes (for detecting reply/forward mode)
function handleItemChanged(event) {
  try {
    // Reset email context when item changes
    console.log('📧 Email context changed');
  } catch (error) {
    console.error('Error handling item change:', error);
  }
}

// Log outgoing email to communications system
async function logOutgoingEmail(emailContext) {
  try {
    // Extract recipient information
    const recipients = parseRecipients(emailContext.to);
    
    // For each recipient, try to link to building/leaseholder
    for (const recipient of recipients) {
      const buildingInfo = await extractBuildingFromEmail(emailContext);
      
      // Log to communications_log table
      const logData = {
        type: 'email',
        building_id: buildingInfo?.buildingId || null,
        unit_id: buildingInfo?.unitId || null,
        leaseholder_id: buildingInfo?.leaseholderId || null,
        subject: emailContext.subject,
        content: emailContext.body,
        sent_at: new Date().toISOString(),
        sent_by: 'outlook_addin', // Will be updated with actual user ID
        building_name: buildingInfo?.buildingName || 'Unknown',
        leaseholder_name: recipient.name || recipient.email,
        unit_number: buildingInfo?.unitNumber || 'Unknown',
        status: 'sent',
        direction: 'outgoing',
        recipient_email: recipient.email,
        is_reply: emailContext.subject.toLowerCase().includes('re:'),
        is_forward: emailContext.subject.toLowerCase().includes('fw:') || emailContext.subject.toLowerCase().includes('fwd:')
      };
      
      // Send to your communications logging API
      await fetch('https://www.blociq.co.uk/api/communications/log-outgoing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });
      
      console.log(`✅ Logged email to ${recipient.email}`);
    }
    
  } catch (error) {
    console.error('Error logging outgoing email:', error);
  }
}

// Parse email recipients
function parseRecipients(recipientsString) {
  if (!recipientsString) return [];
  
  try {
    // Handle different recipient formats
    if (typeof recipientsString === 'string') {
      // Simple comma-separated emails
      return recipientsString.split(',').map(email => ({
        email: email.trim(),
        name: email.trim()
      }));
    } else if (Array.isArray(recipientsString)) {
      // Array of recipient objects
      return recipientsString.map(recipient => ({
        email: recipient.email || recipient.address || recipient,
        name: recipient.name || recipient.displayName || recipient.email || recipient.address || recipient
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing recipients:', error);
    return [];
  }
}

// Handle sending a message
async function handleSendMessage() {
  const message = inputField.value.trim();
  if (!message || isProcessing) return;
  
  // Add user message to chat
  addMessage(message, 'user');
  inputField.value = '';
  adjustTextareaHeight();
  sendButton.disabled = true;
  
  // Show typing indicator
  const typingMessage = addMessage('', 'assistant', true);
  
  try {
    isProcessing = true;
    
    // Get current email context for better responses
    const emailContext = await getCurrentEmailContext();
    
    // Call Ask BlocIQ API
    const response = await callAskBlocIQ(message, emailContext);
    
    // Remove typing indicator and add response
    removeMessage(typingMessage);
    addMessage(response, 'assistant');
    
  } catch (error) {
    console.error('Error getting response:', error);
    removeMessage(typingMessage);
    addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
  } finally {
    isProcessing = false;
    sendButton.disabled = false;
    inputField.focus();
  }
}

// Call Ask BlocIQ API with full context
async function callAskBlocIQ(prompt, emailContext) {
  try {
    console.log('🔍 Calling BlocIQ Add-in API with prompt:', prompt);
    
    // Get current building context if available
    const buildingContext = await getBuildingContext();
    
    const requestBody = {
      prompt: prompt,
      contextType: determineContextType(prompt, buildingContext),
      is_outlook_addin: true,
    };

    // Add building context if available
    if (buildingContext?.buildingId) {
      requestBody.building_id = buildingContext.buildingId;
    }

    // Add email context if available
    if (emailContext) {
      requestBody.emailContext = emailContext;
    }

    console.log('📤 Request body:', requestBody);

    // Use the add-in specific endpoint
    const response = await fetch('https://www.blociq.co.uk/api/addin/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error response:', errorData);
      
      // Handle specific error cases
      if (errorData.action === 'login_required') {
        return `🔐 ${errorData.message}\n\nPlease ensure you are logged into your BlocIQ account in your browser.`;
      }
      
      throw new Error(`API error: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('📥 Response data:', data);
    
    // Return the response
    return data.response || 'I apologize, but I couldn\'t generate a response. Please try again.';

  } catch (error) {
    console.error('Ask BlocIQ API call failed:', error);
    
    // Provide more specific error messages
    if (error.message.includes('401')) {
      return '🔐 I need to authenticate with BlocIQ. Please ensure you are logged into your BlocIQ account.';
    } else if (error.message.includes('403')) {
      return '🚫 I don\'t have permission to access that information. Please check your BlocIQ account permissions.';
    } else if (error.message.includes('500')) {
      return '⚠️ There was a server error. Please try again in a few moments.';
    } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      return '🌐 I couldn\'t connect to BlocIQ. Please check your internet connection and try again.';
    } else {
      return `❌ Sorry, I encountered an error: ${error.message}. Please try again.`;
    }
  }
}

// Get current email context for better responses
async function getCurrentEmailContext() {
  try {
    const item = Office.context.mailbox.item;
    if (!item) return null;

    const [subject, body, from, to] = await Promise.all([
      getItemProperty(item.subject),
      getItemProperty(item.body),
      getItemProperty(item.from),
      getItemProperty(item.to),
    ]);

    return {
      subject: subject || 'No subject',
      body: body || 'No body content',
      from: from || 'Unknown sender',
      to: to || 'Unknown recipient',
      itemId: item.itemId || null,
    };

  } catch (error) {
    console.error('Error getting email context:', error);
    return null;
  }
}

// Get building context from current email or user
async function getBuildingContext() {
  try {
    // Try to extract building info from email content
    const emailContext = await getCurrentEmailContext();
    if (emailContext) {
      const buildingInfo = await extractBuildingFromEmail(emailContext);
      if (buildingInfo) return buildingInfo;
    }

    // Fallback: get user's default building if available
    // This would require additional API calls to your user profile system
    return null;

  } catch (error) {
    console.error('Error getting building context:', error);
    return null;
  }
}

// Extract building information from email content
async function extractBuildingFromEmail(emailContext) {
  try {
    const response = await fetch('https://www.blociq.co.uk/api/ai-extract-building', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        emailContent: `${emailContext.subject}\n\n${emailContext.body}`,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.building || null;
    }

    return null;

  } catch (error) {
    console.error('Error extracting building info:', error);
    return null;
  }
}

// Determine context type based on question and building context
function determineContextType(prompt, buildingContext) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('compliance') || lowerPrompt.includes('regulation') || lowerPrompt.includes('safety')) {
    return 'compliance';
  }
  
  if (lowerPrompt.includes('leaseholder') || lowerPrompt.includes('tenant') || lowerPrompt.includes('resident')) {
    return 'leaseholder';
  }
  
  if (lowerPrompt.includes('major works') || lowerPrompt.includes('section 20') || lowerPrompt.includes('construction')) {
    return 'major_works';
  }
  
  if (lowerPrompt.includes('email') || lowerPrompt.includes('reply') || lowerPrompt.includes('response')) {
    return 'email_reply';
  }
  
  if (buildingContext) {
    return 'building_specific';
  }
  
  return 'general';
}

// Get item property safely
async function getItemProperty(property) {
  return new Promise((resolve) => {
    if (!property) {
      resolve(null);
      return;
    }

    property.getAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value);
      } else {
        resolve(null);
      }
    });
  });
}

// Add message to chat
function addMessage(content, type, isTyping = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}${isTyping ? ' typing' : ''}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = type === 'user' ? 'U' : 'AI';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = content;
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(messageContent);
  
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  return messageDiv;
}

// Remove message from chat
function removeMessage(messageElement) {
  if (messageElement && messageElement.parentNode) {
    messageElement.parentNode.removeChild(messageElement);
  }
}

// Adjust textarea height automatically
function adjustTextareaHeight() {
  inputField.style.height = 'auto';
  inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
}

// Export functions for potential external use
window.BlocIQAssistant = {
  addMessage,
  removeMessage,
  callAskBlocIQ,
  getCurrentEmailContext,
  getBuildingContext,
  logOutgoingEmail,
};

// BlocIQ Outlook Add-in Function Commands
// This handles the "Generate by Ask BlocIQ" button functionality

Office.onReady(() => {
  console.log('BlocIQ function commands loaded');
});

// Main function called when user clicks "Generate by Ask BlocIQ" button
function showAIReplyModal(event) {
  try {
    console.log('Opening AI Reply Modal');
    
    // Get current email context
    getCurrentEmailContext()
      .then(emailContext => {
        if (!emailContext) {
          showError('No email context available. Please ensure you have an email open.');
          return;
        }
        
        // Determine reply type based on email context
        const replyType = determineReplyType(emailContext);
        
        // Open the AI reply generation dialog
        Office.context.ui.displayDialogAsync(
          'https://www.blociq.co.uk/addin/ai-reply-modal.html?replyType=' + replyType,
          {
            height: 70,
            width: 60,
            displayInIframe: true
          },
          (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
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
                  }
                } catch (error) {
                  console.error('Error handling dialog message:', error);
                }
              });
              
              // Handle dialog close
              dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg) => {
                console.log('Dialog event:', arg);
              });
              
            } else {
              console.error('Failed to open dialog:', result.error);
              showError('Failed to open AI Reply dialog');
            }
          }
        );
      })
      .catch(error => {
        console.error('Error getting email context:', error);
        showError('Error accessing email context');
      });
    
  } catch (error) {
    console.error('Error in showAIReplyModal:', error);
    showError('Unexpected error occurred');
  } finally {
    event.completed();
  }
}

// Function to show inbox triage modal
function showInboxTriage(event) {
  try {
    console.log('Opening Inbox Triage Modal');
    
    // Open the triage dialog
    Office.context.ui.displayDialogAsync(
      'https://www.blociq.co.uk/addin/ai-triage-modal.html',
      {
        height: 80,
        width: 70,
        displayInIframe: true
      },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          const dialog = result.value;
          
          // Handle messages from the dialog
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg) => {
            try {
              const data = JSON.parse(arg.message);
              
              switch (data.action) {
                case 'triageComplete':
                  showSuccess(`Triage complete! Generated ${data.count} draft replies.`);
                  dialog.close();
                  break;
                  
                case 'close':
                  dialog.close();
                  break;
                  
                case 'error':
                  showError(data.message);
                  break;
              }
            } catch (error) {
              console.error('Error handling triage dialog message:', error);
            }
          });
          
        } else {
          console.error('Failed to open triage dialog:', result.error);
          showError('Failed to open Inbox Triage dialog');
        }
      }
    );
    
  } catch (error) {
    console.error('Error in showInboxTriage:', error);
    showError('Unexpected error occurred');
  } finally {
    event.completed();
  }
}

// Get current email context
async function getCurrentEmailContext() {
  try {
    const item = Office.context.mailbox.item;
    if (!item) return null;

    const [subject, body, from, to, conversationId] = await Promise.all([
      getItemProperty(item.subject),
      getItemProperty(item.body),
      getItemProperty(item.from),
      getItemProperty(item.to),
      Promise.resolve(item.conversationId)
    ]);

    // Get email thread if available
    let emailThread = null;
    try {
      emailThread = await getEmailThread(conversationId);
    } catch (error) {
      console.log('Could not retrieve email thread:', error);
    }

    return {
      subject: subject || 'No subject',
      body: body || 'No content',
      from: typeof from === 'string' ? from : (from?.emailAddress || from?.displayName || 'Unknown'),
      to: Array.isArray(to) ? to.map(t => t.emailAddress || t.displayName || t).join(', ') : 
          (typeof to === 'string' ? to : (to?.emailAddress || to?.displayName || 'Unknown')),
      itemId: item.itemId,
      conversationId: conversationId,
      emailThread: emailThread,
      itemType: item.itemType, // Message or Appointment
      isReply: subject && subject.toLowerCase().startsWith('re:'),
      isForward: subject && (subject.toLowerCase().startsWith('fw:') || subject.toLowerCase().startsWith('fwd:'))
    };

  } catch (error) {
    console.error('Error getting email context:', error);
    throw error;
  }
}

// Get email thread for better context
async function getEmailThread(conversationId) {
  return new Promise((resolve) => {
    if (!conversationId) {
      resolve(null);
      return;
    }

    try {
      // Try to get conversation items
      Office.context.mailbox.getSelectedItemAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          // This is a simplified approach - in production you'd want to
          // use Graph API to get full conversation thread
          resolve({
            conversationId: conversationId,
            itemCount: 1,
            items: [result.value]
          });
        } else {
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error getting email thread:', error);
      resolve(null);
    }
  });
}

// Determine reply type based on context
function determineReplyType(emailContext) {
  if (!emailContext) return 'reply';
  
  const subject = emailContext.subject?.toLowerCase() || '';
  
  if (subject.startsWith('fw:') || subject.startsWith('fwd:')) {
    return 'forward';
  } else if (subject.startsWith('re:')) {
    return 'reply';
  } else {
    // Default to reply for new compositions
    return 'reply';
  }
}

// Insert the generated reply into the email body
function insertGeneratedReply(content) {
  try {
    console.log('Inserting generated reply');
    
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

// Get item property safely
function getItemProperty(property) {
  return new Promise((resolve) => {
    if (!property) {
      resolve(null);
      return;
    }

    if (typeof property === 'string') {
      resolve(property);
      return;
    }

    if (property.getAsync) {
      property.getAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value);
        } else {
          resolve(null);
        }
      });
    } else {
      resolve(property);
    }
  });
}

// Show success notification
function showSuccess(message) {
  try {
    Office.context.ui.messageParent(JSON.stringify({
      action: 'notification',
      type: 'success',
      message: message
    }));
  } catch (error) {
    console.log('Success:', message);
  }
}

// Show error notification
function showError(message) {
  try {
    Office.context.ui.messageParent(JSON.stringify({
      action: 'notification',
      type: 'error',
      message: message
    }));
  } catch (error) {
    console.error('Error:', message);
  }
}

// Log outgoing emails automatically when they're sent
Office.context.mailbox.addHandlerAsync(Office.EventType.ItemSend, async (event) => {
  try {
    console.log('Email send event detected');
    
    const emailContext = await getCurrentEmailContext();
    if (emailContext) {
      // Log the email to your communications system
      await logEmailToSupabase(emailContext, 'outgoing');
    }
    
  } catch (error) {
    console.error('Error logging outgoing email:', error);
  }
});

// Log email to Supabase communications system
async function logEmailToSupabase(emailContext, direction = 'outgoing') {
  try {
    const logData = {
      type: 'email',
      direction: direction,
      subject: emailContext.subject,
      content: emailContext.body,
      from_email: direction === 'outgoing' ? Office.context.mailbox.userProfile.emailAddress : emailContext.from,
      to_email: direction === 'outgoing' ? emailContext.to : Office.context.mailbox.userProfile.emailAddress,
      sent_at: new Date().toISOString(),
      conversation_id: emailContext.conversationId,
      outlook_item_id: emailContext.itemId,
      is_reply: emailContext.isReply,
      is_forward: emailContext.isForward,
      user_email: Office.context.mailbox.userProfile.emailAddress,
      source: 'outlook_addin'
    };

    // Extract building/property information from email content
    const buildingInfo = await extractBuildingFromContent(emailContext);
    if (buildingInfo) {
      logData.building_id = buildingInfo.building_id;
      logData.unit_id = buildingInfo.unit_id;
      logData.leaseholder_id = buildingInfo.leaseholder_id;
    }

    // Send to your communications logging API
    const response = await fetch('https://www.blociq.co.uk/api/communications/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(logData),
    });

    if (response.ok) {
      console.log('Email logged successfully to communications system');
    } else {
      console.error('Failed to log email:', response.status);
    }

  } catch (error) {
    console.error('Error logging email to Supabase:', error);
  }
}

// Extract building information from email content
async function extractBuildingFromContent(emailContext) {
  try {
    const response = await fetch('https://www.blociq.co.uk/api/ai/extract-building', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        content: `${emailContext.subject}\n\n${emailContext.body}`,
        from_email: emailContext.from,
        to_email: emailContext.to
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.building_info || null;
    }

    return null;
  } catch (error) {
    console.error('Error extracting building info:', error);
    return null;
  }
}

// Register function commands
Office.actions.associate('showAIReplyModal', showAIReplyModal);
Office.actions.associate('showInboxTriage', showInboxTriage);
