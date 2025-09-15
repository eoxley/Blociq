"use client"

import { useState, memo } from 'react'
import { useAgency, useCurrentAgency } from '@/hooks/useAgency'
import { ChevronDownIcon, BuildingOfficeIcon, CheckIcon } from '@heroicons/react/24/outline'

interface AgencySwitcherProps {
  className?: string
  showLabel?: boolean
}

const AgencySwitcher = memo(function AgencySwitcher({ 
  className = "", 
  showLabel = true 
}: AgencySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  
  // Gracefully handle missing AgencyProvider context
  let switchToAgency, agency, agencies, loading
  try {
    const agencyContext = useAgency()
    const currentAgencyContext = useCurrentAgency()
    switchToAgency = agencyContext.switchToAgency
    agency = currentAgencyContext.agency
    agencies = currentAgencyContext.agencies
    loading = currentAgencyContext.loading
  } catch (error) {
    // If not within AgencyProvider, render nothing or fallback
    if (process.env.NODE_ENV === 'development') {
      console.warn('AgencySwitcher used outside AgencyProvider context')
    }
    return null
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          {showLabel && (
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          )}
        </div>
      </div>
    )
  }

  if (!agency || agencies.length <= 1) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="w-8 h-8 bg-[#4f46e5] rounded-lg flex items-center justify-center">
          <BuildingOfficeIcon className="w-5 h-5 text-white" />
        </div>
        {showLabel && agency && (
          <div className="text-sm font-medium text-gray-900">
            {agency.name}
          </div>
        )}
      </div>
    )
  }

  const handleSwitch = async (agencyId: string) => {
    if (agencyId === agency.id || switching) return
    
    setSwitching(true)
    setIsOpen(false)
    
    try {
      await switchToAgency(agencyId)
      // Refresh the page to ensure all data is updated with new agency context
      window.location.reload()
    } catch (error) {
      console.error('Failed to switch agency:', error)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div className={`relative ${className}`} key={agency?.id || 'default'}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
      >
        {/* Agency Logo/Icon */}
        <div className="w-8 h-8 bg-[#4f46e5] rounded-lg flex items-center justify-center flex-shrink-0">
          {agency?.logo_url ? (
            <img 
              src={agency.logo_url} 
              alt={agency.name || 'Agency'}
              className="w-6 h-6 rounded object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}
          <BuildingOfficeIcon className={`w-5 h-5 text-white ${agency?.logo_url ? 'hidden' : ''}`} />
        </div>

        {/* Agency Name */}
        {showLabel && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {agency.name}
            </div>
            <div className="text-xs text-gray-500">
              {agencies.length} {agencies.length === 1 ? 'agency' : 'agencies'}
            </div>
          </div>
        )}

        {/* Dropdown Arrow */}
        <ChevronDownIcon 
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          } ${switching ? 'animate-spin' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
              Switch Agency
            </div>
            
            {agencies.map((memberAgency) => {
              const agencyData = memberAgency.agency
              if (!agencyData) return null
              
              const isSelected = agencyData.id === agency.id
              
              return (
                <button
                  key={agencyData.id}
                  onClick={() => handleSwitch(agencyData.id)}
                  disabled={switching}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Agency Icon */}
                  <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-[#4f46e5]' : 'bg-gray-200'
                  }`}>
                    {agencyData.logo_url ? (
                      <img 
                        src={agencyData.logo_url} 
                        alt={agencyData.name}
                        className="w-4 h-4 rounded object-cover"
                      />
                    ) : (
                      <BuildingOfficeIcon className={`w-3 h-3 ${
                        isSelected ? 'text-white' : 'text-gray-500'
                      }`} />
                    )}
                  </div>

                  {/* Agency Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${
                      isSelected ? 'text-[#4f46e5]' : 'text-gray-900'
                    }`}>
                      {agencyData.name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {memberAgency.role}
                    </div>
                  </div>

                  {/* Selected Check */}
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-[#4f46e5] flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
})

export default AgencySwitcher
