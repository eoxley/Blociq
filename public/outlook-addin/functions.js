/**
 * BlocIQ Outlook Add-in Functions
 * Clean implementation with only core functionality
 */

// Global error handling
window.addEventListener('error', (event) => {
    console.error('[BlocIQ Add-in] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('[BlocIQ Add-in] Promise rejection:', event.reason);
});

// Initialize when Office is ready
Office.onReady((info) => {
    console.log('[BlocIQ Add-in] Office.js ready, host:', info.host);
});

/**
 * Generate AI Reply - Main function for both Read and Compose modes
 */
async function generateReply(event) {
    try {
        console.log('[BlocIQ Add-in] generateReply started');
        
        const item = Office.context.mailbox.item;
        
        if (!item) {
            throw new Error('No mailbox item available');
        }
        
        if (item.itemType !== 'message') {
            throw new Error('Not a message item');
        }
        
        // Get email details
        const subject = item.subject || 'No subject';
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
            context: 'functions'
        });
        
        if (reply && reply.content) {
            // Insert the reply into the compose body
            await insertReplyIntoCompose(reply.content);
            showNotification('AI reply generated successfully!', 'success');
        } else {
            throw new Error('No reply generated');
        }
        
        event.completed();
        
    } catch (error) {
        console.error('[BlocIQ Add-in] Error in generateReply:', error);
        showNotification('Error generating reply: ' + error.message, 'error');
        event.completed();
    }
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
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
    `;
    
    // Set color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            break;
        case 'warning':
            notification.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            break;
        default:
            notification.style.background = 'linear-gradient(135deg, #008C8F, #2BBEB4)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

// Export functions for Office using the correct method
if (typeof Office !== 'undefined' && Office.actions) {
    Office.actions.associate("generateReply", generateReply);
} else {
    // Fallback for when Office.actions is not available
    window.generateReply = generateReply;
}