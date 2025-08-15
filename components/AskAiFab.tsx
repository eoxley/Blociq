'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain } from 'lucide-react'

/**
 * A minimal floating action button that links to /ai-assistant.
 * Hides itself on the Ask AI page to avoid duplication.
 */
export default function AskAiFab({ href = '/ai-assistant' }: { href?: string }) {
  const pathname = usePathname()
  const isOnAsk = pathname?.startsWith(href)
  const isOnLandingPage = pathname === '/'
  const isOnInbox = pathname?.startsWith('/inbox')
  
  // Hide on Ask AI pages, landing page, and inbox page
  if (isOnAsk || isOnLandingPage || isOnInbox) return null

  return (
    <Link
      href={href}
      aria-label="Open Ask AI"
      className="fixed z-50 bottom-6 right-6 group focus:outline-none"
      prefetch
    >
      <span className="sr-only">Open Ask AI</span>
      <div className="relative">
        {/* gentle pulse */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-gradient-to-r from-[#4f46e5] to-[#a855f7]" />
        <div
          className="
            w-14 h-14 rounded-full grid place-items-center
            bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white shadow-lg
            transition-transform duration-150
            hover:scale-[1.03] active:scale-95
          "
          role="button"
          tabIndex={0}
        >
          <Brain className="w-6 h-6" aria-hidden="true" />
        </div>
      </div>
    </Link>
  )
}
