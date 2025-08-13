import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { X, Plus, Mail, User } from "lucide-react"
import EmailThreadList from "./EmailThreadList"
import EditorToolbar from "./EditorToolbar"

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

interface ReplyPopoutProps {
  open: boolean
  onClose: () => void
  onSend: (payload: any) => Promise<void>
  initialTo?: Recipient[]
  initialSubject?: string
  threadMessages: ThreadMessage[]
  fromEmail?: string
  onGenerateAIReply?: () => Promise<void>
  content?: string
}

export default function ReplyPopout({
  open,
  onClose,
  onSend,
  initialTo = [],
  initialSubject = "",
  threadMessages,
  fromEmail = "",
  onGenerateAIReply,
  content: externalContent
}: ReplyPopoutProps) {
  const [to, setTo] = useState<Recipient[]>(initialTo)
  const [cc, setCc] = useState<Recipient[]>([])
  const [bcc, setBcc] = useState<Recipient[]>([])
  const [subject, setSubject] = useState(initialSubject)
  const [content, setContent] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTo(initialTo)
      setSubject(initialSubject)
      setContent("")
      setCc([])
      setBcc([])
      setShowCc(false)
      setShowBcc(false)
    }
  }, [open, initialTo, initialSubject])

  // Reset content when modal opens
  useEffect(() => {
    if (open) {
      setContent("")
    }
  }, [open])

  // Update content when external content changes
  useEffect(() => {
    if (externalContent && externalContent !== content) {
      setContent(externalContent)
    }
  }, [externalContent, content])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return
    
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC")
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handleSend()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const handleSend = async () => {
    if (!to.length || !content.trim()) return
    
    setIsSending(true)
    try {
      await onSend({
        to,
        cc,
        bcc,
        subject,
        content
      })
      onClose()
    } catch (error) {
      console.error("Failed to send email:", error)
    } finally {
      setIsSending(false)
    }
  }

  const handleGenerateAIReply = async () => {
    if (!onGenerateAIReply) return
    
    setIsGeneratingAI(true)
    try {
      await onGenerateAIReply()
    } catch (error) {
      console.error("Failed to generate AI reply:", error)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const addRecipient = (type: 'to' | 'cc' | 'bcc', email: string, name?: string) => {
    const recipient = { email, name }
    if (type === 'to') {
      setTo(prev => [...prev, recipient])
    } else if (type === 'cc') {
      setCc(prev => [...prev, recipient])
    } else {
      setBcc(prev => [...prev, recipient])
    }
  }

  const removeRecipient = (type: 'to' | 'cc' | 'bcc', email: string) => {
    if (type === 'to') {
      setTo(prev => prev.filter(r => r.email !== email))
    } else if (type === 'cc') {
      setCc(prev => prev.filter(r => r.email !== email))
    } else {
      setBcc(prev => prev.filter(r => r.email !== email))
    }
  }

  const RecipientChips = ({ recipients, type, onRemove }: {
    recipients: Recipient[]
    type: 'to' | 'cc' | 'bcc'
    onRemove: (email: string) => void
  }) => (
    <div className="flex flex-wrap gap-1">
      {recipients.map((recipient) => (
        <Badge key={recipient.email} variant="secondary" className="gap-1">
          {recipient.name || recipient.email}
          <button
            type="button"
            onClick={() => onRemove(recipient.email)}
            className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  )

  const RecipientInput = ({ type, onAdd }: {
    type: 'to' | 'cc' | 'bcc'
    onAdd: (email: string, name?: string) => void
  }) => {
    const [inputValue, setInputValue] = useState("")
    
    const handleAdd = () => {
      if (inputValue.trim()) {
        const email = inputValue.trim()
        onAdd(email)
        setInputValue("")
      }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
    }

    return (
      <div className="flex gap-2">
        <Input
          placeholder={`Add ${type.toUpperCase()}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button type="button" size="sm" onClick={handleAdd}>Add</Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden">
        <div className="grid h-[72vh] grid-rows-[auto_auto_minmax(160px,1fr)_220px_auto]">
          {/* Header */}
          <div className="px-5 py-3 border-b">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg">Reply</DialogTitle>
            </DialogHeader>
          </div>

          {/* Address / subject fields (compact) */}
          <div className="px-5 py-3 space-y-2 border-b">
            {/* From (read-only pill style) */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium w-12">From:</Label>
              <Badge variant="outline" className="bg-muted">
                <User className="h-3 w-3 mr-1" />
                {fromEmail || "No sender"}
              </Badge>
            </div>

            {/* To */}
            <div className="flex items-start gap-2">
              <Label className="text-sm font-medium w-12 pt-2">To:</Label>
              <div className="flex-1 space-y-2">
                <RecipientChips recipients={to} type="to" onRemove={(email) => removeRecipient('to', email)} />
                <RecipientInput type="to" onAdd={(email, name) => addRecipient('to', email, name)} />
              </div>
            </div>

            {/* CC (collapsible) */}
            <div className="flex items-start gap-2">
              <Label className="text-sm font-medium w-12 pt-2">CC:</Label>
              <div className="flex-1 space-y-2">
                {showCc && (
                  <>
                    <RecipientChips recipients={cc} type="cc" onRemove={(email) => removeRecipient('cc', email)} />
                    <RecipientInput type="cc" onAdd={(email, name) => addRecipient('cc', email, name)} />
                  </>
                )}
                {!showCc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCc(true)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add CC
                  </Button>
                )}
              </div>
            </div>

            {/* BCC (collapsible) */}
            <div className="flex items-start gap-2">
              <Label className="text-sm font-medium w-12 pt-2">BCC:</Label>
              <div className="flex-1 space-y-2">
                {showBcc && (
                  <>
                    <RecipientChips recipients={bcc} type="bcc" onRemove={(email) => removeRecipient('bcc', email)} />
                    <RecipientInput type="bcc" onAdd={(email, name) => addRecipient('bcc', email, name)} />
                  </>
                )}
                {!showBcc && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBcc(true)}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add BCC
                  </Button>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium w-12">Subject:</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1"
              />
            </div>
          </div>

          {/* Editor */}
          <div className="px-5 py-3 overflow-hidden">
            <div className="border rounded-xl h-full flex flex-col">
              <EditorToolbar
                onGenerateAIReply={handleGenerateAIReply}
                onAttach={() => {
                  // TODO: Implement file attachment
                  console.log("Attach clicked")
                }}
                isGeneratingAI={isGeneratingAI}
              />
              <div className="flex-1 overflow-auto p-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full h-full resize-none border-0 outline-none focus:ring-0 text-sm"
                  style={{ minHeight: '120px' }}
                />
              </div>
            </div>
          </div>

          {/* Thread (visible + scrollable) */}
          <div className="px-5 pb-2 pt-0 border-t">
            <div className="text-sm font-medium mb-2">Email Thread</div>
            <ScrollArea className="h-[200px] rounded-md">
              <EmailThreadList messages={threadMessages} />
            </ScrollArea>
          </div>

          {/* Footer (sticky actions) */}
          <div className="px-5 py-3 border-t flex items-center justify-between bg-background">
            <div className="text-xs text-muted-foreground">
              Tip: Press <kbd className="px-1 border rounded">Ctrl/⌘</kbd> + <kbd className="px-1 border rounded">Enter</kbd> to send
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={handleSend} 
                disabled={isSending || !to.length || !content.trim()}
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
