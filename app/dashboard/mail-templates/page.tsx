'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import DashboardLayout from '../../components/DashboardLayout'

type MailTemplate = {
  id: number
  subject: string
  body: string
}

export default function MailTemplatesPage() {
  const [templates, setTemplates] = useState<MailTemplate[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase.from('mail_templates').select('*')
      if (error) console.error('Error fetching templates:', error)
      else setTemplates(data || [])
    }

    fetchTemplates()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-[#0F5D5D]">Mail Templates</h2>

        {templates.length === 0 ? (
          <p className="text-gray-600">No templates found.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <li key={template.id} className="border rounded-lg p-4 shadow bg-white">
                <h3 className="font-semibold text-lg mb-1">{template.subject}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{template.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
