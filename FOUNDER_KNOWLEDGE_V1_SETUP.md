# Founder Knowledge v1 Setup
_Date: January 15, 2025_

## 🎯 Goal
Make Founder Knowledge targeted, reviewable, and clearly injected at runtime — without refactors or UI changes.

## 📁 Files Created/Modified

### 1. **Database Migration**: `supabase/migrations/20250816_founder_knowledge_meta.sql`
- **Purpose**: Add metadata columns to `founder_knowledge` table
- **Columns Added**:
  - `tags text[]` - e.g., `['tone', 'governance', 'leaks']`
  - `contexts text[]` - e.g., `['core', 'complaints', 'doc_summary', 'auto_polish']`
  - `priority int` - Sorting priority (higher = more important)
  - `version int` - Version tracking
  - `effective_from date` - When guidance becomes active
  - `expires_on date` - When guidance expires
  - `review_due date` - When guidance should be reviewed
  - `is_active boolean` - Whether guidance is active
  - `source_url text` - Source document URL
  - `last_validated_by text` - Who last validated this guidance

### 2. **Enhanced Founder Guidance**: `lib/ai/founder.ts`
- **Purpose**: Context-aware filtering with backward compatibility
- **Features**:
  - Filter by contexts and tags
  - Priority-based sorting
  - Fallback to direct queries if vector search fails
  - Backward compatibility with string input

### 3. **Context Detection**: `lib/buildPrompt.ts`
- **Purpose**: Detect context and inject targeted founder knowledge
- **Features**:
  - `detectContext()` function for automatic context detection
  - Context-aware tag selection
  - Clear "Founder Knowledge (merge)" labeling
  - Backward compatibility maintained

### 4. **Dev Proof Endpoint**: `app/api/dev/founder-proof/route.ts`
- **Purpose**: Verify founder knowledge injection (dev-only)
- **Security**: Token-protected, dev-environment only
- **Functionality**: Test context detection and founder knowledge merging

## 🔧 Setup Instructions

### Step 1: Apply Database Migration
Run the migration in your Supabase SQL editor:
```sql
-- File: supabase/migrations/20250816_founder_knowledge_meta.sql
-- Apply this migration to add metadata columns
```

### Step 2: Add Sample Data (Optional)
```sql
-- Example: Add some sample founder knowledge with metadata
INSERT INTO public.founder_knowledge (
  content, 
  tags, 
  contexts, 
  priority, 
  title,
  is_active
) VALUES 
(
  'When handling complaints, always acknowledge the impact first, then provide clear action steps with dates.',
  ARRAY['tone', 'complaints', 'governance'],
  ARRAY['complaints', 'core'],
  10,
  'Complaint Handling Best Practice',
  true
),
(
  'For document summaries, focus on key findings, immediate risks, and compliance actions.',
  ARRAY['tone', 'governance'],
  ARRAY['doc_summary'],
  8,
  'Document Summary Guidelines',
  true
),
(
  'Keep responses concise (140-220 words) unless statutory citations are required.',
  ARRAY['tone'],
  ARRAY['auto_polish', 'core'],
  5,
  'Response Length Guidelines',
  true
);
```

### Step 3: Test Context Detection
The system now automatically detects context:
- **Complaints**: Keywords like "complain", "complaint", "escalate", "CHP"
- **Document Summary**: Keywords like "summarise", "document", "PDF", "attachment"
- **Auto-Polish**: Text longer than 300 words
- **Core**: Default for everything else

### Step 4: Test Dev Proof Endpoint (Optional)
Add to `.env.local`:
```
FOUNDER_PROOF_TOKEN=your-temp-token-here
```

Test the endpoint:
```
GET /api/dev/founder-proof?token=YOUR_TOKEN&topic=complaints
```

Expected response:
```json
{
  "ok": true,
  "topic": "complaints",
  "founder_guidance_count": 1,
  "system_prompt_contains_founder_block": true,
  "system_prompt_preview": "Context Information:\n\n# Founder Knowledge (merge)\n• Complaint Handling Best Practice\nWhen handling complaints...",
  "source": "founder_knowledge (backend)"
}
```

## 🔍 How It Works

### Context Detection
```typescript
// Automatic context detection based on input
const ctx = detectContext(question, { wordCount: question.split(/\s+/).length });

// Context-aware tag selection
const founderTags =
  ctx === "complaints" ? ["tone","complaints","governance"] :
  ctx === "doc_summary" ? ["tone","governance"] :
  ctx === "auto_polish" ? ["tone"] :
  ["tone","governance"];
```

### Founder Knowledge Injection
```typescript
// Get targeted guidance
const guidance = await getFounderGuidance({ 
  topicHints: [ctx], 
  contexts: [ctx], 
  tags: founderTags, 
  limit: 6 
});

// Build clearly labeled block
if (Array.isArray(guidance) && guidance.length) {
  const items = guidance.map(g => `• ${g.title}\n${g.content}`).join("\n\n");
  founderBlock = `\n# Founder Knowledge (merge)\n${items}\n`;
}
```

## 📊 Benefits

### ✅ **Targeted Guidance**
- Context-specific founder knowledge injection
- Priority-based sorting ensures most relevant guidance first
- Tag-based filtering for precise targeting

### ✅ **Reviewable & Maintainable**
- Metadata columns for tracking and management
- Version control and expiration dates
- Review due dates for content maintenance

### ✅ **Clear Injection**
- "Founder Knowledge (merge)" heading makes injection visible
- Structured format with titles and content
- Easy to spot in logs and debugging

### ✅ **Production Safe**
- Backward compatibility maintained
- Graceful fallbacks if metadata columns don't exist
- No breaking changes to existing functionality

## 🧪 Testing Scenarios

### Test Different Contexts:
1. **Complaints**: "Resident complaint about lift outages..."
2. **Document Summary**: "Please summarise this PDF document..."
3. **Auto-Polish**: Long text (>300 words)
4. **Core**: Standard questions

### Expected Behavior:
- **Complaints**: Gets guidance tagged with `['tone', 'complaints', 'governance']`
- **Document Summary**: Gets guidance tagged with `['tone', 'governance']`
- **Auto-Polish**: Gets guidance tagged with `['tone']`
- **Core**: Gets general guidance tagged with `['tone', 'governance']`

## 🔧 Management

### Adding New Founder Knowledge:
```sql
INSERT INTO public.founder_knowledge (
  content,
  tags,
  contexts,
  priority,
  title,
  is_active,
  effective_from
) VALUES (
  'Your guidance content here',
  ARRAY['relevant', 'tags'],
  ARRAY['relevant', 'contexts'],
  5,
  'Guidance Title',
  true,
  NOW()
);
```

### Updating Existing Guidance:
```sql
UPDATE public.founder_knowledge 
SET 
  content = 'Updated content',
  tags = ARRAY['updated', 'tags'],
  priority = 8,
  version = version + 1
WHERE id = 'your-guidance-id';
```

### Deactivating Guidance:
```sql
UPDATE public.founder_knowledge 
SET is_active = false 
WHERE id = 'your-guidance-id';
```

## 🚀 Next Steps

### Optional Enhancements:
1. **Admin Interface**: Build UI for managing founder knowledge
2. **Analytics**: Track which guidance is most used
3. **A/B Testing**: Test different guidance versions
4. **Import/Export**: Bulk management tools

### Monitoring:
1. **Logs**: Check for "Founder Knowledge (merge)" in AI responses
2. **Performance**: Monitor query performance with new indexes
3. **Usage**: Track which contexts and tags are most active

## 🧹 Cleanup (Optional)

### Remove Dev Endpoint:
```bash
# After testing, remove the dev endpoint
rm app/api/dev/founder-proof/route.ts

# Remove from .env.local
# Delete FOUNDER_PROOF_TOKEN line
```

This implementation provides **targeted, reviewable, and clearly injected** founder knowledge while maintaining full backward compatibility and production safety.
