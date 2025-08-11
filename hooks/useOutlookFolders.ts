import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export function useOutlookFolders() {
  const { data, error, isLoading, mutate } = useSWR("/api/outlook/folders", fetcher, {
    refreshInterval: 60000, // refresh counts every 60s
    revalidateOnFocus: true,
  });

  const folders = data?.folders ?? [];

  return {
    folders,
    isLoading,
    error,
    refresh: mutate,
  };
}
