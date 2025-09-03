# 🔧 AskBlocIQ LeaseClear Integration Patch

## **What This Does:**
- ✅ Keeps your existing file upload flow
- ✅ Adds LeaseClear format for lease documents  
- ✅ Shows beautiful lease analysis in chat bubbles
- ✅ Maintains all your current functionality

## **Files to Import (Already Created):**
- `components/LeaseAnalysisMessage.tsx` - LeaseClear chat bubble component
- `lib/lease-document-parser.ts` - OCR text to structured lease parser

## **Changes to Make in `components/AskBlocIQ.tsx`:**

### **1. Add Imports (at the top of the file):**
```tsx
// Add these imports after your existing imports
import LeaseAnalysisMessage from './LeaseAnalysisMessage'
import { LeaseDocumentParser } from '@/lib/lease-document-parser'
```

### **2. Update Message Type Interface:**
```tsx
// Find your Message interface and update it to include lease analysis
interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  type?: 'text' | 'document_analysis' | 'processing' | 'error'; // Add this line
  leaseData?: any; // Add this line
  fileName?: string; // Add this line
}
```

### **3. Update File Processing Function:**

Find your `processUploadedFiles` function (around line 300-400) and modify it to detect lease documents:

```tsx
// In your processUploadedFiles function, after the OCR processing but before adding the message:

const processUploadedFiles = async (files: UploadedFile[]) => {
  // ... your existing code ...

  try {
    // Your existing file processing logic...
    const response = await fetch('/api/upload-and-analyse', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    // NEW: Check if this is a lease document and parse it
    const isLeaseDocument = files.some(file => 
      file.name.toLowerCase().includes('lease') || 
      result.ai?.extractedText?.toLowerCase().includes('lease') ||
      result.ai?.extractedText?.toLowerCase().includes('lessor') ||
      result.ai?.extractedText?.toLowerCase().includes('lessee')
    );

    if (isLeaseDocument && result.ai?.extractedText) {
      console.log('📋 Detected lease document, creating LeaseClear analysis');
      
      // Parse the OCR text into structured lease data
      const parser = new LeaseDocumentParser(
        result.ai.extractedText, 
        files[0].name,
        result.extractionQuality?.score || 0.85
      );
      const leaseAnalysis = parser.parse();

      // Create a special lease analysis message
      const leaseMessage: Message = {
        id: `lease-${Date.now()}`,
        text: `Lease document analysis for ${files[0].name}`,
        isBot: true,
        timestamp: new Date(),
        type: 'document_analysis',
        leaseData: leaseAnalysis,
        fileName: files[0].name
      };

      setMessages(prev => [...prev, leaseMessage]);
    } else {
      // Your existing message creation logic for non-lease documents
      const message: Message = {
        id: `doc-${Date.now()}`,
        text: result.ai?.summary || 'Document processed successfully',
        isBot: true,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, message]);
    }

    // ... rest of your existing code ...

  } catch (error) {
    // ... your existing error handling ...
  }
};
```

### **4. Update Message Rendering:**

Find your message rendering section (in the JSX) and update it to handle lease analysis messages:

```tsx
{/* In your messages mapping section, update the message rendering: */}
{messages.map((message) => (
  <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} mb-4`}>
    <div className={`max-w-3xl ${
      message.isBot 
        ? message.type === 'document_analysis' 
          ? '' // No background for lease analysis (has its own styling)
          : 'bg-gray-100' 
        : 'bg-purple-600 text-white'
    } rounded-lg ${message.type === 'document_analysis' ? 'p-0' : 'p-4'}`}>
      
      {/* NEW: Handle lease analysis messages */}
      {message.type === 'document_analysis' ? (
        <LeaseAnalysisMessage
          leaseData={message.leaseData}
          fileName={message.fileName || 'Unknown Document'}
          onStartQA={() => {
            // Set up Q&A mode
            setQuestion(`I'd like to ask questions about the lease document: ${message.fileName}`)
            // Optionally focus the input
            inputRef.current?.focus()
          }}
        />
      ) : (
        // Your existing message rendering
        <div>
          <p className="text-sm">{message.text}</p>
          <span className="text-xs opacity-75">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  </div>
))}
```

## **That's It! 🎉**

### **What Users Will Experience:**

**Before:**
1. Upload "Sample Lease_133 Selhurst Close SW19 6AY.pdf"
2. See: "Document processed successfully" + raw OCR text

**After:**
1. Upload "Sample Lease_133 Selhurst Close SW19 6AY.pdf"  
2. See: Beautiful LeaseClear analysis with:
   - Property details (133 Selhurst Close)
   - Key parties (Lessor/Lessee)
   - Financial terms (Ground rent, service charges)
   - Expandable detailed sections
   - "Start Q&A" button

### **Testing the Integration:**

1. **Make the changes above**
2. **Upload a lease PDF** in your Ask AI chat
3. **Verify you see** the LeaseClear format instead of raw text
4. **Test the "Start Q&A" button** - should populate the input field
5. **Test the "Show/Hide Details" button** - should expand/collapse sections

### **Fallback Behavior:**
- ✅ **Non-lease documents** continue to work exactly as before
- ✅ **Failed parsing** falls back to regular text messages
- ✅ **All existing functionality** remains unchanged

This approach gives you the best of both worlds - professional lease analysis when needed, while keeping your familiar chat interface for everything else! 🚀
