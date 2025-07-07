export const runtime = "nodejs"
await fetch("/api/save-emails", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emails: [
      {
        thread_id: "abc123",
        message_id: "xyz456",
        from_email: "jane.doe@example.com",
        subject: "Flat 6 Leak",
        body_preview: "There is water dripping from the ceiling",
        received_at: new Date().toISOString(),
        building_id: 123, // optional
        unit: "Flat 6"
      }
    ]
  })
})
