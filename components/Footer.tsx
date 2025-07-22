'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { LogOut, Settings } from 'lucide-react'
import BlocIQLogo from '@/components/BlocIQLogo'

export default function Footer() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Check if we should show the account/logout links
  const shouldShowAccountLinks = pathname && 
    pathname !== '/' && 
    !pathname.startsWith('/inbox')

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4 text-xs text-gray-600">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-teal-600 rounded-md flex items-center justify-center shadow-sm">
                <BlocIQLogo className="text-white" size={14} />
              </div>
              <span className="ml-1.5 font-medium text-gray-900 text-xs">BlocIQ</span>
            </div>
            <span className="text-xs">&copy; BlocIQ Ltd. All rights reserved.</span>
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <Link 
              href="/privacy-policy" 
              className="text-gray-600 hover:text-[#0F5D5D] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              className="text-gray-600 hover:text-[#0F5D5D] transition-colors"
            >
              Terms
            </Link>
            <Link 
              href="/cookies" 
              className="text-gray-600 hover:text-[#0F5D5D] transition-colors"
            >
              Cookies
            </Link>
            <Link 
              href="/accessibility" 
              className="text-gray-600 hover:text-[#0F5D5D] transition-colors"
            >
              Accessibility
            </Link>
            
            {/* Account and Logout Links - Only show on non-landing, non-inbox pages */}
            {shouldShowAccountLinks && (
              <>
                <span className="text-gray-300">|</span>
                <Link 
                  href="/account" 
                  className="text-gray-600 hover:text-[#0F5D5D] transition-colors flex items-center gap-1"
                >
                  <Settings className="h-3 w-3" />
                  Account
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-[#0F5D5D] transition-colors flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            AI-Powered Property Management Platform
          </p>
        </div>
      </div>
    </footer>
  )
} 