'use client'

import { useState } from 'react'
import { X, AlertTriangle, Clock, CheckCircle, MessageSquare, Bot, Loader2 } from 'lucide-react'
import { useSession } from '@/hooks/useSession'

interface TriageButtonProps {
  className?: string
}

interface ProgressState {
  step: string
  done?: boolean
  link?: string
}

export default function TriageButton({ className = "" }: TriageButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const { data: session, status } = useSession()
  const disabled = status !== "authenticated"

  const triageOptions = [
    { id: 'urgent', label: 'Mark as Urgent', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'follow-up', label: 'Follow Up Later', icon: Clock, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { id: 'resolved', label: 'Mark as Resolved', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'archive', label: 'Archive', icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  ]

  const handleTriage = (optionId: string) => {
    console.log(`Triage action: ${optionId}`)
    // TODO: Implement actual triage logic
    setIsOpen(false)
  }

  const runAITriage = async () => {
    setProgress({ step: "Planning…" });
    
    try {
      const start = await fetch("/api/triage/start", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ 
          batchSize: 10, 
          dryRun: false, 
          inbox_user_id: session?.user?.id 
        })
      }).then(r=>r.json());

      if (start.error) {
        throw new Error(start.error);
      }

      setProgress({ step: `Applying to ${start.planned} emails…` });
      let applied = 0, failed = 0;

      while (applied + failed < start.planned) {
        const res = await fetch("/api/triage/apply", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ 
            run_id: start.run_id, 
            limit: 10, 
            inbox_user_id: session?.user?.id 
          })
        }).then(r=>r.json());
        
        applied += res.applied || 0;
        failed  += res.failed  || 0;

        const s = await fetch(`/api/triage/status?run_id=${start.run_id}`).then(r=>r.json());
        setProgress({ 
          step: `Progress: ${applied}/${start.planned} (failed ${failed})`, 
          link: s.run?.id 
        });
        
        if (applied + failed >= start.planned) break;
        await new Promise(r => setTimeout(r, 600)); // gentle pacing
      }

      setProgress({ step: `Done: ${applied}/${start.planned} applied`, done: true });
    } catch (error) {
      console.error('AI Triage failed:', error);
      setProgress({ step: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, done: true });
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-red-400 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={disabled ? "Connect Outlook to enable AI triage" : "AI Triage Options"}
      >
        <AlertTriangle className="h-4 w-4 text-red-600" />
        Triage
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">AI Triage Options</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {triageOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    onClick={() => handleTriage(option.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${option.bgColor} hover:brightness-95`}
                  >
                    <Icon className={`h-5 w-5 ${option.color}`} />
                    <span className={`font-medium ${option.color}`}>{option.label}</span>
                  </button>
                )
              })}
            </div>

            {/* AI Triage Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={runAITriage}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium transition-all duration-200 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
              >
                <Bot className="h-5 w-5" />
                Run AI Triage
              </button>
              <p className="text-sm text-gray-500 text-center mt-2">
                {disabled 
                  ? "Connect your Outlook account to enable AI triage functionality."
                  : "AI triage runs in small batches. We'll tag and flag emails and create draft replies in Outlook. Nothing is moved or sent automatically."
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {progress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">AI Triage Progress</h2>
              {progress.done && (
                <button
                  onClick={() => setProgress(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {!progress.done ? (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
                <span className="text-gray-700">{progress.step}</span>
              </div>

              {progress.done && !progress.step.includes('Error') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    AI triage completed successfully! Check your Outlook for categorized emails and draft replies.
                  </p>
                </div>
              )}

              {progress.done && progress.step.includes('Error') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    {progress.step}
                  </p>
                </div>
              )}

              {progress.done && (
                <button
                  onClick={() => setProgress(null)}
                  className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
