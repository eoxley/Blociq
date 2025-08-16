// lib/outlook/replyWithAttachment.ts
// Uses Outlook Graph to create a reply draft and (optionally) attach a small file.
// For larger files, prefer sending a link. Max JSON attachment size ~3–4MB.

export async function getAccessTokenForUser(userId?: string) {
  // TODO: Wire this to your existing Outlook/MSAL token store.
  throw new Error("Outlook token lookup not implemented.");
}

// Create a reply draft and set the body (Text)
export async function createReplyDraft(token: string, messageId: string, bodyText: string) {
  const r1 = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}/createReply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r1.ok) throw new Error(`Graph createReply failed ${r1.status}`);
  const draft = await r1.json();

  await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ body: { contentType: "Text", content: bodyText } })
  });

  // fetch webLink
  const r2 = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${draft.id}?$select=webLink`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const j2 = await r2.json();
  return { id: draft.id, webLink: j2.webLink || "" };
}

export async function attachFileToMessage(token: string, messageId: string, fileName: string, contentBytesBase64: string) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments`;
  const payload = {
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: fileName,
    contentBytes: contentBytesBase64
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Graph attach failed ${res.status}: ${await res.text().catch(()=> "")}`);
  return true;
}
