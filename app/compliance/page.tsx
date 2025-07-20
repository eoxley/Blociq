import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function CompliancePage() {
  const supabase = createClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  try {
    // Fetch all buildings for compliance selection
    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching buildings:', error)
      return (
        <LayoutWithSidebar>
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Compliance</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">Error loading buildings: {error.message}</p>
              <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
            </div>
          </div>
        </LayoutWithSidebar>
      )
    }

    return (
      <LayoutWithSidebar>
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-bold mb-4">Compliance</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              <strong>Select a building</strong> to view its compliance information and requirements.
            </p>
          </div>

          {buildings && buildings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((building) => (
                <Link
                  key={building.id}
                  href={`/compliance/${building.id}`}
                  className="block p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {building.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    View compliance requirements and status
                  </p>
                  <div className="mt-3 text-sm text-blue-600">
                    Click to view →
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>No buildings found.</strong> Please add buildings to your portfolio to view compliance information.
              </p>
            </div>
          )}

          <div className="mt-8 bg-gray-50 border rounded-lg p-4">
            <h2 className="text-lg font-medium mb-2">Compliance Overview</h2>
            <p className="text-sm text-gray-600 mb-3">
              Each building has specific compliance requirements that need to be tracked and maintained:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Fire Risk Assessments</li>
              <li>• Electrical Installation Condition Reports (EICR)</li>
              <li>• Gas Safety Certificates</li>
              <li>• Energy Performance Certificates (EPC)</li>
              <li>• Building Insurance</li>
              <li>• And more...</li>
            </ul>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('Unexpected error in compliance page:', error)
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Compliance</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">An unexpected error occurred while loading compliance data.</p>
            <p className="text-red-500 text-sm mt-2">Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 