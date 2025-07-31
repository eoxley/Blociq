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
  full_name: string
  email: string
  phone_number: string
  correspondence_address: string
  unit_number: string
  building_name: string
}

interface EmailDraftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaseholder?: Leaseholder
  building?: { id: string; name: string; address: string }
  isBulk?: boolean
}

export default function EmailDraftModal({
  open,
  onOpenChange,
  leaseholder,
  building,
  isBulk = false
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
        const { data: leaseholders, error } = await supabase
          .from('leaseholders')
          .select(`
            id,
            full_name,
            email,
            units (
              unit_number,
              buildings (id)
            )
          `)
          .eq('units.buildings.id', building.id)
          .not('email', 'is', null)

        if (error) throw error

        const leaseholdersWithEmails = data?.filter(l => l.email) || []
        
        if (leaseholdersWithEmails.length === 0) {
          toast.error('No leaseholders with email addresses found in this building')
          return
        }

        // Log each email
        for (const lh of leaseholdersWithEmails) {
          await logCommunication({
            type: 'email',
            leaseholder_id: lh.id,
            leaseholder_name: lh.full_name,
            building_name: building.name,
            unit_number: lh.units?.unit_number || '',
            subject: emailForm.subject,
            content: emailForm.content
          })
        }

        toast.success(`Email prepared for ${leaseholdersWithEmails.length} leaseholders`)
      } else if (leaseholder) {
        // Individual email
        if (!leaseholder.email) {
          toast.error('No email address available for this leaseholder')
          return
        }

        await logCommunication({
          type: 'email',
          leaseholder_id: leaseholder.id,
          leaseholder_name: leaseholder.full_name,
          building_name: leaseholder.building_name,
          unit_number: leaseholder.unit_number,
          subject: emailForm.subject,
          content: emailForm.content
        })

        toast.success(`Email sent to ${leaseholder.full_name}`)
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

  const logCommunication = async (communication: {
    type: 'email'
    leaseholder_id: string
    leaseholder_name: string
    building_name: string
    unit_number: string
    subject: string
    content: string
  }) => {
    try {
      const { error } = await supabase
        .from('communications_sent')
        .insert({
          to_email: communication.leaseholder_name,
          subject: communication.subject,
          message: communication.content,
          sent_by: 'system',
          status: 'sent'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error logging communication:', error)
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
        title: `To: ${leaseholder.full_name}`,
        subtitle: leaseholder.email,
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