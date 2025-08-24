// BlocIQ Assistant Taskpane JavaScript
// Handles Office.js integration and add-in functionality

Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        console.log('BlocIQ Assistant loaded in Outlook');
        initializeAddin();
    }
});

function initializeAddin() {
    // Get DOM elements
    const analyzeBtn = document.getElementById('analyzeBtn');
    const draftBtn = document.getElementById('draftBtn');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const triageBtn = document.getElementById('triageBtn');
    const loading = document.getElementById('loading');
    const emailInfo = document.getElementById('emailInfo');
    const suggestions = document.getElementById('suggestions');
    const suggestionsList = document.getElementById('suggestionsList');

    // Add event listeners
    analyzeBtn.addEventListener('click', analyzeEmail);
    draftBtn.addEventListener('click', draftReply);
    summarizeBtn.addEventListener('click', summarizeEmail);
    triageBtn.addEventListener('click', triageEmail);

    // Load initial email information
    loadEmailInfo();
}

function loadEmailInfo() {
    const emailInfo = document.getElementById('emailInfo');
    
    Office.context.mailbox.item.loadAsync(['subject', 'from', 'toRecipients', 'ccRecipients', 'bodyPreview'], (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const item = result.value;
            const from = item.from ? item.from.emailAddress : 'Unknown';
            const to = item.toRecipients ? item.toRecipients.map(r => r.emailAddress).join(', ') : 'None';
            const cc = item.ccRecipients ? item.ccRecipients.map(r => r.emailAddress).join(', ') : 'None';
            
            emailInfo.innerHTML = `
                <h4>Subject</h4>
                <p>${item.subject || 'No subject'}</p>
                <h4>From</h4>
                <p>${from}</p>
                <h4>To</h4>
                <p>${to}</p>
                ${cc ? `<h4>CC</h4><p>${cc}</p>` : ''}
                <h4>Preview</h4>
                <p>${item.bodyPreview || 'No preview available'}</p>
            `;
        } else {
            emailInfo.innerHTML = '<p>Error loading email information</p>';
        }
    });
}

function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

function showSuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('suggestions');
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (suggestions && suggestions.length > 0) {
        suggestionsList.innerHTML = suggestions.map(suggestion => 
            `<div class="suggestion" onclick="applySuggestion('${suggestion.id}')">
                <strong>${suggestion.title}</strong><br>
                <small>${suggestion.description}</small>
            </div>`
        ).join('');
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.style.display = 'none';
    }
}

function analyzeEmail() {
    showLoading(true);
    
    // Get email content for analysis
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailContent = result.value;
            
            // Simulate AI analysis (replace with actual API call)
            setTimeout(() => {
                showLoading(false);
                
                const analysisResults = [
                    {
                        id: 'priority',
                        title: 'Priority: High',
                        description: 'This email requires immediate attention due to urgent content.'
                    },
                    {
                        id: 'action',
                        title: 'Action Required',
                        description: 'Contains a request that needs a response within 24 hours.'
                    },
                    {
                        id: 'category',
                        title: 'Category: Business',
                        description: 'Classified as business communication requiring professional response.'
                    }
                ];
                
                showSuggestions(analysisResults);
            }, 2000);
        } else {
            showLoading(false);
            alert('Error analyzing email: ' + result.error.message);
        }
    });
}

function draftReply() {
    showLoading(true);
    
    // Get email content for reply drafting
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailContent = result.value;
            
            // Simulate AI reply drafting (replace with actual API call)
            setTimeout(() => {
                showLoading(false);
                
                const draftReply = `Thank you for your email regarding ${Office.context.mailbox.item.subject}.

I understand your request and will address it promptly. 

Best regards,
Eleanor Oxley
BlocIQ`;

                // Insert the draft reply into a new compose window
                Office.context.mailbox.displayReplyForm(draftReply);
            }, 2000);
        } else {
            showLoading(false);
            alert('Error drafting reply: ' + result.error.message);
        }
    });
}

function summarizeEmail() {
    showLoading(true);
    
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailContent = result.value;
            
            // Simulate AI summarization (replace with actual API call)
            setTimeout(() => {
                showLoading(false);
                
                const summary = `Email Summary:
• Subject: ${Office.context.mailbox.item.subject}
• Key Points: This email contains important information about business operations
• Action Items: Review and respond within 24 hours
• Priority: Medium`;
                
                showSuggestions([{
                    id: 'summary',
                    title: 'Email Summary',
                    description: summary
                }]);
            }, 1500);
        } else {
            showLoading(false);
            alert('Error summarizing email: ' + result.error.message);
        }
    });
}

function triageEmail() {
    showLoading(true);
    
    Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailContent = result.value;
            
            // Simulate AI triage (replace with actual API call)
            setTimeout(() => {
                showLoading(false);
                
                const triageResults = [
                    {
                        id: 'urgent',
                        title: 'Mark as Urgent',
                        description: 'This email requires immediate attention.'
                    },
                    {
                        id: 'followup',
                        title: 'Schedule Follow-up',
                        description: 'Set a reminder to follow up on this email.'
                    },
                    {
                        id: 'delegate',
                        title: 'Delegate',
                        description: 'Consider delegating this to a team member.'
                    }
                ];
                
                showSuggestions(triageResults);
            }, 1500);
        } else {
            showLoading(false);
            alert('Error triaging email: ' + result.error.message);
        }
    });
}

function applySuggestion(suggestionId) {
    switch (suggestionId) {
        case 'priority':
            // Mark email as high priority
            Office.context.mailbox.item.importance.setAsync(Office.MailboxEnums.Importance.High);
            break;
        case 'urgent':
            // Mark email as urgent
            Office.context.mailbox.item.importance.setAsync(Office.MailboxEnums.Importance.High);
            break;
        case 'followup':
            // Create a follow-up reminder
            alert('Follow-up reminder created for this email.');
            break;
        case 'delegate':
            // Show delegation options
            alert('Delegation options will be available in future updates.');
            break;
        default:
            console.log('Unknown suggestion:', suggestionId);
    }
}

// Utility function to make API calls to BlocIQ backend
async function callBlocIQAPI(endpoint, data) {
    try {
        const response = await fetch(`https://blociq.co.uk/api/ai/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

function getAuthToken() {
    // This would need to be implemented based on your authentication system
    // For now, returning a placeholder
    return 'placeholder-token';
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    alert('An error occurred. Please check the console for details.');
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeEmail,
        draftReply,
        summarizeEmail,
        triageEmail,
        applySuggestion
    };
}
