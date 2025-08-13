import { NextResponse } from 'next/server'
import { getToken, moveMessage, moveMessagesBatch } from '@/lib/outlook/graph-move'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Body = {
  messageId?: string
  messageIds?: string[]
  destinationId: string
  sourceFolderId?: string // optional sanity check
}

export async function POST(req: Request) {
  try {
    const token = await getToken(req)
    const body = (await req.json()) as Body
    const { messageId, messageIds, destinationId } = body || {}

    if (!destinationId) {
      return NextResponse.json({ success: false, error: 'destinationId required' }, { status: 400 })
    }

    // Single move
    if (messageId) {
      const moved = await moveMessage(token, messageId, destinationId)
      return NextResponse.json({ success: true, movedId: moved?.id })
    }

    // Batch move
    if (messageIds?.length) {
      const results = await moveMessagesBatch(token, messageIds, destinationId)
      const ok = results.filter(r => r.ok).length
      return NextResponse.json({ success: true, moved: ok, total: results.length, results })
    }

    return NextResponse.json({ success: false, error: 'messageId or messageIds[] is required' }, { status: 400 })
  } catch (e: any) {
    console.error('move route error:', e?.message || e)
    return NextResponse.json({ success: false, error: e?.message || 'unexpected error' }, { status: 500 })
  }
}
