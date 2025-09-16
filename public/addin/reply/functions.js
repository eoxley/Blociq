// BlocIQ Generate Reply Office Add-in Function File
// This file contains the JavaScript functions that are called by the Office add-in

Office.initialize = function (reason) {
    // Initialize the add-in
    console.log('BlocIQ Generate Reply add-in initialized');
};

// Main function to generate email reply
function generateReply(event) {
    // Get the current mail item
    Office.context.mailbox.item.body.getAsync(
        Office.CoercionType.Text,
        function (result) {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                const emailBody = result.value;

                // Get sender information
                const sender = Office.context.mailbox.item.from;
                const subject = Office.context.mailbox.item.subject;

                // Call BlocIQ API to generate reply
                generateBlocIQReply(emailBody, sender, subject)
                    .then(function(replyText) {
                        // Create reply with generated content
                        Office.context.mailbox.item.displayReplyForm({
                            htmlBody: replyText
                        });

                        // Signal that the function is complete
                        event.completed();
                    })
                    .catch(function(error) {
                        console.error('Error generating reply:', error);

                        // Show error notification
                        Office.context.mailbox.item.notificationMessages.addAsync(
                            'generateReplyError',
                            {
                                type: 'errorMessage',
                                message: 'Failed to generate reply. Please try again.'
                            }
                        );

                        event.completed();
                    });
            } else {
                console.error('Failed to get email body:', result.error);
                event.completed();
            }
        }
    );
}

// Function to call BlocIQ API for reply generation
async function generateBlocIQReply(emailBody, sender, subject) {
    try {
        const response = await fetch('https://www.blociq.co.uk/api/addin/generate-reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                emailBody: emailBody,
                sender: sender ? {
                    displayName: sender.displayName,
                    emailAddress: sender.emailAddress
                } : null,
                subject: subject,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.reply) {
            return data.reply;
        } else {
            throw new Error(data.error || 'Failed to generate reply');
        }

    } catch (error) {
        console.error('BlocIQ API error:', error);
        throw error;
    }
}

// Function to get user context for personalization
function getUserContext() {
    return {
        userProfile: Office.context.mailbox.userProfile,
        timeZone: Office.context.mailbox.timeZoneInfo,
        hostVersion: Office.context.host.version
    };
}

// Register the function with Office
Office.actions.associate('generateReply', generateReply);

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateReply: generateReply,
        generateBlocIQReply: generateBlocIQReply,
        getUserContext: getUserContext
    };
}