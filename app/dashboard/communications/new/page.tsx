'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'

export default function NewCommunicationPage() {
  const router = useRouter()
  const [type, setType] = useState('email')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // You'll hook this up to Supabase later
    console.log('Sending...', type)
    router.push('/dashboard/communications')
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
          <Label>Subject / Title</Label>
          <Input placeholder="e.g. Service Charge Reminder" />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea placeholder="Enter your message or letter content..." rows={10} />
        </div>

        <Button type="submit">Send / Save</Button>
      </form>
    </div>
  )
} 