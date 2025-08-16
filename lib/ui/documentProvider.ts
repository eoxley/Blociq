// lib/ui/documentProvider.ts
// UI helper for handling document provider suggestions

export async function onProvideDocument(suggestion: any) {
  try {
    // First, find the document
    const r = await fetch("/api/docs/find-latest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suggestion.payload.body || suggestion.payload)
    });
    
    const j = await r.json();
    
    if (!j.found) {
      return { success: false, message: j.reason || "Document not found" };
    }

    // Show confirmation modal with document details
    const confirmed = await showDocumentConfirmation({
      doc_type: j.doc_type,
      file_name: j.doc.file_name,
      created_at: j.doc.created_at,
      signed_url: j.doc.signed_url,
      building_name: j.building_name
    });

    if (!confirmed) {
      return { success: false, message: "Cancelled by user" };
    }

    // If we have an Outlook message ID, create a reply draft
    if (suggestion.outlook_message_id) {
      const replyR = await fetch("/api/docs/reply-with-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: j.building_id,
          doc_type: j.doc_type,
          outlook_message_id: suggestion.outlook_message_id,
          to_mode: "outlook",
          inbox_user_id: suggestion.inbox_user_id
        })
      });
      
      const replyJ = await replyR.json();
      
      if (replyJ.mode === "outlook_draft" && replyJ.draft?.webLink) {
        window.open(replyJ.draft.webLink, "_blank", "noopener,noreferrer");
        return { success: true, mode: "outlook", message: "Reply draft created in Outlook" };
      } else {
        return { success: true, mode: "text", message: "Reply text prepared", body: replyJ.body };
      }
    }

    // Otherwise, just return the document info
    return { 
      success: true, 
      mode: "document", 
      message: "Document found", 
      doc: j.doc,
      building_name: j.building_name
    };
  } catch (error) {
    console.error('Document provider error:', error);
    return { success: false, message: "Failed to provide document" };
  }
}

// Simple confirmation modal (you can replace with your preferred modal system)
async function showDocumentConfirmation(doc: {
  doc_type: string;
  file_name: string;
  created_at: string;
  signed_url: string | null;
  building_name: string | null;
}): Promise<boolean> {
  const message = `Found: ${doc.doc_type.replace(/_/g, " ")}
File: ${doc.file_name}
Date: ${new Date(doc.created_at).toLocaleDateString()}
Building: ${doc.building_name || "Unknown"}

Would you like to create a reply with this document?`;
  
  return window.confirm(message);
}
