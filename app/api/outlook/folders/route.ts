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
      return NextResponse.json({ error: "No Outlook token available" }, { status: 401 });
    }

    // DIAGNOSTIC: who is this token for?
    try {
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const me = await meRes.json();
        console.log("[folders] token for:", me?.userPrincipalName || me?.mail || "(unknown)");
      } else {
        console.warn("[folders] /me lookup failed:", meRes.status, await meRes.text().catch(()=>"..."));
      }
    } catch (e:any) {
      console.warn("[folders] /me lookup error:", e?.message || e);
    }

    // Fetch standard folders explicitly (most reliable)
    const std = await Promise.all(
      STANDARD.map(async (s) => {
        try {
          const f = await fetchJSON(
            `https://graph.microsoft.com/v1.0/me/mailFolders/${s.path}?$select=id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount`,
            token
          );
          return { ...f, __standardKey: s.key, __labelOverride: s.label };
        } catch {
          return null; // tolerate missing archive etc.
        }
      })
    );
    const stdResults = std.filter(Boolean) as any[];

    // Try to fetch all folders (may fail)
    let allResults: any[] = [];
    try {
      allResults = await fetchAllFolders(token);
    } catch (e) {
      console.warn("[folders] all folders fetch failed:", e);
    }

    // Merge and deduplicate
    const merged = new Map<string, any>();
    
    // Add standard folders first
    stdResults.forEach(f => {
      if (f.id) merged.set(f.id, f);
    });
    
    // Add other folders, preferring standard if duplicate
    allResults.forEach(f => {
      if (f.id && !merged.has(f.id)) {
        merged.set(f.id, f);
      }
    });

    const folders = Array.from(merged.values()).map(f => ({
      id: f.id,
      name: f.__labelOverride || f.displayName,
      unread: f.unreadItemCount || 0,
      total: f.totalItemCount || 0,
      isStandard: !!f.__standardKey,
      childCount: f.childFolderCount || 0
    }));

    return NextResponse.json({ folders });

  } catch (err:any) {
    console.error("[folders] error:", err?.message, err);
    return NextResponse.json(
      { error: "Failed to list folders", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
