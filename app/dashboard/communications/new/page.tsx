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
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, subject, content }),
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