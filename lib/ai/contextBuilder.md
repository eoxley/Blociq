# Universal Supabase Context Builder for Ask BlocIQ

## Overview

The Universal Supabase Context Builder is a comprehensive system that constructs complete property context from all relevant Supabase tables for the Ask BlocIQ AI assistant. It provides rich, structured data to enable accurate, informed responses for property managers.

## Features

### ✅ Complete Data Integration
- **Buildings**: Core building information and structure details
- **Units & Leaseholders**: Complete unit and leaseholder mapping
- **Compliance**: Safety and regulatory compliance tracking
- **Major Works**: Project management and planning data
- **Site Staff**: On-site personnel and roles
- **Documents**: Building documentation and records
- **Events**: Calendar and scheduling information
- **Emails**: Communication history and context
- **Tasks**: Building management tasks and priorities

### ✅ Intelligent Context Assembly
- **Structured Formatting**: Clear, readable context sections
- **Data Validation**: Handles missing or incomplete data gracefully
- **Error Handling**: Robust error management for database queries
- **Performance Optimized**: Efficient queries with proper indexing

### ✅ Enhanced AI Integration
- **Improved Response System**: Integrates with our enhanced AI responses
- **Topic Detection**: Automatically detects relevant topics for pre-defined responses
- **Tone Control**: Supports different response tones (default, formal, friendly, warning)
- **Legal Context**: Includes relevant UK legislation and best practices

## Data Sources

### 🏢 Building Information
```sql
SELECT * FROM buildings WHERE id = $buildingId
```
- Building name, address, structure type
- High-risk building status
- Total unit count and configuration

### 📦 Units and Leaseholders
```sql
SELECT units.*, leaseholders.* 
FROM units 
LEFT JOIN leaseholders ON units.leaseholder_id = leaseholders.id 
WHERE building_id = $buildingId
```
- Unit numbers and configurations
- Leaseholder contact information
- Emergency contact details

### ✅ Compliance and Safety
```sql
SELECT building_compliance_assets.*, compliance_assets.* 
FROM building_compliance_assets 
LEFT JOIN compliance_assets ON building_compliance_assets.compliance_asset_id = compliance_assets.id 
WHERE building_id = $buildingId
```
- Safety inspection schedules
- Regulatory compliance requirements
- Overdue and upcoming items

### 🛠️ Major Works Projects
```sql
SELECT * FROM major_works_projects 
WHERE building_id = $buildingId 
ORDER BY start_date DESC
```
- Project timelines and status
- Cost estimates and budgets
- Contractor information

### 👷 Site Staff
```sql
SELECT * FROM site_staff 
WHERE building_id = $buildingId
```
- On-site personnel details
- Role assignments and responsibilities
- Contact information

### 📁 Building Documents
```sql
SELECT * FROM building_documents 
WHERE building_id = $buildingId 
ORDER BY uploaded_at DESC
```
- Document types and categories
- Upload dates and versions
- File references and metadata

### 🗓️ Calendar Events
```sql
SELECT * FROM property_events 
WHERE building_id = $buildingId 
AND date >= CURRENT_DATE 
ORDER BY date ASC
```
- Upcoming events and schedules
- Event types and descriptions
- Attendee information

### 📬 Recent Emails
```sql
SELECT * FROM incoming_emails 
WHERE building_id = $buildingId 
ORDER BY received_at DESC 
LIMIT 10
```
- Recent communication history
- Email subjects and content
- Sender and recipient information

### 📋 Building Tasks
```sql
SELECT * FROM building_todos 
WHERE building_id = $buildingId 
AND status IN ('pending', 'in_progress') 
ORDER BY due_date ASC
```
- Active task management
- Priority and due dates
- Task assignments and status

## Context Formatting

### Building Information Section
```
**Building Information:**
- Name: Ashwood House
- Structure Type: Purpose-built block
- Address: 123 Main Street, London
- High Risk Building: No
- Total Units: 24
```

### Units and Leaseholders Section
```
**Units and Leaseholders:**
- Flat 1A: John Smith (john.smith@email.com)
- Flat 1B: Sarah Johnson (sarah.johnson@email.com)
- Flat 2A: [Leaseholder unknown]
```

### Compliance Status Section
```
**Compliance Status:**
- Total Items: 12
- Overdue: 2
- Due within 30 days: 3
- Overdue items: Fire Risk Assessment, EICR Certificate
```

### Major Works Section
```
**Major Works Projects:**
- Total Projects: 3
- Active Projects: 1
- Current: Roof Replacement Project
```

## Integration with AI System

### Enhanced Response Processing
1. **Context Building**: Constructs comprehensive building context
2. **AI Generation**: Generates initial AI response with full context
3. **Response Enhancement**: Applies improved response system
4. **Topic Detection**: Identifies relevant pre-defined responses
5. **Tone Application**: Applies appropriate tone and formatting

### Response Enhancement Features
- **British English**: Automatic spelling and terminology correction
- **Legal References**: Includes relevant UK legislation
- **Structured Format**: Clear sections and bullet points
- **Actionable Steps**: Specific next steps for property managers
- **Risk Considerations**: Important warnings and considerations

## Usage Examples

### Basic Usage
```typescript
const response = await fetch('/api/ask-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "What are the current compliance issues at Ashwood House?",
    buildingId: "building-uuid",
    tone: "default"
  })
});
```

### With Related Email
```typescript
const response = await fetch('/api/ask-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "How should I respond to this leaseholder complaint?",
    buildingId: "building-uuid",
    relatedEmailId: "email-uuid",
    tone: "friendly"
  })
});
```

### Response Structure
```typescript
{
  response: "Enhanced AI response with property manager tone...",
  nextSteps: ["Step 1", "Step 2", "Step 3"],
  legalContext: "Relevant UK legislation references",
  keyPoints: ["Key point 1", "Key point 2"],
  context: {
    building: "Ashwood House",
    unitsCount: 24,
    complianceItems: 12,
    majorWorksCount: 3,
    documentsCount: 15,
    eventsCount: 5
  }
}
```

## Error Handling

### Database Query Errors
- **Graceful Degradation**: Continues processing even if some data is unavailable
- **Error Logging**: Comprehensive error logging for debugging
- **User Feedback**: Clear messages about missing data
- **Fallback Responses**: Provides helpful responses even with incomplete data

### Authentication Errors
- **Session Validation**: Ensures user is authenticated
- **Permission Checking**: Validates user access to building data
- **Secure Responses**: Never exposes sensitive information

### Rate Limiting
- **Request Throttling**: Prevents abuse of the AI system
- **Resource Management**: Efficient database querying
- **Performance Monitoring**: Tracks response times and usage

## Performance Optimizations

### Database Queries
- **Efficient Joins**: Optimized queries with proper indexing
- **Selective Loading**: Only loads necessary data
- **Query Batching**: Groups related queries where possible
- **Caching Strategy**: Implements caching for frequently accessed data

### Response Generation
- **Streaming Responses**: For long responses
- **Context Truncation**: Limits context size for large datasets
- **Priority Loading**: Loads most important data first
- **Parallel Processing**: Processes multiple data sources concurrently

## Security Considerations

### Data Protection
- **Row-Level Security**: Enforces Supabase RLS policies
- **User Authentication**: Validates user sessions
- **Data Minimization**: Only loads necessary data
- **Audit Logging**: Tracks all AI interactions

### Privacy Compliance
- **GDPR Compliance**: Handles personal data appropriately
- **Data Retention**: Manages data retention policies
- **Access Controls**: Restricts data access by user permissions
- **Encryption**: Ensures data is encrypted in transit and at rest

## Future Enhancements

### Planned Features
- **Real-time Updates**: Live data synchronization
- **Advanced Analytics**: Building performance insights
- **Predictive Maintenance**: AI-powered maintenance scheduling
- **Integration APIs**: Third-party system integrations

### Scalability Improvements
- **Database Optimization**: Enhanced query performance
- **Caching Layer**: Redis-based caching system
- **Microservices**: Modular service architecture
- **Load Balancing**: Distributed system architecture

## Troubleshooting

### Common Issues
1. **Missing Building Data**: Check building ID and user permissions
2. **Empty Context**: Verify database connections and table structure
3. **Slow Responses**: Monitor database performance and query optimization
4. **Authentication Errors**: Validate user sessions and permissions

### Debug Information
- **Request Logging**: Detailed request/response logging
- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Response time and resource usage tracking
- **User Feedback**: System for reporting issues and improvements

## API Reference

### Endpoint: `/api/ask-ai`
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: Required

### Request Parameters
- `question` (string, required): The user's question
- `buildingId` (string, required): Building UUID
- `relatedEmailId` (string, optional): Related email UUID
- `tone` (string, optional): Response tone (default, formal, friendly, warning)

### Response Format
```typescript
{
  response: string,
  nextSteps: string[],
  legalContext: string,
  keyPoints: string[],
  context: {
    building: string,
    unitsCount: number,
    complianceItems: number,
    majorWorksCount: number,
    documentsCount: number,
    eventsCount: number
  }
}
```

This comprehensive context builder ensures that the Ask BlocIQ AI assistant has access to all relevant property data, enabling accurate, informed, and actionable responses for property managers. 