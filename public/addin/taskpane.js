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
        return `🔐 ${errorData.message}\n\nTo use the full BlocIQ Assistant features, please:\n1. Open your browser and go to https://www.blociq.co.uk\n2. Log in to your BlocIQ account\n3. Return to Outlook and try your question again\n\nFor now, I can help with general property management questions.`;
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
      return '🔐 I need to authenticate with BlocIQ. Please log in to your BlocIQ account in your browser and try again.';
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
