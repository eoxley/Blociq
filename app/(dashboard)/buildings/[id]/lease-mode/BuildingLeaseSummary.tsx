'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield,
  PawPrint,
  Home,
  Briefcase,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'

interface BuildingLeaseSummary {
  id: string
  building_id: string
  insurance_summary: any
  pets_summary: any
  subletting_summary: any
  alterations_summary: any
  business_use_summary: any
  discrepancies: any
  total_leases: number
  analyzed_leases: number
  last_analysis_date: string
}

interface BuildingLeaseSummaryProps {
  buildingId: string
  buildingName: string
}

interface SummaryCard {
  title: string
  icon: React.ComponentType<{ className?: string }>
  status: 'allowed' | 'restricted' | 'mixed' | 'unknown'
  summary: string
  details?: string[]
  leaseCount?: number
  totalLeases?: number
}

export default function BuildingLeaseSummary({ buildingId, buildingName }: BuildingLeaseSummaryProps) {
  const { supabase } = useSupabase()
  const [summary, setSummary] = useState<BuildingLeaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    fetchBuildingSummary()
  }, [buildingId])

  const fetchBuildingSummary = async () => {
    try {
      // First try to get pre-computed building lease summary
      const { data: existingSummary, error: summaryError } = await supabase
        .from('building_lease_summary')
        .select('*')
        .eq('building_id', buildingId)
        .single()

      if (existingSummary && !summaryError) {
        setSummary(existingSummary)
        setLoading(false)
        return
      }

      // If no pre-computed summary exists or table doesn't exist, generate from lease data
      console.log('Building lease summary table not available, generating from lease data...')

      // Fetch leases for this building that have analysis data
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select(`
          id,
          unit_number,
          leaseholder_name,
          building_id,
          unit_id,
          scope,
          analysis_json,
          created_at
        `)
        .eq('building_id', buildingId)
        .not('analysis_json', 'is', null)

      if (leasesError) {
        throw leasesError
      }

      if (!leases || leases.length === 0) {
        setSummary(null)
        setLoading(false)
        return
      }

      // Generate building summary from lease analysis data
      const buildingSummary = generateBuildingSummaryFromLeases(leases)
      setSummary(buildingSummary)

    } catch (error) {
      console.error('Error fetching building lease summary:', error)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const generateBuildingSummaryFromLeases = (leases: any[]) => {
    const totalLeases = leases.length
    const analyzedLeases = leases.filter(lease => lease.analysis_json).length

    // Aggregate data from all leases
    const insuranceSummaries: any[] = []
    const petsSummaries: any[] = []
    const sublettingSummaries: any[] = []
    const alterationsSummaries: any[] = []
    const businessUseSummaries: any[] = []

    leases.forEach(lease => {
      if (lease.analysis_json) {
        const analysis = lease.analysis_json

        // Extract clause summaries from analysis
        if (analysis.clauses || analysis.extracted_clauses) {
          const clauses = analysis.clauses || analysis.extracted_clauses

          // Insurance
          if (clauses.insurance || clauses.insurance_clause) {
            insuranceSummaries.push(clauses.insurance || clauses.insurance_clause)
          }

          // Pets
          if (clauses.pets || clauses.pets_clause) {
            petsSummaries.push(clauses.pets || clauses.pets_clause)
          }

          // Subletting
          if (clauses.subletting || clauses.assignment_subletting) {
            sublettingSummaries.push(clauses.subletting || clauses.assignment_subletting)
          }

          // Alterations
          if (clauses.alterations || clauses.alterations_clause) {
            alterationsSummaries.push(clauses.alterations || clauses.alterations_clause)
          }

          // Business use
          if (clauses.business_use || clauses.permitted_use) {
            businessUseSummaries.push(clauses.business_use || clauses.permitted_use)
          }
        }
      }
    })

    // Create summary based on aggregated data
    const buildingSummary: BuildingLeaseSummary = {
      id: `generated-${buildingId}`,
      building_id: buildingId,
      insurance_summary: createClauseSummary('Insurance', insuranceSummaries, totalLeases),
      pets_summary: createClauseSummary('Pet Policy', petsSummaries, totalLeases),
      subletting_summary: createClauseSummary('Subletting', sublettingSummaries, totalLeases),
      alterations_summary: createClauseSummary('Alterations', alterationsSummaries, totalLeases),
      business_use_summary: createClauseSummary('Business Use', businessUseSummaries, totalLeases),
      discrepancies: {},
      total_leases: totalLeases,
      analyzed_leases: analyzedLeases,
      last_analysis_date: new Date().toISOString()
    }

    return buildingSummary
  }

  const createClauseSummary = (title: string, summaries: any[], totalLeases: number) => {
    if (summaries.length === 0) {
      return {
        status: 'unknown',
        summary: `No ${title.toLowerCase()} clauses found in analyzed leases`,
        applicable_leases: 0,
        details: []
      }
    }

    // Determine status based on clause content analysis
    const allowedTerms = ['permitted', 'allowed', 'may', 'can', 'consent not required']
    const restrictedTerms = ['prohibited', 'not permitted', 'forbidden', 'consent required', 'landlord approval']

    let allowedCount = 0
    let restrictedCount = 0
    const details: string[] = []

    summaries.forEach((summary, index) => {
      const text = typeof summary === 'string' ? summary : JSON.stringify(summary)
      const lowerText = text.toLowerCase()

      if (allowedTerms.some(term => lowerText.includes(term))) {
        allowedCount++
      } else if (restrictedTerms.some(term => lowerText.includes(term))) {
        restrictedCount++
      }

      details.push(text.length > 200 ? text.substring(0, 200) + '...' : text)
    })

    let status = 'unknown'
    let summaryText = `${title} provisions vary by lease`

    if (allowedCount > restrictedCount) {
      status = 'allowed'
      summaryText = `${title} is generally permitted across most leases`
    } else if (restrictedCount > allowedCount) {
      status = 'restricted'
      summaryText = `${title} generally requires consent or is restricted`
    } else if (allowedCount > 0 && restrictedCount > 0) {
      status = 'mixed'
      summaryText = `${title} policies vary significantly between leases`
    }

    return {
      status,
      summary: summaryText,
      applicable_leases: summaries.length,
      details: details.slice(0, 5) // Limit to 5 details
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'allowed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'restricted':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'mixed':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'allowed':
        return 'bg-green-50 border-green-200'
      case 'restricted':
        return 'bg-red-50 border-red-200'
      case 'mixed':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Building Analysis Available</h3>
        <p className="text-gray-500">
          Building-wide lease analysis will be available once lease documents are uploaded and processed.
        </p>
      </div>
    )
  }

  // Build summary cards from the data
  const summaryCards: SummaryCard[] = []

  // Insurance Summary
  if (summary.insurance_summary) {
    const insurance = summary.insurance_summary as any
    summaryCards.push({
      title: 'Insurance',
      icon: Shield,
      status: insurance.status || 'unknown',
      summary: insurance.summary || 'Insurance obligations vary by lease',
      details: insurance.details || [],
      leaseCount: insurance.applicable_leases,
      totalLeases: summary.total_leases
    })
  }

  // Pets Summary
  if (summary.pets_summary) {
    const pets = summary.pets_summary as any
    summaryCards.push({
      title: 'Pet Policy',
      icon: PawPrint,
      status: pets.status || 'unknown',
      summary: pets.summary || 'Pet policies vary by lease',
      details: pets.details || [],
      leaseCount: pets.applicable_leases,
      totalLeases: summary.total_leases
    })
  }

  // Subletting Summary
  if (summary.subletting_summary) {
    const subletting = summary.subletting_summary as any
    summaryCards.push({
      title: 'Subletting',
      icon: Home,
      status: subletting.status || 'unknown',
      summary: subletting.summary || 'Subletting rules vary by lease',
      details: subletting.details || [],
      leaseCount: subletting.applicable_leases,
      totalLeases: summary.total_leases
    })
  }

  // Alterations Summary
  if (summary.alterations_summary) {
    const alterations = summary.alterations_summary as any
    summaryCards.push({
      title: 'Alterations',
      icon: Wrench,
      status: alterations.status || 'unknown',
      summary: alterations.summary || 'Alteration rules vary by lease',
      details: alterations.details || [],
      leaseCount: alterations.applicable_leases,
      totalLeases: summary.total_leases
    })
  }

  // Business Use Summary
  if (summary.business_use_summary) {
    const businessUse = summary.business_use_summary as any
    summaryCards.push({
      title: 'Business Use',
      icon: Briefcase,
      status: businessUse.status || 'unknown',
      summary: businessUse.summary || 'Business use rules vary by lease',
      details: businessUse.details || [],
      leaseCount: businessUse.applicable_leases,
      totalLeases: summary.total_leases
    })
  }

  // Add placeholder cards if no data
  if (summaryCards.length === 0) {
    const placeholders = [
      { title: 'Insurance', icon: Shield },
      { title: 'Pet Policy', icon: PawPrint },
      { title: 'Subletting', icon: Home },
      { title: 'Alterations', icon: Wrench },
      { title: 'Business Use', icon: Briefcase }
    ]

    placeholders.forEach(placeholder => {
      summaryCards.push({
        title: placeholder.title,
        icon: placeholder.icon,
        status: 'unknown',
        summary: 'No analysis available yet',
        totalLeases: summary.total_leases
      })
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Building-Wide Lease Summary</h2>
          <p className="text-sm text-gray-500 mt-1">
            Aggregated rules and clauses across all leases in {buildingName}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {summary.analyzed_leases} of {summary.total_leases} leases analyzed
          </div>
          {summary.last_analysis_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Last updated: {new Date(summary.last_analysis_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon
          const isExpanded = expandedCard === card.title

          return (
            <div
              key={card.title}
              className={`border rounded-lg transition-all duration-200 hover:shadow-md ${getStatusColor(card.status)}`}
            >
              <button
                onClick={() => setExpandedCard(isExpanded ? null : card.title)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-gray-700" />
                    <h3 className="font-medium text-gray-900">{card.title}</h3>
                  </div>
                  {getStatusIcon(card.status)}
                </div>

                <p className="text-sm text-gray-700 mb-3">{card.summary}</p>

                {card.leaseCount !== undefined && card.totalLeases && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Applies to {card.leaseCount} of {card.totalLeases} leases</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${(card.leaseCount / card.totalLeases) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </button>

              {isExpanded && card.details && card.details.length > 0 && (
                <div className="border-t border-gray-200 p-4 bg-white/50">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Details:</h4>
                  <ul className="space-y-1">
                    {card.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Discrepancies */}
      {summary.discrepancies && Object.keys(summary.discrepancies).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900 mb-2">Lease Discrepancies Detected</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Some leases have different terms for the same obligations. Review these carefully:
              </p>
              <div className="space-y-2">
                {Object.entries(summary.discrepancies).map(([type, details]) => (
                  <div key={type} className="text-sm">
                    <span className="font-medium text-yellow-900 capitalize">{type}:</span>
                    <span className="text-yellow-800 ml-2">
                      {typeof details === 'string' ? details : JSON.stringify(details)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {summary.analyzed_leases < summary.total_leases && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Analysis In Progress</h3>
              <p className="text-sm text-blue-800">
                {summary.total_leases - summary.analyzed_leases} lease{summary.total_leases - summary.analyzed_leases !== 1 ? 's' : ''}
                {' '}still need detailed clause analysis. Upload and process lease documents to complete the building summary.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}