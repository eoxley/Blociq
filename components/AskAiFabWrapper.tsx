'use client'

import dynamic from 'next/dynamic'

const AskAiFab = dynamic(() => import('@/components/AskAiFab'), { ssr: false })

export default function AskAiFabWrapper({ href = '/ai-assistant' }: { href?: string }) {
  return <AskAiFab href={href} />
}
