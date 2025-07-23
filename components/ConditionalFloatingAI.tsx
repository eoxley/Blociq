'use client'

import { usePathname } from 'next/navigation'
import FloatingBlocIQ from './FloatingBlocIQ'

export default function ConditionalFloatingAI() {
  const pathname = usePathname()
  
  // Don't show the floating AI on the home page or landing page
  if (pathname === '/home' || pathname === '/') {
    return null
  }
  
  return <FloatingBlocIQ />
} 