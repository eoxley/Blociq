'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export default function SearchBar({ onSearch, placeholder = "Search emails...", className = "" }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  
  // Debounce search to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Trigger search when debounced query changes
  useEffect(() => {
    onSearch(debouncedSearchQuery)
  }, [debouncedSearchQuery, onSearch])

  const handleClear = useCallback(() => {
    setSearchQuery('')
    onSearch('')
  }, [onSearch])

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Clear search"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      
      {/* Search suggestions could go here */}
      {isFocused && searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-2">
          <div className="text-sm text-gray-500">
            Search for: {searchQuery}
          </div>
        </div>
      )}
    </div>
  )
}
