'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Mail, FileText, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import { useState } from 'react';

interface BlocIQResponse {
  context_reasoning: {
    legal_context: string;
    why_this_matters: string;
    agency_obligations: string[];
    tone: string;
    routing?: string;
    escalation_required?: boolean;
    deadlines?: string[];
    compliance_notes?: string[];
  };
  formatted_output: {
    subject: string;
    body: string;
  };
}

interface BlocIQResponseFrameworkProps {
  response: BlocIQResponse;
  onCopyToClipboard?: (text: string) => void;
  onSendEmail?: (subject: string, body: string) => void;
  className?: string;
}

export function BlocIQResponseFramework({ 
  response, 
  onCopyToClipboard, 
  onSendEmail,
  className = "" 
}: BlocIQResponseFrameworkProps) {
  const [activeTab, setActiveTab] = useState<'reasoning' | 'output'>('reasoning');

  const handleCopyText = (text: string, label: string) => {
    if (onCopyToClipboard) {
      onCopyToClipboard(text);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  const handleSendEmail = () => {
    if (onSendEmail) {
      onSendEmail(response.formatted_output.subject, response.formatted_output.body);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('reasoning')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reasoning'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 inline mr-2" />
          BlocIQ Reasoning
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'output'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Draft Communication
        </button>
      </div>

      {/* Content */}
      {activeTab === 'reasoning' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Internal Analysis & Legal Context
            </CardTitle>
            <CardDescription>
              Private reasoning for manager review and audit trail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Legal Context */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Legal Framework</h4>
              <Badge variant="outline" className="text-xs">
                {response.context_reasoning.legal_context}
              </Badge>
            </div>

            {/* Why This Matters */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Why This Matters</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {response.context_reasoning.why_this_matters}
              </p>
            </div>

            {/* Agency Obligations */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Agency Obligations</h4>
              <ul className="space-y-1">
                {response.context_reasoning.agency_obligations.map((obligation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{obligation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tone & Approach */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Tone & Approach</h4>
              <Badge variant="secondary" className="text-xs">
                {response.context_reasoning.tone}
              </Badge>
            </div>

            {/* Deadlines */}
            {response.context_reasoning.deadlines && response.context_reasoning.deadlines.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Important Deadlines</h4>
                <ul className="space-y-1">
                  {response.context_reasoning.deadlines.map((deadline, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-gray-600">{deadline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compliance Notes */}
            {response.context_reasoning.compliance_notes && response.context_reasoning.compliance_notes.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Compliance Notes</h4>
                <ul className="space-y-1">
                  {response.context_reasoning.compliance_notes.map((note, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'output' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Ready-to-Send Communication
            </CardTitle>
            <CardDescription>
              Final draft ready for review and sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject Line */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Subject Line</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={response.formatted_output.subject}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-medium"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyText(response.formatted_output.subject, 'subject')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Email Body */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Email Body</h4>
              <div className="relative">
                <textarea
                  value={response.formatted_output.body}
                  readOnly
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono whitespace-pre-wrap"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyText(response.formatted_output.body, 'body')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {onSendEmail && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSendEmail}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleCopyText(`${response.formatted_output.subject}\n\n${response.formatted_output.body}`, 'full email')}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Full Email
              </Button>
              {onSendEmail && (
                <Button
                  onClick={handleSendEmail}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BlocIQResponseFramework;
