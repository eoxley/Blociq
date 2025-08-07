import { useState, useEffect } from 'react';

interface EmailAttachment {
  content_id: string;
  content_bytes: string;
  content_type: string;
  name?: string;
  size?: number;
}

interface UseEmailAttachmentsReturn {
  attachments: EmailAttachment[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmailAttachments(emailId: string | null): UseEmailAttachmentsReturn {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = async () => {
    if (!emailId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/email-attachments?emailId=${emailId}`);
      
      if (!response.ok) {
        // Don't throw error, just set empty attachments
        console.warn('Email attachments API returned non-OK status:', response.status);
        setAttachments([]);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setAttachments(data.attachments || []);
      } else {
        // Don't throw error, just set empty attachments
        console.warn('Email attachments API returned error:', data.error);
        setAttachments([]);
      }
    } catch (err) {
      console.error('Error fetching email attachments:', err);
      // Don't set error state, just set empty attachments
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [emailId]);

  return {
    attachments,
    loading,
    error,
    refetch: fetchAttachments
  };
} 