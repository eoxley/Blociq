'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, Building, User, Home, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BlocIQCard, BlocIQCardContent } from '@/components/ui/blociq-card'

interface SearchResult {
  id: string
  label: string
  type: 'building' | 'leaseholder' | 'unit'
  building_id?: string
}

interface SmartSearchProps {
  className?: string
}

export default function SmartSearch({ className = "" }: SmartSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounced search function
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    setLoading(true)
    setError(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/search-entities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: query.trim() }),
        })

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        setResults(data.results || [])
        setShowDropdown(true)
      } catch (err) {
        console.error('Search error:', err)
        setError('Search failed. Please try again.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleResultClick = (result: SearchResult) => {
    setShowDropdown(false)
    setQuery('')

    switch (result.type) {
      case 'building':
        router.push(`/dashboard/buildings/${result.id}`)
        break
      case 'leaseholder':
        // For leaseholders, we could open a modal or navigate to a leaseholder page
        // For now, let's navigate to the building page if we have building_id
        if (result.building_id) {
          router.push(`/dashboard/buildings/${result.building_id}`)
        }
        break
      case 'unit':
        // For units, navigate to the building page
        if (result.building_id) {
          router.push(`/dashboard/buildings/${result.building_id}`)
        }
        break
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'building':
        return <Building className="h-4 w-4" />
      case 'leaseholder':
        return <User className="h-4 w-4" />
      case 'unit':
        return <Home className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'building':
        return 'Building'
      case 'leaseholder':
        return 'Leaseholder'
      case 'unit':
        return 'Unit'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search buildings, leaseholders, or units…"
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent text-sm"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        )}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery('')
              setResults([])
              setShowDropdown(false)
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (results.length > 0 || error) && (
        <div className="absolute z-50 w-full mt-2">
          <BlocIQCard className="shadow-xl border-0">
            <BlocIQCardContent className="p-0">
              {error ? (
                <div className="p-4 text-center text-red-600 text-sm">
                  {error}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 text-gray-400">
                        {getTypeIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {result.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getTypeLabel(result.type)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </BlocIQCardContent>
          </BlocIQCard>
        </div>
      )}
    </div>
  )
} 