# DEVELOPMENT GUIDELINES - AI SYNCHRONIZATION

## 🚨 MANDATORY RULES FOR ALL AI CHANGES

### Rule 1: Outlook Add-in Synchronization
**ALL updates to Outlook Add-in functionality MUST be applied to BOTH public and pro versions:**

```bash
# When changing any of these files, update ALL of them:
app/api/ask-ai-outlook-public/route.ts      # Public Outlook AI
app/api/ask-ai-outlook-blociq/route.ts      # Pro Outlook AI
app/api/addin/generate-reply/route.ts       # Generate Reply
app/api/addin/chat/route.ts                 # Outlook Chat
```

### Rule 2: Ask BlocIQ Unification
**ALL Ask BlocIQ changes MUST be unified across ALL endpoints:**

```bash
# When changing any of these files, update ALL of them:
app/api/ask-ai/route.ts                     # Main Ask BlocIQ
app/api/ask-ai-public/route.ts              # Public Ask BlocIQ
app/api/ask-ai-outlook-public/route.ts      # Public Outlook
app/api/ask-ai-outlook-blociq/route.ts      # Pro Outlook
app/api/addin/chat/route.ts                 # Outlook Chat
```

## 🔧 Development Workflow

### Before Making Changes
1. **Run sync check**: `npm run ai-sync-check`
2. **Identify all affected endpoints** using the rules above
3. **Plan changes for ALL endpoints simultaneously**

### Making Changes
1. **Update ALL related endpoints** in the same commit
2. **Maintain block manager perspective** across all changes
3. **Keep response formatting identical**
4. **Test each endpoint individually**

### Before Committing
1. **Run sync check**: `npm run ai-sync-check`
2. **Fix any synchronization errors**
3. **Use the AI sync checklist**: `AI_SYNC_CHECKLIST.md`

## 🤖 Enforcement

### Automatic Checks
- **Pre-commit hook** runs automatically on AI file changes
- **CI/CD integration** prevents deployment of unsynchronized changes
- **Sync enforcement script** validates all endpoints

### Manual Verification
```bash
# Check synchronization before committing
npm run ai-sync-check

# View detailed report
cat ai-sync-report.md
```

### Quick Reference Commands
```bash
# Check AI synchronization
npm run ai-sync-check

# View current rules
cat AI_SYNCHRONIZATION_RULES.md

# Use development checklist
cat AI_SYNC_CHECKLIST.md
```

## ⚠️ Common Mistakes to Avoid

### ❌ Don't Do This:
- Update only the public version
- Update only the main Ask BlocIQ endpoint
- Make changes without running sync check
- Use generic AI assistant language
- Include placeholders like "[Property Manager]"

### ✅ Do This:
- Update ALL related endpoints simultaneously
- Run sync check before and after changes
- Maintain block manager perspective
- Use first-person ownership language
- Test all endpoints individually

## 🚀 Quick Start for AI Changes

1. **Identify scope**: What type of AI change are you making?
2. **List endpoints**: Which endpoints need updating based on the rules?
3. **Plan changes**: Design unified changes for all endpoints
4. **Implement**: Apply changes to ALL endpoints in single session
5. **Test**: Verify consistency across all endpoints
6. **Commit**: Use proper commit message format

## 📋 Commit Message Format

```
AI: [brief description of change]

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
✅ Sync check passed
```

---

**REMEMBER: NO AI CHANGE IS COMPLETE UNTIL ALL RELATED ENDPOINTS ARE UPDATED**