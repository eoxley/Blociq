// BlocIQ AI Assistant - Taskpane JavaScript
// Clean, focused implementation for Outlook Add-in

let isOfficeReady = false;
let currentUser = null;
let currentEmail = null;

// Global error handling
window.addEventListener('error', (event) => {
    console.error('[BlocIQ Taskpane] Global error:', event.error);
    showError('An error occurred: ' + event.error.message);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[BlocIQ Taskpane] Promise rejection:', event.reason);
    showError('An error occurred: ' + event.reason);
});

// Wait for Office.js to be ready
Office.onReady((info) => {
    isOfficeReady = true;
    console.log('[BlocIQ Taskpane] Office.js ready, host:', info.host);
    
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
    
    // Load current email context
    loadEmailContext();
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
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        
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
    
    // Add quick action buttons for email context
    if (isOfficeReady) {
        addEmailContextActions();
    }
}

/**
 * Load current email context
 */
async function loadEmailContext() {
    try {
        if (!isOfficeReady || !Office.context.mailbox.item) {
            return;
        }
        
        const item = Office.context.mailbox.item;
        if (item.itemType !== 'message') {
            return;
        }
        
        currentEmail = {
            subject: item.subject || 'No subject',
            sender: item.from ? item.from.emailAddress : 'Unknown',
            body: await getItemBody(item)
        };
        
        console.log('[BlocIQ Taskpane] Email context loaded:', currentEmail);
        
        // Add email context to chat
        if (currentEmail.subject !== 'No subject') {
            addMessage('assistant', `I can see you're working with an email: "${currentEmail.subject}" from ${currentEmail.sender}. How can I help you with this?`);
        }
        
    } catch (error) {
        console.error('[BlocIQ Taskpane] Error loading email context:', error);
    }
}

/**
 * Get item body content
 */
async function getItemBody(item) {
    return new Promise((resolve, reject) => {
        item.body.getAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result.value);
            } else {
                reject(new Error(result.error.message));
            }
        });
    });
}

/**
 * Show error message
 */
function showError(message) {
    addMessage('assistant', `❌ Error: ${message}`, false, true);
}

/**
 * Add email context actions
 */
function addEmailContextActions() {
    const chatContainer = document.getElementById('chatContainer');
    
    // Create quick actions container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'quick-actions';
    
    actionsContainer.innerHTML = `
        <div class="quick-actions-title">Quick Actions:</div>
        <div class="quick-actions-buttons">
            <button onclick="generateReply()" class="quick-action-btn">Generate Reply</button>
            <button onclick="summarizeEmail()" class="quick-action-btn secondary">Summarize Email</button>
            <button onclick="extractActionItems()" class="quick-action-btn secondary">Extract Actions</button>
        </div>
    `;
    
    chatContainer.appendChild(actionsContainer);
}

/**
 * Generate reply for current email
 */
async function generateReply() {
    if (!currentEmail) {
        showError('No email context available');
        return;
    }
    
    addMessage('user', 'Generate a reply for this email');
    const typingId = showTypingIndicator();
    
    try {
        const reply = await generateAIReply({
            subject: currentEmail.subject,
            body: currentEmail.body,
            sender: currentEmail.sender,
            context: 'taskpane'
        });
        
        hideTypingIndicator(typingId);
        
        if (reply && reply.content) {
            addMessage('assistant', `Here's a suggested reply:\n\n${reply.content}`, false, true);
        } else {
            addMessage('assistant', 'I was unable to generate a reply. Please try again.');
        }
    } catch (error) {
        hideTypingIndicator(typingId);
        showError('Failed to generate reply: ' + error.message);
    }
}

/**
 * Summarize current email
 */
async function summarizeEmail() {
    if (!currentEmail) {
        showError('No email context available');
        return;
    }
    
    addMessage('user', 'Summarize this email');
    const typingId = showTypingIndicator();
    
    try {
        const summary = await callAIAPI('summarize', {
            subject: currentEmail.subject,
            body: currentEmail.body,
            sender: currentEmail.sender
        });
        
        hideTypingIndicator(typingId);
        addMessage('assistant', `Email Summary:\n\n${summary}`, false, true);
    } catch (error) {
        hideTypingIndicator(typingId);
        showError('Failed to summarize email: ' + error.message);
    }
}

/**
 * Extract action items from current email
 */
async function extractActionItems() {
    if (!currentEmail) {
        showError('No email context available');
        return;
    }
    
    addMessage('user', 'Extract action items from this email');
    const typingId = showTypingIndicator();
    
    try {
        const actions = await callAIAPI('extract-actions', {
            subject: currentEmail.subject,
            body: currentEmail.body,
            sender: currentEmail.sender
        });
        
        hideTypingIndicator(typingId);
        addMessage('assistant', `Action Items:\n\n${actions}`, false, true);
    } catch (error) {
        hideTypingIndicator(typingId);
        showError('Failed to extract action items: ' + error.message);
    }
}

/**
 * Call AI API
 */
async function callAIAPI(action, data) {
    try {
        const response = await fetch(`https://www.blociq.co.uk/api/ai/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.content || result.message || 'No response generated';
        
    } catch (error) {
        console.error('[BlocIQ Taskpane] API error:', error);
        throw error;
    }
}

/**
 * Generate AI Reply via API
 */
async function generateAIReply(emailData) {
    return callAIAPI('generate-reply', emailData);
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

function hideTypingIndicator(typingId) {
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
        hideTypingIndicator(typingId);
        
        // Add AI response
        addMessage('assistant', data.response || data.message);
        
        // If the AI suggests a reply, offer to insert it
        if (data.suggestedReply && emailContext.isCompose) {
            addReplyButton(data.suggestedReply);
        }
        
    } catch (error) {
        console.error('Error processing message:', error);
        hideTypingIndicator(typingId);
        
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
        <button onclick="insertReply('${btoa(suggestedReply)}')" class="quick-action-btn">Insert Reply</button>
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

// Make functions globally available
window.insertReply = insertReply;