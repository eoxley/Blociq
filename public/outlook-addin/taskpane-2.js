// BlocIQ Assistant - Outlook Add-in Taskpane
// This provides the main chat interface for the taskpane

let messages = [];
let isProcessing = false;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const inputField = document.getElementById('inputField');
const sendButton = document.getElementById('sendButton');

// AI Reply elements
const aiReplyButton = document.getElementById('aiReplyButton');
const confirmationPanel = document.getElementById('confirmationPanel');
const confirmationTitle = document.getElementById('confirmationTitle');
const closeConfirmation = document.getElementById('closeConfirmation');
const factsSection = document.getElementById('factsSection');
const factsList = document.getElementById('factsList');
const draftTextarea = document.getElementById('draftTextarea');
const insertDraftButton = document.getElementById('insertDraftButton');
const cancelButton = document.getElementById('cancelButton');

// Initialize add-in
Office.onReady(() => {
  console.log('📋 BlocIQ Taskpane loaded successfully');
  setupEventListeners();
  setupAIReplyListeners();
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

// Setup AI Reply event listeners
function setupAIReplyListeners() {
  if (aiReplyButton) {
    aiReplyButton.addEventListener('click', handleAIReply);
  }

  if (closeConfirmation) {
    closeConfirmation.addEventListener('click', hideConfirmationPanel);
  }

  if (insertDraftButton) {
    insertDraftButton.addEventListener('click', handleInsertDraft);
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', hideConfirmationPanel);
  }
}

// Handle AI Reply button click
async function handleAIReply() {
  if (isProcessing) return;

  try {
    isProcessing = true;
    setLoadingState(true);

    console.log('🤖 Starting AI Reply generation...');

    // Get current email context
    const emailContext = await getDetailedEmailContext();
    if (!emailContext) {
      throw new Error('Could not read email context. Please select an email and try again.');
    }

    console.log('📧 Email context:', emailContext);

    // Step 1: Enrich with building and compliance data
    console.log('🔍 Enriching with building data...');
    const enrichResponse = await fetch('https://www.blociq.co.uk/api/outlook/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderEmail: emailContext.senderEmail,
        buildingHint: emailContext.buildingHint,
        messageSummary: emailContext.messageSummary,
        subject: emailContext.subject
      })
    });

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      throw new Error(`Enrichment failed: ${errorText}`);
    }

    const { enrichment } = await enrichResponse.json();
    console.log('✨ Enrichment result:', enrichment);

    // Step 2: Generate draft
    console.log('✍️ Generating draft...');
    const draftResponse = await fetch('https://www.blociq.co.uk/api/outlook/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        residentName: enrichment.residentName,
        unitLabel: enrichment.unitLabel,
        buildingName: enrichment.buildingName,
        facts: enrichment.facts,
        originalMessageSummary: emailContext.messageSummary
      })
    });

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text();
      throw new Error(`Draft generation failed: ${errorText}`);
    }

    const { draft, metadata } = await draftResponse.json();
    console.log('📝 Draft generated:', { draft, metadata });

    // Step 3: Show confirmation panel
    showConfirmationPanel(enrichment, draft, metadata);

  } catch (error) {
    console.error('❌ AI Reply failed:', error);

    // Show error in chat
    addMessage(`AI Reply failed: ${error.message}`, 'assistant');
  } finally {
    isProcessing = false;
    setLoadingState(false);
  }
}

// Get detailed email context for AI Reply
async function getDetailedEmailContext() {
  try {
    const item = Office.context.mailbox.item;
    if (!item) {
      throw new Error('No email item available');
    }

    const context = {
      subject: item.subject || '',
      itemId: item.itemId || null,
      itemType: item.itemType || 'message'
    };

    // Get sender info
    if (item.from) {
      context.senderEmail = item.from.emailAddress || '';
      context.senderName = item.from.displayName || '';
    }

    // Try to get body content
    if (item.body && item.body.getAsync) {
      const bodyResult = await new Promise((resolve, reject) => {
        item.body.getAsync(Office.CoercionType.Text, (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve(result.value);
          } else {
            resolve(''); // Don't fail on body read errors
          }
        });
      });
      context.body = bodyResult;
    }

    // Create message summary for AI processing
    context.messageSummary = createMessageSummary(context);

    // Extract building hint from subject/body
    context.buildingHint = extractBuildingHint(context);

    return context;

  } catch (error) {
    console.error('Error getting detailed email context:', error);
    return null;
  }
}

// Create message summary for topic detection
function createMessageSummary(context) {
  const parts = [];

  if (context.subject) {
    parts.push(`Subject: ${context.subject}`);
  }

  if (context.body) {
    // Take first 500 chars of body for summary
    const bodyPreview = context.body.slice(0, 500).replace(/\s+/g, ' ').trim();
    parts.push(`Body: ${bodyPreview}`);
  }

  return parts.join(' | ');
}

// Extract building hint from email content
function extractBuildingHint(context) {
  const text = `${context.subject || ''} ${context.body || ''}`.toLowerCase();

  // Look for common building name patterns
  const buildingPatterns = [
    /(\w+\s+court)/gi,
    /(\w+\s+house)/gi,
    /(\w+\s+tower)/gi,
    /(\w+\s+mansion)/gi,
    /(\w+\s+apartments?)/gi,
    /(\w+\s+building)/gi,
    /(\w+\s+block)/gi
  ];

  for (const pattern of buildingPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

// Show confirmation panel with enrichment and draft
function showConfirmationPanel(enrichment, draft, metadata) {
  if (!confirmationPanel) return;

  // Update title
  const residentName = enrichment.residentName || 'Resident';
  confirmationTitle.textContent = `Proposed Reply to ${residentName}`;

  // Show facts
  populateFactsList(enrichment.facts);

  // Show draft
  draftTextarea.value = draft;

  // Show panel
  confirmationPanel.style.display = 'block';
}

// Populate facts list
function populateFactsList(facts) {
  if (!factsList) return;

  factsList.innerHTML = '';

  const factLabels = {
    fraLast: 'Fire Risk Assessment (last)',
    fraNext: 'Fire Risk Assessment (next due)',
    fireDoorInspectLast: 'Fire door inspection (last)',
    alarmServiceLast: 'Alarm system service (last)',
    eicrLast: 'EICR (last)',
    eicrNext: 'EICR (next due)',
    gasLast: 'Gas safety (last)',
    gasNext: 'Gas safety (next due)',
    asbestosLast: 'Asbestos survey (last)',
    asbestosNext: 'Asbestos survey (next due)',
    openLeakTicketRef: 'Existing leak ticket',
    openWorkOrderRef: 'Existing work order'
  };

  for (const [key, value] of Object.entries(facts)) {
    if (value !== null && value !== undefined && value !== '') {
      const li = document.createElement('li');
      const label = factLabels[key] || key;
      li.textContent = `${label}: ${value}`;
      factsList.appendChild(li);
    }
  }

  if (factsList.children.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No specific building data available for this sender';
    li.style.fontStyle = 'italic';
    factsList.appendChild(li);
  }
}

// Hide confirmation panel
function hideConfirmationPanel() {
  if (confirmationPanel) {
    confirmationPanel.style.display = 'none';
  }
}

// Handle insert draft into email
async function handleInsertDraft() {
  try {
    const draft = draftTextarea.value;
    if (!draft.trim()) {
      throw new Error('No draft content to insert');
    }

    console.log('📝 Inserting draft into email...');

    // Insert draft into email compose window
    await new Promise((resolve, reject) => {
      Office.context.mailbox.item.body.setSelectedDataAsync(
        draft,
        { coercionType: Office.CoercionType.Text },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve();
          } else {
            reject(new Error(result.error?.message || 'Failed to insert draft'));
          }
        }
      );
    });

    console.log('✅ Draft inserted successfully');

    // Hide panel and show success message
    hideConfirmationPanel();
    addMessage('✅ Draft inserted into your email. You can now review and send it.', 'assistant');

  } catch (error) {
    console.error('❌ Failed to insert draft:', error);
    addMessage(`Failed to insert draft: ${error.message}`, 'assistant');
  }
}

// Set loading state for AI Reply button
function setLoadingState(loading) {
  if (!aiReplyButton) return;

  const container = aiReplyButton.closest('.ai-reply-section');

  if (loading) {
    container.classList.add('loading');
    aiReplyButton.disabled = true;
  } else {
    container.classList.remove('loading');
    aiReplyButton.disabled = false;
  }
}

console.log('📁 BlocIQ taskpane.js loaded successfully');