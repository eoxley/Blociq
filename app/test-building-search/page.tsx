"use client";
import { useState } from 'react';
import { Search, Building2, Users, Home } from 'lucide-react';

export default function TestBuildingSearchPage() {
  const [query, setQuery] = useState('who is the leaseholder of 5 ashwood house');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testQueries = [
    'who is the leaseholder of 5 ashwood house',
    'who lives in flat 5 ashwood house',
    'ashwood house unit 5 leaseholder',
    'emma taylor ashwood house',
    'flat 5 ashwood house contact details'
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await fetch('/api/test-building-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }
      
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = (testQuery: string) => {
    setQuery(testQuery);
    setTimeout(() => handleSearch(), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🧪 Building Search Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the building search functionality to debug leaseholder queries.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Test Queries
              </label>
              <div className="flex flex-wrap gap-2">
                {testQueries.map((testQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickTest(testQuery)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    {testQuery}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Building Information */}
            {results.results.building && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Building Found</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{results.results.building.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{results.results.building.address || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Count</p>
                    <p className="font-medium">{results.results.building.unit_count || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Building Manager</p>
                    <p className="font-medium">{results.results.building.building_manager_name || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Units Information */}
            {results.results.units && results.results.units.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Home className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Units Found ({results.results.units.length})</h2>
                </div>
                <div className="space-y-4">
                  {results.results.units.map((unit: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Unit Number</p>
                          <p className="font-medium">{unit.unit_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Floor</p>
                          <p className="font-medium">{unit.floor || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Type</p>
                          <p className="font-medium">{unit.type || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Leaseholder ID</p>
                          <p className="font-medium">{unit.leaseholder_id || 'None'}</p>
                        </div>
                      </div>
                      
                      {unit.leaseholder && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Leaseholder Information</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-blue-600">Name</p>
                              <p className="font-medium text-blue-800">{unit.leaseholder.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600">Email</p>
                              <p className="font-medium text-blue-800">{unit.leaseholder.email || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-600">Phone</p>
                              <p className="font-medium text-blue-800">{unit.leaseholder.phone || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaseholders Information */}
            {results.results.leaseholders && results.results.leaseholders.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Leaseholders Found ({results.results.leaseholders.length})</h2>
                </div>
                <div className="space-y-4">
                  {results.results.leaseholders.map((leaseholder: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium">{leaseholder.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{leaseholder.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium">{leaseholder.phone || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Units</p>
                          <p className="font-medium">
                            {leaseholder.units && leaseholder.units.length > 0 
                              ? leaseholder.units.map((u: any) => u.unit_number).join(', ')
                              : 'None'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Results */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Raw Results</h2>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
