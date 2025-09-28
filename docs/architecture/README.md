# BlocIQ System Architecture Documentation

## Overview

This documentation provides three complementary views of the BlocIQ property management system architecture:

## 📊 The Three Diagrams

### 1. [Application Flow Diagram](./01-application-flow-diagram.md)
**What it shows:** Complete frontend application flow, API endpoints, and external integrations
- 🎯 **Purpose**: Understand what features exist and how they connect to services
- 🔍 **Focus**: User-facing functionality and system boundaries
- 💡 **Use case**: New developer onboarding, feature planning, integration mapping

### 2. [Database ERD](./02-database-erd.md)
**What it shows:** Complete Supabase database schema with all table relationships
- 🎯 **Purpose**: Understand how data is structured and related
- 🔍 **Focus**: Data modeling, constraints, and entity relationships
- 💡 **Use case**: Database queries, schema changes, data integrity planning

### 3. [Application ↔ Database Linkage](./03-application-database-linkage.md)
**What it shows:** How APIs connect frontend features to specific database tables
- 🎯 **Purpose**: Bridge the gap between user actions and data operations
- 🔍 **Focus**: API-to-database mappings and data flow patterns
- 💡 **Use case**: End-to-end debugging, performance optimization, feature impact analysis

## 🎯 How to Use These Diagrams

### For Developers
1. **Starting a new feature?** → Check Application Flow to see existing patterns
2. **Writing database queries?** → Use the ERD to understand relationships
3. **Debugging data issues?** → Follow the Linkage diagram from frontend to database

### For System Design
1. **Application Flow** = What exists and how it works
2. **Database ERD** = What's stored and how it's connected
3. **App ↔ DB Linkage** = How it all works together

### For End-to-End Tracing
Example: "How does Ask BlocIQ work?"
1. **Application Flow**: User clicks Ask BlocIQ → calls `/api/ask-ai-enhanced`
2. **App ↔ DB Linkage**: API reads from `building_documents`, `ai_logs`, `buildings` tables
3. **Database ERD**: Shows relationships between these tables and data structure

## 🏗️ System Architecture Highlights

### Multi-Tenant Design
- **Agencies** serve as the top-level tenant boundary
- **Users** belong to agencies and can access multiple buildings
- **Row Level Security (RLS)** enforces data isolation

### AI-First Approach
- AI functionality integrated throughout (Ask BlocIQ, document analysis, email drafts)
- Comprehensive logging in `ai_logs` and `chat_history` for context preservation
- Document intelligence with embeddings and Q&A history

### Outlook Integration
- Bidirectional email synchronization
- Calendar integration for property events
- Add-in for in-context AI assistance

### Compliance Automation
- Template-driven compliance tracking
- Automated reminders and status monitoring
- Document lifecycle management

### Document Intelligence
- AI-powered document analysis and summarization
- Context-aware search and retrieval
- Automatic categorization and tagging

## 🔄 Data Flow Patterns

### 1. **Inbox Processing Flow**
```
Outlook Email → /api/cron/sync-outlook → incoming_emails → /api/generate-draft → email_drafts
```

### 2. **Document Upload Flow**
```
User Upload → /api/documents/upload-enhanced → building_documents → document_analysis
```

### 3. **Compliance Tracking Flow**
```
compliance_assets → building_compliance_assets → compliance_documents → reminders
```

### 4. **AI Query Flow**
```
User Question → /api/ask-ai-enhanced → (building_documents + buildings + units) → ai_logs
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Mermaid** for diagrams

### Backend
- **Next.js API Routes** for backend logic
- **Supabase** for database and authentication
- **PostgreSQL** with Row Level Security

### External Services
- **Microsoft Graph API** for Outlook integration
- **OpenAI GPT-4** for AI functionality
- **OCR Service** for document text extraction
- **Stripe** for payment processing

### Database
- **Supabase PostgreSQL** with 30+ tables
- **Row Level Security** for multi-tenancy
- **Comprehensive indexing** for performance
- **Audit trails** for data integrity

## 📈 Scalability Considerations

### Database Design
- Proper indexing on frequently queried columns
- Foreign key constraints for data integrity
- Partitioning potential for large tables (emails, logs)

### API Design
- RESTful endpoints with consistent patterns
- Proper error handling and validation
- Caching strategies for frequently accessed data

### AI Integration
- Context preservation through comprehensive logging
- Efficient document embeddings and retrieval
- Rate limiting and usage tracking

This architecture documentation provides a complete view of how BlocIQ's property management system works from the user interface down to the database level, enabling effective development, debugging, and system evolution.