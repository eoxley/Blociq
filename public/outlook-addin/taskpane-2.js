// BlocIQ Assistant - Outlook Add-in Taskpane
// This provides the main chat interface for the taskpane

let messages = [];
let isProcessing = false;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const inputField = document.getElementById('inputField');
const sendButton = document.getElementById('sendButton');

// Note: AI Reply functionality removed - this is now a pure chat interface

// Tone elements
const toneLabel = document.getElementById('toneLabel');
const toneOverride = document.getElementById('toneOverride');
const toneReasons = document.getElementById('toneReasons');
const boundaryToggle = document.getElementById('boundaryToggle');
const includeBoundary = document.getElementById('includeBoundary');

// Promise detection elements
const promiseStrip = document.getElementById('promiseStrip');
const promiseText = document.getElementById('promiseText');
const confirmPromise = document.getElementById('confirmPromise');
const ignorePromise = document.getElementById('ignorePromise');

// Toast elements
const toastElement = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastClose = document.getElementById('toastClose');

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
      message: prompt,
      emailContext: emailContext,
      source: 'outlook_addin'
    };

    console.log('📤 Request body:', requestBody);

    // Call the unified Ask BlocIQ endpoint
    const response = await fetch('https://www.blociq.co.uk/api/addin/chat', {
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

    if (data.success) {
      return data.response || 'I apologize, but I couldn\'t generate a response. Please try again.';
    } else {
      throw new Error(data.error || 'Unknown API error');
    }

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

  // Tone override functionality
  if (toneOverride) {
    toneOverride.addEventListener('change', handleToneOverride);
  }

  if (includeBoundary) {
    includeBoundary.addEventListener('change', handleBoundaryToggle);
  }

  // Promise detection functionality
  if (confirmPromise) {
    confirmPromise.addEventListener('click', handleConfirmPromise);
  }

  if (ignorePromise) {
    ignorePromise.addEventListener('click', handleIgnorePromise);
  }

  // Toast functionality
  if (toastClose) {
    toastClose.addEventListener('click', hideToast);
  }
}

// Setup ItemSend event handler for toast notifications
function setupItemSendHandler() {
  try {
    // Register for ItemSend event
    Office.context.mailbox.addHandlerAsync(
      Office.EventType.ItemSend,
      handleItemSend,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('✅ ItemSend handler registered successfully');
        } else {
          console.error('❌ Failed to register ItemSend handler:', result.error);
        }
      }
    );
  } catch (error) {
    console.error('❌ Error setting up ItemSend handler:', error);
  }
}

// Handle email send event
function handleItemSend(eventArgs) {
  console.log('📤 Email send detected');

  try {
    // Check if there's a pending follow-up
    if (window.pendingFollowup) {
      const { dueAtHuman, status, warnings } = window.pendingFollowup;

      if (status === 'success') {
        showToast(`📩 Follow-up scheduled for ${dueAtHuman}`, 'success');
      } else if (status === 'partial_success') {
        showToast(`⚠️ Follow-up created with warnings for ${dueAtHuman}`, 'warning');
      } else {
        showToast('⚠️ Could not schedule follow-up', 'error');
      }

      // Clear the pending follow-up
      window.pendingFollowup = null;
    }

    // Always call completed to allow the send to proceed
    eventArgs.completed();

  } catch (error) {
    console.error('❌ Error in ItemSend handler:', error);

    // Still allow the email to send
    eventArgs.completed();
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

    const { enrichment, tone, topic } = await enrichResponse.json();
    console.log('✨ Enrichment result:', { enrichment, tone, topic });

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
        originalMessageSummary: emailContext.messageSummary,
        tone: tone
      })
    });

    if (!draftResponse.ok) {
      const errorText = await draftResponse.text();
      throw new Error(`Draft generation failed: ${errorText}`);
    }

    const { draft, metadata } = await draftResponse.json();
    console.log('📝 Draft generated:', { draft, metadata });

    // Step 3: Show confirmation panel
    showConfirmationPanel(enrichment, tone, draft, metadata, emailContext);

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

// Show confirmation panel with enrichment, tone, and draft
function showConfirmationPanel(enrichment, tone, draft, metadata, emailContext) {
  if (!confirmationPanel) return;

  // Store context for regeneration
  window.currentContext = { enrichment, tone, metadata, emailContext };

  // Update title
  const residentName = enrichment.residentName || 'Resident';
  confirmationTitle.textContent = `Proposed Reply to ${residentName}`;

  // Show tone information
  populateToneSection(tone);

  // Show facts
  populateFactsList(enrichment.facts);

  // Show draft
  draftTextarea.value = draft;

  // Check for promises in the draft and show promise strip if found
  await checkForPromises(draft, enrichment);

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

// Populate tone section
function populateToneSection(tone) {
  if (!toneLabel || !toneReasons) return;

  // Update tone badge
  toneLabel.textContent = tone.label.charAt(0).toUpperCase() + tone.label.slice(1);
  toneLabel.className = `tone-badge ${tone.label}`;

  // Show reasons
  if (tone.reasons && tone.reasons.length > 0) {
    toneReasons.textContent = `Reasons: ${tone.reasons.join(', ')}`;
  } else {
    toneReasons.textContent = '';
  }

  // Show boundary toggle for abusive tone
  if (boundaryToggle) {
    if (tone.label === 'abusive' || tone.escalationRequired) {
      boundaryToggle.style.display = 'block';
    } else {
      boundaryToggle.style.display = 'none';
    }
  }

  // Reset tone override
  if (toneOverride) {
    toneOverride.value = '';
  }
}

// Handle tone override change
async function handleToneOverride() {
  if (!window.currentContext) return;

  const selectedTone = toneOverride.value;
  if (!selectedTone) return; // Use detected tone

  try {
    console.log('🔄 Regenerating draft with tone override:', selectedTone);

    // Regenerate draft with new tone
    const response = await fetch('https://www.blociq.co.uk/api/outlook/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        residentName: window.currentContext.enrichment.residentName,
        unitLabel: window.currentContext.enrichment.unitLabel,
        buildingName: window.currentContext.enrichment.buildingName,
        facts: window.currentContext.enrichment.facts,
        originalMessageSummary: window.currentContext.emailContext.messageSummary,
        tone: window.currentContext.tone,
        userToneOverride: selectedTone
      })
    });

    if (!response.ok) {
      throw new Error('Failed to regenerate draft');
    }

    const { draft } = await response.json();
    draftTextarea.value = draft;

    // Update boundary toggle visibility
    if (boundaryToggle) {
      if (selectedTone === 'abusive') {
        boundaryToggle.style.display = 'block';
      } else {
        boundaryToggle.style.display = 'none';
      }
    }

    console.log('✅ Draft regenerated with new tone');

  } catch (error) {
    console.error('❌ Failed to regenerate draft:', error);
    addMessage(`Failed to regenerate draft: ${error.message}`, 'assistant');
  }
}

// Handle boundary toggle change
function handleBoundaryToggle() {
  // This could trigger a re-generation if needed
  // For now, it's just a visual indicator
  console.log('🔘 Boundary toggle changed:', includeBoundary?.checked);
}

// Check for promises in draft text
async function checkForPromises(draft, enrichment) {
  try {
    console.log('🔍 Checking for promises in draft...');

    const response = await fetch('https://www.blociq.co.uk/api/outlook/followups/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft })
    });

    if (!response.ok) {
      console.warn('Promise detection failed:', response.status);
      return;
    }

    const { promises } = await response.json();

    if (promises && promises.length > 0) {
      const promise = promises[0]; // Use the first detected promise
      showPromiseStrip(promise, enrichment);
      console.log('📅 Promise detected:', promise);
    } else {
      hidePromiseStrip();
    }

  } catch (error) {
    console.error('❌ Promise detection error:', error);
    hidePromiseStrip();
  }
}

// Show promise detection strip
function showPromiseStrip(promise, enrichment) {
  if (!promiseStrip || !promiseText) return;

  const buildingName = enrichment.buildingName || 'Property';
  const text = `Schedule follow-up for ${buildingName} – ${promise.humanLabel}?`;

  promiseText.textContent = text;
  promiseStrip.style.display = 'block';

  // Store promise data for later use
  window.currentPromise = {
    promise,
    enrichment,
    buildingName
  };
}

// Hide promise detection strip
function hidePromiseStrip() {
  if (promiseStrip) {
    promiseStrip.style.display = 'none';
  }
  window.currentPromise = null;
}

// Handle promise confirmation
async function handleConfirmPromise() {
  if (!window.currentPromise) return;

  try {
    console.log('✅ Creating follow-up...');

    // Disable buttons during creation
    if (confirmPromise) confirmPromise.disabled = true;
    if (ignorePromise) ignorePromise.disabled = true;

    const { promise, enrichment, buildingName } = window.currentPromise;
    const emailContext = window.currentContext?.emailContext;

    const response = await fetch('https://www.blociq.co.uk/api/outlook/followups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: emailContext?.subject || 'Follow-up Required',
        matchedText: promise.matchedText,
        dueAtISO: promise.dueAtISO,
        buildingId: enrichment.buildingId,
        unitId: enrichment.unitId,
        leaseholderId: enrichment.leaseholderId,
        buildingName: buildingName,
        senderEmail: emailContext?.senderEmail,
        threadId: emailContext?.threadId,
        messageId: emailContext?.messageId
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Follow-up created:', result);

      // Store for toast notification when email is sent
      window.pendingFollowup = {
        dueAtHuman: result.dueAtHuman,
        status: result.status,
        warnings: result.warnings
      };

      // Hide the strip
      hidePromiseStrip();

      // Show success message in chat
      addMessage(`✅ Follow-up scheduled for ${result.dueAtHuman}`, 'assistant');

    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create follow-up');
    }

  } catch (error) {
    console.error('❌ Follow-up creation failed:', error);
    addMessage(`❌ Could not create follow-up: ${error.message}`, 'assistant');
  } finally {
    // Re-enable buttons
    if (confirmPromise) confirmPromise.disabled = false;
    if (ignorePromise) ignorePromise.disabled = false;
  }
}

// Handle promise ignore
function handleIgnorePromise() {
  console.log('🚫 Promise ignored');
  hidePromiseStrip();
}

// Toast notification functions
function showToast(message, type = 'success') {
  if (!toastElement || !toastMessage) return;

  // Set message and type
  toastMessage.textContent = message;
  toastElement.className = `toast ${type}`;

  // Show toast
  toastElement.style.display = 'flex';

  // Auto-hide after 4 seconds
  setTimeout(() => {
    hideToast();
  }, 4000);

  console.log(`📢 Toast shown: ${type} - ${message}`);
}

function hideToast() {
  if (!toastElement) return;

  // Add hiding animation
  toastElement.classList.add('hiding');

  // Hide after animation completes
  setTimeout(() => {
    toastElement.style.display = 'none';
    toastElement.classList.remove('hiding');
  }, 300);
}

console.log('📁 BlocIQ taskpane.js loaded successfully');