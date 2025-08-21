import { useState, useEffect } from 'react';
import { UserSignature, generateEmailSignature, generateHTMLEmailSignature } from '@/lib/signature';

export function useSignature() {
  const [signature, setSignature] = useState<UserSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignature();
  }, []);

  const fetchSignature = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/signature');
      if (!response.ok) {
        throw new Error('Failed to fetch signature');
      }
      
      const data = await response.json();
      setSignature(data.signature);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch signature');
      console.error('Error fetching signature:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTextSignature = (): string => {
    return signature ? generateEmailSignature(signature) : '';
  };

  const getHTMLSignature = (): string => {
    return signature ? generateHTMLEmailSignature(signature) : '';
  };

  const getSignatureImage = (): string | null => {
    return signature?.signature_url || null;
  };

  const refreshSignature = () => {
    fetchSignature();
  };

  return {
    signature,
    loading,
    error,
    getTextSignature,
    getHTMLSignature,
    getSignatureImage,
    refreshSignature
  };
}
