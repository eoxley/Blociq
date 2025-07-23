'use client'

import { usePathname } from 'next/navigation'
import FloatingBlocIQ from './FloatingBlocIQ'

export default function ConditionalFloatingAI() {
  const pathname = usePathname()
  
  // Don't show the floating AI on the home page
  if (pathname === '/home') {
    return null
  }
  
  return <FloatingBlocIQ />
} 