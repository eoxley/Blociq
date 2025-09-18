// BlocIQ Assistant - Outlook Add-in Taskpane
// This provides the main chat interface for the taskpane

let messages = [];
let isProcessing = false;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const inputField = document.getElementById('inputField');
const sendButton = document.getElementById('sendButton');

// Initialize add-in
Office.onReady(() => {
  console.log('📋 BlocIQ Taskpane loaded successfully');
  setupEventListeners();
  addWelcomeMessage();
  
  // Focus on input field
  if (inputField) {
    inputField.focus();
  }
  
  console.log('✅ Taskpane initialized');
});

// Setup event listeners
function setupEventListeners() {
  if (!sendButton || !inputField) {
    console.error('Required DOM elements not found');
    return;
  }
  
  // Send button click
  sendButton.addEventListener('click', handleSendMessage);
  
  // Enter key in input field
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  
  // Input field changes
  inputField.addEventListener('input', () => {
    const hasText = inputField.value.trim().length > 0;
    sendButton.disabled = !hasText || isProcessing;
    adjustTextareaHeight();
  });
}

// Add welcome message
function addWelcomeMessage() {
  const welcomeMessage = "Hi! I'm your BlocIQ Assistant. I can help you with property management, compliance questions, building information, and more. How can I assist you today?";
  addMessage(welcomeMessage, 'assistant');
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
  isProcessing = true;
  
  // Show typing indicator
  const typingMessage = addMessage('', 'assistant', true);
  
  try {
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
    console.log('🔍 Calling BlocIQ API with prompt:', prompt);
    
    const requestBody = {
      prompt: prompt,
      contextType: 'general',
      is_outlook_addin: true,
    };

    // Add email context if available
    if (emailContext) {
      requestBody.emailContext = emailContext;
    }

    console.log('📤 Request body:', requestBody);

    // Call the main Ask AI endpoint
    const response = await fetch('https://www.blociq.co.uk/api/ask-ai-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Response data:', data);
    
    // Return the response
    return data.response || data.message || 'I apologize, but I couldn\'t generate a response. Please try again.';

  } catch (error) {
    console.error('Ask BlocIQ API call failed:', error);
    
    // Provide more specific error messages
    if (error.message.includes('401')) {
      return '🔐 Authentication needed. Please ensure you are logged into your BlocIQ account.';
    } else if (error.message.includes('403')) {
      return '🚫 Access denied. Please check your BlocIQ account permissions.';
    } else if (error.message.includes('500')) {
      return '⚠️ Server error. Please try again in a few moments.';
    } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      return '🌐 Connection failed. Please check your internet connection and try again.';
    } else {
      return `❌ Error: ${error.message}. Please try again.`;
    }
  }
}

// Get current email context for better responses
async function getCurrentEmailContext() {
  try {
    const item = Office.context.mailbox.item;
    if (!item) return null;

    // Get basic item properties
    const context = {
      subject: item.subject || 'No subject',
      itemId: item.itemId || null,
      itemType: item.itemType || 'message',
    };

    // Try to get additional properties if available
    if (item.from) {
      context.from = item.from.emailAddress || item.from.displayName || 'Unknown sender';
    }

    if (item.to && Array.isArray(item.to)) {
      context.to = item.to.map(recipient => 
        recipient.emailAddress || recipient.displayName || recipient
      ).join(', ');
    }

    return context;

  } catch (error) {
    console.error('Error getting email context:', error);
    return null;
  }
}

// Add message to chat
function addMessage(content, type, isTyping = false) {
  if (!chatContainer) return null;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}${isTyping ? ' typing' : ''}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = type === 'user' ? 'You' : 'AI';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  if (isTyping) {
    messageContent.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
  } else {
    messageContent.textContent = content;
  }
  
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
  if (!inputField) return;
  
  inputField.style.height = 'auto';
  inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
}

console.log('📁 BlocIQ taskpane.js loaded successfully');