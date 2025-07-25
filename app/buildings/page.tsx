import React from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { 
  Building2, 
  MapPin, 
  Users, 
  Plus,
  Eye,
  ArrowRight
} from 'lucide-react'

export default async function BuildingsPage() {
  // Create Supabase client with service role key for server-side queries
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all buildings with RLS-safe query
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching buildings:', error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Error Loading Buildings
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Unable to load your buildings at this time. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 py-20">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <div className="mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                Your Buildings
              </h1>
              <p className="text-xl md:text-2xl text-teal-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Manage all properties under your agency
              </p>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-8 right-8 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-8 left-8 w-24 h-24 bg-white/5 rounded-full"></div>
      </section>

      {/* Buildings Grid Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {buildings && buildings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {buildings.map((building) => (
                <div 
                  key={building.id}
                  className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  {/* Building Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Building2 className="h-8 w-8 text-white" />
                  </div>

                  {/* Building Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    🏢 {building.name}
                  </h3>

                  {/* Address */}
                  {building.address && (
                    <div className="flex items-start gap-3 mb-4">
                      <MapPin className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-600 leading-relaxed">
                        📍 {building.address}
                      </p>
                    </div>
                  )}

                  {/* Unit Count */}
                  {building.unit_count && (
                    <div className="flex items-center gap-3 mb-6">
                      <Users className="h-5 w-5 text-teal-600" />
                      <p className="text-gray-600">
                        🧱 {building.unit_count} {building.unit_count === 1 ? 'unit' : 'units'}
                      </p>
                    </div>
                  )}

                  {/* View Button */}
                  <Link 
                    href={`/buildings/${building.id}`}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full justify-center"
                  >
                    <Eye className="h-5 w-5" />
                    🔐 View Building
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                No Buildings Yet
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Get started by adding your first building to your portfolio. 
                You'll be able to manage units, compliance, and communications all in one place.
              </p>
              <Link 
                href="/buildings/create"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Plus className="h-6 w-6" />
                Create Your First Building
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {buildings && buildings.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Add Another Building
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Expand your portfolio by adding more properties to manage.
              </p>
              <Link 
                href="/buildings/create"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <Plus className="h-6 w-6" />
                Add New Building
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
} 