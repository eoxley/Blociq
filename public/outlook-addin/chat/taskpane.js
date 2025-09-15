/* global Office */

Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        document.addEventListener('DOMContentLoaded', initializeApp);
    }
});

let isLoading = false;
let authToken = null;
let currentUser = null;

function initializeApp() {
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');

    // Event listeners
    messageForm.addEventListener('submit', handleFormSubmit);
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyDown);
    messageInput.addEventListener('input', autoResize);

    // Initialize authentication
    initializeAuth();

    // Focus on input
    messageInput.focus();
}

async function initializeAuth() {
    try {
        console.log('🔐 Initializing authentication...');
        
        // Try to get user email from Outlook context
        if (typeof Office !== 'undefined' && Office.context && Office.context.mailbox) {
            const userEmail = Office.context.mailbox.userProfile.emailAddress;
            console.log('📧 Got user email from Outlook:', userEmail);
            
            if (userEmail) {
                await authenticateWithEmail(userEmail);
                return;
            }
        }
        
        console.log('⚠️ Could not get user email from Outlook context');
        showError('Unable to get user email from Outlook. Please ensure the add-in is properly loaded.');
        
    } catch (error) {
        console.error('❌ Auth initialization error:', error);
        showError('Authentication failed. Please try reloading the add-in.');
    }
}

async function authenticateWithEmail(email) {
    try {
        console.log('🔐 Authenticating with email:', email);
        
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://www.blociq.co.uk';

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${baseUrl}/api/outlook-addin/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bypass_auth: true,
                email: email
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            console.log('✅ Authentication successful for user:', currentUser.name);
            
            // Update welcome message with user info
            updateWelcomeMessage();
            
        } else if (data.needsSignup) {
            console.log('❌ User needs to sign up first');
            showError(`No BlocIQ account found for ${email}. Please sign up at blociq.co.uk first.`);
        } else {
            console.error('❌ Authentication failed:', data.error);
            showError(`Authentication failed: ${data.message || data.error}`);
        }
        
    } catch (error) {
        console.error('❌ Authentication request failed:', error);
        if (error.name === 'AbortError') {
            showError('Authentication request timed out. Please check your connection and try again.');
        } else {
            showError('Unable to authenticate. Please check your internet connection.');
        }
    }
}

function updateWelcomeMessage() {
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage && currentUser) {
        welcomeMessage.innerHTML = `
            <h3>👋 Welcome back, ${currentUser.name}!</h3>
            <p>I'm your AI assistant, ready to help with property law questions, legal guidance, and document reviews. How can I assist you today?</p>
        `;
    }
}

function handleFormSubmit(event) {
    console.log('Form submitted');
    event.preventDefault();
    sendMessage();
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        console.log('Enter key pressed');
        event.preventDefault();
        sendMessage();
    }
}

function autoResize() {
    const messageInput = document.getElementById('messageInput');
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 80) + 'px';
}

async function sendMessage() {
    console.log('sendMessage() called');
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    console.log('Message input value:', message);
    console.log('Is loading:', isLoading);
    console.log('Auth token available:', !!authToken);
    
    if (!message || isLoading) {
        console.log('Message empty or already loading, skipping send');
        return;
    }

    // Authentication is no longer required since we're using public API access
    console.log('🔓 Using public API access for chat');

    console.log('Sending message:', message);

    // Clear input and add user message
    messageInput.value = '';
    autoResize();
    addMessage(message, 'user');
    
    // Show loading
    showLoading();
    
    try {
        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://www.blociq.co.uk';
        console.log('Making API request to:', `${baseUrl}/api/outlook-addin/ask-ai`);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for AI requests

        const response = await fetch(`${baseUrl}/api/ask-ai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                building_id: null,
                is_public: true,
                context_type: 'outlook-addin'
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);
        
        hideLoading();
        
        if (data.response || data.result) {
            const responseText = data.response || data.result;
            console.log('Adding assistant message:', responseText);
            addMessage(responseText, 'assistant');
            console.log('Assistant message added successfully');
        } else {
            console.error('No response field in API data:', data);
            console.error('Available fields:', Object.keys(data));
            throw new Error('No response received from AI');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideLoading();
        if (error.name === 'AbortError') {
            showError(`Request timed out. The server may be busy. Please try again.`);
        } else {
            showError(`Sorry, I encountered an error: ${error.message}. Please try again or check your connection.`);
        }
    }
}

function addMessage(text, sender) {
    console.log(`Adding message from ${sender}:`, text);
    const messagesContainer = document.getElementById('messages');
    
    if (!messagesContainer) {
        console.error('Messages container not found!');
        return;
    }
    
    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        console.log('Removing welcome message');
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? 'U' : 'AI';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    
    messagesContainer.appendChild(messageDiv);
    console.log('Message added to DOM, total messages:', messagesContainer.children.length);
    scrollToBottom();
}

function showLoading() {
    console.log('Showing loading indicator');
    isLoading = true;
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    sendButton.disabled = true;
    messageInput.disabled = true;
    sendButton.innerHTML = '<span>⏳</span>';
    
    const messagesContainer = document.getElementById('messages');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.id = 'loading-indicator';
    
    loadingDiv.innerHTML = `
        <div class="message-avatar" style="background: #f0f0f0; color: #666;">AI</div>
        <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;
    
    messagesContainer.appendChild(loadingDiv);
    console.log('Loading indicator added, total messages:', messagesContainer.children.length);
    scrollToBottom();
}

function hideLoading() {
    console.log('Hiding loading indicator');
    isLoading = false;
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    
    sendButton.disabled = false;
    messageInput.disabled = false;
    sendButton.innerHTML = '<span>➤</span>';
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        console.log('Removing loading indicator');
        loadingIndicator.remove();
    } else {
        console.log('Loading indicator not found');
    }
}

function showError(message) {
    console.log('Showing error message:', message);
    const messagesContainer = document.getElementById('messages');
    
    if (!messagesContainer) {
        console.error('Messages container not found for error display!');
        return;
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    messagesContainer.appendChild(errorDiv);
    console.log('Error message added to DOM');
    scrollToBottom();
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            console.log('Removing error message after timeout');
            errorDiv.remove();
        }
    }, 5000);
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        console.log('Scrolled to bottom, scroll height:', messagesContainer.scrollHeight);
    } else {
        console.error('Messages container not found for scrolling!');
    }
}