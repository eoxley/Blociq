'use client'

import React, { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Home,
  Scissors,
  AlertTriangle,
  DollarSign,
  FileText,
  Bell,
  Gavel,
  PawPrint,
  Briefcase,
  Wrench,
  RotateCcw,
  ArrowLeft
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'

interface LeaseClause {
  id: string
  clause_type: string
  original_text: string
  ai_summary: string
  interpretation: string
  parties: any
  obligations: any
  permissions: any
  restrictions_data: any
  confidence_score: number
  extraction_method: string
}

interface Lease {
  id: string
  unit_number: string
  leaseholder_name: string
  start_date: string
  end_date: string
  status: string
  ground_rent: string
  service_charge_percentage: number
}

interface ClauseViewerProps {
  lease: Lease
  buildingId: string
  onBack: () => void
}

interface ClauseSection {
  type: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  clauses: LeaseClause[]
}

export default function ClauseViewer({ lease, buildingId, onBack }: ClauseViewerProps) {
  const { supabase } = useSupabase()
  const [clauses, setClauses] = useState<LeaseClause[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchLeaseClauses()
  }, [lease.id])

  const fetchLeaseClauses = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_clauses')
        .select('*')
        .eq('lease_id', lease.id)
        .order('clause_type')

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          // Table doesn't exist - handle gracefully
          console.log('Lease clauses table not yet available')
          setClauses([])
        } else {
          throw error
        }
      } else {
        setClauses(data || [])
      }
    } catch (error) {
      console.error('Error fetching lease clauses:', error)
      // Don't show error toast for missing table - just log it
      console.log('Lease clause analysis feature not yet available')
      setClauses([])
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionType: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionType)) {
      newExpanded.delete(sectionType)
    } else {
      newExpanded.add(sectionType)
    }
    setExpandedSections(newExpanded)
  }

  const clauseSections: ClauseSection[] = [
    {
      type: 'insurance',
      title: 'Insurance Obligations',
      icon: Shield,
      description: 'Insurance requirements and responsibilities',
      clauses: clauses.filter(c => c.clause_type === 'insurance')
    },
    {
      type: 'assignment',
      title: 'Assignment Rights',
      icon: FileText,
      description: 'Rules for transferring lease ownership',
      clauses: clauses.filter(c => c.clause_type === 'assignment')
    },
    {
      type: 'subletting',
      title: 'Subletting Rules',
      icon: Home,
      description: 'Permissions and restrictions for subletting',
      clauses: clauses.filter(c => c.clause_type === 'subletting')
    },
    {
      type: 'consents',
      title: 'Consent Requirements',
      icon: FileText,
      description: 'Activities requiring landlord consent',
      clauses: clauses.filter(c => c.clause_type === 'consents')
    },
    {
      type: 'alterations',
      title: 'Alterations & Improvements',
      icon: Wrench,
      description: 'Rules for modifying the property',
      clauses: clauses.filter(c => c.clause_type === 'alterations')
    },
    {
      type: 'pets',
      title: 'Pet Policy',
      icon: PawPrint,
      description: 'Rules regarding pets in the property',
      clauses: clauses.filter(c => c.clause_type === 'pets')
    },
    {
      type: 'business_use',
      title: 'Business Use',
      icon: Briefcase,
      description: 'Commercial activity permissions',
      clauses: clauses.filter(c => c.clause_type === 'business_use')
    },
    {
      type: 'restrictions',
      title: 'General Restrictions',
      icon: AlertTriangle,
      description: 'General prohibitions and limitations',
      clauses: clauses.filter(c => c.clause_type === 'restrictions')
    },
    {
      type: 'ground_rent',
      title: 'Ground Rent',
      icon: DollarSign,
      description: 'Ground rent obligations and payment terms',
      clauses: clauses.filter(c => c.clause_type === 'ground_rent')
    },
    {
      type: 'service_charge',
      title: 'Service Charges',
      icon: DollarSign,
      description: 'Service charge obligations and calculations',
      clauses: clauses.filter(c => c.clause_type === 'service_charge')
    },
    {
      type: 'repairs',
      title: 'Repair Responsibilities',
      icon: Wrench,
      description: 'Maintenance and repair obligations',
      clauses: clauses.filter(c => c.clause_type === 'repairs')
    },
    {
      type: 'notices',
      title: 'Notices & Communications',
      icon: Bell,
      description: 'Notice requirements and procedures',
      clauses: clauses.filter(c => c.clause_type === 'notices')
    },
    {
      type: 'forfeiture',
      title: 'Forfeiture Clauses',
      icon: Gavel,
      description: 'Conditions for lease termination',
      clauses: clauses.filter(c => c.clause_type === 'forfeiture')
    },
    {
      type: 'renewals',
      title: 'Renewal Terms',
      icon: RotateCcw,
      description: 'Lease renewal and extension provisions',
      clauses: clauses.filter(c => c.clause_type === 'renewals')
    }
  ].filter(section => section.clauses.length > 0)

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lease Index
          </button>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lease Index
        </button>
      </div>

      {/* Lease Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lease.unit_number} - Clause Analysis
            </h1>
            <p className="text-gray-600 mt-1">{lease.leaseholder_name}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Lease Term</div>
            <div className="font-medium">
              {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <div className="text-sm text-gray-500">Status</div>
            <div className="font-medium capitalize">{lease.status}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Ground Rent</div>
            <div className="font-medium">{lease.ground_rent}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Service Charge</div>
            <div className="font-medium">{lease.service_charge_percentage}%</div>
          </div>
        </div>
      </div>

      {/* Clause Sections */}
      {clauseSections.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Clause Analysis Available</h3>
          <p className="text-gray-500">
            This lease hasn't been analyzed for detailed clauses yet.
            Clause extraction will be available once the lease document is processed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Lease Clauses & Terms</h2>

          {clauseSections.map(section => {
            const Icon = section.icon
            const isExpanded = expandedSections.has(section.type)

            return (
              <div key={section.type} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleSection(section.type)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{section.title}</div>
                      <div className="text-sm text-gray-500">{section.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                      {section.clauses.length} clause{section.clauses.length !== 1 ? 's' : ''}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {section.clauses.map((clause, index) => (
                      <div key={clause.id} className="p-6 border-b border-gray-100 last:border-b-0">
                        <div className="space-y-4">
                          {/* AI Summary */}
                          {clause.ai_summary && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                                {clause.ai_summary}
                              </p>
                            </div>
                          )}

                          {/* Interpretation */}
                          {clause.interpretation && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">Interpretation</h4>
                              <p className="text-sm text-gray-700">
                                {clause.interpretation}
                              </p>
                            </div>
                          )}

                          {/* Structured Data */}
                          {(clause.obligations || clause.permissions || clause.restrictions_data) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {clause.obligations && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                    Obligations
                                  </h5>
                                  <div className="text-sm text-gray-700">
                                    {typeof clause.obligations === 'string'
                                      ? clause.obligations
                                      : JSON.stringify(clause.obligations, null, 2)
                                    }
                                  </div>
                                </div>
                              )}

                              {clause.permissions && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                    Permissions
                                  </h5>
                                  <div className="text-sm text-gray-700">
                                    {typeof clause.permissions === 'string'
                                      ? clause.permissions
                                      : JSON.stringify(clause.permissions, null, 2)
                                    }
                                  </div>
                                </div>
                              )}

                              {clause.restrictions_data && (
                                <div>
                                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                    Restrictions
                                  </h5>
                                  <div className="text-sm text-gray-700">
                                    {typeof clause.restrictions_data === 'string'
                                      ? clause.restrictions_data
                                      : JSON.stringify(clause.restrictions_data, null, 2)
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Original Text */}
                          {clause.original_text && (
                            <details className="mt-4">
                              <summary className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600">
                                View Original Clause Text
                              </summary>
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono">
                                {clause.original_text}
                              </div>
                            </details>
                          )}

                          {/* Confidence Score */}
                          {clause.confidence_score && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Confidence:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${clause.confidence_score * 100}%` }}
                                ></div>
                              </div>
                              <span>{Math.round(clause.confidence_score * 100)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}