'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'

export default function CommunicationsPage() {
  const [tab, setTab] = useState('templates')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Communications</h1>
        <Button asChild>
          <Link href="/dashboard/communications/new">+ New Communication</Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="letters">Letters & Notices</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardContent className="p-4">
              <p>No email templates yet. Click "New" to get started.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="letters">
          <Card>
            <CardContent className="p-4">
              <p>No letters or notices created yet.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          <Card>
            <CardContent className="p-4">
              <p>No announcements sent yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 