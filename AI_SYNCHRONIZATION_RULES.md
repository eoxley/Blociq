# AI SYNCHRONIZATION RULES - MANDATORY

**⚠️ CRITICAL: ALL AI functionality changes MUST be synchronized across ALL endpoints collectively.**

## RULE 1: OUTLOOK ADDIN SYNCHRONIZATION
**ALL updates to Outlook Add-in functionality MUST be applied to BOTH public and pro versions:**

### Core Endpoints:
- `/api/ask-ai-outlook-public/route.ts` (Public Outlook AI)
- `/api/ask-ai-outlook-blociq/route.ts` (Pro Outlook AI)
- `/api/addin/generate-reply/route.ts` (Generate Reply)
- `/api/addin/chat/route.ts` (Outlook Chat)
- `/api/ask-ai-outlook/route.ts` (Legacy Outlook)

### Requirements:
- System prompts MUST be identical
- Response formatting MUST be consistent
- Block manager perspective MUST be maintained
- Error handling MUST be synchronized
- Rate limiting MUST be consistent

## RULE 2: ASK BLOC AI UNIFICATION
**ALL Ask BlocIQ changes MUST be unified across:**

### Core Endpoints:
- `/api/ask-ai/route.ts` (Main Ask BlocIQ)
- `/api/ask-ai-public/route.ts` (Public Ask BlocIQ)
- `/api/addin/chat/route.ts` (Outlook Chat)
- `/api/ask-ai-outlook-public/route.ts` (Public Outlook)
- `/api/ask-ai-outlook-blociq/route.ts` (Pro Outlook)

### Requirements:
- Block manager perspective MUST be consistent
- System prompts MUST use same base template
- Response logic MUST be synchronized
- Context handling MUST be identical
- Building query logic MUST be unified

## RULE 3: GENERATE REPLY SYNCHRONIZATION
**ALL email reply generation MUST be synchronized across:**

### Core Endpoints:
- `/api/addin/generate-reply/route.ts`
- `/api/generate-reply/route.ts`
- `/api/ai-email-reply/route.ts`
- `/api/generate-email-reply/route.ts`

### Requirements:
- Block manager response perspective
- Identical email formatting
- Same urgency detection
- Consistent legal compliance checks

## RULE 4: TRIAGE FUNCTIONALITY
**ALL triage functionality MUST be synchronized across:**

### Core Endpoints:
- `/api/triage/route.ts`
- `/api/triage/start/route.ts`
- `/api/triage/check/route.ts`
- `/api/bulk-triage/route.ts`

### Requirements:
- Same classification logic
- Identical urgency scoring
- Consistent routing decisions

## IMPLEMENTATION CHECKLIST

### Before Making ANY AI Changes:
1. ✅ Identify ALL affected endpoints
2. ✅ Plan changes for ALL endpoints simultaneously
3. ✅ Test changes across ALL endpoints
4. ✅ Verify consistency across public/pro versions

### Mandatory Change Process:
1. **IDENTIFY**: List all endpoints requiring updates
2. **PLAN**: Design unified changes for all endpoints
3. **IMPLEMENT**: Apply changes to ALL endpoints in single session
4. **TEST**: Verify consistency across all endpoints
5. **DOCUMENT**: Update this file with changes made

### Specific Areas Requiring Synchronization:

#### System Prompts:
```typescript
// MUST be synchronized across:
// - ask-ai/route.ts
// - ask-ai-public/route.ts
// - ask-ai-outlook-public/route.ts
// - ask-ai-outlook-blociq/route.ts
// - addin/chat/route.ts
// - addin/generate-reply/route.ts

const SYSTEM_PROMPTS = {
  general: "You are a professional block manager...",
  email_reply: "You are a professional block manager...",
  // etc.
}
```

#### Response Formatting:
```typescript
// MUST be identical across all endpoints
const responseFormat = {
  blockManagerPerspective: true,
  firstPersonLanguage: "I will...",
  ownershipTone: true,
  professionalClosing: "Kind regards,"
}
```

#### Issue Detection:
```typescript
// MUST be synchronized across all endpoints
const issueDetection = {
  leak: /\b(leak|water|dripping)\b/i,
  noise: /\b(noise|loud|disturb)\b/i,
  maintenance: /\b(repair|broken|maintenance)\b/i
  // etc.
}
```

## VIOLATION CONSEQUENCES
**Failure to follow these rules will result in:**
- Inconsistent user experience
- Confusion between public/pro versions
- Support issues
- Brand inconsistency

## CURRENT SYNCHRONIZED ENDPOINTS (Updated: 2025-01-26)

### ✅ Recently Synchronized:
- `/api/ask-ai-outlook-public/route.ts` - Block manager perspective
- `/api/ask-ai/route.ts` - Block manager system prompts

### ⚠️ REQUIRES IMMEDIATE SYNCHRONIZATION:
- `/api/ask-ai-outlook-blociq/route.ts` - Pro version needs block manager update
- `/api/addin/generate-reply/route.ts` - Needs block manager perspective
- `/api/addin/chat/route.ts` - Needs unified prompts
- `/api/ask-ai-public/route.ts` - Needs block manager perspective

## ENFORCEMENT SYSTEM

### Automated Checks:
1. **Pre-commit hooks** to verify system prompt consistency
2. **CI/CD checks** to ensure endpoint synchronization
3. **Integration tests** to verify consistent responses

### Manual Verification:
1. **Code review checklist** requiring synchronization verification
2. **Testing protocol** for all affected endpoints
3. **Documentation updates** for each change

---

**REMEMBER: NO AI CHANGES ARE COMPLETE UNTIL ALL RELATED ENDPOINTS ARE UPDATED**