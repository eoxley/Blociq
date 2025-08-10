# BlocIQ AI Snapshot

This folder contains a snapshot of all the Ask BlocIQ AI functionality from the BlocIQ frontend repository.

## Contents

### 1. Ask BlocIQ Backend Logic
- `app/api/ask-blociq/route.ts` - Main Ask BlocIQ API endpoint
- `app/api/ask-ai/route.ts` - Unified AI endpoint used by Ask BlocIQ
- `app/api/ask-assistant/route.ts` - Assistant-specific AI endpoint
- `app/api/generate-embeddings/route.ts` - Embedding generation for semantic search

### 2. AI Helper and System Prompt Code
- `lib/ai/systemPrompt.ts` - Main system prompt for AI responses
- `lib/ai/userContext.ts` - User context management for AI
- `lib/ai/founder.ts` - Founder guidance integration
- `lib/ai/logInteraction.ts` - AI interaction logging
- `lib/ai/embed.ts` - Embedding and vector search functionality
- `lib/ai/docs/founder-guidance.md` - Founder guidance documentation
- `lib/buildPrompt.ts` - Prompt building utilities
- `lib/aiDocumentAnalysis.ts` - Document analysis for AI
- `lib/documentProcessor.ts` - Document processing utilities
- `lib/extractSummary.ts` - Summary extraction utilities
- `lib/replacePlaceholders.ts` - Template placeholder replacement

### 3. Supabase Retrieval Logic
- `lib/getStructuredBuildingData.ts` - Building data retrieval
- `lib/buildAIContext.ts` - AI context building from database
- `lib/supabaseClient.ts` - Supabase client configuration
- `lib/supabase.ts` - Supabase utilities
- `lib/database.types.ts` - Database type definitions

### 4. Ask BlocIQ UI Components
- `components/AskBlocIQ.tsx` - Main Ask BlocIQ component
- `components/AskBlocIQHomepage.tsx` - Homepage Ask BlocIQ component
- `components/GlobalAskBlocIQ.tsx` - Global Ask BlocIQ wrapper
- `components/AIDraftButton.tsx` - AI draft generation button
- `components/AIButton.tsx` - General AI button component
- `components/AIFollowUpPrompts.tsx` - AI follow-up prompts
- `components/AIBuildingSummary.tsx` - AI building summary component
- `components/AISummary.tsx` - AI summary component
- `components/AIInput.tsx` - AI input component
- `components/FloatingBlocIQ.tsx` - Floating Ask BlocIQ component
- `components/DocumentAwareAI.tsx` - Document-aware AI component
- `components/BrainButton.tsx` - Brain button component
- `components/EnhancedAITest.tsx` - Enhanced AI test component
- `components/ReplyModal.tsx` - AI reply modal component

### 5. Assistant Dashboard Pages
- `app/(dashboard)/assistant/documents/page.tsx` - Document assistant page
- `app/(dashboard)/assistant/documents/DocumentAssistantClient.tsx` - Document assistant client

## Database Tables Referenced

The AI system interacts with the following Supabase tables:
- `buildings` - Building information
- `units` - Unit information
- `leaseholders` - Leaseholder data
- `building_documents` - Building documents
- `compliance_assets` - Compliance assets
- `incoming_emails` - Email data
- `doc_chunks` - Document chunks for vector search
- `template_embeddings` - Template embeddings for semantic search

## Key Features

1. **Document-Aware AI**: The system can access and reference building documents when providing responses
2. **Vector Search**: Uses embeddings for semantic search across documents and templates
3. **Context Building**: Automatically builds context from building, unit, and leaseholder data
4. **Unified AI Endpoint**: All AI functionality routes through `/api/ask-ai` for consistency
5. **System Prompts**: Comprehensive system prompts for different use cases
6. **Interaction Logging**: Logs all AI interactions for analysis and improvement

## Usage

This snapshot can be used to:
- Understand the AI system architecture
- Extract AI functionality for other projects
- Analyze the prompt engineering and context building
- Reference the database schema and queries
- Study the UI/UX patterns for AI interactions
