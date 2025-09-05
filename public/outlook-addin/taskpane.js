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
    
    // NEW: Attempt email-based authentication from Outlook context
    const outlookAuth = await attemptOutlookEmailAuthentication();
    if (outlookAuth.success) {
      console.log('✅ User authenticated via Outlook email:', outlookAuth.user.email);
      currentUser = outlookAuth.user;
      authToken = outlookAuth.token;
      headerStatus.innerHTML = `${currentUser.name} <span class="user-info">(${currentUser.email})</span>`;
      addWelcomeMessage();
      enableChat();
      return;
    }
    
    // Fallback: Check for existing authentication token in cookies
    authToken = getCookie('blociq_outlook_token');
    const userInfo = getCookie('blociq_outlook_user');
    
    if (authToken && userInfo) {
      try {
        currentUser = JSON.parse(userInfo);
        
        // Validate token with server
        const isValid = await validateToken(authToken);
        
        if (isValid) {
          console.log('✅ User authenticated via cookie:', currentUser.email);
          headerStatus.innerHTML = `${currentUser.name} <span class="user-info">(${currentUser.email})</span>`;
          addWelcomeMessage();
          enableChat();
          return;
        }
      } catch (e) {
        console.warn('Invalid user data in cookie');
      }
    }
    
    // No valid authentication
    if (outlookAuth.showDemo) {
      // User has valid email but no BlocIQ account, show demo mode
      const userProfile = Office.context.mailbox.userProfile;
      showDemoMode(userProfile.emailAddress);
      return;
    }
    
    console.log('📧 Email authentication failed, showing fallback auth');
    showAuthenticationNeeded(outlookAuth.error || 'Email extraction failed');
    
  } catch (error) {
    console.error('Authentication initialization error:', error);
    showAuthenticationNeeded(error.message || 'Failed to initialize authentication');
  }
}

// NEW: Attempt authentication using Outlook email context
async function attemptOutlookEmailAuthentication() {
  try {
    console.log('🔍 Attempting Outlook email authentication...');
    
    // Extract user email and name from Outlook context
    const userProfile = Office.context.mailbox.userProfile;
    
    if (!userProfile || !userProfile.emailAddress) {
      console.warn('❌ No user profile or email available from Outlook');
      return { success: false, error: 'No email available from Outlook context' };
    }
    
    const userEmail = userProfile.emailAddress;
    const displayName = userProfile.displayName || userEmail.split('@')[0];
    
    console.log('📧 Extracted from Outlook:', { email: userEmail, name: displayName });
    
    // Call backend for email-based authentication
    const response = await fetch('https://www.blociq.co.uk/api/outlook-addin/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        display_name: displayName,
        bypass_auth: true,
        context: 'outlook'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Email authentication failed:', errorText);
      
      // Try to parse JSON error response for better details
      let errorDetails = `Authentication failed: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.details) {
          errorDetails = errorJson.details;
        } else if (errorJson.error) {
          errorDetails = errorJson.error;
        }
      } catch (parseError) {
        // If not JSON, use the raw text if it's meaningful
        if (errorText && errorText.length < 200) {
          errorDetails = errorText;
        }
      }
      
      return { success: false, error: errorDetails };
    }
    
    const authData = await response.json();
    
    if (authData.success && authData.token) {
      console.log('✅ Email authentication successful');
      
      return {
        success: true,
        user: {
          email: userEmail,
          name: displayName,
          id: authData.user_id || userEmail
        },
        token: authData.token
      };
    } else if (authData.error === 'User not found') {
      console.log('👤 User not found, offering demo mode');
      return { 
        success: false, 
        error: `No BlocIQ account found for ${userEmail}. You can still use basic assistance.`,
        showDemo: true 
      };
    } else {
      console.warn('❌ Authentication response invalid:', authData);
      return { success: false, error: authData.message || 'Authentication failed' };
    }
    
  } catch (error) {
    console.error('❌ Error during Outlook email authentication:', error);
    return { success: false, error: error.message };
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
function showAuthenticationNeeded(errorMessage = null) {
  headerStatus.textContent = 'Authentication Required';
  
  let authContent = `
    <div class="auth-needed">
      <h3 style="margin: 0 0 10px 0; color: #92400e;">🔐 Authentication Required</h3>`;
  
  if (errorMessage) {
    authContent += `
      <div style="background: #fee; border: 1px solid #fcc; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-size: 11px;">
        <strong>Error:</strong> ${errorMessage}
      </div>`;
  }
  
  authContent += `
      <p style="margin: 0 0 15px 0;">
        To access your property data and get personalized responses, we'll try to authenticate you automatically using your Outlook email.
      </p>
      <p style="margin: 0 0 15px 0; font-size: 11px; color: #6b7280;">
        If automatic authentication fails, you can sign in manually:
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
  
  chatContainer.innerHTML = authContent;
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

// Show demo mode for users without BlocIQ accounts
function showDemoMode(userEmail) {
  headerStatus.textContent = 'Demo Mode';
  currentUser = { email: userEmail, name: userEmail.split('@')[0], demo: true };
  
  const demoMessage = `Hi there! I'm BlocIQ's AI assistant. 

I noticed you don't have a BlocIQ account yet, but I can still help with:

• **General property management advice**
• **UK property law questions** 
• **Email response drafting**
• **Compliance guidance**

For full access to your property portfolio, buildings, and leaseholder data, you'll need a BlocIQ account.

What can I help you with today?`;
  
  addMessage(demoMessage, 'assistant');
  enableChat();
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

// Handle demo mode messages
async function handleDemoMessage() {
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
    // Get current email context
    const emailContext = await getCurrentEmailContext();
    
    // Simple response for demo mode - can be enhanced with basic AI
    let response = `I'm running in demo mode since you don't have a BlocIQ account yet. 

For general property management questions, I'd recommend:

• **Property-specific data**: Sign up for BlocIQ to access your portfolio
• **UK property law**: I can provide general guidance
• **Email assistance**: I can help draft professional responses
• **Compliance**: General regulatory information

Would you like to learn more about BlocIQ's full features or get a specific type of help?`;
    
    // Remove typing indicator and add response
    removeMessage(typingMessage);
    addMessage(response, 'assistant');
    
  } catch (error) {
    console.error('Error in demo mode:', error);
    removeMessage(typingMessage);
    addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
  } finally {
    isProcessing = false;
    sendButton.disabled = false;
    inputField.focus();
  }
}

// Handle sending a message
async function handleSendMessage() {
  if (!currentUser) {
    showAuthenticationNeeded();
    return;
  }
  
  if (currentUser.demo && !authToken) {
    // Demo mode - limited functionality
    return handleDemoMessage();
  }
  
  if (!authToken) {
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