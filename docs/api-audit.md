# 📊 BlocIQ API Audit Log

_Last updated: 3 August 2025_

## 🔍 AI LOGIC AUDIT CHECKLIST

### 📁 Audit Scope
Review all features that use or trigger AI functionality across the BlocIQ platform:
- Quick Search
- Ask BlocIQ (main homepage assistant)
- AI Daily Summary
- Ask AI Speech Bubble
- Email Draft Generator
- Compliance-related AI queries
- Document reading & summarisation

### ✅ AI Feature Audit Results

#### 1. Quick Search
- **Uses API**: `/api/ask-ai` (partial)
- **Has Full Prompt Logic**: ❌ False
- **Includes Supabase Data**: ❌ False
- **Logs to AI Log Table**: ❌ False
- **Includes Building Context**: ❌ False
- **Includes Document Context**: ❌ False
- **Includes Email Thread**: ❌ False
- **Fallback When No Data**: ❌ False
- **Recommendations**:
  - Route through unified `/api/ask-ai` logic
  - Pass building context if on a building page
  - Enable search fallback if nothing found
  - Add logging to `ai_logs` table

#### 2. Ask BlocIQ (main AI assistant)
- **Uses API**: `/api/ask-ai` ✅
- **Has Full Prompt Logic**: ✅ True
- **Includes Supabase Data**: ✅ True
- **Logs to AI Log Table**: ✅ True
- **Includes Building Context**: ✅ True
- **Includes Document Context**: ✅ True
- **Includes Email Thread**: ❌ False
- **Fallback When No Data**: ✅ True
- **Recommendations**:
  - Add email thread memory if question follows up on a previous reply
  - Add 'source used' badge in UI for transparency

#### 3. AI Daily Summary
- **Uses API**: `/api/daily-summary` (direct OpenAI call)
- **Has Full Prompt Logic**: ⚠️ Partial
- **Includes Supabase Data**: ⚠️ Partial
- **Logs to AI Log Table**: ❌ False
- **Includes Building Context**: ✅ True
- **Includes Document Context**: ❌ False
- **Includes Email Thread**: ❌ False
- **Fallback When No Data**: ❌ False
- **Recommendations**:
  - Ensure GPT prompt includes overdue compliance, unread flagged emails, and calendar events
  - Log each summary generation to `ai_logs` for auditing
  - Route through unified `/api/ask-ai` endpoint

#### 4. Ask AI Speech Bubble
- **Uses API**: `/api/ask-ai` (via AskBlocIQ component)
- **Has Full Prompt Logic**: ✅ True
- **Includes Supabase Data**: ✅ True
- **Logs to AI Log Table**: ✅ True
- **Includes Building Context**: ✅ True
- **Includes Document Context**: ✅ True
- **Includes Email Thread**: ❌ False
- **Fallback When No Data**: ✅ True
- **Recommendations**:
  - Add context awareness based on current page (building, email, doc, etc.)
  - Add email thread memory for follow-up questions

#### 5. AI Draft Reply Generator
- **Uses API**: `/api/generate-draft`, `/api/ai-email-draft`
- **Has Full Prompt Logic**: ⚠️ Partial
- **Includes Supabase Data**: ⚠️ Partial
- **Logs to AI Log Table**: ✅ True (in some endpoints)
- **Includes Building Context**: ✅ True
- **Includes Document Context**: ❌ False
- **Includes Email Thread**: ✅ True
- **Fallback When No Data**: ❌ False
- **Recommendations**:
  - Pull previous emails in the same thread and lease context
  - Log AI reply generation with user, building, and thread ID
  - Standardize across all draft generation endpoints

#### 6. AI Compliance Q&A
- **Uses API**: Direct GPT calls in various endpoints
- **Has Full Prompt Logic**: ❌ Minimal
- **Includes Supabase Data**: ❌ No
- **Logs to AI Log Table**: ❌ No
- **Includes Building Context**: ❌ No
- **Includes Document Context**: ❌ No
- **Includes Email Thread**: ❌ No
- **Fallback When No Data**: ❌ No
- **Recommendations**:
  - Route all compliance AI through `/api/ask-ai` with prompt builder
  - Auto-detect if BSA, EWS1, fire safety terms are used
  - Include matching compliance assets or inspection docs in prompt context
  - Add comprehensive logging

### 🧪 Final Check Results

#### ✅ Working Well:
- Ask BlocIQ main assistant (unified endpoint, good logging, context-aware)
- AI Speech Bubble (uses main assistant, good integration)
- Email Draft Generator (partial logging, good context)

#### ⚠️ Needs Improvement:
- Quick Search (no unified endpoint, no logging)
- AI Daily Summary (direct OpenAI calls, no logging)
- Compliance AI (fragmented, no unified approach)

#### ❌ Critical Issues:
- Multiple direct OpenAI calls bypassing unified system
- Inconsistent logging across features
- Missing email thread context in most features
- No fallback handling in several features

### 🚀 Recommended Actions

1. **Unify AI Endpoints**: Route all AI features through `/api/ask-ai`
2. **Standardize Logging**: Ensure all AI interactions log to `ai_logs` table
3. **Enhance Context**: Add email thread memory and document context
4. **Improve Fallbacks**: Add graceful error handling for missing data
5. **Add Transparency**: Show users where AI answers come from

### 📊 Summary Statistics
- **Total AI Features**: 6
- **Using Unified API**: 2/6 (33%)
- **Proper Logging**: 2/6 (33%)
- **Full Context**: 2/6 (33%)
- **Fallback Handling**: 2/6 (33%)

## ✅ Complete Routes (Properly Audited)
| Route                        | Status                | Notes                                                                 |
|------------------------------|-----------------------|-----------------------------------------------------------------------|
| `/api/send-email`            | ✅ Complete [Aug 3]   | Validated inputs, Supabase insert, try/catch, meaningful errors       |
| `/api/upload-doc`            | ✅ Complete [Aug 3]   | Validates file size/type, required fields, try/catch, auth, errors    |
| `/api/check-env`             | ✅ Complete [Aug 3]   | Added try/catch, returns error details, no input required             |
| `/api/test-db`               | ✅ Complete [Aug 3]   | Test route, try/catch, no input, meaningful errors, not for prod      |
| `/api/ask-ai`                | ✅ Complete [Aug 3]   | Validates question/building_id, try/catch, auth, error handling       |
| `/api/upload-and-analyse`    | ✅ Complete [Aug 3]   | Validates file type, required fields, try/catch, auth, errors         |
| `/api/ai-classify`           | ✅ Complete [Aug 3]   | Validates emailId, try/catch, auth, error handling, used in inbox     |
| `/api/mark-read`             | ✅ Complete [Aug 3]   | Validates emailId, try/catch, auth, error handling, used in inbox     |
| `/api/mark-handled`          | ✅ Complete [Aug 3]   | Validates messageId, try/catch, auth, error handling, used in inbox   |
| `/api/mark-deleted`          | ✅ Complete [Aug 3]   | Validates emailId, try/catch, auth, error handling, used in inbox     |
| `/api/mark-escalated`        | ✅ Complete [Aug 3]   | Validates messageId, try/catch, auth, error handling, used in inbox   |
| `/api/mark-archived`         | ✅ Complete [Aug 3]   | Validates messageId, try/catch, auth, error handling, used in inbox   |
| `/api/send-letter`           | ✅ Complete [Aug 3]   | Validates subject/body, try/catch, auth, error handling, used in comm |
| `/api/send-reply`            | ✅ Complete [Aug 3]   | Validates reply fields, try/catch, auth, error handling, used in email|
| `/api/send-new-email`        | ✅ Complete [Aug 3]   | Validates email fields, try/catch, auth, error handling, used in email|
| `/api/send-communication`    | ✅ Complete [Aug 3]   | Validates template fields, try/catch, auth, error handling, used in comm|
| `/api/generate-reply`        | ✅ Complete [Aug 3]   | Validates email fields, try/catch, auth, error handling, used in email|
| `/api/generate-summary`      | ✅ Complete [Aug 3]   | Validates buildingId, try/catch, auth, error handling, used in summary|
| `/api/generate-new-email-draft` | ✅ Complete [Aug 3] | Validates subject, try/catch, auth, error handling, used in email     |
| `/api/generate-letters`      | ✅ Complete [Aug 3]   | Validates template fields, try/catch, auth, error handling, used in letters|
| `/api/ask-blociq`            | ✅ Complete [Aug 3]   | Validates AI fields, try/catch, auth, error handling, used in AI      |
| `/api/assistant-query`       | ✅ Complete [Aug 3]   | Validates userQuestion, try/catch, auth, error handling, used in AI   |
| `/api/create-task-from-suggestion` | ✅ Complete [Aug 3] | Validates action fields, try/catch, auth, error handling, used in AI  |
| `/api/create-event`          | ✅ Complete [Aug 3]   | Validates event fields, try/catch, auth, error handling, used in calendar|
| `/api/search-templates`      | ✅ Complete [Aug 3]   | Validates query, try/catch, auth, error handling, used in template search|
| `/api/search-entities`       | ✅ Complete [Aug 3]   | Validates query, try/catch, auth, error handling, used in SmartSearch  |
| `/api/save-emails`           | ✅ Complete [Aug 3]   | Validates email data, try/catch, error handling, used in email components|
| `/api/list-buildings`        | ✅ Complete [Aug 3]   | Validates auth, try/catch, error handling, used in building components |
| `/api/log-call`              | ✅ Complete [Aug 3]   | Validates leaseholder_id, try/catch, auth, error handling, used in comm|
| `/api/fetch-emails`          | ✅ Complete [Aug 3]   | Validates tokens, try/catch, error handling, used in email sync       |
| `/api/site-inspections`      | ✅ Complete [Aug 3]   | Validates buildingId, try/catch, error handling, used in inspection   |
| `/api/summarise-email`       | ✅ Complete [Aug 3]   | Validates emailId, try/catch, auth, error handling, used in email     |
| `/api/summarise-building-todos` | ✅ Complete [Aug 3] | Validates building_id, try/catch, auth, error handling, used in summary|
| `/api/improve-draft`         | ✅ Complete [Aug 3]   | Validates content, try/catch, error handling, used in draft components |
| `/api/generate-embeddings`   | ✅ Complete [Aug 3]   | Validates templateId, try/catch, error handling, used in AI components |
| `/api/add-to-calendar`       | ✅ Complete [Aug 3]   | Validates title/date/building, try/catch, error handling, used in calendar|
| `/api/ask-document`          | ✅ Complete [Aug 3]   | Validates question/userId, try/catch, auth, error handling, used in docs|
| `/api/ask-assistant`         | ✅ Complete [Aug 3]   | Validates message, try/catch, auth, error handling, used in assistant  |
| `/api/sync-outlook-inbox`    | ✅ Complete [Aug 3]   | Validates session/tokens, try/catch, auth, error handling, used in inbox|
| `/api/sync-inbox`            | ✅ Complete [Aug 3]   | Validates user/token, try/catch, auth, error handling, used in inbox   |
| `/api/sync-emails`           | ✅ Complete [Aug 3]   | Validates session/email data, try/catch, auth, error handling, used in sync|
| `/api/sync-calendar`         | ✅ Complete [Aug 3]   | Validates tokens, try/catch, auth, error handling, used in calendar    |
| `/api/seed-compliance`       | ✅ Complete [Aug 3]   | Validates existing assets, try/catch, error handling, used in compliance|
| `/api/remove-duplicate-ashwood` | ✅ Complete [Aug 3] | Validates data existence, try/catch, error handling, used in cleanup   |
| `/api/match-building`        | ✅ Complete [Aug 3]   | Validates input fields, try/catch, error handling, used in building match|
| `/api/add-building-todo`     | ✅ Complete [Aug 3]   | Validates task fields, try/catch, auth, error handling, used in BuildingTodoList|

## 📊 Summary
- **Total Routes**: 200+
- **Complete Audits**: 51 ✅
- **Deleted Routes**: 23 (cleaned up)
- **Used Routes Needing Audit**: 0 ✅
- **Remaining Routes**: ~135 (to be audited)

## 🎯 Next Steps
1. **✅ Deleted unused routes** (23 routes completed)
2. **✅ Completed critical route audits** (51 routes completed)
3. **✅ Completed all used route audits** (7 routes completed)
4. **Continue systematic audit** of remaining ~135 routes
5. **Add proper validation and error handling** where missing

## 🔍 AI GUIDANCE AUDIT RESULTS

### 📁 Audit Scope
Review all AI logic files for embedded founder guidance, UK-specific property law, or best-practice prompts.

### ✅ AI Guidance Audit Results

#### 1. **lib/ai/systemPrompt.ts** - Main System Prompt
**Location**: Lines 1-69
**Usage**: Passed into GPT as system message
**Coverage**: ✅ Tone of voice, ✅ Legal framing, ✅ Best practice, ✅ Compliance, ✅ Email communication style

**Key Embedded Guidance**:
```typescript
// British English & UK Terminology
- Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Format dates as DD/MM/YYYY (British format)
- Use British terminology and expressions appropriate for UK property management

// Legal Framework
- Landlord and Tenant Act 1985 (e.g. Section 20 consultations, repair obligations)
- Landlord and Tenant Act 1987 (e.g. variations, Tribunal rights)
- Building Safety Act 2022 (e.g. safety cases, accountable persons)

// Hard Rules
- Do NOT use tenancy-related terms like "tenant", "landlord" (except when referring to the freeholder)
- Do NOT assume internal repairs fall under the agent's remit — they often do not
- Always respond from the perspective of a managing agent handling communal issues
```

#### 2. **lib/ai/docs/founder-guidance.md** - Founder Knowledge Base
**Location**: Lines 1-24
**Usage**: Embedded in AI context via `founder_knowledge` table
**Coverage**: ✅ Legal framing, ✅ Best practice, ✅ Compliance

**Key Embedded Guidance**:
```markdown
// Real-world decision-making examples
- Section 20 Notice for major works over £250 per leaseholder
- EWS1 form validity under Building Safety Act
- Waking watch costs recoverability (LTA 1985)
- Leaseholder complaint handling
- Building Safety Regulator role
- Lease breach notifications
- Legal advice boundaries
```

#### 3. **lib/buildAIContext.ts** - Context Builder
**Location**: Lines 122-136, 345-359
**Usage**: Fetches founder knowledge and builds comprehensive context
**Coverage**: ✅ Legal framing, ✅ Best practice, ✅ Compliance

**Key Embedded Guidance**:
```typescript
// Founder Knowledge Integration
- Loads founder knowledge from database
- Integrates with building context
- Provides structured AI guidance based on historical queries

// British English Enforcement
- Use British English spelling (e.g., "summarise", "organisation")
- Provide helpful, accurate responses based on available data
```

#### 4. **app/api/ask-blociq/route.ts** - Enhanced System Prompt
**Location**: Lines 317-414
**Usage**: Advanced system prompt with document awareness
**Coverage**: ✅ Tone of voice, ✅ Legal framing, ✅ Best practice, ✅ Compliance, ✅ Email communication style

**Key Embedded Guidance**:
```typescript
// Document Awareness Framework
- Always reference specific documents when providing information
- Include traceable sources for all claims
- Use UK leasehold terminology and legal frameworks
- Be specific about dates, responsibilities, and actions required

// Document Reference Format
**Summary of [Document Name]:** [summary text]
**Key Actions Identified:** [actions]
**Source: [Document Name] (uploaded [timestamp])**
```

#### 5. **Multiple API Endpoints** - British English Enforcement
**Files**: 15+ API routes
**Usage**: Consistent British English enforcement across all AI features
**Coverage**: ✅ Tone of voice, ✅ Email communication style

**Key Embedded Guidance**:
```typescript
// Consistent British English Prompts (found in 15+ files)
- Use British English spelling throughout (e.g., analyse, summarise, organise, recognise, apologise, customise, centre, defence)
- Format dates as DD/MM/YYYY (British format)
- Use British terminology and expressions appropriate for UK property management
- Professional, courteous, and helpful tone using British English
```

#### 6. **lib/ai/embed.ts** - Founder Knowledge Search
**Location**: Lines 94-158
**Usage**: Semantic search through founder knowledge
**Coverage**: ✅ Legal framing, ✅ Best practice

**Key Embedded Guidance**:
```typescript
// Founder Knowledge Search
- Searches founder_knowledge table for relevant guidance
- Uses vector similarity for semantic matching
- Provides fallback search functionality
- Integrates with AI responses
```

### 🧪 Final Check Results

#### ✅ **Comprehensive Coverage Found**:
- **Tone of Voice**: British English enforcement across all AI features
- **Legal Framing**: UK legislation references (LTA 1985, LTA 1987, Building Safety Act 2022)
- **Best Practice**: Founder guidance based on real-world queries
- **Compliance**: Document awareness and traceable sources
- **Email Communication Style**: Professional, courteous, British English

#### ✅ **Consistent Implementation**:
- **15+ API endpoints** enforce British English
- **Unified system prompt** in `/lib/ai/systemPrompt.ts`
- **Founder knowledge integration** via database and search
- **Document awareness** in main AI assistant
- **Legal framework references** throughout

#### ✅ **Advanced Features**:
- **Founder knowledge search** with semantic matching
- **Document traceability** with source citations
- **Context-aware responses** based on building data
- **Compliance integration** with UK legislation
- **Professional tone management** with British English

### 📊 Summary Statistics
- **Total AI Guidance Files**: 6 core files
- **British English Enforcement**: 15+ API endpoints
- **Legal Framework Coverage**: 3 UK Acts referenced
- **Founder Knowledge Integration**: ✅ Complete
- **Document Awareness**: ✅ Complete
- **Compliance Integration**: ✅ Complete

### 🚀 **Key Strengths**
1. **Comprehensive British English enforcement** across all AI features
2. **Real-world founder guidance** based on historical queries
3. **UK legal framework integration** with specific legislation references
4. **Document traceability** with source citations
5. **Professional tone management** suitable for property managers

### 📋 **Recommendations**
1. **Maintain consistency** - All new AI features should use the unified system prompt
2. **Expand founder knowledge** - Continue adding real-world decision examples
3. **Enhance legal framework** - Add more specific UK legislation references
4. **Improve document integration** - Strengthen document-to-AI response linking
5. **Add compliance alerts** - Integrate real-time compliance checking

The audit reveals a **comprehensive and well-structured AI guidance system** with strong UK property management focus, consistent British English enforcement, and real-world founder knowledge integration.