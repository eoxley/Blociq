'use client';
import React, { useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import AIChatDisclaimer from '@/components/ui/AIChatDisclaimer';

interface UploadDropzoneProps {
  onResult: (data: any) => void;
  defaultBuildingId?: string | null;
  className?: string;
}

export function UploadDropzone({ onResult, defaultBuildingId = null, className = "" }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [textCount, setTextCount] = useState<number>(0);
  const [showText, setShowText] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    
    // Validate file size (15MB limit)
    if (file.size > 15 * 1024 * 1024) { 
      setErr('File too large (>15MB)'); 
      return; 
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/csv',
      'text/html'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|txt|csv|html|htm)$/i)) {
      setErr('Unsupported file type. Please upload PDF, DOCX, DOC, TXT, CSV, or HTML files.');
      return;
    }
    
    setBusy(true);
    setErr(null);
    setUploadedFile(file);
    
    try {
      const fd = new FormData();
      fd.set('file', file);
      if (defaultBuildingId) fd.set('building_id', defaultBuildingId);
      
      const res = await fetch('/api/ask-ai/upload', { method: 'POST', body: fd });
      const result = await res.json();
      
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || 'Upload failed');
      }
      
      // ✅ Log the extracted text info
      console.log('🔍 Upload response data:', result);
      console.log(`📊 Text Length: ${result.textLength}`);
      console.log(`📄 Has extractedText: ${!!result.extractedText}`);
      
      if (result.extractedText && result.extractedText.length > 0) {
        console.log(`📝 First 200 characters:`);
        console.log(`"${result.extractedText.substring(0, 200)}..."`);
        
        // Show in UI
        setExtractedText(result.extractedText);
        setTextCount(result.textLength);
      } else {
        console.log('❌ No extracted text received');
      }
      
      onResult(result);
      setUploadedFile(null);
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setErr(null);
    setExtractedText('');
    setTextCount(0);
    setShowText(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
      dragging ? 'bg-blue-50 border-blue-300' : 'border-gray-300'
    } ${className}`}>
      <input 
        ref={inputRef} 
        type="file" 
        className="hidden" 
        accept=".pdf,.docx,.doc,.txt,.csv,.html,.htm"
        onChange={e => onFiles(e.target.files)} 
      />
      
      {!uploadedFile ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
          className="cursor-pointer"
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="mb-3 font-medium text-gray-700">Drag & drop a document here</p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <button 
            onClick={() => inputRef.current?.click()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Choose file
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Supports PDF, DOCX, DOC, TXT, CSV, HTML (max 15MB)
          </p>
        </div>
      ) : (
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <p className="font-medium text-gray-700 mb-2">{uploadedFile.name}</p>
          <p className="text-sm text-gray-500 mb-4">
            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
          {busy && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Processing...</span>
            </div>
          )}
          {!busy && (
            <button 
              onClick={removeFile}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Remove file
            </button>
          )}
        </div>
      )}
      
      {/* Extracted Text Display */}
      {textCount > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-info text-center">
            <div className="text-green-700 font-medium mb-2">
              ✅ Text extracted: {textCount.toLocaleString()} characters
            </div>
            <button 
              onClick={() => setShowText(!showText)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {showText ? 'Hide' : 'Show'} Extracted Text
            </button>
          </div>
        </div>
      )}

      {showText && extractedText && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Extracted Text Content:</h3>
          <div className="extracted-text">
            <pre 
              className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-80 p-3 bg-white rounded border"
              style={{fontFamily: 'ui-monospace, SFMono-Regular, monospace'}}
            >
              {extractedText}
            </pre>
          </div>
        </div>
      )}
      
      {err && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{err}</span>
          </div>
        </div>
      )}
      
      <AIChatDisclaimer />
    </div>
  );
}
