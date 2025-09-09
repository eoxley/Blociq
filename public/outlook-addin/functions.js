/**
 * BlocIQ Outlook Add-in Functions
 * This file contains all command handlers for the Outlook add-in
 */

// Global error handling
window.addEventListener('error', (event) => {
    console.error('[BlocIQ Add-in] Global error:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('[BlocIQ Add-in] Promise rejection:', event.reason);
});

// Initialize when Office is ready
Office.onReady((info) => {
    console.log('[BlocIQ Add-in] Office.js ready, host:', info.host);
});

/**
 * Generate AI Reply from Read Mode
 */
async function onGenerateReplyFromRead(event) {
    try {
        console.log('[BlocIQ Add-in] onGenerateReplyFromRead started');
        
        const item = Office.context.mailbox.item;
        
        if (!item) {
            throw new Error('No mailbox item available');
        }
        
        if (item.itemType !== 'message') {
            throw new Error('Not a message item');
        }
        
        // Get email details
        const subject = item.subject;
        const body = await getItemBody(item);
        const sender = item.from ? item.from.emailAddress : 'Unknown';
        
        console.log('[BlocIQ Add-in] Email details:', { subject, sender, bodyLength: body.length });
        
        // Show loading state
        showNotification('Generating AI reply...', 'info');
        
        // Call AI API to generate reply
        const reply = await generateAIReply({
            subject,
            body,
            sender,
            context: 'read'
        });
        
        if (reply && reply.content) {
            // Show the generated reply in a modal or task pane
            showAIReplyModal(reply.content, subject);
            showNotification('AI reply generated successfully!', 'success');
        } else {
            throw new Error('No reply generated');
        }
        
        event.completed();
        
    } catch (error) {
        console.error('[BlocIQ Add-in] Error in onGenerateReplyFromRead:', error);
        showNotification('Error generating reply: ' + error.message, 'error');
        event.completed();
    }
}

/**
 * Generate AI Reply in Compose Mode
 */
async function onGenerateIntoCompose(event) {
    try {
        console.log('[BlocIQ Add-in] onGenerateIntoCompose started');
        
        const item = Office.context.mailbox.item;
        
        if (!item) {
            throw new Error('No mailbox item available');
        }
        
        if (item.itemType !== 'message') {
            throw new Error('Not a message item');
        }
        
        // Get email details
        const subject = item.subject;
        const body = await getItemBody(item);
        const sender = item.from ? item.from.emailAddress : 'Unknown';
        
        console.log('[BlocIQ Add-in] Compose email details:', { subject, sender, bodyLength: body.length });
        
        // Show loading state
        showNotification('Generating AI reply...', 'info');
        
        // Call AI API to generate reply
        const reply = await generateAIReply({
            subject,
            body,
            sender,
            context: 'compose'
        });
        
        if (reply && reply.content) {
            // Insert the reply into the compose body
            await insertReplyIntoCompose(reply.content);
            showNotification('AI reply inserted successfully!', 'success');
        } else {
            throw new Error('No reply generated');
        }
        
        event.completed();
        
    } catch (error) {
        console.error('[BlocIQ Add-in] Error in onGenerateIntoCompose:', error);
        showNotification('Error generating reply: ' + error.message, 'error');
        event.completed();
    }
}

/**
 * Show AI Reply Modal
 */
function showAIReplyModal(content, subject) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #333;">AI Generated Reply</h3>
            <button id="closeModal" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        </div>
        <div style="margin-bottom: 15px;">
            <strong>Subject:</strong> ${subject || 'No subject'}
        </div>
        <div style="margin-bottom: 20px;">
            <strong>Reply:</strong>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin-top: 5px; white-space: pre-wrap;">${content}</div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="copyReply" style="padding: 8px 16px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy Reply</button>
            <button id="useReply" style="padding: 8px 16px; background: #107c10; color: white; border: none; border-radius: 4px; cursor: pointer;">Use This Reply</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event handlers
    document.getElementById('closeModal').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    document.getElementById('copyReply').onclick = () => {
        navigator.clipboard.writeText(content).then(() => {
            showNotification('Reply copied to clipboard!', 'success');
        });
    };
    
    document.getElementById('useReply').onclick = async () => {
        try {
            await insertReplyIntoCompose(content);
            showNotification('Reply inserted into compose!', 'success');
            document.body.removeChild(overlay);
        } catch (error) {
            showNotification('Error inserting reply: ' + error.message, 'error');
        }
    };
    
    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

/**
 * Insert reply into compose body
 */
async function insertReplyIntoCompose(content) {
    return new Promise((resolve, reject) => {
        Office.context.mailbox.item.body.setSelectedDataAsync(
            content,
            { coercionType: Office.CoercionType.Html },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    resolve();
                } else {
                    reject(new Error(result.error.message));
                }
            }
        );
    });
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
 * Generate AI Reply via API
 */
async function generateAIReply(emailData) {
    try {
        const response = await fetch('https://www.blociq.co.uk/api/ai/generate-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: emailData.subject,
                body: emailData.body,
                sender: emailData.sender,
                context: emailData.context
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('[BlocIQ Add-in] API error:', error);
        // Return a fallback reply
        return {
            content: `Thank you for your email regarding "${emailData.subject}". I'll review this and get back to you shortly.\n\nBest regards,\nBlocIQ Assistant`
        };
    }
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    // Set color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#107c10';
            break;
        case 'error':
            notification.style.background = '#d13438';
            break;
        case 'warning':
            notification.style.background = '#ff8c00';
            break;
        default:
            notification.style.background = '#0078d4';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

// Export functions for Office
if (typeof Office !== 'undefined') {
    Office.actions = Office.actions || {};
    Office.actions.onGenerateReplyFromRead = onGenerateReplyFromRead;
    Office.actions.onGenerateIntoCompose = onGenerateIntoCompose;
}
