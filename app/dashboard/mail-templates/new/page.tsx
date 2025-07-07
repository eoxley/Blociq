'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import DashboardLayout from '../../components/DashboardLayout'

type MailTemplate = {
  id: string
  subject: string
  body: string
  created_by: string
}

export default function MailTemplatesPage() {
  const [templates, setTemplates] = useState<MailTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) {
        console.error('User not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('mail_templates')
        .select('*')
        .eq('created_by', userId)

      if (error) {
        console.error('Error fetching templates:', error)
      } else {
        setTemplates(data || [])
      }

      setLoading(false)
    }

    fetchTemplates()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#0F5D5D]">My Email Templates</h2>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-gray-600">No templates yet. Create one!</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <li
                key={template.id}
                className="bg-white border shadow-sm p-4 rounded-xl"
              >
                <h3 className="font-semibold text-lg mb-1">{template.subject}</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {template.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  )
}
