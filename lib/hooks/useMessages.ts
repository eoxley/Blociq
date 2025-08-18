"use client";

import useSWR from "swr";

export type OutlookMsg = {
  id: string;
  subject?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
  sender?: { emailAddress?: { name?: string; address?: string } };
  receivedDateTime?: string;
  isRead?: boolean;
  bodyPreview?: string;
  hasAttachments?: boolean;
  toRecipients?: any[];
  ccRecipients?: any[];
  webLink?: string;
  conversationId?: string;
};

const jsonFetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};

/**
 * Stable messages hook.
 * - SWR key is a tuple of primitives (string|number) → no refetch loop
 * - No setState on data in effects
 * - No logging on every render
 */
export function useMessages(folderId: string | null, top: number = 50) {
  const key =
    folderId && typeof folderId === "string"
      ? [`/api/outlook/v2/messages/list`, folderId, top]
      : null;

  const { data, error, isLoading, mutate, isValidating } = useSWR(
    key,
    ([base, fid, t]) =>
      jsonFetcher(`${base}?folderId=${encodeURIComponent(fid)}&top=${t}`),
    {
      revalidateOnFocus: false,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 3000,
      keepPreviousData: true,
    }
  );

  const messages: OutlookMsg[] = data?.ok ? data.items : data?.messages ?? data?.value ?? [];

  return {
    messages,
    loading: !!key && (isLoading || (!data && !error)),
    error: error as Error | undefined,
    refresh: () => mutate(),
    validating: isValidating,
  };
}
