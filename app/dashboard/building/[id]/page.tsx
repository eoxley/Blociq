import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, Brain, Calendar } from 'lucide-react'

interface Building {
  id: string
  name: string
  address: string | null
  unit_count: number | null
  created_at: string | null
}

interface Unit {
  id: string
  unit_number: string
  leaseholder_id: string | null
}

export default async function DashboardBuildingPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id: building_id } = await params
  
  const supabase = createServerComponentClient({ cookies })
  
  // Secure the route using Supabase Auth
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Get building data
  const { data: building } = await supabase
    .from('buildings')
    .select('id, name, address, unit_count')
    .eq('id', building_id)
    .single()

  if (!building) {
    redirect('/dashboard')
  }

  // Get units for this building
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, leaseholder_id')
    .eq('building_id', building_id)
    .order('unit_number')

  // Get recent documents for AI summary
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select('created_at')
    .eq('building_id', building_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastDocumentDate = recentDocuments?.[0]?.created_at
  const aiSummary = `This building has ${units?.length || 0} units. ${
    lastDocumentDate 
      ? `Last document was uploaded on ${new Date(lastDocumentDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}.`
      : 'No documents have been uploaded yet.'
  }`

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-teal-600 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Building Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {building.name}
            </h1>
            {building.address && (
              <p className="text-lg text-gray-600">
                {building.address}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-5 w-5" />
                <span className="font-medium">
                  {building.unit_count || units?.length || 0} units
                </span>
              </div>
              {building.created_at && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-5 w-5" />
                  <span>
                    Added {new Date(building.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <Brain className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">AI Summary</h3>
              <p className="text-blue-800">{aiSummary}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Units Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Units ({units?.length || 0})
          </h2>
        </div>

        {!units || units.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h3>
            <p className="text-gray-500">No units have been added to this building yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {units.map((unit) => (
              <Link
                key={unit.id}
                href={`/dashboard/building/${building_id}/unit/${unit.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-teal-300 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                    {unit.unit_number}
                  </h3>
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-600">
                  {unit.leaseholder_id ? (
                    <span className="text-green-600 font-medium">Occupied</span>
                  ) : (
                    <span className="text-gray-500 italic">Available</span>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Click to view details
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 