'use client'

import React, { useState } from 'react'
import { Mail, Send, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

interface Leaseholder {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  unit_id: number | null
  unit?: {
    unit_number: string
    building?: {
      name: string
      address: string
    }
  }
}

interface EmailDraftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaseholder?: Leaseholder
  building?: { id: string; name: string; address: string }
  isBulk?: boolean
  onSuccess?: () => void
}

export default function EmailDraftModal({
  open,
  onOpenChange,
  leaseholder,
  building,
  isBulk = false,
  onSuccess
}: EmailDraftModalProps) {
  const [loading, setLoading] = useState(false)
  const [emailForm, setEmailForm] = useState({
    subject: '',
    content: '',
    template: ''
  })

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.content) {
      toast.error('Please fill in both subject and content')
      return
    }

    try {
      setLoading(true)

      if (isBulk && building) {
        // Bulk email to all leaseholders in building
        // First get units for this building
        const { data: units, error: unitsError } = await supabase
          .from('units')
          .select('id, unit_number, building_id')
          .eq('building_id', building.id)

        if (unitsError) throw unitsError

        // Then get leaseholders for these units
        const unitIds = units?.map(u => u.id) || []
        const { data: leaseholders, error } = await supabase
          .from('leaseholders')
          .select('id, name, email, unit_id')
          .in('unit_id', unitIds)
          .not('email', 'is', null)

        if (error) throw error

        const leaseholdersWithEmails = leaseholders?.filter(l => l.email) || []
        
        if (leaseholdersWithEmails.length === 0) {
          toast.error('No leaseholders with email addresses found in this building')
          return
        }

        // Send emails to all leaseholders
        for (const lh of leaseholdersWithEmails) {
          await sendEmail({
            to_email: lh.email!,
            subject: emailForm.subject,
            content: emailForm.content,
            leaseholder_id: lh.id,
            leaseholder_name: lh.name || 'Unknown',
            building_name: building.name,
            unit_number: lh.unit?.unit_number || 'Unknown',
            is_bulk: true
          })
        }

        toast.success(`Email sent to ${leaseholdersWithEmails.length} leaseholders`)
        onSuccess?.()
      } else if (leaseholder) {
        // Individual email
        if (!leaseholder.email) {
          toast.error('No email address available for this leaseholder')
          return
        }

        await sendEmail({
          to_email: leaseholder.email,
          subject: emailForm.subject,
          content: emailForm.content,
          leaseholder_id: leaseholder.id,
          leaseholder_name: leaseholder.name || 'Unknown',
          building_name: leaseholder.unit?.building?.name || 'Unknown',
          unit_number: leaseholder.unit?.unit_number || 'Unknown',
          is_bulk: false
        })

        toast.success(`Email sent to ${leaseholder.name || 'leaseholder'}`)
        onSuccess?.()
      }

      // Reset form and close modal
      setEmailForm({ subject: '', content: '', template: '' })
      onOpenChange(false)
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async (emailData: {
    to_email: string
    subject: string
    content: string
    leaseholder_id: string
    leaseholder_name: string
    building_name: string
    unit_number: string
    is_bulk: boolean
  }) => {
    try {
      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }

      return await response.json()
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  const getRecipientInfo = () => {
    if (isBulk && building) {
      return {
        title: `To: All Leaseholders in ${building.name}`,
        subtitle: building.address,
        emailCount: 'Multiple recipients'
      }
    } else if (leaseholder) {
      return {
        title: `To: ${leaseholder.name || 'Unknown'}`,
        subtitle: leaseholder.email || 'No email available',
        emailCount: leaseholder.email ? '1 recipient' : 'No email available'
      }
    }
    return { title: '', subtitle: '', emailCount: '' }
  }

  const recipientInfo = getRecipientInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Draft Email
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium">{recipientInfo.title}</h4>
            <p className="text-sm text-gray-600">{recipientInfo.subtitle}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline">{recipientInfo.emailCount}</Badge>
              {leaseholder && (
                <Badge variant="outline">
                  {leaseholder.building_name} - Unit {leaseholder.unit_number}
                </Badge>
              )}
            </div>
          </div>

          {/* Email Form */}
          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              placeholder="Enter email subject..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email-content">Message</Label>
            <Textarea
              id="email-content"
              value={emailForm.content}
              onChange={(e) => setEmailForm({ ...emailForm, content: e.target.value })}
              placeholder="Enter your message..."
              rows={8}
              className="mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={loading || (!emailForm.subject || !emailForm.content)}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 