'use client'

import React, { useState, useMemo } from 'react'
import { Shield, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock, TrendingUp, FileText, Building, Users, Sparkles, Target, BarChart3 } from 'lucide-react'

interface ComplianceAsset {
  id: string
  name: string
  description: string
  category: string
  required_if: string
  default_frequency: string
  applies: boolean
  last_checked?: string
  next_due?: string
}

interface ComplianceClientProps {
  complianceAssets: ComplianceAsset[]
}

export default function ComplianceClient({ complianceAssets: initialAssets = [] }: ComplianceClientProps) {
  const [assets, setAssets] = useState<ComplianceAsset[]>(initialAssets)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'tracking' | 'setup'>('tracking')

  const toggleAsset = (assetId: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, applies: !asset.applies } : asset
    ))
  }

  const updateLastChecked = (assetId: string, date: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, last_checked: date } : asset
    ))
  }

  const updateNextDue = (assetId: string, date: string) => {
    setAssets(prev => prev.map(asset => 
      asset.id === assetId ? { ...asset, next_due: date } : asset
    ))
  }

  const getRequirementBadge = (requiredIf: string) => {
    if (!requiredIf) return null
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Required: {requiredIf}
      </span>
    )
  }

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase() || '') {
      case 'fire safety':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' }
      case 'electrical':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' }
      case 'plumbing':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' }
      case 'structural':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' }
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' }
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency?.toLowerCase() || '') {
      case 'monthly':
        return 'text-blue-600'
      case 'quarterly':
        return 'text-green-600'
      case 'annually':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Compliant
          </span>
        )
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        )
      default:
        return null
    }
  }

  const getPriorityIndicator = (asset: ComplianceAsset) => {
    const status = getComplianceStatus(asset)
    if (status === 'overdue') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (status === 'pending') {
      return <Clock className="h-4 w-4 text-yellow-500" />
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  const getComplianceStatus = (asset: ComplianceAsset) => {
    if (!asset.applies) return 'not-applicable'
    if (!asset.last_checked && !asset.next_due) return 'pending'
    
    const now = new Date()
    const nextDue = asset.next_due ? new Date(asset.next_due) : null
    
    if (nextDue && nextDue < now) {
      return 'overdue'
    }
    
    return 'compliant'
  }

  const getComplianceStats = () => {
    const total = assets.length
    const active = assets.filter(asset => asset.applies).length
    const compliant = assets.filter(asset => getComplianceStatus(asset) === 'compliant').length
    const overdue = assets.filter(asset => getComplianceStatus(asset) === 'overdue').length
    
    return { total, active, compliant, overdue }
  }

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => 
      (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (asset.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    )
  }, [assets, searchTerm])

  const stats = getComplianceStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Enhanced Hero Banner - BlocIQ Landing Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Compliance Management
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Track and manage building compliance requirements
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Enhanced Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-[#4f46e5]" />
                  <p className="text-gray-600 text-sm font-medium">Total Requirements</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-[#4f46e5]" />
                  <p className="text-gray-600 text-sm font-medium">Active Tracking</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-gray-600 text-sm font-medium">Compliant</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.compliant}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-gray-600 text-sm font-medium">Overdue</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Compliance Tracking</h2>
              <p className="text-gray-600">Manage and track compliance requirements</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search compliance items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all"
                />
              </div>
              
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('tracking')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'tracking' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Tracking
                </button>
                <button
                  onClick={() => setViewMode('setup')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'setup' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Setup
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'tracking' ? (
          <>
            <div className="grid gap-6">
              {filteredAssets.filter(asset => asset.applies).map((asset) => {
                const categoryColors = getCategoryColor(asset.category)
                const status = getComplianceStatus(asset)
                
                return (
                  <div key={asset.id} className={`bg-white rounded-xl shadow-sm border ${categoryColors.border} hover:shadow-md transition-all duration-300`}>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {getPriorityIndicator(asset)}
                            <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                            {getRequirementBadge(asset.required_if)}
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-gray-600 mb-4">{asset.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <span className={`font-medium ${getFrequencyColor(asset.default_frequency)} flex items-center gap-1`}>
                              <Calendar className="h-4 w-4" />
                              {asset.default_frequency}
                            </span>
                            <span className={`font-medium ${categoryColors.text} flex items-center gap-1`}>
                              <Building className="h-4 w-4" />
                              {asset.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right text-sm text-gray-500">
                            {asset.last_checked && (
                              <div className="mb-1">
                                Last checked: {new Date(asset.last_checked).toLocaleDateString()}
                              </div>
                            )}
                            {asset.next_due && (
                              <div>
                                Next due: {new Date(asset.next_due).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => {
                              setViewMode('setup')
                            }}
                            className="px-4 py-2 text-sm rounded-xl transition-all duration-200 font-medium bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white hover:brightness-110 shadow-sm hover:shadow-md"
                          >
                            {asset.applies ? 'Update Tracking' : 'Start Tracking'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {searchTerm && filteredAssets.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No matching compliance items</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search terms or browse all compliance items.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl hover:brightness-110 transition-all duration-200 font-medium shadow-sm"
                >
                  Clear Search
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Building Compliance Setup</h2>
              <p className="text-gray-600 mb-6">Configure which compliance requirements apply to your building and set tracking dates.</p>

              <div className="grid gap-4">
                {assets.map((asset) => {
                  const categoryColors = getCategoryColor(asset.category)
                  const status = getComplianceStatus(asset)
                  
                  return (
                    <div key={asset.id} className={`rounded-xl border ${categoryColors.border} ${categoryColors.bg} p-4`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                            {getRequirementBadge(asset.required_if)}
                            {getStatusBadge(status)}
                          </div>
                          <p className="text-gray-600 mb-3">{asset.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className={`font-medium ${getFrequencyColor(asset.default_frequency)}`}>
                              Frequency: {asset.default_frequency}
                            </span>
                            <span className={`font-medium ${categoryColors.text}`}>
                              Category: {asset.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              checked={asset.applies}
                              onChange={() => toggleAsset(asset.id)}
                              className="accent-[#4f46e5]"
                            />
                            Applies
                          </label>

                          {asset.applies && (
                            <div className="flex flex-col gap-2">
                              <input
                                type="date"
                                value={asset.last_checked || ''}
                                onChange={(e) => updateLastChecked(asset.id, e.target.value)}
                                className="text-xs border px-3 py-2 rounded-xl bg-white focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all"
                                placeholder="Last checked"
                              />
                              <input
                                type="date"
                                value={asset.next_due || ''}
                                onChange={(e) => updateNextDue(asset.id, e.target.value)}
                                className="text-xs border px-3 py-2 rounded-xl bg-white focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all"
                                placeholder="Next due"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}