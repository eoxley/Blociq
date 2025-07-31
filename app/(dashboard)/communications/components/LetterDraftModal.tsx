'use client'

import React, { useState } from 'react'
import { FileText, Download, Send, X } from 'lucide-react'
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

interface LetterDraftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leaseholder?: Leaseholder
  building?: { id: string; name: string; address: string }
  isBulk?: boolean
}

export default function LetterDraftModal({
  open,
  onOpenChange,
  leaseholder,
  building,
  isBulk = false
}: LetterDraftModalProps) {
  const [loading, setLoading] = useState(false)
  const [letterForm, setLetterForm] = useState({
    subject: '',
    content: '',
    template: ''
  })

  const handleGeneratePDF = () => {
    toast.info('PDF generation coming soon!')
  }

  const handleMarkAsSent = async () => {
    if (!letterForm.subject || !letterForm.content) {
      toast.error('Please fill in both subject and content')
      return
    }

    try {
      setLoading(true)

      if (isBulk && building) {
        // Bulk letter to all leaseholders in building
        const { data: leaseholders, error } = await supabase
          .from('leaseholders')
          .select(`
            id,
            full_name,
            correspondence_address,
            units (
              unit_number,
              buildings (id)
            )
          `)
          .eq('units.buildings.id', building.id)

        if (error) throw error

        if (!leaseholders || leaseholders.length === 0) {
          toast.error('No leaseholders found in this building')
          return
        }

        // Log each letter
        for (const lh of leaseholders) {
          await logCommunication({
            type: 'letter',
            leaseholder_id: lh.id,
            leaseholder_name: lh.full_name,
            building_name: building.name,
            unit_number: lh.units?.unit_number || '',
            subject: letterForm.subject,
            content: letterForm.content
          })
        }

        toast.success(`Letter prepared for ${leaseholders.length} leaseholders`)
      } else if (leaseholder) {
        // Individual letter
        await logCommunication({
          type: 'letter',
          leaseholder_id: leaseholder.id,
          leaseholder_name: leaseholder.full_name,
          building_name: leaseholder.building_name,
          unit_number: leaseholder.unit_number,
          subject: letterForm.subject,
          content: letterForm.content
        })

        toast.success(`Letter prepared for ${leaseholder.full_name}`)
      }

      // Reset form and close modal
      setLetterForm({ subject: '', content: '', template: '' })
      onOpenChange(false)
    } catch (error) {
      console.error('Error sending letter:', error)
      toast.error('Failed to send letter')
    } finally {
      setLoading(false)
    }
  }

  const logCommunication = async (communication: {
    type: 'letter'
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
        addressInfo: 'Multiple addresses'
      }
    } else if (leaseholder) {
      return {
        title: `To: ${leaseholder.full_name}`,
        subtitle: leaseholder.correspondence_address || 'No correspondence address',
        addressInfo: leaseholder.correspondence_address ? 'Has address' : 'No address'
      }
    }
    return { title: '', subtitle: '', addressInfo: '' }
  }

  const recipientInfo = getRecipientInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Draft Letter
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipient Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium">{recipientInfo.title}</h4>
            <p className="text-sm text-gray-600">{recipientInfo.subtitle}</p>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline">{recipientInfo.addressInfo}</Badge>
              {leaseholder && (
                <Badge variant="outline">
                  {leaseholder.building_name} - Unit {leaseholder.unit_number}
                </Badge>
              )}
            </div>
          </div>

          {/* Letter Form */}
          <div>
            <Label htmlFor="letter-subject">Subject</Label>
            <Input
              id="letter-subject"
              value={letterForm.subject}
              onChange={(e) => setLetterForm({ ...letterForm, subject: e.target.value })}
              placeholder="Enter letter subject..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="letter-content">Content</Label>
            <Textarea
              id="letter-content"
              value={letterForm.content}
              onChange={(e) => setLetterForm({ ...letterForm, content: e.target.value })}
              placeholder="Enter your letter content..."
              rows={10}
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
              variant="outline" 
              onClick={handleGeneratePDF}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate PDF
            </Button>
            <Button 
              onClick={handleMarkAsSent} 
              disabled={loading || (!letterForm.subject || !letterForm.content)}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Sending...' : 'Mark as Sent'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 