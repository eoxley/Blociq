# How BlocIQ Works - Core Flow Diagram

```mermaid
flowchart TD
    %% Data Input Sources
    A[🏢 Buildings & Units] --> DB[🔐 BlocIQ Secure Database<br/>Ring-fenced | GDPR Compliant | UK Hosted]
    B[📄 Lease Documents] --> DB
    C[🛡️ Compliance Certificates] --> DB
    D[📧 Email Communications] --> DB
    E[📊 Financial Records] --> DB
    
    %% AI Processing Layer
    DB --> AI1[🤖 OpenAI GPT-4<br/>Document Analysis & Drafting]
    DB --> AI2[📄 Google Document AI<br/>OCR & Text Extraction]
    DB --> AI3[🔍 Microsoft Graph<br/>Email Intelligence]
    
    %% Output Services
    AI1 --> O1[📬 Smart Inbox<br/>Auto-drafted replies]
    AI1 --> O2[❓ AskBlocIQ<br/>AI assistant]
    AI2 --> O3[📊 Compliance Dashboard<br/>Real-time tracking]
    AI2 --> O4[📈 Automated Reports<br/>Section 20, BSA updates]
    AI3 --> O5[📅 Calendar Sync<br/>Meeting management]
    
    %% Styling
    classDef input fill:#e1f5fe,stroke:#1976d2,stroke-width:2px,color:#000
    classDef database fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000
    classDef ai fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    classDef output fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
    
    class A,B,C,D,E input
    class DB database
    class AI1,AI2,AI3 ai
    class O1,O2,O3,O4,O5 output
```

## Usage Notes
- Perfect for presentations and one-pagers
- Shows complete data flow from input to output
- Uses BlocIQ brand colors
- Renders in GitHub, Notion, and most markdown editors
