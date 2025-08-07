import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface NotFoundProps {
  title?: string
  message?: string
}

export default function NotFound({ 
  title = "Page Not Found", 
  message = "We couldn't find the page you're looking for." 
}: NotFoundProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <Link 
          href="/buildings"
          className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity inline-block"
        >
          Back to Buildings
        </Link>
      </div>
    </div>
  )
}