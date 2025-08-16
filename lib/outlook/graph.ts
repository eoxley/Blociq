// lib/outlook/graph.ts
// Microsoft Graph helpers for Outlook operations
// Scopes needed: Mail.ReadWrite (drafts, categories, flags). Later if you send: Mail.Send.

type Recipient = { address: string; name?: string };

export async function getAccessTokenForUser(userId?: string) {
  // TODO: wire to your existing Outlook/MSAL token store (delegated token for testbloc@blociq.co.uk)
  throw new Error("Outlook token lookup not implemented. Connect to your MSAL token store.");
}

export async function listInboxMessages(token: string, top = 50) {
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=${top}&$select=id,subject,from,receivedDateTime,conversationId,internetMessageId,isRead,bodyPreview,categories,importance,flag`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Graph list failed ${r.status}`);
  const j = await r.json();
  return j.value || [];
}

export async function patchMessage(token: string, id: string, body: any) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${id}`;
  const r = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Graph patch failed ${r.status}`);
}

export async function createReplyDraft(token: string, id: string, replyText: string) {
  // 1) create draft reply
  const r1 = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${id}/createReply`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }
  });
  if (!r1.ok) throw new Error(`Graph createReply failed ${r1.status}`);
  const draft = await r1.json();

  // 2) patch body
  await patchMessage(token, draft.id, { body: { contentType: "Text", content: replyText } });

  // 3) fetch to get webLink
  const r2 = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}?$select=webLink`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const j2 = await r2.json();
  return { id: draft.id, webLink: j2.webLink || "" };
}

export async function createOutlookDraft(
  userScope: "me" | string,
  token: string,
  to: Recipient[],
  subject: string,
  bodyText: string
) {
  const endpoint =
    userScope === "me"
      ? "https://graph.microsoft.com/v1.0/me/messages"
      : `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userScope)}/messages`;

  const payload = {
    subject,
    body: { contentType: "Text", content: bodyText },
    toRecipients: to.map(t => ({ emailAddress: { address: t.address, name: t.name || undefined } }))
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Graph draft failed (${res.status}): ${errText}`);
  }

  const json = await res.json();
  return { id: json.id, webLink: json.webLink, internetMessageId: json.internetMessageId };
}
