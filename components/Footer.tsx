import Link from 'next/link'
import BlocIQLogo from '@/components/BlocIQLogo'

export default function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
                <BlocIQLogo className="text-white" size={18} />
              </div>
              <span className="ml-2 font-semibold text-gray-900">BlocIQ</span>
            </div>
            <span>&copy; {new Date().getFullYear()} BlocIQ Ltd. All rights reserved.</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
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
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            BlocIQ - AI-Powered Property Management Platform
          </p>
        </div>
      </div>
    </footer>
  )
} 