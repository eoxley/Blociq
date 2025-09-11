/* global Office */

Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        document.addEventListener('DOMContentLoaded', initializeApp);
    }
});

let isLoading = false;

function initializeApp() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleKeyDown);
    messageInput.addEventListener('input', autoResize);

    // Focus on input
    messageInput.focus();
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
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
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || isLoading) return;

    // Clear input and add user message
    messageInput.value = '';
    autoResize();
    addMessage(message, 'user');
    
    // Show loading
    showLoading();
    
    try {
        const response = await fetch('https://www.blociq.co.uk/api/ask-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: 'outlook-addin'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        hideLoading();
        
        if (data.response) {
            addMessage(data.response, 'assistant');
        } else {
            throw new Error('No response received from AI');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideLoading();
        showError('Sorry, I encountered an error. Please try again or check your connection.');
    }
}

function addMessage(text, sender) {
    const messagesContainer = document.getElementById('messages');
    
    // Remove welcome message if it exists
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
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
    scrollToBottom();
}

function showLoading() {
    isLoading = true;
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;
    
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
    scrollToBottom();
}

function hideLoading() {
    isLoading = false;
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = false;
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function showError(message) {
    const messagesContainer = document.getElementById('messages');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    messagesContainer.appendChild(errorDiv);
    scrollToBottom();
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}