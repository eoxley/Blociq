import { NextResponse } from "next/server";
import { getOutlookAccessToken } from "@/lib/outlook/auth"; // must return a valid Graph token for the connected mailbox

const STANDARD: { key: string; path: string; label: string }[] = [
  { key: "inbox", path: "inbox", label: "Inbox" },
  { key: "drafts", path: "drafts", label: "Drafts" },
  { key: "sentitems", path: "sentitems", label: "Sent" },
  { key: "deleteditems", path: "deleteditems", label: "Deleted" },
  { key: "archive", path: "archive", label: "Archive" },
];

async function fetchJSON(url: string, token: string) {
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText} ${text}`.trim());
  }
  return r.json();
}

async function fetchAllFolders(token: string) {
  let url = "https://graph.microsoft.com/v1.0/me/mailFolders?$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount&$top=50";
  const all: any[] = [];
  
  while (url) {
    const data = await fetchJSON(url, token);
    all.push(...(data.value || []));
    url = data["@odata.nextLink"] || "";
  }
  
  return all;
}

export async function GET() {
  try {
    const token = await getOutlookAccessToken();
    if (!token) {
      return NextResponse.json(
        { error: "No Outlook token available" },
        { status: 401 }
      );
    }

    // Fetch standard folders explicitly (most reliable)
    const std = await Promise.all(
      STANDARD.map(async (s) => {
        try {
          const f = await fetchJSON(
            `https://graph.microsoft.com/v1.0/me/mailFolders/${s.path}?$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount`,
            token
          );
          return {
            ...f,
            __standardKey: s.key,
            __labelOverride: s.label
          };
        } catch {
          return null; // tolerate missing archive etc.
        }
      })
    );
    
    const stdResults = std.filter(Boolean) as any[];

    // Try to fetch all folders (custom + root); tolerate failure
    let allFolders: any[] = [];
    try {
      allFolders = await fetchAllFolders(token);
    } catch (e) {
      // swallow — we can still render standard set; include detail for debugging
      console.warn("Graph mailFolders listing failed:", e);
    }

    // Merge by id
    const map = new Map<string, any>();
    [...stdResults, ...allFolders].forEach((f) => {
      if (!f?.id) return;
      if (!map.has(f.id)) map.set(f.id, f);
      else map.set(f.id, { ...map.get(f.id), ...f });
    });

    // Sort: standard first, then A–Z
    const order = new Map(STANDARD.map((s, i) => [s.key, i]));
    const folders = Array.from(map.values())
      .map((f: any) => {
        const label = f.__labelOverride ?? f.displayName ?? "Folder";
        const stdIndex = f.__standardKey ? order.get(f.__standardKey) ?? 999 : 999;
        return {
          id: f.id,
          name: label,
          unread: f.unreadItemCount ?? 0,
          total: f.totalItemCount ?? 0,
          parentFolderId: f.parentFolderId ?? null,
          childFolderCount: f.childFolderCount ?? 0,
          isStandard: Boolean(f.__standardKey),
          stdIndex,
        };
      })
      .sort((a, b) => a.stdIndex - b.stdIndex || a.name.localeCompare(b.name));

    // Fallback: if somehow empty, provide a synthetic standard set
    const fallback = folders.length > 0 ? folders : STANDARD.map((s, i) => ({
      id: `std-${s.key}`,
      name: s.label,
      unread: 0,
      total: 0,
      parentFolderId: null,
      childFolderCount: 0,
      isStandard: true,
      stdIndex: i,
    }));

    return NextResponse.json({ folders: fallback });

  } catch (err: any) {
    return NextResponse.json(
      { 
        error: "Failed to list folders", 
        detail: err?.message ?? String(err) 
      },
      { status: 500 }
    );
  }
}
