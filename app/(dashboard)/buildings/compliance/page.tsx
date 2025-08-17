import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Shield, AlertTriangle, CheckCircle, Clock, Calendar, Building, FileText } from 'lucide-react'
import Link from 'next/link'

// Helper function to calculate status
function calculateStatus(nextDueDate: string | null, lastRenewedDate: string | null): 'compliant' | 'overdue' | 'upcoming' | 'missing' {
  if (!nextDueDate) return 'missing'
  
  const now = new Date()
  const nextDue = new Date(nextDueDate)
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)
  
  if (nextDue < now) return 'overdue'
  if (nextDue < thirtyDaysFromNow) return 'upcoming'
  return 'compliant'
}

// Helper function to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// StatCard component
function StatCard({ label, value, icon: Icon, color }: { 
  label: string; 
  value: number; 
  icon: any; 
  color: string 
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="text-gray-600 text-sm font-medium">{label}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

// ComplianceTable component
function ComplianceTable({ data }: { data: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'upcoming':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'missing':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />
      case 'upcoming':
        return <Clock className="h-4 w-4" />
      case 'missing':
        return <Calendar className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Building
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Due
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Renewed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.asset_name}</div>
                    <div className="text-sm text-gray-500">{item.asset_category}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{item.building_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.next_due_date ? new Date(item.next_due_date).toLocaleDateString() : 'Not set'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.last_renewed_date ? new Date(item.last_renewed_date).toLocaleDateString() : 'Not set'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/buildings/${item.building_id}/compliance`}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Details
                    </Link>
                    {item.latest_document_id && (
                      <Link
                        href={`/buildings/${item.building_id}/compliance/documents/${item.latest_document_id}`}
                        className="text-green-600 hover:text-green-800"
                      >
                        <FileText className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance data found</h3>
          <p className="text-gray-500 mb-4">Set up compliance tracking for your buildings to see data here.</p>
          <Link
            href="/buildings"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Buildings
          </Link>
        </div>
      )}
    </div>
  )
}

export default async function CompliancePage() {
  const supabase = createClient(cookies())
  
  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      redirect('/login')
    }

    // Fetch all building compliance assets with joined data
    const { data: complianceData, error } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        building_id,
        asset_id,
        status,
        notes,
        next_due_date,
        last_renewed_date,
        latest_document_id,
        created_at,
        updated_at,
        buildings (
          id,
          name,
          address
        ),
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months
        )
      `)
      .order('next_due_date', { ascending: true })

    if (error) {
      console.error('Error fetching compliance data:', error)
      return (
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-red-600 font-semibold">Error loading compliance data</p>
                <p className="text-red-500 text-sm">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Transform and calculate status for each compliance item
    const transformedData = (complianceData || []).map(item => {
      const calculatedStatus = calculateStatus(item.next_due_date, item.last_renewed_date)
      
      return {
        id: item.id,
        building_id: item.building_id,
        asset_id: item.asset_id,
        status: calculatedStatus,
        notes: item.notes,
        next_due_date: item.next_due_date,
        last_renewed_date: item.last_renewed_date,
        latest_document_id: item.latest_document_id,
        building_name: item.buildings?.name || 'Unknown Building',
        building_address: item.buildings?.address || '',
        asset_name: item.compliance_assets?.title || 'Unknown Asset',
        asset_category: item.compliance_assets?.category || 'Unknown',
        asset_description: item.compliance_assets?.description || '',
        frequency_months: item.compliance_assets?.frequency_months || 12,
        created_at: item.created_at,
        updated_at: item.updated_at
      }
    })

    // Calculate summary statistics
    const totalCompliant = transformedData.filter(item => item.status === 'compliant').length
    const totalOverdue = transformedData.filter(item => item.status === 'overdue').length
    const totalUpcoming = transformedData.filter(item => item.status === 'upcoming').length
    const totalMissing = transformedData.filter(item => item.status === 'missing').length

      return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mb-8 rounded-2xl shadow-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Compliance Overview</h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Track and manage building compliance requirements across your portfolio
            </p>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Compliance Tracker</h2>
          <p className="text-gray-600 mt-1">Track and manage building compliance requirements across all properties</p>
        </div>
        <Link
          href="/buildings"
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Back to Buildings
        </Link>
      </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            label="Compliant" 
            value={totalCompliant} 
            icon={CheckCircle} 
            color="text-green-600" 
          />
          <StatCard 
            label="Overdue" 
            value={totalOverdue} 
            icon={AlertTriangle} 
            color="text-red-600" 
          />
          <StatCard 
            label="Upcoming" 
            value={totalUpcoming} 
            icon={Clock} 
            color="text-yellow-600" 
          />
          <StatCard 
            label="Missing" 
            value={totalMissing} 
            icon={Calendar} 
            color="text-gray-600" 
          />
        </div>

        {/* Live Tracker Table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Compliance Tracker</h2>
            <div className="text-sm text-gray-500">
              {transformedData.length} total compliance items
            </div>
          </div>
          <ComplianceTable data={transformedData} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/buildings"
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building className="h-5 w-5 text-[#4f46e5] mr-3" />
              <span className="text-gray-700">Manage Buildings</span>
            </Link>
            <Link
              href="/buildings/compliance/setup"
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Shield className="h-5 w-5 text-[#4f46e5] mr-3" />
              <span className="text-gray-700">Setup Compliance</span>
            </Link>
            <Link
              href="/buildings/compliance/reports"
              className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileText className="h-5 w-5 text-[#4f46e5] mr-3" />
              <span className="text-gray-700">View Reports</span>
            </Link>
          </div>
        </div>
      </div>
    )
    
  } catch (error) {
    console.error('Unexpected error in compliance page:', error)
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-red-600 font-semibold">Unexpected error</p>
              <p className="text-red-500 text-sm">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 