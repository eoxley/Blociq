// BlocIQ Outlook Add-in - Enhanced with Email Analysis, Reply Generation & Triage
// Integrates with existing BlocIQ API infrastructure

// API Configuration - matches existing Ask AI implementation
const API_CONFIG = {
  endpoints: {
    askAI: '/api/addin/ask-ai',
    generateReply: '/api/generate-reply',
    emailAnalysis: '/api/ai-email-reply',
    triage: '/api/triage',
    bulkTriage: '/api/bulk-triage'
  },
  headers: {
    'Content-Type': 'application/json'
  }
};

// Global state
let currentEmailData = null;
let isOfficeReady = false;
let conversationHistory = [];
let isLoading = false;

// Initialize Office.js
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    console.log('🚀 BlocIQ Outlook Add-in initialized');
    isOfficeReady = true;
    initializeApp();
  }
});

// Main initialization
function initializeApp() {
  setupEventListeners();
  loadCurrentEmail();
  displayWelcomeMessage();
  setupQuickActions();
}

// Setup event listeners
function setupEventListeners() {
  const inputField = document.getElementById('inputField');
  const sendButton = document.getElementById('sendButton');
  
  if (inputField) {
    inputField.addEventListener('input', handleInputChange);
    inputField.addEventListener('keydown', handleKeyDown);
  }
  
  if (sendButton) {
    sendButton.addEventListener('click', handleSendMessage);
  }
}

// Handle input changes
function handleInputChange() {
  const inputField = document.getElementById('inputField');
  const sendButton = document.getElementById('sendButton');
  
  if (inputField && sendButton) {
    const hasContent = inputField.value.trim().length > 0;
    sendButton.disabled = !hasContent || isLoading;
    
    // Auto-resize textarea
    inputField.style.height = 'auto';
    inputField.style.height = Math.min(inputField.scrollHeight, 120) + 'px';
  }
}

// Handle key down events
function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
}

// Load current email context
async function loadCurrentEmail() {
  if (!isOfficeReady) return;
  
  try {
    const emailData = await getCurrentEmailContent();
    currentEmailData = emailData;
    console.log('📧 Current email loaded:', emailData);
    
    // Show email context in chat
    if (emailData.subject) {
      displayEmailContext(emailData);
    }
  } catch (error) {
    console.error('❌ Error loading email:', error);
  }
}

// Get current email content from Outlook
async function getCurrentEmailContent() {
  return new Promise((resolve, reject) => {
    if (!Office.context.mailbox.item) {
      resolve({ subject: 'No email selected', body: '', sender: '' });
      return;
    }

    const item = Office.context.mailbox.item;
    
    // Get email body
    item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const emailData = {
          id: item.itemId || 'unknown',
          subject: item.subject || 'No Subject',
          body: result.value || '',
          sender: item.sender?.emailAddress || 'Unknown',
          senderName: item.sender?.displayName || 'Unknown',
          recipients: item.to || [],
          dateTime: item.dateTimeCreated || new Date(),
          importance: item.importance || 'normal',
          itemType: item.itemType || 'message',
          conversationId: item.conversationId || null
        };
        resolve(emailData);
      } else {
        reject(new Error('Failed to read email: ' + result.error.message));
      }
    });
  });
}

// Display email context in chat
function displayEmailContext(emailData) {
  const contextMessage = {
    role: 'assistant',
    content: `📧 **Current Email Context**
    
**Subject:** ${emailData.subject}
**From:** ${emailData.senderName} (${emailData.sender})
**Received:** ${new Date(emailData.dateTime).toLocaleDateString('en-GB')}

I can help you with:
• **AI Reply Generation** - Create professional responses
• **Email Analysis** - Understand content and urgency  
• **Triage Recommendations** - Categorize and prioritize
• **Property Context** - Building and compliance information

What would you like to do with this email?`,
    timestamp: new Date()
  };
  
  displayMessage(contextMessage);
  addQuickActionButtons();
}

// Add quick action buttons for email operations
function addQuickActionButtons() {
  const chatContainer = document.getElementById('chatContainer');
  
  const quickActionsHtml = `
    <div class="quick-actions" style="margin: 16px 0; display: flex; flex-wrap: wrap; gap: 8px;">
      <button onclick="generateAIReply()" class="quick-action-btn" style="background: linear-gradient(135deg, var(--blociq-primary), var(--blociq-secondary)); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: transform 0.2s;">
        🤖 Generate Reply
      </button>
      <button onclick="analyzeEmail()" class="quick-action-btn" style="background: white; color: var(--blociq-primary); border: 1px solid var(--blociq-primary); padding: 8px 16px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: transform 0.2s;">
        📊 Analyze Email
      </button>
      <button onclick="triageEmail()" class="quick-action-btn" style="background: white; color: var(--blociq-accent); border: 1px solid var(--blociq-accent); padding: 8px 16px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: transform 0.2s;">
        🎯 Triage Email
      </button>
      <button onclick="bulkTriage()" class="quick-action-btn" style="background: white; color: var(--blociq-warning); border: 1px solid var(--blociq-warning); padding: 8px 16px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: transform 0.2s;">
        📬 Bulk Triage
      </button>
    </div>
  `;
  
  const quickActionsDiv = document.createElement('div');
  quickActionsDiv.innerHTML = quickActionsHtml;
  chatContainer.appendChild(quickActionsDiv);
  
  // Add hover effects
  const buttons = quickActionsDiv.querySelectorAll('.quick-action-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
  });
}

// Generate AI Reply
async function generateAIReply() {
  if (!currentEmailData) {
    displayMessage({
      role: 'assistant',
      content: '❌ No email context available. Please select an email first.',
      timestamp: new Date()
    });
    return;
  }

  displayMessage({
    role: 'user',
    content: '🤖 Generate AI reply for this email',
    timestamp: new Date()
  });

  setLoading(true);

  try {
    const response = await fetch(API_CONFIG.endpoints.emailAnalysis, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        subject: currentEmailData.subject,
        body: currentEmailData.body,
        sender: currentEmailData.sender,
        senderName: currentEmailData.senderName,
        context: 'outlook_addin_reply'
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      const replyContent = `✨ **AI-Generated Reply**

${result.suggested_reply}

**Analysis:** ${result.analysis}
**Confidence:** ${result.confidence}%

Would you like me to insert this reply into your email or generate a different version?`;

      displayMessage({
        role: 'assistant',
        content: replyContent,
        timestamp: new Date()
      });

      // Add action buttons for the reply
      addReplyActionButtons(result.suggested_reply);
    } else {
      throw new Error(result.error || 'Failed to generate reply');
    }
  } catch (error) {
    console.error('❌ Reply generation error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error generating reply:** ${error.message}`,
      timestamp: new Date()
    });
  } finally {
    setLoading(false);
  }
}

// Add reply action buttons
function addReplyActionButtons(replyText) {
  const chatContainer = document.getElementById('chatContainer');
  
  const actionsHtml = `
    <div class="reply-actions" style="margin: 12px 0; display: flex; gap: 8px;">
      <button onclick="insertReply('${btoa(replyText)}')" class="action-btn" style="background: var(--blociq-success); color: white; border: none; padding: 8px 16px; border-radius: 16px; font-size: 12px; cursor: pointer;">
        📧 Insert Reply
      </button>
      <button onclick="regenerateReply()" class="action-btn" style="background: var(--blociq-secondary); color: white; border: none; padding: 8px 16px; border-radius: 16px; font-size: 12px; cursor: pointer;">
        🔄 Regenerate
      </button>
      <button onclick="copyToClipboard('${btoa(replyText)}')" class="action-btn" style="background: var(--blociq-accent); color: white; border: none; padding: 8px 16px; border-radius: 16px; font-size: 12px; cursor: pointer;">
        📋 Copy
      </button>
    </div>
  `;
  
  const actionsDiv = document.createElement('div');
  actionsDiv.innerHTML = actionsHtml;
  chatContainer.appendChild(actionsDiv);
  scrollToBottom();
}

// Insert reply into Outlook
async function insertReply(encodedReply) {
  const replyText = atob(encodedReply);
  
  try {
    Office.context.mailbox.item.body.setAsync(
      replyText,
      { coercionType: Office.CoercionType.Text },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          displayMessage({
            role: 'assistant',
            content: '✅ **Reply inserted successfully!** You can now review and send your email.',
            timestamp: new Date()
          });
        } else {
          throw new Error(result.error.message);
        }
      }
    );
  } catch (error) {
    console.error('❌ Insert reply error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error inserting reply:** ${error.message}`,
      timestamp: new Date()
    });
  }
}

// Regenerate reply
async function regenerateReply() {
  displayMessage({
    role: 'user',
    content: '🔄 Regenerate a different reply',
    timestamp: new Date()
  });

  setLoading(true);

  try {
    const response = await fetch(API_CONFIG.endpoints.emailAnalysis, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        subject: currentEmailData.subject,
        body: currentEmailData.body,
        sender: currentEmailData.sender,
        senderName: currentEmailData.senderName,
        context: 'outlook_addin_reply',
        regenerate: true
      })
    });

    const result = await response.json();

    if (result.success) {
      const replyContent = `🔄 **Regenerated Reply**

${result.suggested_reply}

**Analysis:** ${result.analysis}
**Confidence:** ${result.confidence}%`;

      displayMessage({
        role: 'assistant',
        content: replyContent,
        timestamp: new Date()
      });

      addReplyActionButtons(result.suggested_reply);
    } else {
      throw new Error(result.error || 'Failed to regenerate reply');
    }
  } catch (error) {
    console.error('❌ Regenerate error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error regenerating reply:** ${error.message}`,
      timestamp: new Date()
    });
  } finally {
    setLoading(false);
  }
}

// Analyze Email
async function analyzeEmail() {
  if (!currentEmailData) {
    displayMessage({
      role: 'assistant',
      content: '❌ No email context available.',
      timestamp: new Date()
    });
    return;
  }

  displayMessage({
    role: 'user',
    content: '📊 Analyze this email',
    timestamp: new Date()
  });

  setLoading(true);

  try {
    // Use the enhanced triage endpoint for comprehensive analysis
    const response = await fetch(API_CONFIG.endpoints.triage, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        messageId: currentEmailData.id,
        analysisMode: true
      })
    });

    const result = await response.json();

    if (result.success || result.triage) {
      const analysis = result.triage || result;
      
      const analysisContent = `📊 **Email Analysis Complete**

**🎯 Category:** ${analysis.enhancedCategory || analysis.label || 'General'}
**⚡ Urgency:** ${analysis.urgency?.level || 'Medium'} (Score: ${analysis.urgency?.score || 'N/A'})
**🏠 Properties Mentioned:** ${analysis.properties?.map(p => p.name).join(', ') || 'None detected'}

**🔍 Key Insights:**
${analysis.insights?.map(insight => `• ${insight.message}`).join('\n') || 'Processing insights...'}

**📝 Suggested Actions:**
${analysis.suggestedActions?.map(action => `• ${action}`).join('\n') || analysis.attachments_suggestions?.join('\n• ') || 'No specific actions suggested'}

**🧠 AI Reasoning:**
${analysis.urgency?.reasoning || analysis.reasoning || 'Email analyzed for content and context'}`;

      displayMessage({
        role: 'assistant',
        content: analysisContent,
        timestamp: new Date()
      });
    } else {
      throw new Error('Analysis failed');
    }
  } catch (error) {
    console.error('❌ Analysis error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error analyzing email:** ${error.message}`,
      timestamp: new Date()
    });
  } finally {
    setLoading(false);
  }
}

// Triage Email
async function triageEmail() {
  displayMessage({
    role: 'user',
    content: '🎯 Triage this email',
    timestamp: new Date()
  });

  setLoading(true);

  try {
    const response = await fetch(API_CONFIG.endpoints.triage, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        messageId: currentEmailData?.id || 'current',
        emailData: currentEmailData
      })
    });

    const result = await response.json();

    if (result.success || result.triage) {
      const triage = result.triage || result;
      
      const triageContent = `🎯 **Email Triage Complete**

**📋 Category:** ${triage.label || 'Uncategorized'}
**⚡ Priority:** ${triage.priority || 'Medium'}
**🏷️ Tags:** ${triage.tags?.join(', ') || 'None'}

**📝 Recommended Actions:**
${triage.attachments_suggestions?.map(action => `• ${action}`).join('\n') || 'No specific actions recommended'}

**💬 Suggested Reply:**
${triage.reply?.content || 'No reply suggested'}

**🔄 Next Steps:**
• ${triage.priority === 'P1' ? 'Handle immediately - urgent matter' : 
     triage.priority === 'P2' ? 'Address within 24 hours' : 
     'Standard response timeline applies'}
• Review any attached documents or requirements
• Update internal systems if needed`;

      displayMessage({
        role: 'assistant',
        content: triageContent,
        timestamp: new Date()
      });
    } else {
      throw new Error('Triage failed');
    }
  } catch (error) {
    console.error('❌ Triage error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error triaging email:** ${error.message}`,
      timestamp: new Date()
    });
  } finally {
    setLoading(false);
  }
}

// Bulk Triage
async function bulkTriage() {
  displayMessage({
    role: 'user',
    content: '📬 Start bulk inbox triage',
    timestamp: new Date()
  });

  setLoading(true);

  try {
    const response = await fetch(API_CONFIG.endpoints.bulkTriage, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        bulkTriage: true,
        maxEmails: 20 // Limit for performance
      })
    });

    const result = await response.json();

    if (result.success && result.triage) {
      const processed = result.triage.processed || 0;
      const actions = result.triage.actions || [];
      
      const bulkContent = `📬 **Bulk Triage Complete**

**📊 Processed:** ${processed} emails
**⚡ Actions Taken:** ${actions.length}

**📋 Summary:**
${actions.slice(0, 10).map(action => `• ${action}`).join('\n')}
${actions.length > 10 ? `\n... and ${actions.length - 10} more actions` : ''}

**🎯 Next Steps:**
• Review categorized emails in your inbox
• Follow up on high-priority items
• Check for any urgent matters requiring immediate attention

*Bulk triage helps organize your inbox automatically based on AI analysis.*`;

      displayMessage({
        role: 'assistant',
        content: bulkContent,
        timestamp: new Date()
      });
    } else {
      throw new Error('Bulk triage failed');
    }
  } catch (error) {
    console.error('❌ Bulk triage error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error with bulk triage:** ${error.message}`,
      timestamp: new Date()
    });
  } finally {
    setLoading(false);
  }
}

// Copy to clipboard
async function copyToClipboard(encodedText) {
  const text = atob(encodedText);
  
  try {
    await navigator.clipboard.writeText(text);
    displayMessage({
      role: 'assistant',
      content: '📋 **Text copied to clipboard!**',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Copy error:', error);
    displayMessage({
      role: 'assistant',
      content: '❌ Failed to copy to clipboard',
      timestamp: new Date()
    });
  }
}

// Handle send message - Uses authenticated database-linked endpoint
async function handleSendMessage() {
  const inputField = document.getElementById('inputField');
  if (!inputField || isLoading) return;

  const message = inputField.value.trim();
  if (!message) return;

  // Clear input
  inputField.value = '';
  handleInputChange();

  // Add user message
  displayMessage({
    role: 'user',
    content: message,
    timestamp: new Date()
  });

  setLoading(true);

  try {
    // Get current building context if available
    const buildingContext = await getBuildingContext();
    
    const requestBody = {
      prompt: message,
      contextType: determineContextType(message, buildingContext),
      is_outlook_addin: true,
    };

    // Add building context if available
    if (buildingContext?.buildingId) {
      requestBody.building_id = buildingContext.buildingId;
    }

    // Add email context if available
    if (currentEmailData) {
      requestBody.emailContext = currentEmailData;
    }

    console.log('📤 Request body:', requestBody);

    // Use the authenticated add-in endpoint that links to user's database
    const response = await fetch('/api/addin/ask-ai', {
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
        displayMessage({
          role: 'assistant',
          content: `🔐 ${errorData.message}\n\nPlease ensure you are logged into your BlocIQ account in your browser.`,
          timestamp: new Date()
        });
        return;
      }
      
      throw new Error(`API error: ${response.status} - ${errorData.message || errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('📥 Response data:', data);
    
    if (data.success && (data.response || data.result)) {
      const aiResponse = data.response || data.result;
      
      displayMessage({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });
    } else {
      throw new Error(data.error || 'No response received from AI');
    }
  } catch (error) {
    console.error('❌ Chat error:', error);
    displayMessage({
      role: 'assistant',
      content: `❌ **Error:** ${error.message}. Please try again.`,
      timestamp: new Date()
    });
  } finally {
    setLoading(false);
  }
}

// Display message in chat
function displayMessage(message) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.role}`;
  
  const avatar = message.role === 'user' ? 'U' : 'AI';
  const timestamp = message.timestamp.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      ${formatMessageContent(message.content)}
      <div style="font-size: 10px; opacity: 0.7; margin-top: 8px;">${timestamp}</div>
    </div>
  `;

  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

// Format message content (basic markdown support)
function formatMessageContent(content) {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/^(#{1,6})\s(.+)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      return `<h${level} style="margin: 8px 0; font-size: ${20 - level}px;">${title}</h${level}>`;
    });
}

// Set loading state
function setLoading(loading) {
  isLoading = loading;
  const sendButton = document.getElementById('sendButton');
  const inputField = document.getElementById('inputField');
  
  if (sendButton) {
    sendButton.disabled = loading;
  }
  
  if (inputField) {
    inputField.disabled = loading;
  }

  if (loading) {
    displayTypingIndicator();
  } else {
    removeTypingIndicator();
  }
}

// Display typing indicator
function displayTypingIndicator() {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;

  const typingDiv = document.createElement('div');
  typingDiv.id = 'typing-indicator';
  typingDiv.className = 'message assistant typing';
  typingDiv.innerHTML = `
    <div class="message-avatar">AI</div>
    <div class="message-content">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="display: flex; gap: 4px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--blociq-primary); animation: pulse 1.5s infinite;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--blociq-primary); animation: pulse 1.5s infinite 0.2s;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--blociq-primary); animation: pulse 1.5s infinite 0.4s;"></div>
        </div>
        <span style="font-size: 12px; color: var(--blociq-text-light);">BlocIQ is thinking...</span>
      </div>
    </div>
  `;

  chatContainer.appendChild(typingDiv);
  scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Scroll to bottom of chat
function scrollToBottom() {
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 100);
  }
}

// Display welcome message
function displayWelcomeMessage() {
  const welcomeMessage = {
    role: 'assistant',
    content: `🏢 **Welcome to BlocIQ Assistant!**

I'm connected to your BlocIQ database and can help you with:

• **🗣️ Ask Questions** - Full access to your buildings, documents, and data
• **📧 Email Analysis** - Understand content, urgency, and context
• **🤖 Reply Generation** - Create professional, contextual responses  
• **🎯 Email Triage** - Categorize and prioritize messages
• **🏠 Building Information** - Your property data and compliance
• **📋 Document Search** - Access your uploaded documents

${currentEmailData ? '**Current email loaded with full database context!**' : 'I have access to your full BlocIQ account data.'}

*🔐 Authenticated and connected to your personal database.*`,
    timestamp: new Date()
  };

  displayMessage(welcomeMessage);
}

// Setup quick actions in the interface
function setupQuickActions() {
  // Add any additional quick action setup here
  console.log('✅ Quick actions initialized');
}

// Get building context from email or user data
async function getBuildingContext() {
  try {
    // Try to extract building information from current email
    if (currentEmailData) {
      const buildingInfo = await extractBuildingFromContent(currentEmailData);
      if (buildingInfo?.building_id) {
        return {
          buildingId: buildingInfo.building_id,
          buildingName: buildingInfo.building_name,
          source: 'email_extraction'
        };
      }
    }
    
    // Could add other building context detection methods here
    return null;
  } catch (error) {
    console.error('Error getting building context:', error);
    return null;
  }
}

// Determine context type based on message content and building context
function determineContextType(message, buildingContext) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('reply') || lowerMessage.includes('respond') || lowerMessage.includes('email')) {
    return 'email_reply';
  }
  
  if (lowerMessage.includes('major works') || lowerMessage.includes('construction') || lowerMessage.includes('project')) {
    return 'major_works';
  }
  
  if (lowerMessage.includes('compliance') || lowerMessage.includes('regulation') || lowerMessage.includes('certificate')) {
    return 'compliance';
  }
  
  if (buildingContext?.buildingId) {
    return 'building_specific';
  }
  
  return 'general';
}

// Extract building information from email content (simplified version)
async function extractBuildingFromContent(emailContext) {
  try {
    const text = `${emailContext.subject} ${emailContext.body}`;
    
    // Simple pattern matching for building names/addresses
    const buildingPatterns = [
      /\b([A-Z][a-z]+\s+(House|Manor|Gardens|Lodge|Court|Building|Apartments?|Flats?|Estate|Tower|Place|Square|Mews|Close|Road|Street|Avenue|Lane|Drive|Way))\b/gi,
      /\b(\d+\s+[A-Z][a-z]+\s+(Road|Street|Avenue|Lane|Drive|Way))\b/gi,
    ];
    
    for (const pattern of buildingPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          building_name: match[0],
          building_id: null, // Would need API call to resolve
          confidence: 0.7
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting building from content:', error);
    return null;
  }
}

// Utility functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('❌ JavaScript Error:', {
    message: msg,
    source: url,
    line: lineNo,
    column: columnNo,
    error: error
  });
  return false;
};

// Export functions for global access
window.generateAIReply = generateAIReply;
window.analyzeEmail = analyzeEmail;
window.triageEmail = triageEmail;
window.bulkTriage = bulkTriage;
window.insertReply = insertReply;
window.regenerateReply = regenerateReply;
window.copyToClipboard = copyToClipboard;

console.log('🚀 BlocIQ Outlook Add-in fully loaded and ready!');
