Office.onReady(() => {
    // Register functions for Office commands
    Office.actions.associate("generateReply", generateReply);
});

async function generateReply(event) {
    try {
        // Show progress indicator
        showProgressIndicator("Generating AI reply...");

        // Get the current item (email being replied to)
        const item = Office.context.mailbox.item;
        
        // Get email context data
        const emailContext = await getEmailContext(item);
        
        if (!emailContext) {
            showNotification("Unable to read email content. Please ensure you're replying to an email.", "error");
            event.completed();
            return;
        }

        // Call BlocIQ API to generate reply
        const response = await fetch('https://www.blociq.co.uk/api/generate-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject: emailContext.subject,
                sender: emailContext.sender,
                body: emailContext.body
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.reply) {
            throw new Error("No reply generated from API");
        }

        // Insert the generated reply into the compose window
        await insertReplyContent(data.reply);
        
        showNotification("AI reply generated successfully!", "success");

    } catch (error) {
        console.error('Error generating AI reply:', error);
        showNotification("Failed to generate AI reply. Please try again.", "error");
    } finally {
        hideProgressIndicator();
        event.completed();
    }
}

async function getEmailContext(item) {
    return new Promise((resolve) => {
        // Get the conversation to access the original email
        if (item.conversationId) {
            // For replies, try to get the original email context
            const context = {
                subject: item.subject || "No Subject",
                sender: "Previous Sender",
                body: "Previous email content"
            };

            // Try to get the original email content if available
            if (item.getSelectedDataAsync) {
                item.body.getAsync(Office.CoercionType.Text, (result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        // Extract original email content from the reply chain
                        const bodyText = result.value;
                        const originalEmailMatch = bodyText.match(/From:.*?Sent:.*?To:.*?Subject:.*?[\s\S]*?(?=\n\s*$|\n\n|$)/);
                        
                        if (originalEmailMatch) {
                            context.body = originalEmailMatch[0].substring(0, 1000); // Limit to 1000 chars
                        } else {
                            // Fallback: use first part of the body
                            context.body = bodyText.substring(0, 500);
                        }
                    }
                    resolve(context);
                });
            } else {
                resolve(context);
            }
        } else {
            // If no conversation context, create basic context
            resolve({
                subject: item.subject || "Email Reply",
                sender: "Email Sender",
                body: "Original email content not available"
            });
        }
    });
}

async function insertReplyContent(replyHtml) {
    return new Promise((resolve, reject) => {
        // Insert the AI-generated reply at the current cursor position
        Office.context.mailbox.item.body.setSelectedDataAsync(
            replyHtml,
            { coercionType: Office.CoercionType.Html },
            (result) => {
                if (result.status === Office.AsyncResultStatus.Succeeded) {
                    resolve();
                } else {
                    reject(new Error("Failed to insert reply content"));
                }
            }
        );
    });
}

function showProgressIndicator(message) {
    // Use Office notification if available
    if (Office.context.mailbox.item.notificationMessages) {
        Office.context.mailbox.item.notificationMessages.addAsync("progress", {
            type: Office.MailboxEnums.ItemNotificationMessageType.ProgressIndicator,
            message: message
        });
    }
}

function hideProgressIndicator() {
    if (Office.context.mailbox.item.notificationMessages) {
        Office.context.mailbox.item.notificationMessages.removeAsync("progress");
    }
}

function showNotification(message, type = "informational") {
    const notificationType = type === "error" 
        ? Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage
        : Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage;

    if (Office.context.mailbox.item.notificationMessages) {
        Office.context.mailbox.item.notificationMessages.addAsync("notification", {
            type: notificationType,
            message: message,
            persistent: false
        });

        // Auto-remove notification after 3 seconds
        setTimeout(() => {
            Office.context.mailbox.item.notificationMessages.removeAsync("notification");
        }, 3000);
    }
}