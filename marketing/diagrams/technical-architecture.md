# BlocIQ Technical Architecture

```mermaid
graph TB
    %% Frontend Layer
    UI[🖥️ BlocIQ Web App<br/>Next.js 14 | TypeScript | Tailwind]
    
    %% Backend Services
    UI --> API[🔧 API Layer<br/>Next.js API Routes | Server Actions]
    API --> DB[🗄️ Supabase Database<br/>PostgreSQL | RLS | EU Hosted]
    API --> STORAGE[📁 Supabase Storage<br/>Document Storage | GDPR Compliant]
    
    %% External Integrations
    API --> OPENAI[🤖 OpenAI GPT-4<br/>Document Analysis | Content Generation]
    API --> GOOGLE[📄 Google Document AI<br/>OCR Processing | EU Endpoints]
    API --> MICROSOFT[📧 Microsoft Graph<br/>Outlook Integration | OAuth 2.0]
    API --> SENDGRID[📬 SendGrid<br/>Email Delivery | SMTP Services]
    
    %% Security Layer
    DB --> RLS[🔒 Row Level Security<br/>Agency Data Isolation]
    API --> AUTH[🔐 Authentication<br/>Supabase Auth | MFA Ready]
    
    %% Styling
    classDef frontend fill:#eff6ff,stroke:#2563eb,stroke-width:2px
    classDef backend fill:#faf5ff,stroke:#7c3aed,stroke-width:2px
    classDef external fill:#f0fdfa,stroke:#0d9488,stroke-width:2px
    classDef security fill:#fef2f2,stroke:#ef4444,stroke-width:2px
    
    class UI frontend
    class API,DB,STORAGE backend
    class OPENAI,GOOGLE,MICROSOFT,SENDGRID external
    class RLS,AUTH security
```

## Architecture Highlights
- **Frontend**: Modern Next.js 14 with TypeScript
- **Backend**: Serverless API with Supabase
- **Security**: Row-level security and GDPR compliance
- **Integrations**: AI services with EU data residency
- **Scalability**: Built for growth from 5 to 500+ buildings

## Usage Notes
- Perfect for technical presentations
- Shows security and compliance focus
- Demonstrates modern tech stack
- Can be used in investor decks
