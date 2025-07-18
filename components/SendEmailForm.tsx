"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface SendEmailFormProps {
  generatedFileUrl: string;
  generatedFilePath: string;
  templateName: string;
  templateId: string;
  buildingId?: string;
  buildingName?: string;
  unitNumber?: string;
  leaseholderEmail?: string;
  onEmailSent?: (result: any) => void;
  onCancel?: () => void;
}

export default function SendEmailForm({
  generatedFileUrl,
  generatedFilePath,
  templateName,
  templateId,
  buildingId,
  buildingName,
  unitNumber,
  leaseholderEmail,
  onEmailSent,
  onCancel
}: SendEmailFormProps) {
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    to: leaseholderEmail || '',
    subject: `${buildingName || 'BlocIQ'} - ${templateName}`,
    message: `Dear ${unitNumber ? `Flat ${unitNumber} leaseholder` : 'leaseholder'},

Please find attached the ${templateName.toLowerCase()} for ${buildingName || 'your property'}.

If you have any questions, please do not hesitate to contact us.

Best regards,
BlocIQ Property Management`,
    fileType: 'docx'
  });

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleInputChange = (field: string, value: string) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendEmail = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          message: emailData.message,
          attachmentPath: generatedFilePath,
          templateId: templateId,
          buildingId: buildingId,
          sentBy: 'current_user' // TODO: Get actual user ID
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      setSuccess('Email sent successfully!');
      onEmailSent?.(result);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generatedFileUrl;
    link.download = `${templateName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${emailData.fileType}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📧 Send via Email
          <Badge variant="secondary">{emailData.fileType.toUpperCase()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            ❌ {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            ✅ {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="to">Recipient Email *</Label>
            <Input
              id="to"
              type="email"
              value={emailData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              placeholder="leaseholder@example.com"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="fileType">File Type</Label>
            <Select value={emailData.fileType} onValueChange={(value) => handleInputChange('fileType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docx">DOCX</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="subject">Subject *</Label>
          <Input
            id="subject"
            value={emailData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Email subject"
            required
          />
        </div>

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={emailData.message}
            onChange={(e) => handleInputChange('message', e.target.value)}
            placeholder="Email message..."
            rows={6}
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">📎 Attachment Preview</h4>
          <div className="text-sm text-gray-600">
            <div><strong>File:</strong> {templateName.replace(/\s+/g, '_')}_generated.{emailData.fileType}</div>
            <div><strong>Template:</strong> {templateName}</div>
            {buildingName && <div><strong>Building:</strong> {buildingName}</div>}
            {unitNumber && <div><strong>Unit:</strong> Flat {unitNumber}</div>}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleSendEmail} 
            disabled={loading || !emailData.to || !emailData.subject}
            className="flex-1"
          >
            {loading ? 'Sending...' : '📧 Send Email'}
          </Button>
          
          <Button 
            onClick={handleDownload} 
            variant="outline"
            disabled={loading}
          >
            📥 Download
          </Button>
          
          {onCancel && (
            <Button 
              onClick={onCancel} 
              variant="ghost"
              disabled={loading}
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 text-center">
          Email will be logged in communications history
        </div>
      </CardContent>
    </Card>
  );
} 