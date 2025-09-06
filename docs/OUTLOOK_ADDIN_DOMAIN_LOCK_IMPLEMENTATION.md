# Outlook Add-in Domain Lock Implementation

## Overview

This implementation provides a comprehensive domain-locked system for the Outlook Add-in with strict property management focus, deterministic fact-based responses, and British English requirements.

## 🏗️ Architecture

### Core Components

1. **Property Acronyms Glossary** (`ai/glossary/propertyAcronyms.ts`)
   - Canonical definitions for UK leasehold property management acronyms
   - Domain-specific interpretation (RCA = Restatement Cost Analysis, not GitHub)
   - Out-of-scope detection for IT/development terms

2. **Intent Detection** (`ai/intent/parseAddinIntent.ts`)
   - Q&A vs Reply intent classification
   - Outlook message context integration
   - Building/unit context extraction

3. **Prompt Builder** (`ai/prompt/addinPrompt.ts`)
   - Domain-locked system prompts
   - Acronym expansion and validation
   - Reply context building

4. **Q&A Adapter** (`ai/adapters/addinQAAdapter.ts`)
   - Deterministic fact-based answers
   - Lease Lab summary integration
   - Building data queries

5. **Reply Adapter** (`ai/adapters/addinReplyAdapter.ts`)
   - Professional email reply generation
   - British English formatting
   - Fact-based content with sources

### API Routes

- **`/api/addin/ask`** - Main Q&A and reply endpoint
- **`/api/addin/generate-reply`** - Dedicated reply generation
- **`/api/addin/ask-ai`** - Updated legacy endpoint with domain locking

## 🔒 Domain Locking Rules

### Hard Domain Restrictions (Non-Negotiable)

1. **Scope**: UK leasehold block management, building safety, compliance, insurance, RICS/TPI governance, Section 20, lease clauses
2. **Facts First**: Use BlocIQ data (Supabase + Lease Lab summaries). If unavailable, say "Not specified in the lease/building records."
3. **No Invention**: Do not invent information
4. **Acronyms**: Interpret using property domain meanings only
5. **Email Drafting**: Only when explicitly requested or with active Outlook selection
6. **Style**: British English, professional, concise
7. **Safety**: If you don't know, say you don't know

### Acronym Map

| Acronym | Full Name | Domain | Context |
|---------|-----------|--------|---------|
| RCA | Restatement Cost Analysis | Insurance | Insurance rebuild valuation |
| S20 | Section 20 | Legal | LTA 1985 consultation thresholds |
| FRA | Fire Risk Assessment | Safety | Fire safety risk assessment |
| FRAEW | Fire Risk Assessment External Wall | Safety | External wall fire assessment |
| EICR | Electrical Installation Condition Report | Safety | Electrical safety inspection |
| HRB | Higher-Risk Building | Safety | Building Safety Act 2022 |
| RTA | Recognised Tenants' Association | Management | Formal leaseholder association |
| S.146 | Section 146 | Legal | Forfeiture/relief pre-conditions |
| RMC | Residents Management Company | Management | Leaseholder management company |
| RTM | Right to Manage | Management | Leaseholder management rights |
| EWS1 | External Wall System assessment form | Safety | Cladding safety assessment |

## 🎯 Intent Detection

### Q&A Intent Triggers
- General property management questions
- Building/unit information requests
- Compliance queries
- Lease term questions

### Reply Intent Triggers
- Explicit keywords: "draft", "reply", "respond", "write", "compose", "send"
- Active Outlook message selection with headers
- Email context with from/subject/date

## 📊 Response Types

### Q&A Responses
- **High Confidence**: Based on Lease Lab summaries or building data
- **Medium Confidence**: Based on general property knowledge
- **Low Confidence**: Generic property management guidance

### Reply Responses
- **Subject Suggestion**: Professional email subject
- **Body HTML**: Formatted email body with facts and sources
- **Used Facts**: List of facts incorporated
- **Sources**: Data sources referenced

## 🧪 Testing

### Automated Tests
```bash
npm run test:addin
```

### Manual Test Cases

1. **Acronym Check**: "What should I consider when carrying out an RCA?"
   - Expected: Treats as Restatement Cost Analysis
   - Lists survey scope, BCIS basis, exclusions, plant, access assumptions, fees, indexation

2. **Q&A vs Reply**:
   - "What is Section 20?" → Q&A answer; no email format
   - "Draft a reply explaining Section 20 to the board" → returns drafted email

3. **Lease Facts**: "Who pays for windows in Flat 8 Ashwood House?"
   - Expected: Cites repair_matrix + page references from Lease Lab

4. **Out of Scope**: "How do I rotate AWS keys?"
   - Expected: "Out of scope for BlocIQ add-in"

5. **Ambiguity**: "Do an RCA for the leak"
   - Expected: Clarification prompt for RCA meaning

## 🔧 Configuration

### Environment Variables
- `SITE_URL` - Base URL for API calls
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

### User Settings
- `signature` - Email signature for replies
- `tone` - Response tone (formal, friendly, concise)

## 📝 Usage Examples

### Q&A Example
```javascript
const response = await fetch('/api/addin/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userInput: 'What is Section 20 consultation?',
    emailContext: null
  })
});
```

### Reply Example
```javascript
const response = await fetch('/api/addin/generate-reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userInput: 'Draft a reply about repair obligations',
    outlookContext: {
      from: 'tenant@example.com',
      subject: 'Window Repair Request',
      receivedDateTime: '2025-01-17T10:00:00Z'
    }
  })
});
```

## 🚀 Deployment

1. **Code Changes**: All files are ready for deployment
2. **Database**: No schema changes required
3. **Environment**: Ensure environment variables are set
4. **Testing**: Run manual tests after deployment

## 📋 Acceptance Criteria

- ✅ No off-domain answers for RCA — always means Restatement Cost Analysis
- ✅ Replies generated only on explicit triggers or with selected Outlook message
- ✅ Q&A uses deterministic facts; LLM only phrases
- ✅ Clear refusals for out-of-scope or unknowns
- ✅ British English everywhere
- ✅ Acronym expansion and domain validation
- ✅ Lease Lab summary integration
- ✅ Professional email formatting

## 🔍 Monitoring

### Key Metrics
- Intent classification accuracy
- Acronym expansion success rate
- Out-of-scope detection rate
- Response confidence levels
- User satisfaction with domain locking

### Logging
- All API calls logged with intent and confidence
- Acronym processing tracked
- Domain validation results recorded
- Error handling and fallbacks monitored

## 🛠️ Maintenance

### Regular Updates
- Acronym definitions as property management evolves
- Intent detection patterns based on user feedback
- Domain boundaries as business requirements change
- Response templates for new property management scenarios

### Troubleshooting
- Check acronym definitions for new terms
- Validate intent detection patterns
- Review domain boundaries for edge cases
- Monitor response quality and user feedback
