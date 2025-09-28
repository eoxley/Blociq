# BlocIQ Application ↔ Database Linkage Diagram

## How APIs Connect to Supabase Tables

```mermaid
flowchart TB
    %% Frontend Features
    subgraph "Frontend Features"
        direction TB
        FE_Home[🏠 Home Dashboard]
        FE_Documents[📄 Document Library]
        FE_Buildings[🏢 Buildings]
        FE_Compliance[🛡️ Compliance Hub]
        FE_Communications[📨 Communications]
        FE_MajorWorks[🔧 Major Works]
        FE_AskBlocIQ[🤖 Ask BlocIQ]
        FE_OutlookAddin[📧 Outlook Add-in]
        FE_Calendar[📅 Calendar]
    end

    %% API Layer
    subgraph "API Endpoints"
        direction TB

        %% Core Building APIs
        API_Buildings["/api/buildings/[id]/*<br/>Building Management"]
        API_BuildingTasks["/api/building-tasks<br/>Task Management"]
        API_Units["/api/buildings/[id]/units<br/>Unit Management"]
        API_Leaseholders["/api/leaseholders/*<br/>Leaseholder Management"]

        %% Document APIs
        API_DocumentUpload["/api/documents/upload-enhanced<br/>Document Upload"]
        API_DocumentAnalyze["/api/documents/analyze<br/>Document Processing"]
        API_DocumentCreate["/api/documents/create<br/>Document Creation"]

        %% AI APIs
        API_AskAI["/api/ask-ai<br/>Basic AI Queries"]
        API_AskAIEnhanced["/api/ask-ai-enhanced<br/>Context-Aware AI"]
        API_GenerateDraft["/api/generate-draft<br/>Email Draft Generation"]

        %% Compliance APIs
        API_ComplianceAssets["/api/compliance/assets/list<br/>List Assets"]
        API_ComplianceUpdate["/api/compliance/[bca_id]/update<br/>Update Compliance"]
        API_ComplianceReminders["/api/compliance/reminders<br/>Due Date Reminders"]

        %% Communication APIs
        API_EmailHistory["/api/email-history<br/>Email Records"]
        API_CommunicationsBatch["/api/communications/batch-group<br/>Batch Communications"]
        API_Templates["/api/compliance/templates<br/>Communication Templates"]

        %% Outlook APIs
        API_OutlookSync["/api/cron/sync-outlook<br/>Email Synchronization"]
        API_OutlookMessages["/api/outlook/v2/messages/*<br/>Message Management"]
        API_AddinChat["/api/addin/chat<br/>Add-in Interface"]

        %% Calendar APIs
        API_CreateEvent["/api/create-event<br/>Event Creation"]
        API_SyncCalendar["/api/cron/sync-calendar<br/>Calendar Sync"]

        %% Major Works APIs
        API_MajorWorksLogs["/api/major-works-logs<br/>Project Logging"]
        API_ProjectDetails["/api/major-works/project/[id]/logs<br/>Project Management"]
    end

    %% Database Tables
    subgraph "Supabase Database Tables"
        direction TB

        %% Core Tables
        DB_Buildings[🏢 buildings<br/>Property information]
        DB_BuildingSetup[⚙️ building_setup<br/>Configuration]
        DB_Units[🏠 units<br/>Individual units]
        DB_Leaseholders[👥 leaseholders<br/>Property owners]
        DB_Occupiers[🏠 occupiers<br/>Tenants]

        %% Document Tables
        DB_BuildingDocuments[📄 building_documents<br/>File storage]
        DB_DocumentAnalysis[🔍 document_analysis<br/>AI analysis results]
        DB_DocumentQueries[❓ document_queries<br/>Q&A history]
        DB_Leases[📋 leases<br/>Lease documents]

        %% AI Tables
        DB_AILogs[🤖 ai_logs<br/>AI interaction history]
        DB_ChatHistory[💬 chat_history<br/>Conversation tracking]

        %% Compliance Tables
        DB_ComplianceAssets[📋 compliance_assets<br/>Asset templates]
        DB_BuildingComplianceAssets[🛡️ building_compliance_assets<br/>Building assignments]
        DB_ComplianceDocuments[📄 compliance_documents<br/>Certificates]
        DB_ComplianceContracts[📝 compliance_contracts<br/>Service contracts]
        DB_Contractors[🔧 contractors<br/>Service providers]

        %% Communication Tables
        DB_IncomingEmails[📧 incoming_emails<br/>Received emails]
        DB_EmailHistory[📤 email_history<br/>Sent emails]
        DB_EmailDrafts[📝 email_drafts<br/>AI drafts]
        DB_Communications[📨 communications<br/>Batch communications]
        DB_CommunicationTemplates[📋 communication_templates<br/>Email templates]

        %% Calendar Tables
        DB_PropertyEvents[📅 property_events<br/>Scheduled events]
        DB_DiaryEntries[📔 diary_entries<br/>Activity logs]

        %% Major Works Tables
        DB_MajorWorks[🏗️ major_works<br/>Projects]
        DB_MajorWorksLogs[📝 major_works_logs<br/>Activity logs"]

        %% User Tables
        DB_Users[👤 users<br/>System users]
        DB_Profiles[👤 profiles<br/>User profiles]
        DB_Agencies[🏢 agencies<br/>Organizations]
        DB_OutlookTokens[🔑 outlook_tokens<br/>OAuth tokens]

        %% Audit Tables
        DB_BuildingAmendments[📝 building_amendments<br/>Change tracking]
    end

    %% Frontend to API Connections
    FE_Home --> API_Buildings
    FE_Home --> API_ComplianceReminders
    FE_Home --> API_AskAI

    FE_Documents --> API_DocumentUpload
    FE_Documents --> API_DocumentAnalyze
    FE_Documents --> API_AskAIEnhanced

    FE_Buildings --> API_Buildings
    FE_Buildings --> API_Units
    FE_Buildings --> API_Leaseholders
    FE_Buildings --> API_BuildingTasks

    FE_Compliance --> API_ComplianceAssets
    FE_Compliance --> API_ComplianceUpdate
    FE_Compliance --> API_ComplianceReminders

    FE_Communications --> API_EmailHistory
    FE_Communications --> API_CommunicationsBatch
    FE_Communications --> API_Templates

    FE_MajorWorks --> API_MajorWorksLogs
    FE_MajorWorks --> API_ProjectDetails
    FE_MajorWorks --> API_CreateEvent

    FE_AskBlocIQ --> API_AskAI
    FE_AskBlocIQ --> API_AskAIEnhanced

    FE_OutlookAddin --> API_AddinChat
    FE_OutlookAddin --> API_OutlookMessages

    FE_Calendar --> API_CreateEvent
    FE_Calendar --> API_SyncCalendar

    %% API to Database Connections

    %% Building Management APIs
    API_Buildings --> DB_Buildings
    API_Buildings --> DB_BuildingSetup
    API_Buildings --> DB_BuildingAmendments
    API_BuildingTasks --> DB_Buildings
    API_Units --> DB_Units
    API_Units --> DB_Buildings
    API_Leaseholders --> DB_Leaseholders
    API_Leaseholders --> DB_Units

    %% Document APIs
    API_DocumentUpload --> DB_BuildingDocuments
    API_DocumentUpload --> DB_DocumentAnalysis
    API_DocumentAnalyze --> DB_BuildingDocuments
    API_DocumentAnalyze --> DB_DocumentAnalysis
    API_DocumentCreate --> DB_BuildingDocuments
    API_DocumentCreate --> DB_Leases

    %% AI APIs
    API_AskAI --> DB_AILogs
    API_AskAI --> DB_ChatHistory
    API_AskAI --> DB_Users
    API_AskAI --> DB_Agencies

    API_AskAIEnhanced --> DB_AILogs
    API_AskAIEnhanced --> DB_ChatHistory
    API_AskAIEnhanced --> DB_BuildingDocuments
    API_AskAIEnhanced --> DB_DocumentAnalysis
    API_AskAIEnhanced --> DB_Buildings
    API_AskAIEnhanced --> DB_Units
    API_AskAIEnhanced --> DB_Leaseholders
    API_AskAIEnhanced --> DB_DocumentQueries

    API_GenerateDraft --> DB_AILogs
    API_GenerateDraft --> DB_EmailDrafts
    API_GenerateDraft --> DB_IncomingEmails

    %% Compliance APIs
    API_ComplianceAssets --> DB_ComplianceAssets
    API_ComplianceUpdate --> DB_BuildingComplianceAssets
    API_ComplianceUpdate --> DB_ComplianceDocuments
    API_ComplianceReminders --> DB_BuildingComplianceAssets
    API_ComplianceReminders --> DB_ComplianceAssets

    %% Communication APIs
    API_EmailHistory --> DB_EmailHistory
    API_EmailHistory --> DB_IncomingEmails
    API_CommunicationsBatch --> DB_Communications
    API_CommunicationsBatch --> DB_Leaseholders
    API_CommunicationsBatch --> DB_Units
    API_Templates --> DB_CommunicationTemplates

    %% Outlook APIs
    API_OutlookSync --> DB_IncomingEmails
    API_OutlookSync --> DB_Buildings
    API_OutlookSync --> DB_Units
    API_OutlookSync --> DB_Leaseholders
    API_OutlookSync --> DB_OutlookTokens

    API_OutlookMessages --> DB_IncomingEmails
    API_OutlookMessages --> DB_EmailHistory

    API_AddinChat --> DB_AILogs
    API_AddinChat --> DB_IncomingEmails
    API_AddinChat --> DB_EmailDrafts

    %% Calendar APIs
    API_CreateEvent --> DB_PropertyEvents
    API_CreateEvent --> DB_Buildings
    API_SyncCalendar --> DB_PropertyEvents
    API_SyncCalendar --> DB_OutlookTokens

    %% Major Works APIs
    API_MajorWorksLogs --> DB_MajorWorksLogs
    API_MajorWorksLogs --> DB_MajorWorks
    API_ProjectDetails --> DB_MajorWorks
    API_ProjectDetails --> DB_MajorWorksLogs

    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef database fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef core-tables fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef ai-tables fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef compliance-tables fill:#e0f2f1,stroke:#2e7d32,stroke-width:2px
    classDef communication-tables fill:#fff8e1,stroke:#f57f17,stroke-width:2px

    class FE_Home,FE_Documents,FE_Buildings,FE_Compliance,FE_Communications,FE_MajorWorks,FE_AskBlocIQ,FE_OutlookAddin,FE_Calendar frontend
    class API_Buildings,API_BuildingTasks,API_Units,API_Leaseholders,API_DocumentUpload,API_DocumentAnalyze,API_DocumentCreate,API_AskAI,API_AskAIEnhanced,API_GenerateDraft,API_ComplianceAssets,API_ComplianceUpdate,API_ComplianceReminders,API_EmailHistory,API_CommunicationsBatch,API_Templates,API_OutlookSync,API_OutlookMessages,API_AddinChat,API_CreateEvent,API_SyncCalendar,API_MajorWorksLogs,API_ProjectDetails api
    class DB_Buildings,DB_BuildingSetup,DB_Units,DB_Leaseholders,DB_Occupiers,DB_Users,DB_Profiles,DB_Agencies,DB_BuildingAmendments core-tables
    class DB_AILogs,DB_ChatHistory,DB_DocumentAnalysis,DB_DocumentQueries ai-tables
    class DB_ComplianceAssets,DB_BuildingComplianceAssets,DB_ComplianceDocuments,DB_ComplianceContracts,DB_Contractors compliance-tables
    class DB_IncomingEmails,DB_EmailHistory,DB_EmailDrafts,DB_Communications,DB_CommunicationTemplates communication-tables
    class DB_BuildingDocuments,DB_Leases,DB_PropertyEvents,DB_DiaryEntries,DB_MajorWorks,DB_MajorWorksLogs,DB_OutlookTokens database
```

## API → Database Mapping Details

### 🏠 **Home Dashboard Data Flow**
```
Frontend Request → /api/buildings/[id]/info → buildings, building_compliance_assets
Frontend Request → /api/compliance/reminders → building_compliance_assets, compliance_assets
Frontend Request → /api/ask-ai → ai_logs, users, agencies
```

### 📄 **Document Library Data Flow**
```
Upload Document → /api/documents/upload-enhanced → building_documents, document_analysis
Analyze Document → /api/documents/analyze → building_documents, document_analysis
Ask AI Question → /api/ask-ai-enhanced → ai_logs, building_documents, document_queries
```

### 🏢 **Buildings Management Data Flow**
```
View Building → /api/buildings/[id]/info → buildings, building_setup
Manage Units → /api/buildings/[id]/units → units, leaseholders
Update Building → /api/buildings/[id]/info → buildings, building_amendments
Building Tasks → /api/building-tasks → buildings (custom logic)
```

### 🛡️ **Compliance Hub Data Flow**
```
List Assets → /api/compliance/assets/list → compliance_assets
Update Status → /api/compliance/[bca_id]/update → building_compliance_assets, compliance_documents
Check Reminders → /api/compliance/reminders → building_compliance_assets, compliance_assets
```

### 📨 **Communications Data Flow**
```
Email History → /api/email-history → email_history, incoming_emails
Batch Send → /api/communications/batch-group → communications, leaseholders, units
Templates → /api/compliance/templates → communication_templates
Generate Draft → /api/generate-draft → ai_logs, email_drafts, incoming_emails
```

### 📧 **Outlook Integration Data Flow**
```
Sync Emails → /api/cron/sync-outlook → incoming_emails, buildings, units, leaseholders
Manage Messages → /api/outlook/v2/messages/* → incoming_emails, email_history
Add-in Chat → /api/addin/chat → ai_logs, incoming_emails, email_drafts
Authentication → outlook_tokens (stored for all Outlook operations)
```

### 🔧 **Major Works Data Flow**
```
Project Logs → /api/major-works-logs → major_works_logs, major_works
Project Details → /api/major-works/project/[id]/logs → major_works, major_works_logs
Create Event → /api/create-event → property_events, buildings
```

### 🤖 **AI System Data Flow**
```
Basic AI Query → /api/ask-ai → ai_logs, chat_history, users, agencies
Enhanced AI Query → /api/ask-ai-enhanced → ai_logs + building_documents + document_analysis + buildings + units + leaseholders + document_queries
```

### 📅 **Calendar Integration Data Flow**
```
Create Event → /api/create-event → property_events, buildings
Sync Calendar → /api/cron/sync-calendar → property_events, outlook_tokens
```

## Key Integration Patterns

### 1. **Multi-Context Data Enrichment**
APIs like `/api/ask-ai-enhanced` read from multiple tables to provide rich context:
- building_documents + document_analysis (document content)
- buildings + units + leaseholders (property context)
- ai_logs + chat_history (conversation context)

### 2. **Audit Trail Pattern**
Write operations trigger audit logging:
- Building updates → building_amendments
- AI interactions → ai_logs
- Document queries → document_queries

### 3. **External Integration Sync**
Outlook APIs maintain bidirectional sync:
- incoming_emails ← Outlook API
- email_history → Outlook API
- property_events ↔ Outlook Calendar API

### 4. **Compliance Lifecycle**
Compliance management follows a structured flow:
- compliance_assets (templates) → building_compliance_assets (assignments) → compliance_documents (certificates) → compliance_contracts (service agreements)

### 5. **Document Intelligence**
Document processing creates layered intelligence:
- building_documents (file storage) → document_analysis (AI extraction) → document_queries (Q&A history)

This linkage diagram shows the "missing middle" - exactly how each frontend feature connects through specific APIs to manipulate precise database tables, enabling full end-to-end traceability of data flow in the BlocIQ system.