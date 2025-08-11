import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) {
    // Enhanced error handling to prevent client-side exceptions
    const error = new Error(`HTTP ${r.status}: ${r.statusText}`);
    console.warn('[useOutlookFolders] API error:', error.message);
    throw error;
  }
  return r.json();
}).catch((error) => {
  // Defensive error handling to prevent crashes
  console.warn('[useOutlookFolders] Fetch error:', error.message);
  // Return empty data instead of throwing
  return { folders: [] };
});

export function useOutlookFolders() {
  const { data, error, isLoading, mutate } = useSWR("/api/outlook/folders", fetcher, {
    refreshInterval: 60000, // refresh counts every 60s
    revalidateOnFocus: true,
    // Add error retry with backoff
    errorRetryCount: 2,
    errorRetryInterval: 5000,
    // Prevent infinite retries on auth errors
    onError: (err) => {
      if (err.message.includes('401') || err.message.includes('403')) {
        console.warn('[useOutlookFolders] Auth error, stopping retries');
        return false; // Stop retrying
      }
    }
  });

  const folders = data?.folders ?? [];

  return {
    folders,
    isLoading,
    error,
    refresh: mutate,
  };
}
