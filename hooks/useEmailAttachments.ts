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
        throw new Error('Failed to fetch attachments');
      }

      const data = await response.json();
      
      if (data.success) {
        setAttachments(data.attachments || []);
      } else {
        throw new Error(data.error || 'Failed to fetch attachments');
      }
    } catch (err) {
      console.error('Error fetching email attachments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attachments');
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