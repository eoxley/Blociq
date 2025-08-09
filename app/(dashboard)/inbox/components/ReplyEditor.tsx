// LEGACY REPLY UI – superseded by ReplyModalV2 in Inbox V2.
'use client'

import React, { useState } from 'react'
import { Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface ReplyEditorProps {
  originalEmail: {
    id: string
    subject: string | null
    from_name: string | null
    from_email: string | null
    building_id: string | null
  }
  draftContent: string
  onCancel: () => void
  onSend: (content: string) => void
  isSending: boolean
}

export default function ReplyEditor({
  originalEmail,
  draftContent,
  onCancel,
  onSend,
  isSending
}: ReplyEditorProps) {
  const [replyContent, setReplyContent] = useState(draftContent)

  const handleSend = () => {
    if (!replyContent.trim()) {
      toast.error('Please enter a reply message')
      return
    }
    onSend(replyContent)
  }

  return (
    <Card className="mt-4 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-900">
            Reply to {originalEmail.from_name || originalEmail.from_email}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-600">
          Subject: {originalEmail.subject || 'No Subject'}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Edit your reply..."
          className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500"
          disabled={isSending}
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !replyContent.trim()}
            size="sm"
            className="flex items-center gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 