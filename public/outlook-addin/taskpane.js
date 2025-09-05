// BlocIQ Assistant - Outlook Add-in Taskpane with Authentication
// This provides the main chat interface with user session management

let messages = [];
let isProcessing = false;
let currentUser = null;
let authToken = null;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const inputField = document.getElementById('inputField');
const sendButton = document.getElementById('sendButton');
const headerStatus = document.getElementById('headerStatus');

// Initialize add-in
Office.onReady(() => {
  console.log('📋 BlocIQ Taskpane loaded successfully');
  setupEventListeners();
  initializeAuthentication();
  
  console.log('✅ Taskpane initialized');
});

// Initialize authentication
async function initializeAuthentication() {
  try {
    headerStatus.textContent = 'Connecting...';
    
    // Check for existing authentication token in cookies
    authToken = getCookie('blociq_outlook_token');
    const userInfo = getCookie('blociq_outlook_user');
    
    if (authToken && userInfo) {
      try {
        currentUser = JSON.parse(userInfo);
        
        // Validate token with server
        const isValid = await validateToken(authToken);
        
        if (isValid) {
          console.log('✅ User authenticated:', currentUser.email);
          headerStatus.innerHTML = `${currentUser.name} <span class="user-info">(${currentUser.email})</span>`;
          addWelcomeMessage();
          enableChat();
          return;
        }
      } catch (e) {
        console.warn('Invalid user data in cookie');
      }
    }
    
    // No valid authentication, show auth needed message
    showAuthenticationNeeded();
    
  } catch (error) {
    console.error('Authentication initialization error:', error);
    showAuthenticationNeeded();
  }
}

// Validate authentication token
async function validateToken(token) {
  try {
    const response = await fetch('https://www.blociq.co.uk/api/outlook-addin/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.success;
    }
    
    return false;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

// Get cookie value
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(';').shift());
  }
  return null;
}

// Show authentication needed message
function showAuthenticationNeeded() {
  headerStatus.textContent = 'Authentication Required';
  chatContainer.innerHTML = `
    <div class="auth-needed">
      <h3 style="margin: 0 0 10px 0; color: #92400e;">🔐 Authentication Required</h3>
      <p style="margin: 0 0 15px 0;">
        To access your property data and get personalized responses, please authenticate with your BlocIQ account.
      </p>
      <a href="https://www.blociq.co.uk/api/outlook-addin/auth?return_url=${encodeURIComponent(window.location.href)}" 
         class="auth-button" 
         target="_blank" 
         onclick="handleAuthClick()">
        Sign in to BlocIQ
      </a>
      <p style="margin: 15px 0 0 0; font-size: 10px; color: #6b7280;">
        After signing in, please refresh this window to continue.
      </p>
    </div>
  `;
  
  disableChat();
}

// Handle authentication click
function handleAuthClick() {
  // Show loading message
  setTimeout(() => {
    chatContainer.innerHTML = `
      <div class="auth-needed">
        <h3 style="margin: 0 0 10px 0; color: #2563eb;">🔄 Authenticating...</h3>
        <p style="margin: 0;">
          Please complete authentication in the new window, then refresh this page.
        </p>
      </div>
    `;
  }, 1000);
}

// Enable chat interface
function enableChat() {
  if (inputField && sendButton) {
    inputField.disabled = false;
    sendButton.disabled = false;
    inputField.focus();
  }
}

// Disable chat interface
function disableChat() {
  if (inputField && sendButton) {
    inputField.disabled = true;
    sendButton.disabled = true;
  }
}

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
    sendButton.disabled = !hasText || isProcessing || !currentUser;
    adjustTextareaHeight();
  });
  
  // Handle window focus to check for auth updates
  window.addEventListener('focus', () => {
    if (!currentUser) {
      // Check if authentication was completed
      setTimeout(initializeAuthentication, 1000);
    }
  });
}

// Add welcome message
function addWelcomeMessage() {
  const welcomeMessage = `Hi ${currentUser.name}! I'm your BlocIQ Assistant with full access to your property portfolio. I can help you with:

• **Property Information**: "Who is the leaseholder of unit 5 at Ashwood House?"
• **Access Codes**: "What are the access codes for Oak Court?"
• **Portfolio Overview**: "Show me my buildings" or "What documents have I uploaded?"
• **Email Responses**: I can help draft replies based on your current email context

What would you like to know?`;
  
  addMessage(welcomeMessage, 'assistant');
}

// Handle sending a message
async function handleSendMessage() {
  if (!currentUser || !authToken) {
    showAuthenticationNeeded();
    return;
  }
  
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
    
    // Call authenticated Ask BlocIQ API
    const response = await callAuthenticatedAskBlocIQ(message, emailContext);
    
    // Remove typing indicator and add response
    removeMessage(typingMessage);
    addMessage(response, 'assistant');
    
  } catch (error) {
    console.error('Error getting response:', error);
    removeMessage(typingMessage);
    
    if (error.message.includes('401') || error.message.includes('Invalid token')) {
      // Token expired or invalid, re-authenticate
      authToken = null;
      currentUser = null;
      showAuthenticationNeeded();
    } else {
      addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    }
  } finally {
    isProcessing = false;
    if (currentUser) {
      sendButton.disabled = false;
      inputField.focus();
    }
  }
}

// Call authenticated Ask BlocIQ API with full context
async function callAuthenticatedAskBlocIQ(prompt, emailContext) {
  try {
    console.log('🔍 Calling authenticated BlocIQ API with prompt:', prompt);
    
    const requestBody = {
      prompt: prompt,
      token: authToken,
      is_outlook_addin: true,
    };

    // Add email context if available
    if (emailContext) {
      requestBody.emailContext = emailContext;
    }

    console.log('📤 Request body:', { ...requestBody, token: '[REDACTED]' });

    // Call the authenticated Outlook add-in endpoint
    const response = await fetch('https://www.blociq.co.uk/api/outlook-addin/ask-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required - please sign in again');
      }
      
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Response data:', data);
    
    // Return the response
    return data.response || data.message || 'I apologize, but I couldn\'t generate a response. Please try again.';

  } catch (error) {
    console.error('Authenticated Ask BlocIQ API call failed:', error);
    throw error; // Re-throw to handle authentication errors properly
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
    // Convert markdown-like formatting to HTML
    let formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    messageContent.innerHTML = formattedContent;
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

console.log('📁 BlocIQ authenticated taskpane.js loaded successfully');