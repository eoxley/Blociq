'use client'

import DashboardLayout from '../../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

type MailTemplate = {
  id: number
  subject: string
  body: string
}


export default function MailMergePage() {
  const [templates, setTemplates] = useState<MailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase.from('mail_templates').select('*')
      if (error) console.error('Error loading templates:', error)
      else setTemplates(data || [])
    }

    fetchTemplates()
  }, [])

  const selected = templates.find(t => t.id === selectedTemplate)

  return (
    <DashboardLayout>
      <div>
        <h2 className="text-xl font-bold mb-4">Mail Merge</h2>

        <label className="block mb-2 font-medium">Choose a template:</label>
        <select
          onChange={(e) => setSelectedTemplate(Number(e.target.value))}
          className="mb-4 p-2 border rounded"
          value={selectedTemplate || ''}
        >
          <option value="">-- Select --</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.subject}
            </option>
          ))}
        </select>

        {selected && (
          <div className="border p-4 rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Preview</h2>
            <p><strong>Subject:</strong> {selected.subject}</p>
            <p className="mt-2 whitespace-pre-wrap"><strong>Body:</strong><br />{selected.body}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
