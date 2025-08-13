'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Upload, X, MessageSquare, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAIConversation } from '@/hooks/useAIConversation';
import UploadDropzone from '@/components/ask/UploadDropzone';
import { AskResultCard } from '@/components/ask/AskResultCard';

interface UserData {
  name: string;
  email: string;
}

interface AIAssistantClientProps {
  userData: UserData;
}

export default function AIAssistantClient({ userData }: AIAssistantClientProps) {
  const {
    messages,
    conversationId,
    useMemory,
    isLoading,
    memoryContext,
    sendMessage,
    startNewThread,
    setUseMemory,
    clearMessages
  } = useAIConversation();

  const [inputValue, setInputValue] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a message or upload a file');
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(userMessage, uploadedFiles);
      
      // Clear uploaded files after successful send
      if (uploadedFiles.length > 0) {
        setUploadedFiles([]);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    }
  };

  const handleNewThread = () => {
    startNewThread();
    clearMessages();
    toast.success('Started new conversation thread');
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${newFiles.length} file(s)`);
  };

  const handleUploadResult = (result: any) => {
    setUploadResult(result);
    toast.success('Document analyzed successfully!');
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask Blociq</h1>
          <p className="text-gray-600">Your intelligent property management assistant with memory</p>
        </div>

        {/* Memory Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={useMemory}
                  onChange={(e) => setUseMemory(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Use previous messages
                </span>
              </label>
              
              {memoryContext && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <MessageSquare className="w-4 h-4" />
                  <span>Context: {memoryContext.recentTurns} turns, {memoryContext.factsUsed} facts</span>
                </div>
              )}
            </div>
            
            <button
              onClick={handleNewThread}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>New Thread</span>
            </button>
          </div>
        </div>

        {/* Document Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Document for Analysis</h3>
            <p className="text-sm text-gray-600">
              Drag and drop any document to get an AI-powered summary and suggested actions
            </p>
          </div>
          <UploadDropzone onResult={handleUploadResult} defaultBuildingId={null} />
        </div>

        {/* Upload Results */}
        {uploadResult && (
          <AskResultCard data={uploadResult} />
        )}

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
            {conversationId && (
              <p className="text-sm text-gray-500 mt-1">
                Thread ID: {conversationId.slice(0, 8)}...
              </p>
            )}
          </div>
          
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Start a conversation with Blociq</p>
                <p className="text-sm">Ask about property management, upload documents, or get help with notices</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* File Upload Area */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded Files</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
            
            <div className="flex space-x-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Blociq anything about property management..."
                className="flex-1 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                disabled={isLoading}
              />
              
              <button
                type="submit"
                disabled={isLoading || (!inputValue.trim() && uploadedFiles.length === 0)}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>Blociq provides guidance, not legal advice. Always consult professionals for legal matters.</p>
        </div>
      </div>
    </div>
  );
}
