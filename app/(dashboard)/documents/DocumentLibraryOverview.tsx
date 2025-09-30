'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Folder, 
  Building2, 
  Microscope, 
  Shield, 
  Wrench, 
  Calendar,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  document_count: number
  recent_uploads: number
}

interface DocumentStats {
  total_documents: number
  recent_uploads: number
  pending_ocr: number
  completed_ocr: number
}

interface CategoryCounts {
  lease_lab: number
  compliance: number
  major_works: number
  general: number
}

export default function DocumentLibraryOverview() {
  const { supabase } = useSupabase()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [stats, setStats] = useState<DocumentStats>({
    total_documents: 0,
    recent_uploads: 0,
    pending_ocr: 0,
    completed_ocr: 0
  })
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    lease_lab: 0,
    compliance: 0,
    major_works: 0,
    general: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name')

      if (buildingsError) throw buildingsError

      // Fetch document counts for each building separately
      const buildingsWithCounts = await Promise.all(
        (buildingsData || []).map(async (building) => {
          try {
            const { count: documentCount, error: countError } = await supabase
              .from('building_documents')
              .select('id', { count: 'exact', head: true })
              .eq('building_id', building.id)

            if (countError) {
              // Log error but don't show toast for missing tables
              console.error(`Error counting documents for building ${building.id}:`, countError)
              return {
                id: building.id,
                name: building.name,
                document_count: 0,
                recent_uploads: 0
              }
            }

            return {
              id: building.id,
              name: building.name,
              document_count: documentCount || 0,
              recent_uploads: 0 // We'll calculate this separately
            }
          } catch (error) {
            console.error(`Exception counting documents for building ${building.id}:`, error)
            return {
              id: building.id,
              name: building.name,
              document_count: 0,
              recent_uploads: 0
            }
          }
        })
      )

      setBuildings(buildingsWithCounts)

      // Fetch overall document stats from dedicated API endpoint
      try {
        const statsResponse = await fetch('/api/documents/stats')
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        } else {
          console.error('Error fetching document stats:', statsResponse.statusText)
          setStats({
            total_documents: 0,
            recent_uploads: 0,
            pending_ocr: 0,
            completed_ocr: 0
          })
        }
      } catch (statsError) {
        console.error('Exception fetching document stats:', statsError)
        setStats({
          total_documents: 0,
          recent_uploads: 0,
          pending_ocr: 0,
          completed_ocr: 0
        })
      }

      // Fetch category counts
      try {
        const categoryCounts: CategoryCounts = {
          lease_lab: 0,
          compliance: 0,
          major_works: 0,
          general: 0
        }

        // Fetch lease lab documents
        try {
          const leaseLabResponse = await fetch('/api/lease-lab/jobs')
          if (leaseLabResponse.ok) {
            const leaseLabData = await leaseLabResponse.json()
            categoryCounts.lease_lab = leaseLabData.jobs?.length || 0
          }
        } catch (error) {
          console.error('Error fetching lease lab count:', error)
        }

        // Fetch compliance documents
        try {
          const complianceResponse = await fetch('/api/compliance-lab/jobs')
          if (complianceResponse.ok) {
            const complianceData = await complianceResponse.json()
            categoryCounts.compliance = complianceData.jobs?.length || 0
          }
        } catch (error) {
          console.error('Error fetching compliance count:', error)
        }

        // Fetch major works documents (TODO: Create this endpoint)
        try {
          const majorWorksResponse = await fetch('/api/major-works-lab/jobs')
          if (majorWorksResponse.ok) {
            const majorWorksData = await majorWorksResponse.json()
            categoryCounts.major_works = majorWorksData.jobs?.length || 0
          }
        } catch (error) {
          console.error('Error fetching major works count:', error)
        }

        // Fetch general documents
        try {
          const generalResponse = await fetch('/api/general-lab/jobs')
          if (generalResponse.ok) {
            const generalData = await generalResponse.json()
            categoryCounts.general = generalData.jobs?.length || 0
          }
        } catch (error) {
          console.error('Error fetching general docs count:', error)
        }

        setCategoryCounts(categoryCounts)
      } catch (error) {
        console.error('Error fetching category counts:', error)
      }

    } catch (error) {
      console.error('Error fetching document library data:', error)

      // Set fallback data to prevent UI crashes
      setBuildings([])
      setStats({
        total_documents: 0,
        recent_uploads: 0,
        pending_ocr: 0,
        completed_ocr: 0
      })

      // Only show toast for unexpected errors, not missing tables
      if (error instanceof Error && !error.message.includes('does not exist')) {
        toast.error('Failed to load document library data')
      }
    } finally {
      setLoading(false)
    }
  }

  const documentCategories = [
    {
      name: 'Lease Lab',
      description: 'Specialized lease analysis and extraction',
      icon: Microscope,
      href: '/documents/lease-lab',
      color: 'bg-purple-500',
      count: categoryCounts.lease_lab
    },
    {
      name: 'Compliance',
      description: 'EICRs, Fire Risk Assessments, Insurance',
      icon: Shield,
      href: '/documents/compliance',
      color: 'bg-blue-500',
      count: categoryCounts.compliance
    },
    {
      name: 'Major Works',
      description: 'Project documentation and contracts',
      icon: Wrench,
      href: '/documents/major-works',
      color: 'bg-orange-500',
      count: categoryCounts.major_works
    },
    {
      name: 'General',
      description: 'Minutes, correspondence, other documents',
      icon: FileText,
      href: '/documents/general',
      color: 'bg-gray-500',
      count: categoryCounts.general
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Document Library
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Centralized document management for your property portfolio. Upload, organize, and let BlocIQ's AI do the heavy lifting.
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_documents}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recent_uploads}</p>
                <p className="text-xs text-gray-500">Last 7 days</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending_ocr}</p>
                <p className="text-xs text-gray-500">OCR in progress</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Ready</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed_ocr}</p>
                <p className="text-xs text-gray-500">Searchable by AI</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {/* Document Categories */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Document Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {documentCategories.map((category) => (
            <Link key={category.name} href={category.href}>
              <BlocIQCard className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <BlocIQCardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${category.color} text-white`}>
                      <category.icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">{category.count} documents</span>
                    <BlocIQBadge variant="secondary" className="text-xs">
                      AI Powered
                    </BlocIQBadge>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Buildings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Buildings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map((building) => (
            <Link key={building.id} href={`/buildings/${building.id}/documents`}>
              <BlocIQCard className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                <BlocIQCardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{building.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">{building.document_count} documents</span>
                    <BlocIQBadge variant="outline" className="text-xs">
                      View Library
                    </BlocIQBadge>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/documents/lease-lab">
            <BlocIQCard className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 border-purple-200 hover:border-purple-300">
              <BlocIQCardContent className="p-6 text-center">
                <div className="p-4 rounded-full bg-purple-100 text-purple-600 mx-auto mb-4 w-fit">
                  <Microscope className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Lease</h3>
                <p className="text-sm text-gray-600 mb-4">Get detailed lease analysis and extraction</p>
                <BlocIQBadge variant="default" className="text-xs">
                  AI Analysis
                </BlocIQBadge>
              </BlocIQCardContent>
            </BlocIQCard>
          </Link>

          <Link href="/buildings">
            <BlocIQCard className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 border-blue-200 hover:border-blue-300">
              <BlocIQCardContent className="p-6 text-center">
                <div className="p-4 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4 w-fit">
                  <Building2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Browse Buildings</h3>
                <p className="text-sm text-gray-600 mb-4">Access building-specific document libraries</p>
                <BlocIQBadge variant="outline" className="text-xs">
                  View All
                </BlocIQBadge>
              </BlocIQCardContent>
            </BlocIQCard>
          </Link>

          <Link href="/home">
            <BlocIQCard className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 border-green-200 hover:border-green-300">
              <BlocIQCardContent className="p-6 text-center">
                <div className="p-4 rounded-full bg-green-100 text-green-600 mx-auto mb-4 w-fit">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask BlocIQ</h3>
                <p className="text-sm text-gray-600 mb-4">Query your documents with AI</p>
                <BlocIQBadge variant="default" className="text-xs">
                  AI Powered
                </BlocIQBadge>
              </BlocIQCardContent>
            </BlocIQCard>
          </Link>
        </div>
      </div>
    </div>
  )
}
