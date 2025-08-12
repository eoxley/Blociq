'use client'

import React, { useState, useEffect } from 'react'
import { X, Download, Send, Save, Edit, FileText, Mail, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface CommunicationModalProps {
  isOpen: boolean
  onClose: () => void
  aiContent: string
  templateType: 'letter' | 'email' | 'notice'
  buildingName?: string
  leaseholderName?: string | null
  unitNumber?: string | null
  onSave?: (template: any) => void
}

interface Placeholder {
  key: string
  value: string
  description: string
}

export default function CommunicationModal({
  isOpen,
  onClose,
  aiContent,
  templateType,
  buildingName = 'General',
  leaseholderName,
  unitNumber,
  onSave
}: CommunicationModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subject, setSubject] = useState('')
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([])
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && aiContent) {
      // Clean the AI content
      const cleanContent = aiContent.replace(/\*\*Used Context:\*\*[\s\S]*$/, '').trim()
      setContent(cleanContent)
      
      // Set default title based on type
      const defaultTitle = `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} - ${new Date().toLocaleDateString()}`
      setTitle(defaultTitle)
      
      // Set default subject for emails
      if (templateType === 'email') {
        setSubject(`Update from ${buildingName} - ${new Date().toLocaleDateString()}`)
      }
      
      // Initialize placeholders
      const defaultPlaceholders: Placeholder[] = [
        { key: '[LEASEHOLDER_NAME]', value: leaseholderName || '', description: 'Leaseholder name' },
        { key: '[UNIT_NUMBER]', value: unitNumber || '', description: 'Unit number' },
        { key: '[DATE]', value: new Date().toLocaleDateString('en-GB'), description: 'Current date' },
        { key: '[BUILDING_NAME]', value: buildingName, description: 'Building name' },
        { key: '[MANAGER_NAME]', value: '', description: 'Property manager name' },
        { key: '[COMPANY_NAME]', value: 'MIH Property Management', description: 'Company name' }
      ]
      setPlaceholders(defaultPlaceholders)
      
      // Set default values
      const defaultValues: Record<string, string> = {}
      defaultPlaceholders.forEach(p => {
        defaultValues[p.key] = p.value
      })
      setSelectedPlaceholders(defaultValues)
    }
      }, [isOpen, aiContent, templateType, buildingName, leaseholderName, unitNumber])

  const replacePlaceholders = (text: string) => {
    let result = text
    Object.entries(selectedPlaceholders).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    })
    return result
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const template = {
        title,
        content: replacePlaceholders(content),
        subject: templateType === 'email' ? replacePlaceholders(subject) : undefined,
        building_name: buildingName,
        template_type: templateType,
        created_from_ai: true,
        placeholders: selectedPlaceholders,
        notice_type: templateType === 'notice' ? 'general' : undefined,
        leaseholder_name: leaseholderName || null,
        unit_number: unitNumber || null
      }

      if (onSave) {
        onSave(template)
      }

      toast.success(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} template saved!`)
      onClose()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportPDF = async () => {
    setIsLoading(true)
    try {
      const finalContent = replacePlaceholders(content)
      
      // Create PDF content with MIH letterhead
      const pdfContent = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4f46e5; padding-bottom: 20px;">
            <h1 style="color: #4f46e5; margin: 0;">MIH Property Management</h1>
            <p style="color: #6b7280; margin: 5px 0;">Professional Property Management Services</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <p><strong>Date:</strong> ${selectedPlaceholders['[DATE]'] || new Date().toLocaleDateString('en-GB')}</p>
            <p><strong>Building:</strong> ${selectedPlaceholders['[BUILDING_NAME]'] || buildingName}</p>
            ${selectedPlaceholders['[LEASEHOLDER_NAME]'] ? `<p><strong>To:</strong> ${selectedPlaceholders['[LEASEHOLDER_NAME]']}</p>` : ''}
            ${selectedPlaceholders['[UNIT_NUMBER]'] ? `<p><strong>Unit:</strong> ${selectedPlaceholders['[UNIT_NUMBER]']}</p>` : ''}
          </div>
          
          <div style="line-height: 1.6; margin-bottom: 30px;">
            ${finalContent.replace(/\n/g, '<br>')}
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              <strong>${selectedPlaceholders['[COMPANY_NAME]'] || 'MIH Property Management'}</strong><br>
              ${selectedPlaceholders['[MANAGER_NAME]'] ? `Property Manager: ${selectedPlaceholders['[MANAGER_NAME]']}<br>` : ''}
              Professional Property Management Services
            </p>
          </div>
        </div>
      `

      // Create blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Failed to export PDF')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendEmail = async () => {
    setIsLoading(true)
    try {
      const finalContent = replacePlaceholders(content)
      const finalSubject = replacePlaceholders(subject)
      
      // Here you would integrate with your email sending logic
      // For now, we'll just show a success message
      toast.success('Email template ready! You can send it via Outlook.')
      
      // Log the action
      console.log('Email template prepared:', {
        subject: finalSubject,
        body: finalContent,
        placeholders: selectedPlaceholders
      })
      
    } catch (error) {
      console.error('Error preparing email:', error)
      toast.error('Failed to prepare email')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <CardHeader className="flex items-center justify-between border-b">
          <div className="flex items-center gap-3">
            {templateType === 'letter' && <FileText className="h-5 w-5 text-blue-600" />}
            {templateType === 'email' && <Mail className="h-5 w-5 text-green-600" />}
            {templateType === 'notice' && <AlertCircle className="h-5 w-5 text-purple-600" />}
            <div>
              <CardTitle className="text-lg">
                Create {templateType.charAt(0).toUpperCase() + templateType.slice(1)} from AI Response
              </CardTitle>
              <p className="text-sm text-gray-600">
                Edit and customize the AI-generated content
              </p>
            </div>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="p-1">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter template title"
                />
              </div>

              {/* Subject (for emails) */}
              {templateType === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject"
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter content"
                  rows={12}
                  className="resize-none overflow-y-auto"
                  style={{ minHeight: '300px', maxHeight: '400px' }}
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview (with placeholders replaced)
                </label>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-40 overflow-y-auto">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {replacePlaceholders(content)}
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholders Panel */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Dynamic Placeholders</h3>
                <div className="space-y-3">
                  {placeholders.map((placeholder) => (
                    <div key={placeholder.key} className="space-y-1">
                      <label className="block text-xs font-medium text-gray-600">
                        {placeholder.description}
                      </label>
                      <Input
                        value={selectedPlaceholders[placeholder.key] || ''}
                        onChange={(e) => setSelectedPlaceholders(prev => ({
                          ...prev,
                          [placeholder.key]: e.target.value
                        }))}
                        placeholder={placeholder.key}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="w-full"
                  size="sm"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Template
                </Button>

                <Button
                  onClick={handleExportPDF}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>

                {templateType === 'email' && (
                  <Button
                    onClick={handleSendEmail}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Tip:</strong> Use placeholders like [LEASEHOLDER_NAME] in your content. 
                  They will be automatically replaced with the values you set above.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 