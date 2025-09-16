// Office.js Function File for BlocIQ Generate Reply Add-in
// This file must be accessible at: https://www.blociq.co.uk/addin/reply/functions.js

(function () {
    "use strict";

    // Office is ready
    Office.onReady(() => {
        console.log('BlocIQ Functions file loaded');
    });

    // The initialize function must be run each time a new page is loaded
    Office.initialize = function (reason) {
        console.log('Office initialized with reason:', reason);
    };

    /**
     * Generate Reply Function
     * Called when user clicks "Generate Reply" button
     */
    function generateReply(event) {
        console.log('Generate Reply function called');
        
        try {
            // Show progress indicator
            Office.context.ui.displayDialogAsync(
                'https://www.blociq.co.uk/addin/reply?mode=generating',
                { height: 60, width: 40, displayInIframe: true },
                function (result) {
                    if (result.status === Office.AsyncResultStatus.Failed) {
                        console.error('Failed to show progress dialog:', result.error.message);
                    } else {
                        const dialog = result.value;
                        
                        // Auto close dialog after 2 seconds
                        setTimeout(() => {
                            dialog.close();
                        }, 2000);
                    }
                }
            );

            // Get the current email item
            const item = Office.context.mailbox.item;
            
            if (!item) {
                console.error('No email item found');
                showNotification('Error', 'No email found to generate reply for');
                event.completed();
                return;
            }

            // Extract email content based on item type
            if (item.itemType === Office.MailboxEnums.ItemType.Message) {
                // Reading an email - get body content
                item.body.getAsync(Office.CoercionType.Text, function (bodyResult) {
                    if (bodyResult.status === Office.AsyncResultStatus.Succeeded) {
                        const emailBody = bodyResult.value;
                        const subject = item.subject;
                        const sender = item.from ? item.from.emailAddress : 'Unknown';
                        
                        console.log('Email details extracted:', {
                            subject,
                            sender,
                            bodyLength: emailBody.length
                        });
                        
                        // Call BlocIQ API to generate reply
                        generateReplyContent(subject, sender, emailBody, event);
                        
                    } else {
                        console.error('Failed to get email body:', bodyResult.error.message);
                        showNotification('Error', 'Could not read email content');
                        event.completed();
                    }
                });
                
            } else if (item.itemType === Office.MailboxEnums.ItemType.Appointment) {
                // Handle appointment/meeting
                showNotification('Info', 'Reply generation for appointments is not yet supported');
                event.completed();
                
            } else {
                // Composing an email - different handling
                console.log('Compose mode - generating reply assistance');
                showComposeAssistance(event);
            }

        } catch (error) {
            console.error('Error in generateReply function:', error);
            showNotification('Error', 'An unexpected error occurred');
            event.completed();
        }
    }

    /**
     * Generate reply content using BlocIQ API
     */
    async function generateReplyContent(subject, sender, emailBody, event) {
        try {
            const response = await fetch('https://www.blociq.co.uk/api/addin/generate-reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    originalSubject: subject,
                    originalSender: sender,
                    originalBody: emailBody,
                    context: 'outlook_addin'
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && result.reply) {
                // Create a new reply with the generated content
                createReplyWithContent(result.reply, subject, event);
            } else {
                throw new Error(result.error || 'Failed to generate reply');
            }

        } catch (error) {
            console.error('Error generating reply:', error);
            showNotification('Error', 'Failed to generate reply: ' + error.message);
            event.completed();
        }
    }

    /**
     * Create a reply email with generated content
     */
    function createReplyWithContent(replyContent, originalSubject, event) {
        try {
            // Create reply
            Office.context.mailbox.item.reply.displayAsync(
                {
                    htmlBody: `<div style="font-family: Arial, sans-serif; font-size: 14px;">
                        <p>${replyContent.replace(/\n/g, '</p><p>')}</p>
                        <br>
                        <div style="font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px;">
                            <em>Generated by BlocIQ AI Assistant</em>
                        </div>
                    </div>`
                },
                function (result) {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        console.log('Reply created successfully');
                        showNotification('Success', 'Reply generated and opened for review');
                    } else {
                        console.error('Failed to create reply:', result.error.message);
                        showNotification('Error', 'Could not create reply email');
                    }
                    event.completed();
                }
            );

        } catch (error) {
            console.error('Error creating reply:', error);
            showNotification('Error', 'Failed to create reply email');
            event.completed();
        }
    }

    /**
     * Handle compose assistance
     */
    function showComposeAssistance(event) {
        try {
            // For compose mode, show the taskpane instead
            Office.context.ui.displayDialogAsync(
                'https://www.blociq.co.uk/addin/ask?mode=compose',
                { height: 80, width: 60, displayInIframe: true },
                function (result) {
                    if (result.status === Office.AsyncResultStatus.Failed) {
                        console.error('Failed to show compose dialog:', result.error.message);
                        showNotification('Error', 'Could not open compose assistance');
                    }
                    event.completed();
                }
            );

        } catch (error) {
            console.error('Error showing compose assistance:', error);
            showNotification('Error', 'Could not open compose assistance');
            event.completed();
        }
    }

    /**
     * Show notification to user
     */
    function showNotification(title, message) {
        try {
            Office.context.mailbox.item.notificationMessages.addAsync(
                'blociq_notification',
                {
                    type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
                    message: message,
                    icon: 'Icon.16x16',
                    persistent: false
                }
            );
        } catch (error) {
            console.error('Error showing notification:', error);
            // Fallback to console log if notifications fail
            console.log(`${title}: ${message}`);
        }
    }

    // Register the function with Office
    if (typeof Office !== 'undefined' && Office.actions) {
        Office.actions.associate('generateReply', generateReply);
    } else {
        // Fallback for older Office versions
        window.generateReply = generateReply;
    }

    // Global error handler
    window.addEventListener('error', function(e) {
        console.error('Global error in functions.js:', e.error);
    });

})();