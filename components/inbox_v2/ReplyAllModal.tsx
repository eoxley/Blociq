"use client"

import React, { useMemo, useState } from "react";
import { useTriageDraft } from "@/hooks/useTriageDraft";
import { buildReplySubject, quoteThread, composeBody, displayNameFromAddress, dedupeEmails } from "@/lib/replyUtils";
import { ReplyAll, Paperclip, Brain, Loader2, X, Send, MessageSquare } from 'lucide-react';

type ReplyAllModalProps = {
  isOpen: boolean;
  onClose: () => void;
  message: any | null;
  ownEmails?: string[]; // exclude your addresses
};

export default function ReplyAllModal({ isOpen, onClose, message, ownEmails = [] }: ReplyAllModalProps) {
  const { loading, result, error, generate, reset } = useTriageDraft();

  // Prepare email data for triage
  const emailData = useMemo(() => {
    if (!message) return null
    return {
      subject: message.subject || '',
      plainText: message.bodyPreview || message.body?.content || '',
      from: message.from?.emailAddress?.address || message.from?.emailAddress || '',
      to: message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
      cc: message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
      date: message.receivedDateTime
    }
  }, [message]);

  const initialTo = useMemo(() => {
    if (!emailData) return []
    return dedupeEmails([emailData.from, ...emailData.to], ownEmails)
  }, [emailData, ownEmails]);
  
  const initialCc = useMemo(() => {
    if (!emailData) return []
    return dedupeEmails(emailData.cc ?? [], ownEmails)
  }, [emailData, ownEmails]);

  const [to, setTo] = useState<string[]>(initialTo);
  const [cc, setCc] = useState<string[]>(initialCc);
  const [subject, setSubject] = useState(buildReplySubject(message?.subject));
  const [body, setBody] = useState<string>("");
  const [attachIds, setAttachIds] = useState<string[]>([]);
  const [suggestedAttachments, setSuggestedAttachments] = useState<any[]>([]);

  const quoted = useMemo(() => {
    if (!emailData) return ''
    return quoteThread(emailData.plainText)
  }, [emailData]);

  const handleGenerate = async () => {
    if (!emailData) {
      console.error('No email data available for AI generation')
      return
    }
    
    console.log('Starting AI generation with data:', emailData)
    
    try {
      const r = await generate(emailData)
      if (!r) {
        throw new Error('AI generation returned no result')
      }

      console.log('AI generation successful:', r)

      // Greet the primary correspondent if model didn't
      const draft = { ...r.reply }
      const primaryName = displayNameFromAddress(emailData.from)
      if (!draft.greeting?.trim().toLowerCase().startsWith("dear ")) {
        draft.greeting = `Dear ${primaryName}`
      }
      // Enforce our house sign-off
      draft.signoff = "Kind regards"

      setSubject(buildReplySubject(emailData.subject))
      setBody(composeBody(draft, quoted))

      // Pre-tick suggested attachments
      if (r.attachments_suggestions) {
        setSuggestedAttachments(r.attachments_suggestions)
        setAttachIds(r.attachments_suggestions.map(a => a.doc_id))
      }
    } catch (error: any) {
      console.error('Error generating AI reply:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Error generating AI reply. Please try again.'
      
      if (error?.message) {
        if (error.message.includes('triage failed')) {
          errorMessage = 'AI triage service unavailable. Please check your configuration.'
        } else if (error.message.includes('Failed to generate draft')) {
          errorMessage = 'AI draft generation failed. Please try again.'
        } else if (error.message.includes('No email data')) {
          errorMessage = 'No email data available for AI generation.'
        } else {
          errorMessage = `AI Generation Error: ${error.message}`
        }
      }
      
      // Show error to user (you might want to add a state for this)
      console.error('AI Generation Error:', errorMessage)
      
      // Fallback: Create a basic reply template
      try {
        const primaryName = displayNameFromAddress(emailData.from)
        const fallbackBody = `Dear ${primaryName},\n\nThank you for your email.\n\nKind regards`
        setBody(fallbackBody)
        console.log('Applied fallback reply template')
      } catch (fallbackError) {
        console.error('Fallback template also failed:', fallbackError)
      }
    }
  };

  const toggleAttachment = (doc_id: string) => {
    setAttachIds(prev => prev.includes(doc_id) ? prev.filter(x => x !== doc_id) : [...prev, doc_id]);
  };

  const handleSend = async () => {
    try {
      const response = await fetch('/api/outlook/v2/messages/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: message.id,
          to: to.filter(Boolean),
          cc: cc.filter(Boolean),
          bcc: [],
          subject: subject.trim(),
          htmlBody: body.split('\n').map(line => `<p>${line}</p>`).join('')
        })
      })
      
      if (response.ok) {
        reset()
        onClose()
      } else {
        console.error('Failed to send reply')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    }
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <ReplyAll className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold">Reply All</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {loading ? "Generating…" : "Generate with AI"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">🤖 AI Triage Results:</div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Priority {result.priority}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {result.category}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {result.label}
                </span>
              </div>
              {result.required_actions && result.required_actions.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium">Required actions:</span> {result.required_actions.join(', ')}
                </div>
              )}
            </div>
            
            {result.attachments_suggestions && result.attachments_suggestions.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-sm font-medium text-blue-800">Suggested attachments</div>
                {result.attachments_suggestions.map(att => (
                  <label key={att.doc_id} className="flex items-center justify-between rounded-md border border-blue-200 bg-white p-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{att.title}</div>
                      <div className="text-xs text-gray-500 capitalize">{att.kind.replace(/_/g, ' ')}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={attachIds.includes(att.doc_id)}
                      onChange={() => toggleAttachment(att.doc_id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-600">To</label>
          <input
            className="mt-1 w-full rounded-md border p-2 text-sm"
            value={to.join(", ")}
            onChange={e => setTo(e.target.value.split(",").map(v => v.trim()))}
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-600">Cc</label>
          <input
            className="mt-1 w-full rounded-md border p-2 text-sm"
            value={cc.join(", ")}
            onChange={e => setCc(e.target.value.split(",").map(v => v.trim()))}
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-600">Subject</label>
          <input
            className="mt-1 w-full rounded-md border p-2 text-sm"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600">Message</label>
          <textarea
            className="mt-1 h-72 w-full rounded-md border p-2 text-sm"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Your reply will appear here after AI generation..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Recipients de-duplicated; greeting and sign-off follow house style.
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              onClick={handleSend}
              disabled={!body.trim()}
              className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
