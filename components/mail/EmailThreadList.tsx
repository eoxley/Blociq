import { useState } from "react"
import { ChevronDown, ChevronRight, Mail, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Recipient {
  name?: string
  email: string
}

interface ThreadMessage {
  id: string
  from: { name?: string; email: string }
  to: Recipient[]
  subject: string
  date: string
  snippet: string
  html?: string
  text?: string
}

interface EmailThreadListProps {
  messages: ThreadMessage[]
}

export default function EmailThreadList({ messages }: EmailThreadListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No messages in thread</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2 pr-2">
      {messages.map((message) => (
        <ThreadItem key={message.id} message={message} />
      ))}
    </ul>
  )
}

interface ThreadItemProps {
  message: ThreadMessage
}

function ThreadItem({ message }: ThreadItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      } else if (diffInHours < 168) { // 7 days
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      }
    } catch {
      return dateString
    }
  }

  const formatRecipients = (recipients: Recipient[]) => {
    if (!recipients || recipients.length === 0) return "No recipients"
    return recipients.map(r => r.name || r.email).join(", ")
  }

  const renderContent = () => {
    if (message.html) {
      // Strip HTML tags for snippet display
      const textContent = message.html.replace(/<[^>]*>/g, '')
      return (
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: message.html }}
          />
        </div>
      )
    }
    
    return (
      <p className="text-sm leading-relaxed text-foreground">
        {message.text || message.snippet}
      </p>
    )
  }

  return (
    <li className="border rounded-lg bg-card hover:bg-muted/50 transition-colors">
      {/* Header - Always visible */}
      <button
        type="button"
        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate">
              {message.subject || "No subject"}
            </span>
            {message.html && (
              <Badge variant="outline" size="sm" className="text-xs">
                HTML
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">
                {message.from.name || message.from.email}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">
                To: {formatRecipients(message.to)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="h-3 w-3" />
          <span>{formatDate(message.date)}</span>
        </div>
      </button>

      {/* Content - Expandable */}
      <div className={cn(
        "px-3 pb-3 transition-all duration-200",
        isExpanded ? "block" : "hidden"
      )}>
        <Separator className="mb-3" />
        
        {/* Sender and recipient details */}
        <div className="text-xs text-muted-foreground mb-3 space-y-1">
          <div><strong>From:</strong> {message.from.name || message.from.email}</div>
          <div><strong>To:</strong> {formatRecipients(message.to)}</div>
          <div><strong>Date:</strong> {new Date(message.date).toLocaleString()}</div>
        </div>
        
        {/* Message content */}
        <div className="border-t pt-3">
          {renderContent()}
        </div>
      </div>
    </li>
  )
}

// Simple separator component if not available
function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border", className)} />
}
