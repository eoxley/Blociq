Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        initializeChat();
    }
});

function initializeChat() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messagesContainer = document.getElementById('messages');

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Send message on Enter (but allow Shift+Enter for new lines)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Send button click
    sendButton.addEventListener('click', sendMessage);

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Clear input and disable send button
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendButton.disabled = true;

        // Remove welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Add user message to chat
        addMessage(message, 'user');

        // Add loading indicator
        const loadingElement = addLoadingIndicator();

        try {
            // Call BlocIQ API
            const response = await fetch('https://www.blociq.co.uk/api/ask-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Remove loading indicator
            loadingElement.remove();
            
            // Add assistant response
            addMessage(data.response || 'I apologize, but I was unable to process your request.', 'assistant');

        } catch (error) {
            console.error('Error calling BlocIQ API:', error);
            
            // Remove loading indicator
            loadingElement.remove();
            
            // Add error message
            addMessage('I apologize, but I\'m having trouble connecting to our services right now. Please try again in a moment.', 'assistant');
        } finally {
            // Re-enable send button
            sendButton.disabled = false;
            messageInput.focus();
        }
    }

    function addMessage(text, type) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = text;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageElement;
    }

    function addLoadingIndicator() {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'loading';
        loadingElement.innerHTML = `
            <span>BlocIQ is thinking</span>
            <div class="loading-dots">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        `;
        
        messagesContainer.appendChild(loadingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return loadingElement;
    }

    // Focus input on load
    messageInput.focus();
}