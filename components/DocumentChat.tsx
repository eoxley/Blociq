"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { supabase } from '@/lib/supabaseClient';
import { Send, FileText, Building2, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import AIChatDisclaimer from '@/components/ui/AIChatDisclaimer';

interface Document {
  id: string;
  file_name: string;
  type: string;
  created_at: string;
  building_id: number;
  building?: {
    name: string;
  };
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentContext?: {
    id: string;
    name: string;
    type: string;
    building_name: string;
  };
}

interface DocumentChatProps {
  buildingId?: string;
  onDocumentSelect?: (documentId: string) => void;
}

export default function DocumentChat({ buildingId, onDocumentSelect }: DocumentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();

    // Load available documents
    loadDocuments();
  }, [buildingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadDocuments = async () => {
    try {
      let query = supabase
        .from('building_documents')
        .select(`
          id,
          file_name,
          type,
          created_at,
          building_id,
          building:buildings(name)
        `)
        .order('created_at', { ascending: false });

      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading documents:', error);
        toast.error('Failed to load documents');
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !userId) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputValue,
          buildingId: buildingId,
          documentType: selectedDocumentType,
          userId: userId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        timestamp: new Date(),
        documentContext: data.document_analyzed ? {
          id: data.document_analyzed.id,
          name: data.document_analyzed.name,
          type: data.document_analyzed.type,
          building_name: data.document_analyzed.building_name
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Notify parent component if document was selected
      if (data.document_analyzed && onDocumentSelect) {
        onDocumentSelect(data.document_analyzed.id);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getDocumentTypeOptions = () => {
    const types = Array.from(new Set(documents.map(doc => doc.type).filter(Boolean)));
    return types.map(type => ({ value: type, label: type }));
  };

  const getAvailableDocuments = () => {
    let filteredDocs = documents;
    if (selectedDocumentType) {
      filteredDocs = documents.filter(doc => doc.type === selectedDocumentType);
    }
    return filteredDocs.slice(0, 5); // Show latest 5
  };

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Assistant
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ask questions about your uploaded documents
        </p>
      </CardHeader>

      {/* Document Selection */}
      <div className="px-6 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by type:</label>
          <Select
            value={selectedDocumentType}
            onChange={(e) => setSelectedDocumentType(e.target.value)}
          >
            <option value="">All documents</option>
            {getDocumentTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Available Documents */}
        {getAvailableDocuments().length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Available documents:</p>
            <div className="flex flex-wrap gap-2">
              {getAvailableDocuments().map((doc) => (
                <Badge key={doc.id} variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {doc.file_name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <CardContent className="flex-1 overflow-y-auto space-y-4 px-6">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              Ask me anything about your uploaded documents!
            </p>
            <p className="text-xs mt-2">
              Try: "Summarise this document" or "What are the key actions?"
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Document Context for Assistant Messages */}
                {message.type === 'assistant' && message.documentContext && (
                  <div className="mb-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                    <div className="flex items-center gap-2 text-xs text-blue-700">
                      <FileText className="h-3 w-3" />
                      <span className="font-medium">{message.documentContext.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {message.documentContext.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {message.documentContext.building_name}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm text-gray-600">Analysing document...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="p-6 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your documents..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("Summarize this document")}
            disabled={isLoading}
          >
            Summarise
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("What are the key actions?")}
            disabled={isLoading}
          >
            Key Actions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("What are the deadlines?")}
            disabled={isLoading}
          >
            Deadlines
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue("Who is responsible?")}
            disabled={isLoading}
          >
            Responsible Parties
          </Button>
        </div>
        <AIChatDisclaimer />
      </div>
    </div>
  );
} 