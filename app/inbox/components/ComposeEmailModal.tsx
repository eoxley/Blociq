'use client'

import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Send, Loader2, User, Building, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Contact {
  id: string
  email: string
  name: string | null
}

interface Building {
  id: string
  name: string
}

interface ComposeEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onEmailSent?: () => void
}

export default function ComposeEmailModal({ 
  isOpen, 
  onClose, 
  onEmailSent 
}: ComposeEmailModalProps) {
  const supabase = createClientComponentClient()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [showContactSuggestions, setShowContactSuggestions] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false)

  // Fetch contacts and buildings on mount
  useEffect(() => {
    if (isOpen) {
      fetchContacts()
      fetchBuildings()
    }
  }, [isOpen])

  // Filter contacts based on "to" input
  useEffect(() => {
    if (to.trim()) {
      const filtered = contacts.filter(contact =>
        contact.email.toLowerCase().includes(to.toLowerCase()) ||
        (contact.name && contact.name.toLowerCase().includes(to.toLowerCase()))
      )
      setFilteredContacts(filtered)
      setShowContactSuggestions(filtered.length > 0)
    } else {
      setFilteredContacts([])
      setShowContactSuggestions(false)
    }
  }, [to, contacts])

  const fetchContacts = async () => {
    setIsLoadingContacts(true)
    try {
      const { data, error } = await supabase
        .from('known_contacts')
        .select('id, email, name')
        .order('last_contacted', { ascending: false })
        .limit(20)
      
      if (!error && data) {
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setIsLoadingContacts(false)
    }
  }

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name', { ascending: true })
      
      if (!error && data) {
        setBuildings(data)
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  const selectContact = (contact: Contact) => {
    setTo(contact.email)
    setShowContactSuggestions(false)
  }

  const handleAIDraft = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject first')
      return
    }

    setIsGeneratingDraft(true)
    try {
      const response = await fetch('/api/generate-new-email-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          recipient: to.trim() || null,
          building_id: selectedBuilding || null,
          context: null,
          purpose: subject.trim()
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setBody(result.draft)
        toast.success('AI draft generated successfully')
      } else {
        toast.error(result.error || 'Failed to generate AI draft')
      }
    } catch (error) {
      console.error('Error generating AI draft:', error)
      toast.error('Failed to generate AI draft')
    } finally {
      setIsGeneratingDraft(false)
    }
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/send-new-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          buildingId: selectedBuilding || null
        }),
      })

      const result = await response.json()

      if (response.ok && result.status === 'sent') {
        toast.success('✅ Email sent successfully')
        
        // Log contact
        await logContact(to.trim(), null)
        
        // Close modal and reset form
        handleClose()
        onEmailSent?.()
      } else {
        toast.error(result.message || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    } finally {
      setIsSending(false)
    }
  }

  const logContact = async (email: string, name: string | null) => {
    try {
      await supabase
        .from('known_contacts')
        .upsert({
          email: email.toLowerCase(),
          name,
          last_contacted: new Date().toISOString()
        }, {
          onConflict: 'user_id,email'
        })
    } catch (error) {
      console.error('Error logging contact:', error)
    }
  }

  const handleClose = () => {
    setTo('')
    setSubject('')
    setBody('')
    setSelectedBuilding('')
    setShowContactSuggestions(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">New Email</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* To Field */}
          <div className="space-y-2">
            <Label htmlFor="to">To:</Label>
            <div className="relative">
              <Input
                id="to"
                type="email"
                placeholder="Enter email address..."
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={() => setShowContactSuggestions(true)}
                className="pr-10"
              />
              {isLoadingContacts && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
            
            {/* Contact Suggestions */}
            {showContactSuggestions && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => selectContact(contact)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{contact.name || 'No name'}</div>
                      <div className="text-sm text-gray-500">{contact.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject:</Label>
              <span className="text-xs text-gray-500">Required for AI Draft</span>
            </div>
            <Input
              id="subject"
              placeholder="Enter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Building Selection (Optional) */}
          {buildings.length > 0 && (
            <div className="space-y-2">
              <Label>Building (Optional):</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedBuilding === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBuilding('')}
                >
                  None
                </Button>
                {buildings.map((building) => (
                  <Button
                    key={building.id}
                    variant={selectedBuilding === building.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedBuilding(building.id)}
                  >
                    <Building className="h-4 w-4 mr-1" />
                    {building.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Body Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="body">Message:</Label>
              <div className="flex items-center gap-2">
                {!subject.trim() && (
                  <span className="text-xs text-gray-500">Enter subject first</span>
                )}
                <Button
                  onClick={handleAIDraft}
                  disabled={isGeneratingDraft || !subject.trim()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  title={!subject.trim() ? "Please enter a subject first to generate AI draft" : "Generate AI-powered email draft"}
                >
                  {isGeneratingDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {isGeneratingDraft ? 'Generating...' : '🧠 AI Draft'}
                </Button>
              </div>
            </div>
            <Textarea
              id="body"
              placeholder="Enter your message or click 'AI Draft' to generate content (subject required)..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            ❌ Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending || !to.trim() || !subject.trim() || !body.trim()}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? 'Sending...' : '✈️ Send'}
          </Button>
        </div>
      </div>
    </div>
  )
} 