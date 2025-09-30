# Founder Knowledge Scan (read-only)
_Date: January 15, 2025_

## Summary
- DB table `public.ai_founder_knowledge`: **Not found**
- SQL migration creating it: **Not found**
- `prompts/policy.yml`: **Not found**
  - `founder_knowledge:` section: **N/A**
  - `merge_rules.include_founder_knowledge`: **N/A**
  - `ask-blociq-core` prompt id: **N/A**
- `lib/founderKnowledge.ts`: **Not found**
  - `fetchFounderKnowledge`, `mergeFounderKnowledge` exported: **N/A**
- `lib/promptRouter.ts`: **Not found**
  - `detectContext`, `buildPrompt` present: **N/A**
  - Founder knowledge merge path: **N/A**
- Usage of `buildPrompt(` in APIs: **Found - Multiple instances**

## Evidence (paths & snippets)

### Matches: ai_founder_knowledge (code & migrations)
**No matches found** for `ai_founder_knowledge` in the codebase.

### Alternative Founder Knowledge Implementation
**Found alternative implementation** using `founder_knowledge` table (not `ai_founder_knowledge`):

#### lib/ai/embed.ts
- **Path**: `lib/ai/embed.ts`
- **Table**: Uses `founder_knowledge` table (line 10)
- **Functions**:
  - `embedMarkdownFile()` - Embeds markdown content into founder_knowledge table
  - `searchFounderKnowledge()` - Searches founder knowledge using vector similarity
  - `searchFounderKnowledgeFallback()` - Client-side fallback search

#### lib/ai/founder.ts
- **Path**: `lib/ai/founder.ts`
- **Function**: `getFounderGuidance(question: string)` - Wrapper for founder knowledge search

#### lib/buildAIContext.ts
- **Path**: `lib/buildAIContext.ts`
- **Lines**: 127-140
- **Usage**: Direct query to `founder_knowledge` table for content

#### lib/buildPrompt.ts
- **Path**: `lib/buildPrompt.ts`
- **Lines**: 6, 33-35
- **Usage**: Imports and uses `getFounderGuidance()` function

### buildPrompt( ) Calls
**Found multiple instances** of `buildPrompt` usage:

#### lib/buildPrompt.ts
```typescript
export async function buildPrompt({
  contextType,
  question,
  buildingId,
  documentIds = [],
  emailThreadId,
  manualContext,
  leaseholderId,
  projectId,
}: {
  contextType: string;
  question: string;
  buildingId?: string;
  documentIds?: string[];
  emailThreadId?: string;
  manualContext?: string;
  leaseholderId?: string;
  projectId?: string;
}) {
  // 📘 Founder Guidance
  const founder = await getFounderGuidance(question);
  if (founder) contextSections.push(`Founder Guidance:\n${founder}`);
  // ... rest of function
}
```

#### lib/ai-context-handler.ts
```typescript
static buildPrompt(
  context: 'core' | 'doc_summary' | 'auto_polish' | 'complaints',
  userInput: string,
  buildingContext?: string,
  uploadedFiles?: File[]
): string {
  const basePrompt = getPromptForContext(context);
  // ... rest of function
}
```

#### API Usage
- **app/api/ask-ai/route.ts** (lines 118, 165)
- **app/api/ask-blociq/route.ts** (line 57)
- **app/api/summarise-email/route.ts** (line 53)

### Database Schema Analysis
**No `ai_founder_knowledge` table found** in migrations, but `founder_knowledge` table is referenced in code.

**Found references to `founder_knowledge` table**:
- Used in `lib/ai/embed.ts` for vector embeddings
- Used in `lib/buildAIContext.ts` for direct content retrieval
- Referenced in `docs/api-audit.md` as "Embedded in AI context via founder_knowledge table"

### Vector Search Implementation
**Found vector search functionality**:
- **RPC Function**: `match_founder_knowledge` (referenced in lib/ai/embed.ts:121)
- **Fallback**: Client-side cosine similarity search
- **Embedding Model**: `text-embedding-ada-002`
- **Threshold**: 0.7 similarity
- **Results**: Top 5 matches

### YAML Dependencies
**Found YAML dependencies** in package-lock.json:
- `js-yaml`: "^4.1.0"
- `yaml`: "^2.2.1"

## Key Findings

### ✅ What EXISTS:
1. **Founder Knowledge System**: Implemented using `founder_knowledge` table (not `ai_founder_knowledge`)
2. **Vector Search**: Full vector similarity search with embeddings
3. **Integration**: Founder knowledge is integrated into AI context building
4. **API Usage**: Multiple API endpoints use founder knowledge via `buildPrompt()`
5. **Fallback Search**: Client-side cosine similarity as backup

### ❌ What's MISSING:
1. **`ai_founder_knowledge` table**: No such table exists
2. **`prompts/policy.yml`**: No policy file found
3. **`lib/founderKnowledge.ts`**: No such file exists
4. **`lib/promptRouter.ts`**: No such file exists
5. **`ask-blociq-core` prompt**: No such prompt ID found
6. **`include_founder_knowledge` flag**: No such configuration found

### 🔄 Current Implementation:
The codebase has a **different founder knowledge implementation**:
- Uses `founder_knowledge` table instead of `ai_founder_knowledge`
- Implements vector search with embeddings
- Integrates directly into `buildPrompt()` function
- Uses `getFounderGuidance()` wrapper function
- No YAML policy configuration - uses direct database queries

## Next Steps (no changes performed)

### If implementing the "BlocIQ – AI Policy Bundle (with Founder Knowledge)":

1. **Database Migration**: Create `ai_founder_knowledge` table (replacing or alongside `founder_knowledge`)
2. **Policy File**: Add `prompts/policy.yml` with founder knowledge configuration
3. **Helper Files**: Add `lib/founderKnowledge.ts` and `lib/promptRouter.ts`
4. **Integration**: Update existing `buildPrompt()` calls to use new system
5. **Migration**: Migrate existing `founder_knowledge` data to new schema

### Current System Status:
The existing founder knowledge system is **functional but different** from the expected "AI Policy Bundle" implementation. It provides vector search and AI integration but uses a different schema and approach.
