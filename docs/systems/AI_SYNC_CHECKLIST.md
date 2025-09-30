# AI SYNCHRONIZATION CHECKLIST

**⚠️ Use this checklist for ALL future AI changes**

## Before Making AI Changes

### Step 1: Identify Scope
- [ ] What type of change are you making?
  - [ ] System prompt update
  - [ ] Response format change
  - [ ] New functionality
  - [ ] Bug fix
  - [ ] Performance improvement

### Step 2: Identify Affected Endpoints
- [ ] **Outlook Add-in Changes** - Must update BOTH:
  - [ ] `/api/ask-ai-outlook-public/route.ts` (Public)
  - [ ] `/api/ask-ai-outlook-blociq/route.ts` (Pro)
  - [ ] `/api/addin/generate-reply/route.ts` (Generate Reply)
  - [ ] `/api/addin/chat/route.ts` (Chat)

- [ ] **Ask BlocIQ Changes** - Must update ALL:
  - [ ] `/api/ask-ai/route.ts` (Main)
  - [ ] `/api/ask-ai-public/route.ts` (Public)
  - [ ] `/api/ask-ai-outlook-public/route.ts` (Outlook Public)
  - [ ] `/api/ask-ai-outlook-blociq/route.ts` (Outlook Pro)
  - [ ] `/api/addin/chat/route.ts` (Outlook Chat)

## Making Changes

### Step 3: Apply Changes Consistently
- [ ] Update system prompts in ALL affected endpoints
- [ ] Ensure block manager perspective is maintained
- [ ] Keep response formatting identical
- [ ] Synchronize error handling
- [ ] Match rate limiting rules

### Step 4: Test Changes
- [ ] Test public version works correctly
- [ ] Test pro version works correctly
- [ ] Test Outlook add-in integration
- [ ] Verify consistent responses across endpoints

## Pre-Commit Verification

### Step 5: Run Enforcement Script
```bash
node scripts/enforce-ai-sync.js
```

- [ ] All checks pass
- [ ] No synchronization errors
- [ ] Warnings addressed (if any)

### Step 6: Manual Verification
- [ ] Review `ai-sync-report.md`
- [ ] Confirm all endpoints updated
- [ ] Verify block manager perspective maintained
- [ ] Check professional response formatting

## Common Patterns to Maintain

### System Prompts
```typescript
// ✅ CORRECT - Block manager perspective
"You are a professional block manager using BlocIQ..."

// ❌ INCORRECT - Generic assistant
"You are BlocIQ, an AI assistant..."
```

### Response Language
```typescript
// ✅ CORRECT - First person ownership
"I will arrange the inspection within 24 hours"

// ❌ INCORRECT - Generic advice
"You should contact your property manager"
```

### Email Responses
```typescript
// ✅ CORRECT - Block manager receiving email
"Thank you for bringing this leak to my attention"

// ❌ INCORRECT - Generic acknowledgment
"Thank you for your email regarding the leak"
```

## Commit Message Template

```
AI: [description of change]

Synchronized endpoints:
- ask-ai/route.ts
- ask-ai-public/route.ts
- ask-ai-outlook-public/route.ts
- ask-ai-outlook-blociq/route.ts
- addin/generate-reply/route.ts
- addin/chat/route.ts

✅ Block manager perspective maintained
✅ Response formatting consistent
✅ All endpoints tested
```

## Emergency Rollback

If synchronization issues are discovered after deployment:

1. **Immediate Action**:
   ```bash
   git revert [commit-hash]
   ```

2. **Fix and Re-deploy**:
   - Use this checklist
   - Apply changes to ALL endpoints
   - Test thoroughly
   - Deploy synchronized changes

---

**Remember: NO AI CHANGE IS COMPLETE UNTIL ALL RELATED ENDPOINTS ARE UPDATED**