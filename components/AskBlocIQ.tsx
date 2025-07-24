"use client";

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Calendar, Loader2 } from 'lucide-react';

type SuggestedAction = {
  type: 'todo';
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  description?: string;
};

type DocumentSearchResult = {
  id: string;
  title: string;
  summary: string;
  doc_url: string;
  uploaded_at: string;
  expiry_date?: string;
};

type AIResponse = {
  success: boolean;
  response: string;
  documentSearch?: boolean;
  documents?: DocumentSearchResult[];
  suggested_action?: SuggestedAction;
};

interface AskBlocIQProps {
  buildingId?: string;
  buildingName?: string;
  context?: string;
  placeholder?: string;
  className?: string;
}

export default function AskBlocIQ({ 
  buildingId, 
  buildingName,
  context, 
  placeholder = "Ask BlocIQ anything...",
  className = ""
}: AskBlocIQProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [suggestedAction, setSuggestedAction] = useState<SuggestedAction | null>(null);
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([]);
  const [isDocumentSearch, setIsDocumentSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingToTodo, setAddingToTodo] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setAnswer('Please enter a question.');
      return;
    }
    if (!userId) {
      setAnswer('User not authenticated. Please log in.');
      return;
    }

    setLoading(true);
    setSuggestedAction(null); // Clear previous suggestions
    setDocumentResults([]); // Clear previous document results
    setIsDocumentSearch(false); // Reset document search flag
    
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: question,
          building_id: buildingId, // Note: API expects building_id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      if (data.success && data.response) {
        setAnswer(data.response);
        
        // Handle document search results
        if (data.documentSearch && data.documents) {
          setIsDocumentSearch(true);
          setDocumentResults(data.documents);
        }
        
        // Check if there's a suggested action
        if (data.suggested_action) {
          setSuggestedAction(data.suggested_action);
        }

        // Log the interaction to ai_logs
        try {
          await supabase
            .from('ai_logs')
            .insert({
              user_id: userId,
              question: question,
              response: data.response,
              timestamp: new Date().toISOString(),
              building_id: buildingId,
              document_search: data.documentSearch || false,
              documents_found: data.documents?.length || 0
            });
        } catch (logError) {
          console.error('Failed to log AI interaction:', logError);
        }
      } else {
        setAnswer('Error: No response from AI service');
      }
    } catch (error) {
      setAnswer('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTodo = async () => {
    if (!suggestedAction || !buildingId) return;
    
    setAddingToTodo(true);
    try {
      const response = await fetch('/api/create-task-from-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestedAction,
          buildingId: parseInt(buildingId)
        }),
      });

      if (response.ok) {
        setSuggestedAction(null); // Hide the suggestion after adding
        setAnswer(prev => prev + '\n\n✅ Task added to your building to-do list!');
      } else {
        console.error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setAddingToTodo(false);
    }
  };

  const handleAddToOutlook = async () => {
    if (!suggestedAction) return;
    
    setAddingToCalendar(true);
    try {
      const response = await fetch('/api/add-to-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: suggestedAction.title,
          date: suggestedAction.due_date,
          building: buildingName || 'Building'
        }),
      });

      if (response.ok) {
        setSuggestedAction(null); // Hide the suggestion after adding
        setAnswer(prev => prev + '\n\n📅 Event added to your Outlook calendar!');
      } else {
        console.error('Failed to add to calendar');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
    } finally {
      setAddingToCalendar(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {answer && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-semibold mb-2">AI Response:</h3>
          <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 pr-2">
            <p className="text-gray-700 whitespace-pre-wrap break-words">{answer}</p>
          </div>
        </div>
      )}

      {/* Document Search Results */}
      {isDocumentSearch && documentResults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            📄 Found Documents
          </h3>
          <div className="space-y-3">
            {documentResults.map((doc, index) => (
              <div key={doc.id} className="bg-white p-3 rounded-md border border-blue-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{doc.title}</h4>
                    {doc.summary && (
                      <p className="text-sm text-gray-600 mb-2">{doc.summary}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📅 Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}</span>
                      {doc.expiry_date && (
                        <span>⏰ Expires: {new Date(doc.expiry_date).toLocaleDateString('en-GB')}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={doc.doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    📎 View PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
          {buildingId && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <a
                href={`/buildings/${buildingId}/compliance`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                🔗 View All in Compliance Tracker →
              </a>
            </div>
          )}
        </div>
      )}

      {/* No Documents Found - Upload Prompt */}
      {isDocumentSearch && documentResults.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <h3 className="font-semibold text-yellow-800 mb-2">📄 Document Not Found</h3>
          <p className="text-yellow-700 mb-3">
            I couldn't find that document. Would you like to upload one now?
          </p>
          <button
            onClick={() => {
              // TODO: Open UploadComplianceModal
              setAnswer(prev => prev + '\n\n💡 Tip: You can upload compliance documents using the Upload button in the compliance tracker.');
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-2"
          >
            📤 Upload Document
          </button>
        </div>
      )}

      {/* Suggested Action Panel */}
      {suggestedAction && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-1">🧠 BlocIQ Suggests:</h3>
            <p className="text-gray-700 mb-3">{suggestedAction.title}</p>
            {suggestedAction.description && (
              <p className="text-sm text-gray-600 mb-3">{suggestedAction.description}</p>
            )}
            {suggestedAction.due_date && (
              <p className="text-sm text-gray-600 mb-3">
                📅 Due: {new Date(suggestedAction.due_date).toLocaleDateString()}
              </p>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={handleAddToTodo}
                disabled={addingToTodo}
                className="flex items-center gap-2"
              >
                {addingToTodo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {addingToTodo ? 'Adding...' : 'Add to To-Do'}
              </Button>
              <Button 
                onClick={handleAddToOutlook}
                disabled={addingToCalendar}
                variant="outline"
                className="flex items-center gap-2"
              >
                {addingToCalendar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {addingToCalendar ? 'Adding...' : 'Add to Outlook Calendar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 