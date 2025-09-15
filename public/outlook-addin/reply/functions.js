/* global Office */

Office.onReady(() => {
    // Register the functions that will be called when the buttons are clicked
    Office.actions.associate("generateReply", generateReply);
    Office.actions.associate("generateReplyFromRead", generateReplyFromRead);
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
                // Safe property access with detailed logging
                console.log('🔍 Item properties:', {
                    subject: item.subject,
                    from: item.from,
                    conversationId: item.conversationId,
                    hasBody: !!result.value
                });

                let subject = "No subject";
                let sender = "Unknown sender";

                // Handle subject property safely
                if (item.subject && typeof item.subject === 'string') {
                    subject = item.subject;
                } else if (item.subject && typeof item.subject === 'object' && item.subject.toString) {
                    subject = item.subject.toString();
                } else {
                    console.warn('⚠️ Subject property issue:', typeof item.subject, item.subject);
                }

                // Handle sender property safely
                if (item.from) {
                    const fromObj = item.from;
                    console.log('📧 From object:', fromObj);

                    if (typeof fromObj === 'object') {
                        const displayName = fromObj.displayName || fromObj.name || '';
                        const emailAddress = fromObj.emailAddress || fromObj.address || '';

                        if (displayName && emailAddress) {
                            sender = `${displayName} <${emailAddress}>`;
                        } else if (emailAddress) {
                            sender = emailAddress;
                        } else if (displayName) {
                            sender = displayName;
                        }
                    } else if (typeof fromObj === 'string') {
                        sender = fromObj;
                    }
                }

                const context = {
                    subject: subject,
                    sender: sender,
                    body: result.value || "No content",
                    conversationId: item.conversationId || "unknown",
                    timestamp: new Date().toISOString()
                };

                console.log('✅ Final email context:', context);
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
        console.log('🤖 Generating AI reply for email context:', emailContext);

        // Use the main AI API for reply generation (no authentication needed for public access)
        const response = await fetch('https://www.blociq.co.uk/api/ask-ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: `Please draft a professional reply to this email. Subject: "${emailContext.subject}", From: ${emailContext.sender}, Content: ${emailContext.body}`,
                building_id: null,
                is_public: true,
                context_type: 'email_reply',
                intent: 'REPLY',
                emailContext: {
                    subject: emailContext.subject,
                    from: emailContext.sender,
                    body: emailContext.body,
                    conversationId: emailContext.conversationId
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        if (data.success && (data.response || data.result)) {
            return data.response || data.result;
        } else {
            throw new Error(data.error || 'No reply generated');
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

async function generateReplyFromRead(event) {
    try {
        // Show progress indicator
        showNotification("Generating AI reply...", "info");

        // Get the current item (the email being read)
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
            // Create a new compose form with the reply
            Office.context.mailbox.displayReplyForm({
                'htmlBody': aiReply,
                'attachments': []
            });

            showNotification("AI reply generated successfully! Check your compose window.", "success");
        } else {
            showNotification("Failed to generate reply", "error");
        }

    } catch (error) {
        console.error('Error generating reply from read mode:', error);
        showNotification("Error generating reply: " + error.message, "error");
    }

    // Complete the action
    event.completed();
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