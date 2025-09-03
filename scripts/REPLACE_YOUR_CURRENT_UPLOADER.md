# 🔄 Replace Your Current Document Uploader

## **Quick Integration Guide**

### **Step 1: Find Your Current Upload Component**
Look for files that handle document uploads, typically containing:
- File input elements
- OCR text display
- Basic document results

Common locations:
- `components/DocumentUploader.tsx`
- `components/FileUpload.tsx` 
- `app/upload/page.tsx`
- `components/AskBlocIQ.tsx` (file upload sections)

### **Step 2: Simple Replacement**

**Replace this pattern:**
```jsx
// OLD: Basic document uploader
import { useState } from 'react';

export default function DocumentUploader() {
  const [results, setResults] = useState(null);
  
  const handleUpload = async (file) => {
    const response = await fetch('/api/upload-and-analyse', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    
    // PROBLEM: Raw OCR display
    setResults(result.ai.extractedText);
  };
  
  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {results && <pre>{results}</pre>}
    </div>
  );
}
```

**With this:**
```jsx
// NEW: Professional LeaseClear uploader
import LeaseClearDocumentUploader from '@/components/LeaseClearDocumentUploader';

export default function DocumentUploader() {
  return (
    <LeaseClearDocumentUploader 
      buildingId="optional-building-id"
      onUploadComplete={(result) => {
        console.log('✅ Lease analysis complete:', result);
      }}
      className="my-custom-styles"
    />
  );
}
```

### **Step 3: Page-Level Integration**

**For full pages (e.g., `/upload` route):**
```jsx
// app/upload/page.tsx
import LeaseClearDocumentUploader from '@/components/LeaseClearDocumentUploader';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Lease Document Analysis</h1>
      <LeaseClearDocumentUploader />
    </div>
  );
}
```

### **Step 4: Integration with Existing Components**

**If you have existing upload logic you want to keep:**
```jsx
import { LeaseDocumentParser } from '@/lib/lease-document-parser';
import LeaseAnalysisReport from '@/components/LeaseAnalysisReport';

const YourExistingComponent = () => {
  const [leaseResults, setLeaseResults] = useState(null);
  
  const handleYourExistingUpload = async (file) => {
    // Your existing upload logic...
    const response = await fetch('/api/your-endpoint', { ... });
    const result = await response.json();
    
    // NEW: Transform to LeaseClear format
    let leaseAnalysis;
    
    if (result.leaseAnalysis) {
      // Use structured analysis if available
      leaseAnalysis = result.leaseAnalysis;
    } else if (result.ai?.extractedText) {
      // Parse raw OCR text
      const parser = new LeaseDocumentParser(result.ai.extractedText, file.name);
      leaseAnalysis = parser.parse();
    }
    
    setLeaseResults(leaseAnalysis);
  };
  
  return (
    <div>
      {/* Your existing upload UI */}
      
      {/* NEW: Professional results display */}
      {leaseResults && (
        <LeaseAnalysisReport 
          leaseData={leaseResults}
          fileName={file.name}
        />
      )}
    </div>
  );
};
```

## **Common Integration Patterns**

### **Pattern 1: Complete Replacement**
```jsx
// Before
<YourOldUploader />

// After  
<LeaseClearDocumentUploader />
```

### **Pattern 2: Conditional Display**
```jsx
const [showLeaseClear, setShowLeaseClear] = useState(false);

return (
  <div>
    <button onClick={() => setShowLeaseClear(!showLeaseClear)}>
      {showLeaseClear ? 'Basic Upload' : 'LeaseClear Analysis'}
    </button>
    
    {showLeaseClear ? (
      <LeaseClearDocumentUploader />
    ) : (
      <YourExistingUploader />
    )}
  </div>
);
```

### **Pattern 3: Modal Integration**
```jsx
const [showLeaseModal, setShowLeaseModal] = useState(false);

return (
  <div>
    <button onClick={() => setShowLeaseModal(true)}>
      Analyze Lease Document
    </button>
    
    {showLeaseModal && (
      <div className="modal">
        <LeaseClearDocumentUploader 
          onUploadComplete={() => setShowLeaseModal(false)}
        />
      </div>
    )}
  </div>
);
```

## **Key Benefits of This Replacement**

### **Before (Your Current System):**
- ❌ Raw OCR text display
- ❌ "Holloway Road" caching issues  
- ❌ Basic, unstructured output
- ❌ No professional formatting

### **After (LeaseClear System):**
- ✅ Professional tabbed interface
- ✅ Cache-busting prevents document mix-ups
- ✅ Structured lease analysis
- ✅ Beautiful LeaseClear formatting
- ✅ Confidence scores and quality metrics
- ✅ Legal clause references
- ✅ Comprehensive error handling

## **Testing Your Integration**

1. **Replace your current uploader** with `LeaseClearDocumentUploader`
2. **Deploy the changes**
3. **Upload your "Selhurst Close" PDF**
4. **Verify you see**:
   - ✅ Professional LeaseClear header
   - ✅ Tabbed navigation (Summary, Details, Financial, etc.)
   - ✅ Correct property address (not "Holloway Road")
   - ✅ Structured sections with icons
   - ✅ Legal disclaimer footer

## **Troubleshooting**

### **If you still see "Holloway Road" results:**
1. **Check browser cache** - Hard refresh (Ctrl+Shift+R)
2. **Verify state clearing** - Look for console log: "🗑️ Clearing previous results"
3. **Check processing ID** - Each upload should have unique ID in logs
4. **Clear localStorage** - `localStorage.clear()` in browser console

### **If results don't show:**
1. **Check console logs** for errors
2. **Verify LeaseAnalysisReport import** is correct
3. **Check API response** - should include `leaseAnalysis` field
4. **Test with simple PDF** first

This replacement will transform your basic OCR output into the professional, structured LeaseClear format while completely eliminating the caching issues! 🎉
