"use client";
import { useState } from "react";
import { toast } from "sonner";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { Sparkles, Send, X } from "lucide-react";

interface AIResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResponseGenerated: (response: string) => void;
  originalEmail: {
    subject: string | null;
    body_full: string | null;
    body_preview: string | null;
    buildings?: { name: string } | null;
    tags: string[] | null;
  };
  mode: "reply" | "replyAll" | "forward";
}

export default function AIResponseModal({ 
  isOpen, 
  onClose, 
  onResponseGenerated, 
  originalEmail,
  mode 
}: AIResponseModalProps) {
  const [userRequest, setUserRequest] = useState("");
  const [generating, setGenerating] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
  }>>([]);

  const generateAIResponse = async () => {
    if (!userRequest.trim()) {
      toast.error("Please enter your request");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate-email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          emailId: null, // We're not using emailId for this
          subject: originalEmail.subject,
          body: originalEmail.body_full || originalEmail.body_preview,
          buildingContext: originalEmail.buildings?.name,
          tags: originalEmail.tags || [],
          userRequest: userRequest,
          conversationHistory: conversationHistory,
          mode: mode
        }),
      });
      
      if (res.ok) {
        const { draft } = await res.json();
        
        // Add to conversation history
        const newHistory = [
          ...conversationHistory,
          { role: 'user' as const, content: userRequest },
          { role: 'assistant' as const, content: draft }
        ];
        setConversationHistory(newHistory);
        
        // Pass the response back to parent
        onResponseGenerated(draft);
        setUserRequest("");
        toast.success("AI response generated successfully");
      } else {
        toast.error("Failed to generate AI response");
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      toast.error("Failed to generate AI response");
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateAIResponse();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              AI Email Assistant
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Original Email Context */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Original Email Context:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Subject:</strong> {originalEmail.subject}</p>
            <p><strong>Building:</strong> {originalEmail.buildings?.name || 'N/A'}</p>
            <p><strong>Tags:</strong> {originalEmail.tags?.join(', ') || 'None'}</p>
            <p><strong>Mode:</strong> {mode.charAt(0).toUpperCase() + mode.slice(1)}</p>
          </div>
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mb-6 max-h-40 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Conversation History:</h3>
            <div className="space-y-2">
              {conversationHistory.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-sm ${
                    message.role === 'user' 
                      ? 'bg-blue-50 text-blue-900 ml-4' 
                      : 'bg-gray-50 text-gray-900 mr-4'
                  }`}
                >
                  <div className="font-medium mb-1">
                    {message.role === 'user' ? 'You:' : 'AI:'}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like me to help you with?
            </label>
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 'Write a professional reply', 'Make it more urgent', 'Add a follow-up question', 'Make it more formal'..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors resize-none overflow-y-auto"
              style={{ minHeight: '120px' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </div>
            <BlocIQButton
              onClick={generateAIResponse}
              disabled={generating || !userRequest.trim()}
              className="flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Response
                </>
              )}
            </BlocIQButton>
          </div>
        </div>

        {/* Quick Suggestions */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Suggestions:</h3>
          <div className="flex flex-wrap gap-2">
            {[
              "Write a professional reply",
              "Make it more urgent",
              "Add a follow-up question",
              "Make it more formal",
              "Include next steps",
              "Ask for clarification"
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setUserRequest(suggestion)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 