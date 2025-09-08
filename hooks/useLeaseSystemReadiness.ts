import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/SupabaseProvider';

interface LeaseSystemReadiness {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  checks: {
    authenticated: boolean;
    databaseTable: boolean;
    backgroundProcessing: boolean;
  };
}

export function useLeaseSystemReadiness(): LeaseSystemReadiness {
  const { supabase } = useSupabase();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState({
    authenticated: false,
    databaseTable: false,
    backgroundProcessing: false
  });

  useEffect(() => {
    checkSystemReadiness();
  }, []);

  const checkSystemReadiness = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const newChecks = {
        authenticated: false,
        databaseTable: false,
        backgroundProcessing: false
      };

      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setChecks(newChecks);
        setIsReady(false);
        setIsLoading(false);
        return;
      }
      newChecks.authenticated = true;

      // Check if lease_processing_jobs table exists
      const { error: tableError } = await supabase
        .from('lease_processing_jobs')
        .select('id')
        .limit(1);

      if (tableError) {
        console.log('Lease processing system not configured:', tableError.message);
        setChecks(newChecks);
        setIsReady(false);
        setIsLoading(false);
        return;
      }
      newChecks.databaseTable = true;

      // Check if background processing is available
      try {
        const response = await fetch('/api/cron/process-lease-jobs', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          console.log('Background processing not available');
          setChecks(newChecks);
          setIsReady(false);
          setIsLoading(false);
          return;
        }
        newChecks.backgroundProcessing = true;
      } catch (error) {
        console.log('Background processing endpoint not accessible');
        setChecks(newChecks);
        setIsReady(false);
        setIsLoading(false);
        return;
      }

      // All checks passed
      setChecks(newChecks);
      setIsReady(true);
      
    } catch (error) {
      console.error('System readiness check failed:', error);
      setError('Failed to check system status');
      setIsReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isReady,
    isLoading,
    error,
    checks
  };
}
