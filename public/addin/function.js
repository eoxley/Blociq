// BlocIQ Assistant Function Commands
// This file handles function commands for the Office Add-in

Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        console.log('BlocIQ Assistant functions loaded');
    }
});

// Function to handle custom function commands
function executeFunction(functionName, eventArgs) {
    switch (functionName) {
        case 'analyzeEmail':
            analyzeEmailFunction(eventArgs);
            break;
        case 'draftReply':
            draftReplyFunction(eventArgs);
            break;
        case 'summarizeEmail':
            summarizeEmailFunction(eventArgs);
            break;
        case 'triageEmail':
            triageEmailFunction(eventArgs);
            break;
        default:
            console.log('Unknown function:', functionName);
    }
}

function analyzeEmailFunction(eventArgs) {
    // This function can be called from ribbon commands
    console.log('Analyze email function called');
    
    // Get the current item
    const item = Office.context.mailbox.item;
    
    // Load item properties
    item.loadAsync(['subject', 'from', 'bodyPreview'], (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Email analyzed:', result.value);
            // Here you would typically make an API call to your AI service
        } else {
            console.error('Error loading item:', result.error);
        }
    });
    
    eventArgs.completed();
}

function draftReplyFunction(eventArgs) {
    console.log('Draft reply function called');
    
    const item = Office.context.mailbox.item;
    
    // Create a new reply
    Office.context.mailbox.displayReplyForm({
        htmlBody: '<p>Thank you for your email. I will respond shortly.</p><p>Best regards,<br>Eleanor Oxley<br>BlocIQ</p>'
    });
    
    eventArgs.completed();
}

function summarizeEmailFunction(eventArgs) {
    console.log('Summarize email function called');
    
    const item = Office.context.mailbox.item;
    
    item.loadAsync(['subject', 'bodyPreview'], (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const summary = `Subject: ${result.value.subject}\nPreview: ${result.value.bodyPreview}`;
            console.log('Email summary:', summary);
        }
    });
    
    eventArgs.completed();
}

function triageEmailFunction(eventArgs) {
    console.log('Triage email function called');
    
    const item = Office.context.mailbox.item;
    
    // Mark as high priority for urgent emails
    item.importance.setAsync(Office.MailboxEnums.Importance.High, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Email marked as high priority');
        }
    });
    
    eventArgs.completed();
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        executeFunction,
        analyzeEmailFunction,
        draftReplyFunction,
        summarizeEmailFunction,
        triageEmailFunction
    };
}
