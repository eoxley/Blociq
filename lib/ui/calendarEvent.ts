// lib/ui/calendarEvent.ts
// UI helper for handling calendar events with Outlook integration and ICS fallback

export async function onAddCalendarEvent(suggestion: any) {
  try {
    const r = await fetch("/api/calendar/prepare", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(suggestion.payload.body || suggestion.payload)
    });
    
    const j = await r.json();
    
    if (j.mode === "outlook_event" && j.draft?.webLink) {
      window.open(j.draft.webLink, "_blank", "noopener,noreferrer");
      // You can add toast notification here: toast.success("Tentative event created in Outlook");
      return { success: true, mode: "outlook", message: "Event created in Outlook" };
    } else if (j.mode === "ics" && j.ics) {
      // Offer ICS download
      const blob = new Blob([j.ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; 
      a.download = "event.ics"; 
      a.click();
      URL.revokeObjectURL(url);
      // You can add toast notification here: toast.info("ICS file downloaded");
      return { success: true, mode: "ics", message: "ICS file downloaded" };
    } else {
      // You can add toast notification here: toast.info(j.message || "No event detected");
      return { success: false, message: j.message || "No event detected" };
    }
  } catch (error) {
    console.error('Calendar event error:', error);
    // You can add toast notification here: toast.error("Failed to create calendar event");
    return { success: false, message: "Failed to create calendar event" };
  }
}
