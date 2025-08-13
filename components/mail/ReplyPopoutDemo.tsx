"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail, Reply } from "lucide-react"
import ReplyPopout from "./ReplyPopout"

// Sample thread messages for demonstration
const sampleThreadMessages = [
  {
    id: "1",
    from: { name: "John Smith", email: "john.smith@example.com" },
    to: [{ name: "Jane Doe", email: "jane.doe@example.com" }],
    subject: "Project Update Meeting",
    date: "2024-01-15T10:30:00Z",
    snippet: "Hi Jane, I wanted to schedule a meeting to discuss the project updates...",
    text: "Hi Jane,\n\nI wanted to schedule a meeting to discuss the project updates we discussed last week. Let me know what time works best for you.\n\nBest regards,\nJohn"
  },
  {
    id: "2",
    from: { name: "Jane Doe", email: "jane.doe@example.com" },
    to: [{ name: "John Smith", email: "john.smith@example.com" }],
    subject: "Re: Project Update Meeting",
    date: "2024-01-15T14:15:00Z",
    snippet: "Hi John, thanks for reaching out. I'm available tomorrow afternoon...",
    text: "Hi John,\n\nThanks for reaching out. I'm available tomorrow afternoon between 2-4 PM. Would that work for you?\n\nCheers,\nJane"
  },
  {
    id: "3",
    from: { name: "John Smith", email: "john.smith@example.com" },
    to: [{ name: "Jane Doe", email: "jane.doe@example.com" }],
    subject: "Re: Project Update Meeting",
    date: "2024-01-15T16:45:00Z",
    snippet: "Perfect! Let's meet tomorrow at 2:30 PM in the conference room...",
    html: "<p>Perfect! Let's meet tomorrow at <strong>2:30 PM</strong> in the conference room.</p><p>I'll prepare the agenda and send it over tonight.</p><p>Best regards,<br>John</p>"
  }
]

export default function ReplyPopoutDemo() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleSend = async (payload: any) => {
    setIsSending(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log("Sending email:", payload)
    
    // Simulate success
    setIsSending(false)
    setIsOpen(false)
    
    // You could show a toast notification here
    alert("Email sent successfully!")
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <Mail className="h-12 w-12 mx-auto mb-4 text-blue-600" />
        <h1 className="text-2xl font-bold mb-2">Reply Pop-Out Demo</h1>
        <p className="text-muted-foreground">
          Click the button below to open the compact reply modal
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Features Demonstrated:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Compact modal (~760px wide, ~72vh tall)</li>
            <li>• Tight spacing on header and address fields</li>
            <li>• Email thread visible below editor with scroll</li>
            <li>• Persistent sticky footer with actions</li>
            <li>• Compact "Generate AI Reply" button in toolbar</li>
            <li>• Keyboard shortcuts: Ctrl/Cmd+Enter = Send, Esc = Close</li>
          </ul>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={() => setIsOpen(true)}
            size="lg"
            className="gap-2"
          >
            <Reply className="h-5 w-5" />
            Open Reply Modal
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Sample Thread Data:</h3>
          <div className="text-sm text-muted-foreground">
            <p>The modal will show {sampleThreadMessages.length} sample messages in the thread below the editor.</p>
            <p>Click on any message to expand and see its full content.</p>
          </div>
        </div>
      </div>

      <ReplyPopout
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSend={handleSend}
        initialTo={[{ name: "Jane Doe", email: "jane.doe@example.com" }]}
        initialSubject="Re: Project Update Meeting"
        threadMessages={sampleThreadMessages}
      />
    </div>
  )
}
