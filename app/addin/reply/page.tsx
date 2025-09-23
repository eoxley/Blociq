'use client';

import { useEffect, useState, Suspense } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { ToastManager, useToasts } from '@/components/addin/Toast';
import { EnrichmentResult } from '@/app/api/outlook/enrich/route';
import { ToneLabel, detectTone } from '@/lib/addin/tone';
import { DraftResult } from '@/app/api/outlook/draft/route';
import { ParseResult } from '@/app/api/outlook/followups/parse/route';

interface FollowupSuggestion {
  matchedText: string;
  dueAtISO: string;
  humanLabel: string;
  buildingName: string;
  buildingId: string;
  unitId?: string;
  leaseholderId?: string;
  subject: string;
}

function GenerateReplyContent() {
  const [step, setStep] = useState<'loading' | 'context' | 'tone' | 'draft' | 'ready'>('loading');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [officeReady, setOfficeReady] = useState(false);

  // Context and enrichment
  const [enrichment, setEnrichment] = useState<EnrichmentResult | null>(null);
  const [detectedTone, setDetectedTone] = useState<ToneLabel>('neutral');
  const [selectedTone, setSelectedTone] = useState<ToneLabel>('neutral');

  // Draft and editing
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [editedDraft, setEditedDraft] = useState('');

  // Follow-up management
  const [followupSuggestion, setFollowupSuggestion] = useState<FollowupSuggestion | null>(null);
  const [pendingFollowup, setPendingFollowup] = useState<FollowupSuggestion | null>(null);
  const [isCreatingFollowup, setIsCreatingFollowup] = useState(false);

  // Email context for name extraction
  const [rawEmailBody, setRawEmailBody] = useState<string>('');
  const [senderDisplayName, setSenderDisplayName] = useState<string>('');

  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const { toasts, removeToast, showSuccess, showError } = useToasts();

  useEffect(() => {
    const checkOffice = () => {
      if (typeof window !== 'undefined' && (window as any).Office) {
        (window as any).Office.onReady((info: any) => {
          console.log('Office.js ready, host:', info.host);
          setOfficeReady(true);

          // Register send event handler
          registerSendHandler();

          if (mode === 'generating') {
            generateReplyFromEmail();
          }
        });
      } else {
        setTimeout(checkOffice, 100);
      }
    };

    checkOffice();
  }, [mode]);

  const registerSendHandler = () => {
    try {
      const Office = (window as any).Office;
      if (Office?.context?.mailbox?.item) {
        Office.context.mailbox.item.addHandlerAsync(
          Office.EventType.ItemSend,
          handleEmailSend
        );
      }
    } catch (error) {
      console.warn('Could not register send handler:', error);
    }
  };

  const handleEmailSend = async (eventArgs: any) => {
    console.log('Email being sent, checking for pending follow-up...');

    if (pendingFollowup) {
      setIsCreatingFollowup(true);

      try {
        const response = await fetch('/api/outlook/followups/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingFollowup)
        });

        const result = await response.json();

        if (result.success) {
          showSuccess(`📩 Follow-up scheduled for ${pendingFollowup.humanLabel}`, 7000);
          setPendingFollowup(null);
        } else {
          showError('⚠️ Could not schedule follow-up. Please create manually.', 10000);
        }
      } catch (error) {
        console.error('Error creating follow-up:', error);
        showError('⚠️ Could not schedule follow-up. Please create manually.', 10000);
      } finally {
        setIsCreatingFollowup(false);
      }
    }

    // Always call completed to allow send to proceed
    eventArgs.completed();
  };

  const generateReplyFromEmail = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError('');
    setStep('context');

    try {
      const Office = (window as any).Office;
      const item = Office?.context?.mailbox?.item;

      if (!item) {
        throw new Error('No email item found');
      }

      // Get email context - both HTML and text for name extraction
      const bodyTextResult = await new Promise<any>((resolve, reject) => {
        item.body.getAsync(Office.CoercionType.Text, (result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve(result);
          } else {
            reject(new Error(result.error.message));
          }
        });
      });

      const bodyHtmlResult = await new Promise<any>((resolve, reject) => {
        item.body.getAsync(Office.CoercionType.Html, (result: any) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve(result);
          } else {
            // If HTML fails, fallback to text
            resolve({ value: bodyTextResult.value });
          }
        });
      });

      const senderEmail = item.from ? item.from.emailAddress : '';
      const senderName = item.from ? item.from.displayName : '';
      const subject = item.subject || '';
      const bodyPreview = bodyTextResult.value || '';
      const conversationId = item.conversationId || '';

      // Store for name extraction
      setRawEmailBody(bodyHtmlResult.value || bodyTextResult.value || '');
      setSenderDisplayName(senderName || '');

      // Step 1: Enrich context
      const enrichResponse = await fetch('/api/outlook/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderEmail,
          subject,
          bodyPreview,
          conversationId
        })
      });

      if (!enrichResponse.ok) {
        throw new Error('Failed to enrich context');
      }

      const enrichResult = await enrichResponse.json();
      if (!enrichResult.success) {
        throw new Error(enrichResult.error || 'Enrichment failed');
      }

      setEnrichment(enrichResult.data);
      setStep('tone');

      // Step 2: Detect tone
      const toneResult = detectTone(bodyPreview);
      setDetectedTone(toneResult.label);
      setSelectedTone(toneResult.label);
      setStep('draft');

      // Step 3: Generate draft
      await generateDraft(enrichResult.data, toneResult.label, bodyHtmlResult.value || bodyTextResult.value, senderName);

    } catch (error) {
      console.error('Error generating reply:', error);
      setError(`Failed to generate reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStep('loading');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDraft = async (enrichmentData: EnrichmentResult, tone: ToneLabel, emailBody?: string, displayName?: string) => {
    try {
      const draftResponse = await fetch('/api/outlook/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrichment: enrichmentData,
          tone: tone,
          rawEmailBody: emailBody || rawEmailBody,
          outlookDisplayName: displayName || senderDisplayName
        })
      });

      if (!draftResponse.ok) {
        throw new Error('Failed to generate draft');
      }

      const draftResult = await draftResponse.json();
      if (!draftResult.success) {
        throw new Error(draftResult.error || 'Draft generation failed');
      }

      setDraft(draftResult.data);
      setEditedDraft(draftResult.data.bodyHtml);

      // Check for follow-up suggestions
      await checkFollowupSuggestions(draftResult.data.bodyHtml, enrichmentData);

      setStep('ready');
    } catch (error) {
      console.error('Error generating draft:', error);
      setError(`Failed to generate draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkFollowupSuggestions = async (draftText: string, enrichmentData: EnrichmentResult) => {
    try {
      const parseResponse = await fetch('/api/outlook/followups/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftText })
      });

      if (parseResponse.ok) {
        const parseResult = await parseResponse.json();
        if (parseResult.success && parseResult.data && enrichmentData.building) {
          setFollowupSuggestion({
            matchedText: parseResult.data.matchedText,
            dueAtISO: parseResult.data.dueAtISO,
            humanLabel: parseResult.data.humanLabel,
            buildingName: enrichmentData.building.name,
            buildingId: enrichmentData.building.id,
            subject: 'Email Follow-up'
          });
        }
      }
    } catch (error) {
      console.warn('Error checking follow-up suggestions:', error);
    }
  };

  const handleToneChange = async (newTone: ToneLabel) => {
    if (!enrichment || newTone === selectedTone) return;

    setSelectedTone(newTone);
    setIsGenerating(true);

    try {
      await generateDraft(enrichment, newTone);
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmFollowup = () => {
    if (followupSuggestion) {
      setPendingFollowup(followupSuggestion);
      setFollowupSuggestion(null);
    }
  };

  const insertDraft = async () => {
    if (!editedDraft) return;

    try {
      const Office = (window as any).Office;
      const item = Office?.context?.mailbox?.item;

      if (!item) {
        throw new Error('No email item found');
      }

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
          ${editedDraft.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')}
          <br>
          <div style="font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px;">
            <em>Generated by BlocIQ AI Assistant</em>
          </div>
        </div>
      `;

      await new Promise<void>((resolve, reject) => {
        item.reply.displayAsync(
          { htmlBody },
          (result: any) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error(result.error.message));
            }
          }
        );
      });

      showSuccess('✉️ Reply opened for review', 3000);

      setTimeout(() => {
        window.close();
      }, 2000);

    } catch (error) {
      console.error('Error inserting draft:', error);
      setError(`Failed to create reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderContextPreview = () => {
    if (!enrichment) return null;

    const { residentName, unitLabel, building, facts, topic } = enrichment;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">Context Found</h4>
        <div className="space-y-1 text-sm">
          <div><strong>Resident:</strong> {residentName || '(no data available)'}</div>
          <div><strong>Unit:</strong> {unitLabel || '(no data available)'}</div>
          <div><strong>Building:</strong> {building?.name || '(no data available)'}</div>
          <div><strong>Topic:</strong> <span className="capitalize">{topic}</span></div>
          {Object.keys(facts).length > 0 && (
            <div className="mt-2">
              <strong>Available Facts:</strong>
              <ul className="ml-4 list-disc">
                {Object.entries(facts).map(([key, value]) => (
                  <li key={key}>{key}: {value || '(no data available)'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderToneSelector = () => {
    const tones: Array<{ value: ToneLabel; label: string; color: string }> = [
      { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-800' },
      { value: 'concerned', label: 'Concerned', color: 'bg-yellow-100 text-yellow-800' },
      { value: 'angry', label: 'Angry', color: 'bg-orange-100 text-orange-800' },
      { value: 'abusive', label: 'Abusive', color: 'bg-red-100 text-red-800' }
    ];

    return (
      <div className="mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">
          Detected Tone: <span className="font-normal">Override if needed</span>
        </h4>
        <div className="flex gap-2 flex-wrap">
          {tones.map(tone => (
            <button
              key={tone.value}
              onClick={() => handleToneChange(tone.value)}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${
                selectedTone === tone.value
                  ? `${tone.color} border-current shadow-sm`
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {tone.label}
              {detectedTone === tone.value && ' (detected)'}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderFollowupSuggestion = () => {
    if (!followupSuggestion && !pendingFollowup) return null;

    if (pendingFollowup) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <span className="text-green-500 text-lg mr-3">✓</span>
            <div className="flex-1">
              <h4 className="font-semibold text-green-800">Follow-up Scheduled</h4>
              <p className="text-green-700 text-sm">
                {pendingFollowup.buildingName} – {pendingFollowup.humanLabel}
              </p>
              <p className="text-green-600 text-xs mt-1">
                Will be created when you send the email
                {isCreatingFollowup && ' (creating now...)'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-blue-800">Schedule Follow-up?</h4>
            <p className="text-blue-700 text-sm">
              <strong>{followupSuggestion.buildingName}</strong> – {followupSuggestion.humanLabel}
            </p>
            <p className="text-blue-600 text-xs mt-1">
              Found: "{followupSuggestion.matchedText}"
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmFollowup}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              Confirm & Create
            </button>
            <button
              onClick={() => setFollowupSuggestion(null)}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <ToastManager toasts={toasts} onRemoveToast={removeToast} />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 text-center shadow-lg">
        <h1 className="text-lg font-semibold m-0">⚡ Generate Reply</h1>
        <p className="text-xs opacity-90 mt-1 mb-0">AI-powered email response generation</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        {step === 'loading' && !error && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Ready to Generate</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              I'll analyze the current email and generate a professional reply for you.
              Click the button below to get started.
            </p>
            <button
              onClick={generateReplyFromEmail}
              disabled={!officeReady}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {officeReady ? 'Generate Reply' : 'Loading...'}
            </button>
          </div>
        )}

        {isGenerating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
            <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-blue-800 font-medium">
              {step === 'context' && 'Analyzing email context...'}
              {step === 'tone' && 'Detecting tone...'}
              {step === 'draft' && 'Generating reply...'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={generateReplyFromEmail}
                  className="mt-3 bg-red-100 text-red-800 px-4 py-2 rounded text-sm hover:bg-red-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {enrichment && step !== 'loading' && (
          <>
            {renderContextPreview()}
            {renderToneSelector()}
            {renderFollowupSuggestion()}
          </>
        )}

        {step === 'ready' && draft && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Generated Reply</h3>
              <button
                onClick={generateReplyFromEmail}
                className="text-indigo-600 text-sm hover:text-indigo-800 transition-colors"
              >
                🔄 Regenerate
              </button>
            </div>

            <textarea
              value={editedDraft}
              onChange={(e) => setEditedDraft(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-sm font-mono resize-none focus:outline-none focus:border-indigo-500"
              placeholder="Your reply will appear here..."
            />

            <div className="flex gap-3">
              <button
                onClick={insertDraft}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-medium transition-all hover:shadow-lg"
              >
                ✉️ Insert Draft
              </button>
              <button
                onClick={generateReplyFromEmail}
                className="px-6 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium border border-gray-300 transition-all hover:bg-gray-200"
              >
                🔄 Regenerate
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 text-center">
        <p className="text-xs text-gray-500">
          💡 The generated reply will open in a new compose window for you to review and edit
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 text-center shadow-lg">
        <h1 className="text-lg font-semibold m-0">⚡ Generate Reply</h1>
        <p className="text-xs opacity-90 mt-1 mb-0">AI-powered email response generation</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}

export default function GenerateReplyTaskpane() {
  return (
    <>
      <Script
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
        strategy="beforeInteractive"
      />

      <Suspense fallback={<LoadingFallback />}>
        <GenerateReplyContent />
      </Suspense>
    </>
  );
}