'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { supabase } from '@/utils/supabase/client'

export default function NewCommunicationPage() {
  const router = useRouter()

  const [type, setType] = useState('email')
  const [sendMethod, setSendMethod] = useState<'letter' | 'email'>('email')

  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [unitId, setUnitId] = useState<string | undefined>()

  const [buildings, setBuildings] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [leaseholders, setLeaseholders] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [templateId, setTemplateId] = useState<string | undefined>()

  useEffect(() => {
    const fetchData = async () => {
      const { data: bldgs } = await supabase.from('buildings').select('id, name')
      setBuildings(bldgs || [])

      const { data: allUnits } = await supabase.from('units').select('id, unit_number, building_id')
      setUnits(allUnits || [])

      const { data: lholders } = await supabase
        .from('leaseholders')
        .select('id, name, email, unit_id')

      setLeaseholders(lholders || [])

      const { data: tmplts } = await supabase
        .from('communication_templates')
        .select('id, name, subject, content, type')
        .order('created_at', { ascending: false })

      setTemplates(tmplts || [])
    }

    fetchData()
  }, [])

  const filteredUnits = units.filter((u) => u.building_id === buildingId)
  const recipients = leaseholders.filter((l) =>
    unitId ? l.unit_id === unitId : filteredUnits.map((u) => u.id).includes(l.unit_id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (sendMethod === 'letter') {
      const res = await fetch('/api/communications/generate-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject,
          content,
          building_id: buildingId,
          unit_id: unitId,
        }),
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `letters-${Date.now()}.zip`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Failed to generate letters')
      }

      return
    }

    // Fallback: save/send email
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          subject,
          content,
          building_id: buildingId,
          unit_id: unitId,
          template_id: templateId,
          send_method: sendMethod,
          recipient_ids: recipients.map((r) => r.id),
        }),
      })

      if (res.ok) {
        router.push('/dashboard/communications')
      } else {
        console.error('Failed to save communication')
      }
    } catch (error) {
      console.error('Error sending communication:', error)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">New Communication</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Load from Template</Label>
          <Select 
            value={templateId} 
            onChange={(e) => {
              const selected = templates.find((t) => t.id === e.target.value)
              setTemplateId(e.target.value)
              if (selected) {
                setType(selected.type)
                setSubject(selected.subject)
                setContent(selected.content)
              }
            }}
          >
            <option value="">Select a template (optional)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="email">Email</option>
            <option value="letter">Letter</option>
            <option value="announcement">Announcement</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Send Method</Label>
          <Select value={sendMethod} onChange={(e) => setSendMethod(e.target.value as 'email' | 'letter')}>
            <option value="email">Email</option>
            <option value="letter">Letter (PDF)</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Building</Label>
          <Select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
            <option value="">Select a building</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Unit (optional)</Label>
          <Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Select a unit</option>
            {filteredUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_number}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Subject / Title</Label>
          <Input 
            placeholder="e.g. Service Charge Reminder" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea 
            placeholder="Enter your message or letter content..." 
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        {sendMethod === 'email' && recipients.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Will send to {recipients.length} leaseholder{recipients.length > 1 ? 's' : ''}:{' '}
            {recipients.map((r) => r.email).join(', ')}
          </div>
        )}

        {sendMethod === 'letter' && recipients.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Letter will be generated for postal addresses of: {recipients.map((r) => r.name).join(', ')}
          </div>
        )}

        <Button type="submit">{sendMethod === 'email' ? 'Send Email' : 'Generate Letter'}</Button>
      </form>
    </div>
  )
} 