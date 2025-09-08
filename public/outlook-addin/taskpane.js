// BlocIQ AI Assistant - Taskpane JavaScript

let isOfficeReady = false;
let currentUser = null;

// Wait for Office.js to be ready
Office.onReady((info) => {
    isOfficeReady = true;
    console.log('Office.js ready in taskpane');
    
    // Update header status
    document.getElementById('headerStatus').textContent = 'Ready';
    
    // Initialize the chat
    initializeChat();
    
    // Get user info if available
    if (Office.context.mailbox.userProfile) {
        currentUser = {
            name: Office.context.mailbox.userProfile.displayName,
            email: Office.context.mailbox.userProfile.emailAddress
        };
        document.getElementById('headerStatus').textContent = `Hello, ${currentUser.name.split(' ')[0]}!`;
    }
});

function initializeChat() {
    const inputField = document.getElementById('inputField');
    const sendButton = document.getElementById('sendButton');
    const chatContainer = document.getElementById('chatContainer');
    
    // Enable input when Office is ready
    inputField.disabled = false;
    sendButton.disabled = false;
    
    // Add welcome message
    addMessage('assistant', 'Hello! I\'m your BlocIQ AI Assistant. I can help you with property management, compliance questions, lease queries, and generating email replies. How can I assist you today?');
    
    // Auto-resize textarea
    inputField.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 80) + 'px';
        
        // Enable/disable send button
        sendButton.disabled = this.value.trim() === '';
    });
    
    // Send message on Enter (Shift+Enter for new line)
    inputField.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button click
    sendButton.addEventListener('click', sendMessage);
    
    // Add some quick action buttons for email context
    if (isOfficeReady) {
        addEmailContextActions();
    }
}

function sendMessage() {
    const inputField = document.getElementById('inputField');
    const message = inputField.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage('user', message);
    
    // Clear input
    inputField.value = '';
    inputField.style.height = 'auto';
    document.getElementById('sendButton').disabled = true;
    
    // Show typing indicator
    const typingId = showTypingIndicator();
    
    // Process the message
    processMessage(message, typingId);
}

function addMessage(sender, content, isHTML = false) {
    const chatContainer = document.getElementById('chatContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? (currentUser ? currentUser.name.charAt(0) : 'U') : 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (isHTML) {
        contentDiv.innerHTML = content;
    } else {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    const typingId = 'typing-' + Date.now();
    const chatContainer = document.getElementById('chatContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = typingId;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return typingId;
}

function removeTypingIndicator(typingId) {
    const typingElement = document.getElementById(typingId);
    if (typingElement) {
        typingElement.remove();
    }
}

async function processMessage(message, typingId) {
    try {
        // Get email context if available
        const emailContext = await getEmailContext();
        
        // Prepare request data
        const requestData = {
            message: message,
            context: emailContext,
            user: currentUser
        };
        
        // Call your AI service
        const response = await fetch('https://www.blociq.co.uk/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add AI response
        addMessage('assistant', data.response || data.message);
        
        // If the AI suggests a reply, offer to insert it
        if (data.suggestedReply && emailContext.isCompose) {
            addReplyButton(data.suggestedReply);
        }
        
    } catch (error) {
        console.error('Error processing message:', error);
        removeTypingIndicator(typingId);
        
        // Show fallback response
        addMessage('assistant', 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again in a moment, or contact support if the issue persists.');
    }
}

async function getEmailContext() {
    if (!isOfficeReady) return { available: false };
    
    try {
        const item = Office.context.mailbox.item;
        const context = {
            available: true,
            isCompose: item.itemType === Office.MailboxEnums.ItemType.Message && item.subject !== undefined,
            itemType: item.itemType
        };
        
        if (item.subject) {
            context.subject = item.subject;
        }
        
        // Get email body if in read mode
        if (item.body && !context.isCompose) {
            const bodyResult = await new Promise((resolve) => {
                item.body.getAsync("text", (result) => {
                    resolve(result.status === Office.AsyncResultStatus.Succeeded ? result.value : null);
                });
            });
            context.body = bodyResult;
        }
        
        // Get sender info if available
        if (item.from) {
            context.from = {
                name: item.from.displayName,
                email: item.from.emailAddress
            };
        }
        
        return context;
    } catch (error) {
        console.error('Error getting email context:', error);
        return { available: false };
    }
}

function addReplyButton(suggestedReply) {
    const chatContainer = document.getElementById('chatContainer');
    
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'message assistant';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `
        <p style="margin-bottom: 8px;">Would you like me to insert this reply into your email?</p>
        <button onclick="insertReply('${btoa(suggestedReply)}')" style="background: #008C8F; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Insert Reply</button>
    `;
    
    buttonDiv.appendChild(avatar);
    buttonDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(buttonDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function insertReply(encodedReply) {
    try {
        const reply = atob(encodedReply);
        const item = Office.context.mailbox.item;
        
        item.body.setAsync(reply, { coercionType: Office.CoercionType.Html }, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                addMessage('assistant', 'Reply inserted successfully!');
            } else {
                addMessage('assistant', 'Sorry, I couldn\'t insert the reply. Please copy and paste it manually.');
            }
        });
    } catch (error) {
        console.error('Error inserting reply:', error);
        addMessage('assistant', 'Sorry, I couldn\'t insert the reply. Please copy and paste it manually.');
    }
}

function addEmailContextActions() {
    // Add quick action buttons based on email context
    setTimeout(async () => {
        const context = await getEmailContext();
        
        if (context.available) {
            let quickActions = [];
            
            if (context.isCompose) {
                quickActions.push('Help me write a professional email');
                quickActions.push('Suggest improvements to my draft');
            } else {
                quickActions.push('Generate a reply to this email');
                quickActions.push('Summarize this email');
                quickActions.push('What action items are in this email?');
            }
            
            // Add quick action buttons
            const chatContainer = document.getElementById('chatContainer');
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message assistant';
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = 'AI';
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = `
                <p style="margin-bottom: 8px; font-size: 11px; opacity: 0.8;">Quick actions:</p>
                ${quickActions.map(action => 
                    `<button onclick="sendQuickMessage('${action}')" style="background: #f3f4f6; border: 1px solid #d1d5db; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 10px; cursor: pointer;">${action}</button>`
                ).join('')}
            `;
            
            actionsDiv.appendChild(avatar);
            actionsDiv.appendChild(contentDiv);
            
            chatContainer.appendChild(actionsDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, 1000);
}

function sendQuickMessage(message) {
    // Simulate clicking a quick action
    document.getElementById('inputField').value = message;
    sendMessage();
}

// Make functions globally available
window.insertReply = insertReply;
window.sendQuickMessage = sendQuickMessage;