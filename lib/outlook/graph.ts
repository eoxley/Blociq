// lib/outlook/graph.ts
// Minimal draft creator for Microsoft Graph (Outlook).
// Scopes needed: Mail.ReadWrite (drafts). Later if you send: Mail.Send.

type Recipient = { address: string; name?: string };

export async function getAccessTokenForUser(userId?: string) {
  // TODO: Wire to your existing Outlook/MSAL token store.
  // Must return a delegated access token for the Outlook mailbox (e.g. testbloc@blociq.co.uk).
  // Example: return await lookupMsalToken(userId);
  throw new Error("Outlook token lookup not implemented. Wire this to your existing Outlook integration.");
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
