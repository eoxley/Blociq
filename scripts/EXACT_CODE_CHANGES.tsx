// 🔧 EXACT CODE CHANGES FOR components/AskBlocIQ.tsx
// Copy and paste these exact changes into your existing file

// ========================================
// 1. ADD THESE IMPORTS (after your existing imports)
// ========================================
import LeaseAnalysisMessage from './LeaseAnalysisMessage'
import { LeaseDocumentParser } from '@/lib/lease-document-parser'

// ========================================
// 2. UPDATE MESSAGE INTERFACE (find and replace your existing Message interface)
// ========================================
interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  type?: 'text' | 'document_analysis' | 'processing' | 'error';
  leaseData?: any;
  fileName?: string;
}

// ========================================
// 3. REPLACE YOUR processUploadedFiles FUNCTION WITH THIS:
// ========================================
const processUploadedFiles = async (files: UploadedFile[]) => {
  if (files.length === 0) return;

  setProcessingFiles(files.map(f => f.name));

  try {
    console.log(`📤 Uploading ${files.length} file(s):`, files.map(f => f.name));

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file.file);
    });

    if (buildingId) {
      formData.append('buildingId', buildingId.toString());
    }

    if (context) {
      formData.append('context', JSON.stringify(context));
    }

    // Add cache-busting parameters
    formData.append('processingId', `askblociq_${Date.now()}_${files[0].name}`);
    formData.append('forceReprocess', 'true');

    const response = await fetch('/api/upload-and-analyse', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Upload result:', result);

    // NEW: Check if this is a lease document
    const isLeaseDocument = files.some(file => 
      file.name.toLowerCase().includes('lease') || 
      file.name.toLowerCase().includes('tenancy')
    ) || (result.ai?.extractedText && (
      result.ai.extractedText.toLowerCase().includes('lease') ||
      result.ai.extractedText.toLowerCase().includes('lessor') ||
      result.ai.extractedText.toLowerCase().includes('lessee') ||
      result.ai.extractedText.toLowerCase().includes('tenancy')
    ));

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
      // Regular document processing (your existing logic)
      const message: Message = {
        id: `doc-${Date.now()}`,
        text: result.ai?.summary || result.ai?.extractedText?.substring(0, 500) + '...' || 'Document processed successfully',
        isBot: true,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, message]);
    }

    // Clear uploaded files
    setUploadedFiles([]);
    
  } catch (error) {
    console.error('File processing error:', error);
    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      text: `Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      isBot: true,
      timestamp: new Date(),
      type: 'error'
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setProcessingFiles([]);
  }
};

// ========================================
// 4. REPLACE YOUR MESSAGE RENDERING JSX WITH THIS:
// ========================================
{/* Find your messages.map section and replace it with this: */}
{messages.map((message) => (
  <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} mb-4`}>
    <div className={`max-w-3xl ${
      message.isBot 
        ? message.type === 'document_analysis' 
          ? '' // No background for lease analysis (has its own styling)
          : message.type === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-gray-100' 
        : 'bg-purple-600 text-white'
    } rounded-lg ${message.type === 'document_analysis' ? 'p-0' : 'p-4'}`}>
      
      {/* Handle different message types */}
      {message.type === 'document_analysis' ? (
        <LeaseAnalysisMessage
          leaseData={message.leaseData}
          fileName={message.fileName || 'Unknown Document'}
          onStartQA={() => {
            setQuestion(`I'd like to ask questions about the lease document: ${message.fileName}`)
            inputRef.current?.focus()
          }}
        />
      ) : (
        <div>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          <span className="text-xs opacity-75 block mt-2">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  </div>
))}

// ========================================
// THAT'S ALL THE CHANGES NEEDED! 🎉
// ========================================

/*
SUMMARY OF WHAT THESE CHANGES DO:

1. ✅ Imports the LeaseClear components
2. ✅ Updates the Message interface to support lease analysis
3. ✅ Detects lease documents during file upload
4. ✅ Parses OCR text into structured lease data
5. ✅ Renders beautiful LeaseClear format in chat
6. ✅ Keeps all existing functionality for non-lease documents
7. ✅ Adds "Start Q&A" button that populates the input field

TESTING:
- Upload a lease PDF → Should show LeaseClear format
- Upload a non-lease document → Should work as before
- Click "Start Q&A" → Should populate input field
- Click "Show/Hide Details" → Should expand/collapse sections

The changes are minimal and preserve all your existing functionality!
*/
