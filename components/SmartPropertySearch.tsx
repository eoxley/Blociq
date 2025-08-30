"use client";

import React, { useState } from 'react';
import { searchWithSmartMatching, UnitSearchMatcher, LeaseholderData } from '@/lib/search/smart-unit-matcher';

// React component using the smart search
export default function SmartPropertySearch({ data }: { data: LeaseholderData[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const searchResults = await searchWithSmartMatching(data, query)
      setResults(searchResults)
      
      // Also call AI with the matched data
      if (searchResults.matches.length > 0) {
        await callAIWithMatches(query, searchResults.matches)
      }
    } catch (error) {
      console.error('Search error:', error)
    }
    setLoading(false)
  }
  
  const callAIWithMatches = async (query: string, matches: LeaseholderData[]) => {
    // Format data for AI
    const formattedMatches = matches.map(match => ({
      unit: match.unit_number,
      name: match.leaseholder_name,
      email: match.leaseholder_email,
      phone: match.leaseholder_phone,
      address: match.correspondence_address,
      is_director: match.is_director
    }))
    
    const aiPrompt = `
Query: ${query}

Found ${matches.length} matching property record(s):
${JSON.stringify(formattedMatches, null, 2)}

Please provide a helpful response with the leaseholder information requested.`
    
    console.log('AI Prompt:', aiPrompt)
    // Call your AI service here
  }
  
  return (
    <div className="p-6">
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try: 'flat 5', 'leaseholder of unit 11', 'who lives in flat 1'"
          className="flex-1 p-3 border rounded"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      {results && (
        <div className="space-y-4">
          {results.type === 'unit_match' && (
            <div className="bg-green-50 p-4 rounded">
              <h3 className="font-semibold text-green-800 mb-2">
                Found {results.matches.length} matching unit(s):
              </h3>
              {results.matches.map((match: LeaseholderData, index: number) => (
                <div key={index} className="bg-white p-3 rounded border mb-2">
                  <div className="font-medium">{match.unit_number}</div>
                  <div><strong>Name:</strong> {match.leaseholder_name}</div>
                  <div><strong>Email:</strong> {match.leaseholder_email}</div>
                  <div><strong>Phone:</strong> {match.leaseholder_phone}</div>
                  {match.is_director && (
                    <div className="text-blue-600"><strong>Role:</strong> {match.director_role || 'Director'}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {results.type === 'broad_match' && (
            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">
                Found {results.matches.length} matching record(s):
              </h3>
              {results.matches.map((match: LeaseholderData, index: number) => (
                <div key={index} className="bg-white p-3 rounded border mb-2">
                  <div className="font-medium">{match.unit_number}</div>
                  <div><strong>Name:</strong> {match.leaseholder_name}</div>
                  <div><strong>Email:</strong> {match.leaseholder_email}</div>
                  <div><strong>Phone:</strong> {match.leaseholder_phone}</div>
                  {match.is_director && (
                    <div className="text-blue-600"><strong>Role:</strong> {match.director_role || 'Director'}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {results.type === 'no_match' && results.suggestions.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">
                No exact match found. Did you mean:
              </h3>
              <div className="space-x-2">
                {results.suggestions.map((suggestion: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {results.type === 'no_match' && results.suggestions.length === 0 && (
            <div className="bg-red-50 p-4 rounded">
              <h3 className="font-semibold text-red-800 mb-2">
                No matches found
              </h3>
              <p className="text-red-600">
                Try searching for a unit number, tenant name, or address.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}