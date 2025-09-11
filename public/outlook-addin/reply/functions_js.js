/* global Office */

Office.onReady(() => {
    // Register the function that will be called when the button is clicked
    Office.actions.associate("generateReply", generateReply);
});

async function generateReply(event) {
    try {
        // Show progress indicator
        showNotification("Generating AI reply...", "info");
        
        // Get the current item (the email being replied to)
        const item = Office.context.mailbox.item;
        
        if (!item) {
            showNotification("No email selected", "error");
            event.completed();
            return;
        }

        // Get email context
        const emailContext = await getEmailContext(item);
        
        if (!emailContext) {
            showNotification("Could not read email content", "error");
            event.completed();
            return;
        }

        // Generate reply using AI
        const aiReply = await generateAIReply(emailContext);
        
        if (aiReply) {
            // Insert the reply into the email body
            await insertReplyIntoBody(aiReply);
            showNotification("AI reply generated successfully!", "success");
        } else {
            showNotification("Failed to generate reply", "error");
        }
        
    } catch (error) {
        console.error('Error generating reply:', error);
        showNotification("Error generating reply: " + error.message, "error");
    }
    
    // Complete the action
    event.completed();
}

async function getEmailContext(item) {
    return new Promise((resolve, reject) => {
        // Get the original email content
        item.body.getAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                const context = {
                    subject: item.subject || "No subject",
                    sender: item.from ? item.from.displayName + " <" + item.from.emailAddress + ">" : "Unknown sender",
                    body: result.value || "No content",
                    conversationId: item.conversationId,
                    timestamp: new Date().toISOString()
                };
                resolve(context);
            } else {
                console.error('Error reading email body:', result.error);
                reject(new Error('Failed to read email content'));
            }
        });
    });
}

async function generateAIReply(emailContext) {
    try {
        const response = await fetch('https://www.blociq.co.uk/api/generate-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: emailContext.subject,
                sender: emailContext.sender,
                body: emailContext.body,
                context: 'outlook-addin-reply'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.reply) {
            return data.reply;
        } else {
            throw new Error('No reply generated');
        }
        
    } catch (error) {
        console.error('Error calling AI reply API:', error);
        throw error;
    }
}

async function insertReplyIntoBody(replyText) {
    return new Promise((resolve, reject) => {
        // Get current item (the compose email)
        const item = Office.context.mailbox.item;
        
        // Convert plain text to HTML if needed
        let htmlReply = replyText;
        if (!replyText.includes('<')) {
            // Simple text to HTML conversion
            htmlReply = replyText
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>');
        }
        
        // Insert at the beginning of the email body
        item.body.setSelectedDataAsync(
            htmlReply,
            {
                coercionType: Office.CoercionType.Html,
                asyncContext: { operation: 'insertReply' }
            },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    resolve(true);
                } else {
                    console.error('Error inserting reply:', result.error);
                    reject(new Error('Failed to insert reply into email'));
                }
            }
        );
    });
}

function showNotification(message, type = 'info') {
    // Show notification using Office notification API
    if (Office.context.mailbox.item.notificationMessages) {
        const notificationId = 'blociq-' + Date.now();
        const notificationData = {
            type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
            message: message,
            icon: type === 'error' ? 'icon2' : 'icon1',
            persistent: type === 'error'
        };
        
        Office.context.mailbox.item.notificationMessages.addAsync(
            notificationId,
            notificationData,
            (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    console.error('Failed to show notification:', result.error);
                }
                
                // Auto-remove success notifications after 3 seconds
                if (type === 'success') {
                    setTimeout(() => {
                        Office.context.mailbox.item.notificationMessages.removeAsync(notificationId);
                    }, 3000);
                }
            }
        );
    } else {
        // Fallback to console if notifications aren't supported
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}