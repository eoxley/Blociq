'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  FileText,
  ScrollText,
  Shield,
  ChevronLeft
} from 'lucide-react'

interface BuildingNavigationProps {
  buildingId: string
  buildingName: string
}

const NAVIGATION_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    icon: Building2,
    href: '',
    description: 'Building details and information'
  },
  {
    key: 'documents',
    label: 'Document Library',
    icon: FileText,
    href: '/documents',
    description: 'Upload & manage documents • AI-powered'
  },
  {
    key: 'compliance',
    label: 'Compliance',
    icon: Shield,
    href: '/compliance',
    description: 'Compliance tracking and alerts'
  }
]

export default function BuildingNavigation({ buildingId, buildingName }: BuildingNavigationProps) {
  const pathname = usePathname()

  const getActiveTab = () => {
    if (pathname.includes('/documents')) return 'documents'
    if (pathname.includes('/lease-mode')) return 'lease-mode'
    if (pathname.includes('/compliance')) return 'compliance'
    return 'overview'
  }

  const activeTab = getActiveTab()

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      {/* Building Header */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/buildings"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back to Buildings</span>
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{buildingName}</h1>
              <p className="text-sm text-gray-600">Building Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex space-x-8 -mb-px">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.key
            const href = `/buildings/${buildingId}${item.href}`

            return (
              <Link
                key={item.key}
                href={href}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}