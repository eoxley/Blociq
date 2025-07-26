"use client";

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, ChevronDown, ChevronUp, User, Mail, Home, Eye } from 'lucide-react';
import { BlocIQBadge } from '@/components/ui/blociq-badge';

interface Leaseholder {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  unit_id: number | null;
}

interface Lease {
  id: string;
  building_id: number;
  unit_id: number | null;
  start_date: string | null;
  expiry_date: string | null;
  is_headlease: boolean | null;
  doc_type: string | null;
  created_at: string | null;
}

interface Unit {
  id: number;
  unit_number: string;
  floor: string | null;
  type: string | null;
}

interface LeaseholderWithUnit {
  leaseholder: Leaseholder;
  unit: Unit | null;
  lease: Lease | null;
}

interface LeaseholdersTableProps {
  buildingId: string;
  className?: string;
}

export default function LeaseholdersTable({ buildingId, className = "" }: LeaseholdersTableProps) {
  const [leaseholders, setLeaseholders] = useState<LeaseholderWithUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchLeaseholders = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query leases table to get all leases for this building
        // Handle the UUID/integer mismatch: buildingId is UUID, leases.building_id is integer
        // We need to convert the buildingId to a number or find an alternative approach
        
        // First, try to get the building to understand the ID type
        const { data: building, error: buildingError } = await supabase
          .from('buildings')
          .select('id')
          .eq('id', buildingId)
          .single();

        if (buildingError) {
          console.error('Error fetching building:', buildingError);
          throw new Error(`Failed to fetch building: ${buildingError.message}`);
        }

        // For now, we'll try to find leases by unit association
        // Get all units for this building first
        const { data: buildingUnits, error: unitsError } = await supabase
          .from('units')
          .select('id')
          .eq('building_id', buildingId);

        if (unitsError) {
          console.error('Error fetching building units:', unitsError);
          throw new Error(`Failed to fetch building units: ${unitsError.message}`);
        }

        const unitIds = buildingUnits?.map(unit => unit.id) || [];

        if (unitIds.length === 0) {
          setLeaseholders([]);
          setLoading(false);
          return;
        }

        // Now get leases for these units
        const { data: leases, error: leasesError } = await supabase
          .from('leases')
          .select(`
            id,
            building_id,
            unit_id,
            start_date,
            expiry_date,
            is_headlease,
            doc_type,
            created_at
          `)
          .in('unit_id', unitIds);

        if (leasesError) {
          console.error('Error fetching leases:', leasesError);
          throw new Error(`Failed to fetch leases: ${leasesError.message}`);
        }

        // Get unique unit IDs from leases
        const leaseUnitIds = [...new Set(leases?.map(lease => lease.unit_id).filter(Boolean))];

        if (leaseUnitIds.length === 0) {
          setLeaseholders([]);
          setLoading(false);
          return;
        }

        // Fetch units for these unit IDs
        const { data: units, error: unitsError } = await supabase
          .from('units')
          .select(`
            id,
            unit_number,
            floor,
            type
          `)
          .in('id', leaseUnitIds);

        if (unitsError) {
          console.error('Error fetching units:', unitsError);
          throw new Error(`Failed to fetch units: ${unitsError.message}`);
        }

        // Fetch leaseholders for these units
        const { data: leaseholdersData, error: leaseholdersError } = await supabase
          .from('leaseholders')
          .select(`
            id,
            name,
            email,
            phone,
            unit_id
          `)
          .in('unit_id', leaseUnitIds);

        if (leaseholdersError) {
          console.error('Error fetching leaseholders:', leaseholdersError);
          throw new Error(`Failed to fetch leaseholders: ${leaseholdersError.message}`);
        }

        // Create a map of unit_id to unit
        const unitMap = new Map<number, Unit>();
        units?.forEach(unit => {
          unitMap.set(unit.id, unit);
        });

        // Create a map of unit_id to lease
        const leaseMap = new Map<number, Lease>();
        leases?.forEach(lease => {
          if (lease.unit_id) {
            leaseMap.set(lease.unit_id, lease);
          }
        });

        // Combine the data
        const leaseholdersWithUnits: LeaseholderWithUnit[] = (leaseholdersData || []).map(leaseholder => ({
          leaseholder,
          unit: leaseholder.unit_id ? unitMap.get(leaseholder.unit_id) || null : null,
          lease: leaseholder.unit_id ? leaseMap.get(leaseholder.unit_id) || null : null
        }));

        setLeaseholders(leaseholdersWithUnits);
        console.log('Leaseholders data:', leaseholdersWithUnits);

      } catch (err) {
        console.error('Error in fetchLeaseholders:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaseholders();
  }, [buildingId, supabase]);

  // Filter leaseholders based on search term
  const filteredLeaseholders = leaseholders.filter(leaseholderData => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const { leaseholder, unit } = leaseholderData;

    return (
      (leaseholder.name && leaseholder.name.toLowerCase().includes(searchLower)) ||
      (leaseholder.email && leaseholder.email.toLowerCase().includes(searchLower)) ||
      (unit && unit.unit_number.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-8 shadow-xl border border-gray-100 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Loading leaseholders...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl p-8 shadow-xl border border-gray-100 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Error loading leaseholders</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <div className="text-sm text-gray-500">
              <a 
                href={`/api/test-leaseholders?buildingId=${buildingId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 underline"
              >
                Debug: Check leaseholders data
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Leaseholders</h3>
              <p className="text-gray-600">
                {leaseholders.length} leaseholder{leaseholders.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-5 w-5" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-5 w-5" />
                Expand
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Search Input */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 placeholder-gray-500"
                placeholder="Search by name, email, or unit number..."
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {leaseholders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">No leaseholders found</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  No leaseholders are currently associated with this building. Leaseholders will appear here once leases are added to units.
                </p>
                <div className="text-sm text-gray-500">
                  <a 
                    href={`/api/test-leaseholders?buildingId=${buildingId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 underline"
                  >
                    Debug: Check leaseholders data
                  </a>
                </div>
              </div>
            ) : filteredLeaseholders.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No leaseholders found matching your search</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredLeaseholders.map(({ leaseholder, unit, lease }) => (
                  <div key={leaseholder.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {leaseholder.name || 'Unnamed Leaseholder'}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {leaseholder.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  {leaseholder.email}
                                </div>
                              )}
                              {leaseholder.phone && (
                                <div className="flex items-center gap-1">
                                  <span>📞</span>
                                  {leaseholder.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Unit Information */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900">Unit Information</span>
                            </div>
                            {unit ? (
                              <div className="space-y-1 text-sm">
                                <div><span className="font-medium">Unit:</span> {unit.unit_number}</div>
                                {unit.floor && <div><span className="font-medium">Floor:</span> {unit.floor}</div>}
                                {unit.type && <div><span className="font-medium">Type:</span> {unit.type}</div>}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm">No unit assigned</div>
                            )}
                          </div>

                          {/* Lease Information */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-gray-900">Lease Information</span>
                            </div>
                            {lease ? (
                              <div className="space-y-1 text-sm">
                                {lease.start_date && (
                                  <div><span className="font-medium">Start:</span> {new Date(lease.start_date).toLocaleDateString('en-GB')}</div>
                                )}
                                {lease.expiry_date && (
                                  <div><span className="font-medium">Expiry:</span> {new Date(lease.expiry_date).toLocaleDateString('en-GB')}</div>
                                )}
                                {lease.is_headlease && (
                                  <BlocIQBadge variant="secondary" size="sm" className="mt-1">
                                    Head Lease
                                  </BlocIQBadge>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm">No lease information</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4">
                        <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors duration-200">
                          <Eye className="h-4 w-4" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            {leaseholders.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {filteredLeaseholders.length} of {leaseholders.length} leaseholder{leaseholders.length !== 1 ? 's' : ''}
                  </span>
                  {searchTerm && (
                    <span>Filtered by "{searchTerm}"</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 