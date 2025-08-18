"use client";

import useSWR from "swr";

const jsonFetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};

/** Fetches full body only when a message id is provided */
export function useMessageBody(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? [`/api/outlook/v2/messages/${id}`] : null,
    ([base]) => jsonFetcher(base),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 5000,
    }
  );

  const html =
    data?.message?.body?.content ??
    data?.body?.content ??
    (typeof data === "string" ? data : "");

  return { html, loading: !!id && isLoading, error: error as Error | undefined };
}
