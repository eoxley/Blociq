'use client'

import React from 'react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import { UK_COMPLIANCE_ITEMS } from '../../lib/complianceUtils'
import { Shield, AlertTriangle, Clock, CheckCircle, Building, Plus } from 'lucide-react'
import Link from 'next/link'

export default function CompliancePage() {
  const getRequirementBadge = (requiredIf: string) => {
    switch (requiredIf) {
      case 'always':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Always Required
          </span>
        )
      case 'if present':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            If Present
          </span>
        )
      case 'if HRB':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Shield className="h-3 w-3 mr-1" />
            HRB Only
          </span>
        )
      default:
        return null
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Safety': return 'border-red-200 bg-red-50'
      case 'Electrical': return 'border-yellow-200 bg-yellow-50'
      case 'Gas': return 'border-orange-200 bg-orange-50'
      case 'Health': return 'border-green-200 bg-green-50'
      case 'Insurance': return 'border-blue-200 bg-blue-50'
      case 'Structural': return 'border-purple-200 bg-purple-50'
      case 'Equipment': return 'border-gray-200 bg-gray-50'
      case 'Energy': return 'border-teal-200 bg-teal-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Safety': return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'Electrical': return <Shield className="h-5 w-5 text-yellow-600" />
      case 'Gas': return <Shield className="h-5 w-5 text-orange-600" />
      case 'Health': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'Insurance': return <Shield className="h-5 w-5 text-blue-600" />
      case 'Structural': return <Building className="h-5 w-5 text-purple-600" />
      case 'Equipment': return <Clock className="h-5 w-5 text-gray-600" />
      case 'Energy': return <Shield className="h-5 w-5 text-teal-600" />
      default: return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">UK Compliance Management</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive library of compliance requirements for UK leasehold block management
          </p>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Always Required</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {UK_COMPLIANCE_ITEMS.filter(item => item.required_if === 'always').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">If Present</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {UK_COMPLIANCE_ITEMS.filter(item => item.required_if === 'if present').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">HRB Only</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {UK_COMPLIANCE_ITEMS.filter(item => item.required_if === 'if HRB').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-8 w-8 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {UK_COMPLIANCE_ITEMS.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Items Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Compliance Requirements Library</h2>
            <Link
              href="/buildings"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              <Building className="h-4 w-4 mr-2" />
              Manage Building Compliance
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {UK_COMPLIANCE_ITEMS.map(item => (
              <div key={item.id} className={`p-6 rounded-lg border ${getCategoryColor(item.category)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {getCategoryIcon(item.category)}
                    <h3 className="ml-3 text-lg font-medium text-gray-900">{item.name}</h3>
                  </div>
                  {getRequirementBadge(item.required_if)}
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Frequency: {item.default_frequency}</span>
                  <span className="capitalize">{item.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/buildings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Building className="h-6 w-6 text-teal-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Configure Building Compliance</h4>
                <p className="text-sm text-gray-500">Set up compliance requirements for individual buildings</p>
              </div>
            </Link>
            
            <Link
              href="/compliance/setup"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-6 w-6 text-teal-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Add Custom Compliance Item</h4>
                <p className="text-sm text-gray-500">Create new compliance requirements for your portfolio</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}
