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
  leaseholder?: Array<{
    full_name: string
    email: string
  }>
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
    .select('id, name, address, unit_count, created_at')
    .eq('id', building_id)
    .single()

  if (!building) {
    redirect('/home')
  }

  // 📦 Fetch all units for this building
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, type, floor')
    .eq('building_id', building_id)
    .order('unit_number')

  // Fetch leaseholders separately
  let leaseholders: any[] = []
  if (units && units.length > 0) {
    const unitIds = units.map(u => u.id)
    const { data: leaseholdersData, error: leaseholdersError } = await supabase
      .from('leaseholders')
      .select('id, unit_id, name, email, phone')
      .in('unit_id', unitIds)
    
    if (!leaseholdersError && leaseholdersData) {
      leaseholders = leaseholdersData
    }
  }

  // Combine units with their leaseholders
  const unitsWithLeaseholders = units?.map(unit => ({
    ...unit,
    leaseholder: leaseholders.filter(l => l.unit_id === unit.id)
  })) || []

  // Get recent documents for AI summary
  const { data: recentDocuments } = await supabase
    .from('documents')
    .select('created_at')
    .eq('building_id', building_id)
    .order('created_at', { ascending: false })
    .limit(1)

  const lastDocumentDate = recentDocuments?.[0]?.created_at
  const aiSummary = `This building has ${unitsWithLeaseholders?.length || 0} units. ${
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
          href="/home" 
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
                  {building.unit_count || unitsWithLeaseholders?.length || 0} units
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
            Units ({unitsWithLeaseholders?.length || 0})
          </h2>
        </div>

        {!unitsWithLeaseholders || unitsWithLeaseholders.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Found</h3>
            <p className="text-gray-500">No units have been added to this building yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unitsWithLeaseholders.map((unit) => (
              <div key={unit.id} className="p-4 border rounded shadow-sm hover:shadow-md transition">
                <h3 className="font-semibold text-lg mb-1">{unit.unit_number}</h3>

                {unit.leaseholder && unit.leaseholder.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-900 font-medium">{unit.leaseholder[0].name}</p>
                    <p className="text-sm text-gray-600">{unit.leaseholder[0].email}</p>
                    {unit.leaseholder[0].phone && (
                      <p className="text-sm text-gray-600">{unit.leaseholder[0].phone}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm italic text-red-400">Leaseholder not assigned</p>
                )}

                <Link href={`/buildings/${building_id}/units/${unit.id}`}>
                  <button className="mt-3 text-blue-600 hover:underline text-sm">
                    View Correspondence
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 