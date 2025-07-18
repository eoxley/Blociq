# AI Suggested Action Sidebar for BlocIQ Inbox

## Overview

The AI Suggested Action Sidebar is a smart assistant that automatically analyzes incoming emails and provides property managers with intelligent suggestions for next actions. It appears as a right-hand sidebar in the email detail view (`/inbox/[id]`) and helps streamline email handling workflows.

## Features

### 🧠 AI Email Analysis
- **Automatic Tagging**: Categorizes emails with relevant tags (service charge, maintenance, complaint, legal, finance, emergency, routine)
- **Smart Summaries**: Provides concise 2-3 sentence summaries of email content
- **Action Suggestions**: Recommends the best next action for each email
- **Template Matching**: Suggests relevant document templates when appropriate

### 🎯 Action Types
The AI categorizes suggested actions into these types:

1. **Generate Template** (`generate_template`)
   - When a specific document/letter should be generated
   - Links directly to template creation with prefilled data
   - Examples: Service charge letters, maintenance notices, legal documents

2. **Reply** (`reply`)
   - When a direct email reply is needed
   - Opens the AI Reply modal with context
   - Pre-fills with relevant building/unit information

3. **Raise Task** (`raise_task`)
   - When a maintenance task or work order should be created
   - Navigates to task creation with prefilled information
   - Links email context to the task

4. **Escalate** (`escalate`)
   - When the issue needs senior management attention
   - Marks email as escalated in the system
   - Updates status and handling information

5. **Archive** (`archive`)
   - When no action is needed
   - Moves email to archived folder
   - Marks as handled

### 🎨 Visual Design
- **Color-coded Tags**: Different colors for different tag types
- **Action Icons**: Visual indicators for each action type
- **Loading States**: Smooth loading animations during analysis
- **Tooltips**: Helpful hints for each action button

## Database Schema

### New Fields Added to `incoming_emails` Table

```sql
-- AI-generated tags for email categorization
tags TEXT[] 

-- AI-generated summary of email content
ai_summary TEXT

-- AI-suggested next action for this email
suggested_action TEXT

-- Type of suggested action
suggested_action_type TEXT

-- Template ID to use if suggested action is generate_template
suggested_template_id UUID REFERENCES templates(id)

-- Unit ID if email is related to a specific unit
related_unit_id UUID REFERENCES units(id)

-- Timestamp when AI analysis was performed
ai_analyzed_at TIMESTAMP WITH TIME ZONE
```

### Indexes for Performance
```sql
CREATE INDEX idx_incoming_emails_tags ON incoming_emails USING GIN(tags);
CREATE INDEX idx_incoming_emails_suggested_action_type ON incoming_emails(suggested_action_type);
CREATE INDEX idx_incoming_emails_ai_analyzed_at ON incoming_emails(ai_analyzed_at);
CREATE INDEX idx_incoming_emails_suggested_template_id ON incoming_emails(suggested_template_id);
CREATE INDEX idx_incoming_emails_related_unit_id ON incoming_emails(related_unit_id);
```

## API Endpoints

### 1. Analyze Email
**POST** `/api/analyze-email`

Analyzes an email and provides AI-generated insights.

**Request Body:**
```json
{
  "messageId": "string",
  "forceReanalyze": false
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "tags": ["service charge", "complaint"],
    "ai_summary": "Leaseholder is concerned about high service charge",
    "suggested_action": "Reply with explanation and attach Budget Letter",
    "suggested_action_type": "generate_template",
    "suggested_template_id": "uuid",
    "related_unit_id": "uuid",
    "ai_analyzed_at": "2024-01-01T12:00:00Z"
  }
}
```

### 2. Mark as Escalated
**POST** `/api/mark-escalated`

Marks an email as escalated.

**Request Body:**
```json
{
  "messageId": "string"
}
```

### 3. Mark as Archived
**POST** `/api/mark-archived`

Marks an email as archived.

**Request Body:**
```json
{
  "messageId": "string"
}
```

## Components

### AISuggestedActionSidebar
Main component that displays the AI analysis and action buttons.

**Props:**
- `messageId`: Email message ID
- `buildingId`: Optional building ID for context
- `onActionTaken`: Callback when action is executed

**Features:**
- Fetches and displays AI analysis
- Provides action buttons with loading states
- Handles navigation to other pages
- Supports re-analysis of emails

### Tooltip Component
New UI component for displaying helpful tooltips.

**Usage:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Helpful hint</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Integration Points

### Email Sync Process
The email sync process (`/api/sync-emails`) automatically triggers AI analysis for newly synced emails:

```typescript
// After successfully inserting email
if (!error) {
  // Trigger AI analysis asynchronously
  fetch('/api/analyze-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId: email.message_id })
  })
}
```

### Email Detail Page
The email detail page (`/inbox/[id]`) now includes:

1. **Two-column layout**: Email content on left, AI sidebar on right
2. **Updated interface**: Includes AI analysis fields
3. **Action integration**: Sidebar actions trigger appropriate responses

### Reply Modal Integration
When the sidebar suggests a "reply" action, it can trigger the existing reply modal with context.

## AI Analysis Process

### 1. Context Building
The AI analysis considers:
- Email content (subject, body, sender)
- Building context (if related to a specific building)
- Unit context (if related to a specific unit)
- Property management domain knowledge

### 2. Analysis Steps
1. **Tag Generation**: Categorizes email with relevant tags
2. **Summary Creation**: Creates concise summary of content
3. **Action Recommendation**: Suggests best next action
4. **Template Matching**: Finds relevant templates if needed
5. **Context Linking**: Links to related units/buildings

### 3. AI Prompt Structure
```typescript
const systemPrompt = `You are an expert property management AI assistant specializing in UK leasehold block management. Your job is to analyze incoming emails and provide:

1. **Tags**: Categorize the email with relevant tags
2. **Summary**: Provide a concise 2-3 sentence summary
3. **Suggested Action**: Recommend the best next action
4. **Action Type**: Categorize the suggested action

Return your response as a valid JSON object.`;
```

## Usage Examples

### Example 1: Service Charge Query
**Email**: "Hi, the service charge budget seems too high this year."

**AI Analysis**:
- Tags: `["service charge", "finance"]`
- Summary: "Leaseholder is concerned about high service charge"
- Suggested Action: "Reply with explanation and attach Budget Letter"
- Action Type: `generate_template`

**User Action**: Click "Generate Document" → Opens budget letter template

### Example 2: Maintenance Request
**Email**: "The heating in Flat 7 isn't working properly."

**AI Analysis**:
- Tags: `["maintenance", "heating"]`
- Summary: "Heating system issue reported in Flat 7"
- Suggested Action: "Create maintenance task for heating repair"
- Action Type: `raise_task`

**User Action**: Click "Create Task" → Opens task creation with prefilled data

### Example 3: Legal Notice
**Email**: "We need to serve a Section 20 notice for major works."

**AI Analysis**:
- Tags: `["legal", "major works"]`
- Summary: "Legal notice required for major works project"
- Suggested Action: "Generate Section 20 notice template"
- Action Type: `generate_template`

**User Action**: Click "Generate Document" → Opens Section 20 template

## Benefits

### For Property Managers
1. **Faster Response Times**: AI suggests actions immediately
2. **Reduced Decision Fatigue**: Clear recommendations for each email
3. **Consistent Handling**: Standardized approach to common issues
4. **Template Discovery**: Automatic suggestion of relevant templates
5. **Context Awareness**: Links emails to relevant buildings/units

### For Operations
1. **Automated Workflows**: Streamlined email handling process
2. **Better Tracking**: All actions logged and tracked
3. **Template Usage**: Increased use of standardized templates
4. **Quality Control**: Consistent response quality
5. **Training Tool**: Helps new staff understand proper procedures

## Future Enhancements

### Planned Features
1. **Learning from Actions**: AI learns from user actions to improve suggestions
2. **Priority Scoring**: AI assigns priority scores to emails
3. **Escalation Rules**: Automatic escalation based on content analysis
4. **Template Customization**: AI suggests template modifications
5. **Bulk Actions**: Handle multiple similar emails at once

### Integration Opportunities
1. **Calendar Integration**: Schedule follow-ups based on AI analysis
2. **Task Management**: Direct integration with task creation
3. **Document Generation**: Seamless template filling and generation
4. **Reporting**: Analytics on email handling efficiency
5. **Mobile Support**: Mobile-optimized sidebar interface

## Technical Notes

### Performance Considerations
- AI analysis is triggered asynchronously to avoid blocking email sync
- Analysis results are cached in the database
- Re-analysis is available but not automatic
- Indexes optimize query performance

### Error Handling
- Graceful fallbacks when AI analysis fails
- Manual re-analysis option available
- Clear error messages for debugging
- Non-blocking design for email sync

### Security
- AI analysis uses existing OpenAI API key
- No sensitive data sent to AI (only email content)
- Database updates use service role key
- User permissions respected for actions

## Troubleshooting

### Common Issues

1. **AI Analysis Not Appearing**
   - Check if email sync completed successfully
   - Verify OpenAI API key is configured
   - Check browser console for errors
   - Try manual re-analysis

2. **Actions Not Working**
   - Verify API endpoints are accessible
   - Check user permissions
   - Ensure database schema is updated
   - Review network requests in browser

3. **Performance Issues**
   - Check database indexes are created
   - Monitor OpenAI API response times
   - Verify async processing is working
   - Review server logs for bottlenecks

### Debug Mode
Enable debug mode by setting `NODE_ENV=development` to see detailed error messages and API responses.

## Conclusion

The AI Suggested Action Sidebar transforms BlocIQ's inbox from a simple email viewer into an intelligent operations assistant. By automatically analyzing emails and suggesting appropriate actions, it significantly reduces the time property managers spend on routine email handling while ensuring consistent, high-quality responses.

The feature is designed to be non-intrusive, providing helpful suggestions without forcing specific workflows, and can be easily extended with additional action types and integrations as needed. 