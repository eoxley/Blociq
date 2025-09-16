'use client'

import { ArrowLeft, Building2, Mail, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import CommunicationsLog from '@/components/communications/CommunicationsLog'

interface Building {
  id: string
  name: string
  address: string | null
}

interface BuildingCommunicationsClientProps {
  building: Building
}

export default function BuildingCommunicationsClient({ building }: BuildingCommunicationsClientProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/buildings/${building.id}`}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Building
          </Link>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-12 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <MessageSquare className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Communications
            </h1>
            <div className="flex items-center justify-center gap-2 text-white/90 mb-2">
              <Building2 className="h-5 w-5" />
              <span className="text-lg">{building.name}</span>
            </div>
            {building.address && (
              <p className="text-white/80">
                {building.address}
              </p>
            )}
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Communications Log */}
      <div className="px-6">
        <CommunicationsLog
          buildingId={building.id}
          title={`Communications for ${building.name}`}
          showFilters={true}
          limit={100}
        />
      </div>

      {/* Quick Actions */}
      <div className="px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/communications`}
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <Mail className="h-5 w-5 text-teal-600 mr-3 group-hover:text-teal-700" />
              <span className="text-gray-700 group-hover:text-gray-900">Send New Communication</span>
            </Link>
            <Link
              href={`/buildings/${building.id}/units`}
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <Building2 className="h-5 w-5 text-teal-600 mr-3 group-hover:text-teal-700" />
              <span className="text-gray-700 group-hover:text-gray-900">View Leaseholders</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}