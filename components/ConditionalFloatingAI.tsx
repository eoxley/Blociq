'use client'

import { usePathname } from 'next/navigation'
import BrainButton from './BrainButton'

export default function ConditionalFloatingAI() {
  const pathname = usePathname()
  
  // Don't show the brain button on the home page or landing page
  if (pathname === '/home' || pathname === '/') {
    return null
  }
  
  return <BrainButton />
} 