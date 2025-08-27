"use client"

import React, { useState } from 'react';
import { Brain, X, MessageSquare, Upload, Send, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAskBlocIQ } from '@/hooks/useAskBlocIQ';

interface AskBlocIQButtonProps {
  selectedMessage?: any;
  className?: string;
  buildingId?: string;
  buildingName?: string;
}

export default function AskBlocIQButton({ selectedMessage, className = "", buildingId, buildingName }: AskBlocIQButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Use the shared hook for all AskBlocIQ functionality
  const aiLogic = useAskBlocIQ({ 
    buildingId, 
    buildingName, 
    selectedMessage, 
    isPublic: false 
  });

  return (
    <>
      {/* Enhanced Floating Button with Pulsating Brain */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50 group ${className}`}
        title="Ask BlocIQ AI Assistant"
      >
        {/* Pulsating Brain Icon */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Brain className="h-8 w-8 mx-auto animate-pulse group-hover:animate-none transition-all duration-300" />
          
          {/* Pulsating Ring Effect */}
          <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse"></div>
          
          {/* Sparkle Effects */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce opacity-80"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </button>

      {/* Enhanced Modal with Full BlocIQ Functionality */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden">
            {/* Enhanced Header with Gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] opacity-10"></div>
              <div className="relative flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] rounded-2xl flex items-center justify-center shadow-lg">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    {/* Floating sparkles around the brain */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4f46e5] to-[#a855f7] bg-clip-text text-transparent">
                      Ask BlocIQ
                    </h2>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI-powered property management assistant
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Suggested Prompts */}
            {aiLogic.messages.length === 0 && (
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700 mb-3">💡 Suggested prompts:</p>
                <div className="flex flex-wrap gap-2">
                  {aiLogic.getSuggestedPrompts().slice(0, 4).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => aiLogic.handleSuggestedPrompt(prompt)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96 bg-gradient-to-b from-gray-50/50 to-white">
              {aiLogic.messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="relative mb-6">
                    <MessageSquare className="h-16 w-16 mx-auto text-gray-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] rounded-full flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">Start a conversation with BlocIQ AI</p>
                  <p className="text-sm text-gray-500">Ask questions, get insights, or analyze your documents</p>
                  {selectedMessage && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Context:</span> Email from {selectedMessage.from?.emailAddress?.address}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                aiLogic.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Action Buttons for AI Responses */}
                      {message.role === 'assistant' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => aiLogic.handleCreateLetter(message.content)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            📝 Create Letter
                          </button>
                          <button
                            onClick={() => aiLogic.handleSendEmail(message.content)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            📨 Send Email
                          </button>
                          <button
                            onClick={() => aiLogic.handleSaveAsNotice(message.content)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                          >
                            📄 Save as Notice
                          </button>
                        </div>
                      )}
                      
                      {/* Document Analysis Results */}
                      {message.role === 'assistant' && message.documentAnalysis && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                          <h4 className="font-semibold text-sm mb-2 text-gray-800">
                            📊 Document Analysis Results
                          </h4>
                          <div className="space-y-2 text-sm">
                            {message.documentAnalysis.map((analysis, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  📄 {analysis.filename}
                                </p>
                                <p className="text-xs text-gray-600 mb-2">
                                  {analysis.summary}
                                </p>
                                {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {analysis.suggestedActions.map((action: any, actionIndex: number) => (
                                      <span
                                        key={actionIndex}
                                        className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                      >
                                        {typeof action === 'string'
                                          ? action
                                          : action?.label || action?.key || JSON.stringify(action)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Suggested Action Panel */}
                      {message.role === 'assistant' && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-sm mb-2 text-blue-800">
                            💡 Suggested Actions
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toast.info('Add to To-Do feature available for BlocIQ clients')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              ✅ Add to To-Do
                            </button>
                            <button
                              onClick={() => toast.info('Add to Calendar feature available for BlocIQ clients')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              📅 Add to Calendar
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Files */}
                      {message.files && message.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.files.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span>{aiLogic.getFileIcon(file.type)}</span>
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs opacity-70">({aiLogic.formatFileSize(file.size)})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={`text-xs mt-2 opacity-70 ${message.role === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {aiLogic.isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#4f46e5] rounded-full animate-spin"></div>
                      </div>
                      <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={aiLogic.messagesEndRef} />
            </div>

            {/* Enhanced Input Form */}
            <div className="p-6 border-t border-gray-200 bg-gray-50/50">
              <form onSubmit={aiLogic.handleSubmit} className="space-y-4">
                {/* Enhanced File Upload Area */}
                {aiLogic.uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-[#4f46e5]" />
                      Uploaded Files:
                    </p>
                    <div className="space-y-2">
                      {aiLogic.uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <span className="text-sm text-gray-600 font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => aiLogic.removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced File Upload */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                    aiLogic.isDragOver 
                      ? 'border-[#4f46e5] bg-blue-50/50 shadow-lg' 
                      : 'border-gray-300 hover:border-[#4f46e5] hover:bg-blue-50/30'
                  }`}
                  onDragOver={aiLogic.handleDragOver}
                  onDragLeave={aiLogic.handleDragLeave}
                  onDrop={aiLogic.handleDrop}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <label className="text-[#4f46e5] hover:text-[#4338ca] cursor-pointer font-medium">
                      browse
                      <input
                        ref={aiLogic.fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => aiLogic.handleFileUpload(e.target.files)}
                        accept=".pdf,.doc,.docx,.txt,.jpeg,.jpg,.png,.gif,.bmp,.tiff,.webp"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">Supports PDF, Word, text, and image files</p>
                </div>

                {/* Enhanced Question Input */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <textarea
                      ref={aiLogic.inputRef}
                      value={aiLogic.question}
                      onChange={(e) => aiLogic.setQuestion(e.target.value)}
                      placeholder="Ask BlocIQ anything about your building, compliance, or upload documents..."
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent shadow-sm transition-all duration-200 resize-none"
                      rows={1}
                      disabled={aiLogic.isLoading}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    {aiLogic.question && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={aiLogic.isLoading || (!aiLogic.question.trim() && aiLogic.uploadedFiles.length === 0)}
                    className="px-8 py-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl hover:from-[#4338ca] hover:to-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                    Ask
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
