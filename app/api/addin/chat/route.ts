// app/api/addin/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, emailContext, source } = body;

        console.log('Chat request received:', {
            message: message.substring(0, 100),
            hasEmailContext: !!emailContext,
            source
        });

        // Validate required fields
        if (!message) {
            return NextResponse.json({
                success: false,
                error: 'Missing message'
            }, { status: 400 });
        }

        // Generate AI response
        const response = await generateChatResponse(message, emailContext);

        return NextResponse.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in chat API:', error);
        
        return NextResponse.json({
            success: false,
            error: 'Failed to process chat message'
        }, { status: 500 });
    }
}

// CORS headers for Outlook add-in
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
}

async function generateChatResponse(message: string, emailContext?: any): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Property management specific responses
    if (lowerMessage.includes('property management') || lowerMessage.includes('property help')) {
        return `🏠 I can help you with various property management tasks:

• **Tenant Relations**: Handling tenant inquiries, lease agreements, and communication
• **Maintenance**: Coordinating repairs, inspections, and routine maintenance
• **Financial Management**: Rent collection, expense tracking, and financial reporting  
• **Legal Compliance**: Understanding regulations, safety requirements, and documentation
• **Market Analysis**: Rental pricing, property valuations, and market trends

What specific property management area would you like assistance with?`;
    }
    
    if (lowerMessage.includes('analyze email') || lowerMessage.includes('analyze this email')) {
        if (emailContext && emailContext.subject) {
            let analysis = `📊 **Email Analysis**\n\n`;
            
            analysis += `**Subject**: ${emailContext.subject}\n`;
            if (emailContext.from) {
                analysis += `**From**: ${emailContext.from}\n`;
            }
            analysis += `**Type**: ${emailContext.itemType || 'Email'}\n\n`;
            
            // Analyze subject for urgency/importance
            const urgent = /urgent|asap|emergency|immediate/i.test(emailContext.subject);
            const inquiry = /question|inquiry|ask|help/i.test(emailContext.subject);
            const complaint = /complaint|issue|problem|concern/i.test(emailContext.subject);
            
            analysis += `**Priority Level**: ${urgent ? '🔴 High' : '🟡 Medium'}\n`;
            analysis += `**Category**: ${complaint ? 'Complaint/Issue' : inquiry ? 'Inquiry' : 'General Communication'}\n\n`;
            
            analysis += `**Recommended Actions**:\n`;
            if (urgent) {
                analysis += `• Respond within 2-4 hours\n`;
            } else {
                analysis += `• Respond within 24 hours\n`;
            }
            analysis += `• Acknowledge receipt and set expectations\n`;
            analysis += `• Gather any additional information needed\n`;
            
            return analysis;
        } else {
            return "To analyze an email, please open this assistant from within an email message. I can then provide insights about the email's content, urgency, and recommended response approach.";
        }
    }
    
    if (lowerMessage.includes('draft reply') || lowerMessage.includes('draft a reply')) {
        if (emailContext && emailContext.subject) {
            return `✍️ **Reply Draft Suggestions**

Based on the email context, here's a professional reply template:

**Subject**: Re: ${emailContext.subject}

**Draft Reply**:
"Thank you for your email regarding [specific topic]. 

I've received your message and understand your [inquiry/concern/request]. I will review the details and provide you with a comprehensive response within [timeframe].

In the meantime, please don't hesitate to reach out if you have any urgent questions or additional information to share.

Best regards,
[Your name]"

**Tips**:
• Customize the timeframe based on complexity
• Add specific details relevant to their inquiry  
• Include next steps or actions you'll take
• Maintain a professional but warm tone

Would you like me to help customize this further?`;
        } else {
            return "To draft a reply, please open this assistant from within an email message. I can then create a tailored response based on the email's content and context.";
        }
    }
    
    if (lowerMessage.includes('action') || lowerMessage.includes('what action')) {
        if (emailContext) {
            return `⚡ **Action Items Analysis**

Based on this email, here are the potential action items:

**Immediate Actions** (within 24 hours):
• Send acknowledgment reply to sender
• Review any attachments or documents mentioned
• Check internal records/systems for relevant information

**Follow-up Actions** (within 2-3 days):  
• Research and gather complete response information
• Consult with relevant team members if needed
• Prepare comprehensive response

**Monitoring Actions** (ongoing):
• Track response time and sender satisfaction
• Document interaction in CRM/system
• Set follow-up reminders if needed

**Priority Assessment**: 
The email appears to be ${emailContext.subject?.includes('urgent') ? 'HIGH priority' : 'STANDARD priority'} based on the subject line.

Would you like me to help create a specific action plan?`;
        } else {
            return "To analyze action items, please open this assistant from within an email. I can then identify specific actions needed based on the email's content.";
        }
    }
    
    // Tenant-related queries
    if (lowerMessage.includes('tenant')) {
        return `👥 **Tenant Management Guidance**

I can help you with various tenant-related matters:

**Communication**:
• Responding to tenant inquiries professionally
• Setting clear expectations and timelines
• Documenting all interactions

**Common Issues**:
• Maintenance requests and coordination
• Rent payment discussions
• Lease agreement questions
• Move-in/move-out procedures

**Best Practices**:
• Respond promptly (within 24 hours for non-urgent matters)
• Be clear and specific in communications
• Keep detailed records of all interactions
• Follow local landlord-tenant laws

What specific tenant situation do you need help with?`;
    }
    
    // Maintenance queries
    if (lowerMessage.includes('maintenance') || lowerMessage.includes('repair')) {
        return `🔧 **Maintenance & Repairs Guidance**

**Prioritization System**:
• **Emergency**: Safety/security issues, no heat/AC, major leaks
• **Urgent**: Affects habitability but not immediate danger  
• **Routine**: General upkeep, minor issues

**Response Framework**:
1. **Acknowledge**: Confirm receipt within 2 hours for emergencies
2. **Assess**: Determine if contractor needed or can self-resolve
3. **Act**: Schedule repairs with appropriate timeline
4. **Follow-up**: Ensure work completed satisfactorily

**Communication Tips**:
• Give realistic timelines and stick to them
• Explain any delays immediately
• Provide tenant with contractor contact info when appropriate
• Document everything with photos/receipts

Need help with a specific maintenance issue?`;
    }
    
    // Financial queries
    if (lowerMessage.includes('rent') || lowerMessage.includes('payment') || lowerMessage.includes('financial')) {
        return `💰 **Financial Management Assistance**

**Rent Collection**:
• Set clear payment terms and due dates
• Offer multiple payment methods when possible
• Send friendly reminders before late fees apply
• Document all payment communications

**Late Payment Process**:
1. Grace period reminder (day after due date)
2. Official late notice (3-5 days late)
3. Follow-up communication (7-10 days late)
4. Legal consultation if needed (30+ days late)

**Financial Records**:
• Track all income and expenses
• Keep receipts for maintenance and improvements
• Prepare monthly/quarterly reports
• Maintain separate accounts for security deposits

**Professional Tone Example**:
"Thank you for contacting me regarding your rent payment. I wanted to follow up on the payment due [date] and see if there are any concerns or questions I can help address."

What financial matter can I assist with?`;
    }
    
    // General helpful response
    return `I'm here to help with your property management needs! I can assist with:

🏠 **Property Management**: Tenant relations, maintenance coordination, financial tracking
📧 **Email Support**: Draft replies, analyze messages, suggest action items  
📋 **Process Guidance**: Best practices for common property management scenarios
🔧 **Maintenance Help**: Prioritizing repairs, contractor communication
💰 **Financial Advice**: Rent collection, expense tracking, reporting

${emailContext ? 'I can see you have an email open - would you like me to help analyze it or draft a response?' : 'Feel free to ask me about any specific property management situation you\'re dealing with!'}

What would you like help with today?`;
}