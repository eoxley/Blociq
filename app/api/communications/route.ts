// Handles saving new communications to Supabase

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Database } from '../../../lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const { type, subject, content } = body

  const { data, error } = await supabase.from('communications').insert([
    {
      type,
      subject,
      content,
      sent: false,
    },
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
} 