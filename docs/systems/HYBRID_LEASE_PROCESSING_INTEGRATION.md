# Hybrid Lease Processing System - Integration Guide

## 🎯 Overview

This hybrid system provides the best of both worlds: instant analysis for simple documents/questions and comprehensive background processing for complex scenarios. Users get immediate help when possible, with graceful fallback to background processing when needed.

## 🔄 Workflow Architecture

### Decision Tree
```
User uploads lease + asks question
          ↓
    File size check
          ↓
   ≤10MB? Quick patterns in question?
          ↓                    ↓
       YES                    NO  
          ↓                    ↓
  Try Quick Processing    → Background Processing
  (3 min timeout)           (Full analysis)
          ↓                    ↓
   Success? → Immediate Answer
          ↓
      NO → Fallback to Background
              ↓
        Graceful messaging + alternatives
```

## 📁 Files Created

### Core Processing Logic
- `lib/hybrid-lease-processor.ts` - Main hybrid processing engine
- `hooks/useHybridAskAI.ts` - React hook for UI integration
- `components/HybridAskAI.tsx` - Complete Ask AI interface
- `app/api/ask-ai/hybrid/route.ts` - API endpoint for hybrid processing

### Key Features

#### 1. **Smart Processing Decision**
```typescript
// Automatically determines processing approach
const shouldTryQuick = this.shouldAttemptQuickProcessing(file, userQuestion);
```

**Quick Processing Triggers:**
- File ≤ 10MB
- Question contains page numbers (`"What's on page 2?"`)
- Targeted questions (`"rent amount"`, `"tenant name"`, `"signature"`)
- Simple fact extraction requests

#### 2. **Graceful Fallback Messaging**
When quick processing fails or isn't attempted:

```
"This lease document (lease.pdf, 25.3MB) is quite complex and needs more thorough analysis. I've started a comprehensive background analysis that will be ready in approximately 5-10 minutes.

🔄 What's happening now:
- Your document is being processed with advanced OCR
- Complete lease analysis with all clauses and terms  
- You'll receive an email when ready

📧 You'll be notified when complete with:
- Full lease analysis and key terms
- Downloadable reports
- Answer to your specific question: "What are the key lease terms?"

⚡ In the meantime, I can help if you:
1. Ask about a specific page number (e.g., 'What's on page 1?')
2. Focus on a particular section (e.g., 'rent section', 'signature page')
3. Ask for general lease advice or terminology explanations
4. Upload just the relevant page if you know where the information is"
```

#### 3. **Page-Specific Processing**
```typescript
// Handle page-specific queries instantly
const pageMatch = message.match(/page (\d+)/i);
if (pageMatch && uploadStatus.currentFile) {
  const pageNum = parseInt(pageMatch[1]);
  return processPageSpecific(uploadStatus.currentFile, pageNum, message);
}
```

#### 4. **Background Job Integration**
- Automatically creates background job when quick processing fails
- Stores user's original question for context
- Provides job tracking and status updates
- Integrates with existing notification system

## 🛠 Integration Steps

### Step 1: Add Dependencies
The hybrid processor uses the existing background processing infrastructure:

```bash
# No additional dependencies needed - uses existing:
# - Supabase client
# - OpenAI API
# - Background job system
```

### Step 2: Environment Variables
Uses existing configuration:
```bash
# Already configured:
OPENAI_API_KEY=your-key
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
BACKGROUND_PROCESSOR_API_KEY=your-key
```

### Step 3: Replace Ask AI Component

**Option A: Complete Replacement**
```tsx
// In your Ask AI page/component
import HybridAskAI from '@/components/HybridAskAI';

export default function AskAIPage() {
  return (
    <div className="container mx-auto p-6">
      <HybridAskAI 
        buildingId={buildingId} 
        onJobCreated={(jobId) => console.log('Background job created:', jobId)}
      />
    </div>
  );
}
```

**Option B: Gradual Integration**
```tsx
// Add hybrid processing to existing Ask AI
import { useHybridAskAI } from '@/hooks/useHybridAskAI';

function ExistingAskAI() {
  const { processFileWithQuestion } = useHybridAskAI();
  
  // Replace existing file processing with:
  await processFileWithQuestion(file, question, buildingId);
}
```

### Step 4: Update API Routes
Add hybrid endpoint alongside existing ones:
```typescript
// Option 1: Replace existing upload handler
import { HybridLeaseProcessor } from '@/lib/hybrid-lease-processor';

// Option 2: Add new hybrid endpoint (recommended)
// Uses /api/ask-ai/hybrid/route.ts
```

## 📊 User Experience Flow

### Scenario 1: Small Document + Simple Question
```
User: "What's the rent amount?" (uploads 2MB lease)
↓
⚡ Quick Processing (30 seconds)
↓
Assistant: "The monthly rent is £1,200, payable in advance on the 1st of each month..."
```

### Scenario 2: Large Document + Complex Question  
```
User: "Analyze all the clauses" (uploads 15MB lease)
↓
📋 Background Processing (automatic)
↓
Assistant: "This lease document is quite complex... I've started comprehensive analysis...
⚡ In the meantime, I can help if you:
1. Ask about a specific page number
2. Focus on particular sections..."
```

### Scenario 3: Page-Specific Query
```
User: "What's on page 3?" (any size document)
↓
📄 Page Processing (quick)
↓
Assistant: "Here's what I found on page 3: [targeted analysis]"
```

### Scenario 4: Timeout Fallback
```
User: "Key terms?" (uploads 8MB complex lease)
↓
⚡ Quick Processing Attempt → Times out after 3 minutes
↓
📋 Automatic Background Fallback
↓
Assistant: "This lease needed more thorough analysis... background processing started..."
```

## 💡 Smart Features

### 1. **Question Pattern Recognition**
```typescript
const quickQuestionPatterns = [
  /page \d+/i,           // "page 2", "Page 5"
  /rent amount|monthly rent/i, // Rent queries  
  /parties|tenant|landlord/i,  // Party identification
  /signature/i,          // Signature page
  /address/i,           // Property address
  /date/i              // Lease dates
];
```

### 2. **File Size Intelligence**
- ≤10MB: Always try quick processing first
- >10MB + quick patterns: Still attempt quick processing
- >10MB + complex question: Skip to background processing

### 3. **Contextual Alternatives**
Based on the user's question, provides relevant alternatives:
```typescript
if (userQuestion.includes('rent')) {
  alternatives.unshift("Ask specifically about the rent amount if you know which page it's on");
}
```

### 4. **Processing Time Estimation**
- Quick: "30 seconds - 3 minutes"  
- Background: "5-10 minutes"
- Page-specific: "30 seconds - 1 minute"

## 🔧 Configuration Options

### Timeouts
```typescript
// Configurable timeouts
const QUICK_TIMEOUT = 180000; // 3 minutes
const MAX_QUICK_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const AI_ANALYSIS_TIMEOUT = 30000; // 30 seconds
```

### Processing Priorities
```typescript
// Background jobs from Ask AI get high priority
formData.append('priority', '1'); // High priority for Ask AI requests
```

### Question Context Storage
```typescript
// Store original question with background job for reference
await this.storeUserQuestion(result.jobId, userQuestion);
```

## 📈 Benefits

### For Users
✅ **Instant Results** - Simple questions get immediate answers  
✅ **No Timeouts** - Complex documents handled properly  
✅ **Clear Communication** - Always know what's happening  
✅ **Helpful Alternatives** - Options when waiting  
✅ **Consistent Experience** - Same interface, smart processing  

### For System
✅ **Resource Optimization** - Only use background processing when needed  
✅ **Better Success Rates** - Appropriate processing for each scenario  
✅ **Reduced Server Load** - Quick processing reduces queue pressure  
✅ **User Engagement** - Immediate feedback keeps users engaged  

## 🧪 Testing Scenarios

### Test Cases

1. **Small PDF + Simple Question**
   - File: ≤5MB lease PDF
   - Question: "What's the monthly rent?"
   - Expected: Quick processing, immediate answer

2. **Large PDF + Complex Question** 
   - File: >20MB lease PDF
   - Question: "Analyze all lease clauses and terms"
   - Expected: Background processing with alternatives

3. **Medium PDF + Page Query**
   - File: 12MB lease PDF  
   - Question: "What's on page 2?"
   - Expected: Quick processing despite file size

4. **Timeout Scenario**
   - File: Complex 8MB scanned document
   - Question: "Key terms?"
   - Expected: Quick attempt → timeout → background fallback

5. **Background Job Tracking**
   - Upload large document
   - Verify job creation, status tracking, email notification

## 🚀 Deployment Checklist

- [ ] Background processing system deployed and tested
- [ ] Hybrid processor library integrated  
- [ ] Ask AI UI updated with hybrid component
- [ ] API endpoints configured
- [ ] Email notifications working
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Timeout handling tested
- [ ] User feedback messages refined

## 🎯 Success Metrics

Track these metrics to measure hybrid system effectiveness:

- **Quick Processing Success Rate** - % of files processed quickly
- **Background Processing Usage** - % requiring background processing  
- **User Satisfaction** - Feedback on response times and alternatives
- **System Resource Usage** - Impact on server load and queue times
- **Question Resolution** - % of questions answered vs. requiring follow-up

---

## 📝 Implementation Summary

This hybrid system provides a seamless experience where:

1. **Small documents and targeted questions** get instant analysis
2. **Complex documents** automatically use background processing  
3. **Users always get immediate feedback** with clear next steps
4. **Page-specific queries** work instantly regardless of file size
5. **Timeout scenarios** gracefully fall back with helpful alternatives

The system maintains the conversational flow of Ask AI while solving the timeout issues that plagued large document processing. Users get the best possible experience based on their specific use case, with clear communication throughout the process.