/**
 * BlocIQ Generate Reply - Taskpane UI Controller
 * 
 * This file handles the UI interactions for the BlocIQ Generate Reply taskpane.
 * It provides visual feedback and controls for the reply generation process.
 */

// Global variables
let isOfficeReady = false;
let isGenerating = false;

// Initialize Office.js
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    isOfficeReady = true;
    console.log('BlocIQ Generate Reply: Taskpane loaded');
    initializeUI();
  }
});

/**
 * Initialize the UI elements and event handlers
 */
function initializeUI() {
  const generateBtn = document.getElementById('generateBtn');
  const statusCard = document.getElementById('statusCard');
  
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateClick);
  }
  
  // Show initial status
  showStatus('ready', 'Ready to generate reply', 'Click the button above to generate an AI-powered reply');
}

/**
 * Handle the generate button click
 */
async function handleGenerateClick() {
  if (isGenerating) {
    return;
  }
  
  if (!isOfficeReady) {
    showStatus('error', 'Error', 'Office.js not ready. Please try again.');
    return;
  }
  
  isGenerating = true;
  updateGenerateButton(true);
  showStatus('loading', 'Generating...', 'Analyzing email content and generating reply...');
  
  try {
    // Get email context
    const context = await getEmailContext();
    console.log('BlocIQ Generate Reply: Email context retrieved', context);
    
    // Call BlocIQ API
    const draftReply = await callBlocIQAPI(context);
    console.log('BlocIQ Generate Reply: Draft received', draftReply);
    
    // Insert draft into email
    await insertDraftIntoEmail(draftReply);
    console.log('BlocIQ Generate Reply: Draft inserted successfully');
    
    showStatus('success', 'Success!', 'AI reply has been inserted into your email. You can edit it before sending.');
    
  } catch (error) {
    console.error('BlocIQ Generate Reply: Error occurred', error);
    showStatus('error', 'Error', error.message || 'Failed to generate reply. Please try again.');
  } finally {
    isGenerating = false;
    updateGenerateButton(false);
  }
}

/**
 * Get email context (subject, body, sender info)
 */
async function getEmailContext(): Promise<any> {
  return new Promise((resolve, reject) => {
    const item = Office.context.mailbox.item;
    
    if (!item) {
      reject(new Error('No email item available'));
      return;
    }

    // Get email properties
    const context = {
      subject: item.subject || '',
      body: '',
      sender: '',
      recipient: '',
      timestamp: new Date().toISOString()
    };

    // Get email body
    item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        context.body = result.value || '';
      }

      // Get sender information
      if (item.from) {
        context.sender = item.from.emailAddress || '';
      }

      // Get recipient information
      if (item.to && item.to.length > 0) {
        context.recipient = item.to[0].emailAddress || '';
      }

      resolve(context);
    });
  });
}

/**
 * Call BlocIQ API to generate draft reply
 */
async function callBlocIQAPI(context: any): Promise<string> {
  try {
    const response = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        emailContext: context,
        prompt: `Generate a professional reply to this email about property management. 
                 Subject: ${context.subject}
                 From: ${context.sender}
                 Content: ${context.body}
                 
                 Please provide a concise, professional response that addresses the sender's inquiry.`
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate draft');
    }

    return data.draft || 'Thank you for your email. I will review your inquiry and get back to you shortly.';
  } catch (error) {
    console.error('BlocIQ Generate Reply: API call failed', error);
    throw new Error('Failed to generate AI reply. Please try again.');
  }
}

/**
 * Insert the generated draft into the email body
 */
async function insertDraftIntoEmail(draft: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const item = Office.context.mailbox.item;
    
    if (!item) {
      reject(new Error('No email item available'));
      return;
    }

    // Insert the draft into the email body
    item.body.setAsync(draft, { coercionType: Office.CoercionType.Html }, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve();
      } else {
        reject(new Error('Failed to insert draft into email'));
      }
    });
  });
}

/**
 * Show status message
 */
function showStatus(type: 'ready' | 'loading' | 'success' | 'error', title: string, message: string) {
  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const statusTitle = document.getElementById('statusTitle');
  const statusMessage = document.getElementById('statusMessage');
  
  if (!statusCard || !statusIcon || !statusTitle || !statusMessage) {
    return;
  }
  
  // Show the status card
  statusCard.classList.remove('hidden');
  
  // Update content
  statusTitle.textContent = title;
  statusMessage.textContent = message;
  
  // Update icon and colors based on type
  statusIcon.className = 'w-6 h-6 rounded-full flex items-center justify-center';
  
  switch (type) {
    case 'ready':
      statusIcon.classList.add('bg-blue-500');
      statusIcon.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
      break;
    case 'loading':
      statusIcon.classList.add('bg-blue-500');
      statusIcon.innerHTML = '<svg class="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
      break;
    case 'success':
      statusIcon.classList.add('bg-green-500');
      statusIcon.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
      break;
    case 'error':
      statusIcon.classList.add('bg-red-500');
      statusIcon.innerHTML = '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
      break;
  }
}

/**
 * Update the generate button state
 */
function updateGenerateButton(isGenerating: boolean) {
  const generateBtn = document.getElementById('generateBtn');
  
  if (!generateBtn) {
    return;
  }
  
  if (isGenerating) {
    generateBtn.disabled = true;
    generateBtn.classList.add('opacity-50', 'cursor-not-allowed');
    generateBtn.innerHTML = `
      <svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      Generating...
    `;
  } else {
    generateBtn.disabled = false;
    generateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    generateBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      Generate AI Reply
    `;
  }
}
