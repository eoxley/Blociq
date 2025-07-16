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
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [buildingId, setBuildingId] = useState<string | undefined>()
  const [unitId, setUnitId] = useState<string | undefined>()

  const [buildings, setBuildings] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: bldgs } = await supabase.from('buildings').select('id, name')
      setBuildings(bldgs || [])

      const { data: allUnits } = await supabase.from('units').select('id, unit_number, building_id')
      setUnits(allUnits || [])
    }

    fetchData()
  }, [])

  const filteredUnits = units.filter((u) => u.building_id === buildingId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
        }),
      })

      if (res.ok) {
        router.push('/dashboard/communications')
      } else {
        console.error('Failed to save communication')
      }
    } catch (error) {
      console.error('Error saving communication:', error)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">New Communication</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="email">Email</option>
            <option value="letter">Letter</option>
            <option value="announcement">Announcement</option>
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

        <Button type="submit">Send / Save</Button>
      </form>
    </div>
  )
} 