"use client";

import { useState } from 'react';
import { X, Loader2, Tag, FolderOpen } from 'lucide-react';
import TriageIcon from '@/components/icons/TriageIcon';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TriageResult {
  emailId: string;
  subject: string;
  tag: string;
  category: string;
}

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreadEmails: any[];
  onTriageComplete?: (results: any) => void;
}

export default function TriageModal({ isOpen, onClose, unreadEmails, onTriageComplete }: TriageModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [triageData, setTriageData] = useState<any>(null);

  const handleRunTriage = async () => {
    if (unreadEmails.length === 0) {
      toast.error('No emails to triage');
      return;
    }

    setIsRunning(true);
    setResults(null);
    setTriageData(null);

    try {
      toast.loading('Running AI triage on emails...');

      // Call the comprehensive triage API
      const response = await fetch('/api/triage-inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run triage');
      }

      const data = await response.json();
      setTriageData(data);
      setResults(data.draft_emails);
      
      // Notify parent component
      onTriageComplete?.(data);
      
      toast.success(`${data.summary} – ${data.drafts_ready} drafts, ${data.urgent_count} urgent`);
    } catch (error) {
      console.error('Error running triage:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run AI triage');
    } finally {
      setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                     <div className="flex items-center gap-3">
             <TriageIcon className="w-8 h-8" />
             <h2 className="text-xl font-semibold text-gray-900">AI Triage This Inbox</h2>
           </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!triageData ? (
            <>
                        <div className="text-gray-600">
            <p>AI will analyze {unreadEmails.length} emails and:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>📊 Summarise inbox and categorize emails</li>
                  <li>🔥 Mark urgent emails automatically</li>
                  <li>📝 Generate draft replies for actionable emails</li>
                  <li>🗂️ Suggest AI folders and tags</li>
                  <li>⚡ Recommend actions (notes, events, todos)</li>
                </ul>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleRunTriage}
                  disabled={isRunning || unreadEmails.length === 0}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Triage...
                    </>
                  ) : (
                    <>
                      <Tag className="h-4 w-4 mr-2" />
                      Run Triage Now
                    </>
                  )}
                </Button>
              </div>

              {/* Empty State */}
              {unreadEmails.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No unread emails to triage</p>
                </div>
              )}
            </>
          ) : (
            /* Triage Results */
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">📊 Triage Summary</h3>
                <p className="text-blue-700">{triageData.summary}</p>
              </div>

              {/* Suggested Tags/Folders */}
              {triageData.suggested_tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">🗂️ Suggested Folders</h3>
                  <div className="flex flex-wrap gap-2">
                    {triageData.suggested_tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                      >
                        <FolderOpen className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft Emails */}
              {triageData.draft_emails.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">📝 Draft Replies ({triageData.draft_emails.length})</h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {triageData.draft_emails.map((draft: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-800">
                            {draft.category}
                          </span>
                          <span className="text-xs text-green-600">
                            {Math.round(draft.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-green-700 line-clamp-2">
                          {draft.draft.substring(0, 150)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {triageData.suggested_actions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">⚡ Suggested Actions</h3>
                  <div className="space-y-2">
                    {triageData.suggested_actions.map((action: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <div className="flex-shrink-0">
                          {action.type === 'event' && <span className="text-orange-600">📅</span>}
                          {action.type === 'note' && <span className="text-orange-600">📝</span>}
                          {action.type === 'todo' && <span className="text-orange-600">✅</span>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-800">
                            {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                          </p>
                          <p className="text-sm text-orange-700">{action.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Urgent Emails */}
              {triageData.urgent_ids.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">🔥 Urgent Emails ({triageData.urgent_ids.length})</h3>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      {triageData.urgent_ids.length} email{triageData.urgent_ids.length > 1 ? 's' : ''} marked as urgent and require immediate attention.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRunning}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 