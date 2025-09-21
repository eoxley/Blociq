'use client';

import { useState, useEffect } from 'react';
import { FileText, Building2, Home, Calendar, DollarSign, Users, Eye, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useSupabase } from '@/components/SupabaseProvider';
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card';
import { BlocIQBadge } from '@/components/ui/blociq-badge';
import LeaseAnalysisViewer from './LeaseAnalysisViewer';
import { toast } from 'sonner';

interface Lease {
  id: string;
  building_id: number;
  unit_id?: number;
  scope: 'building' | 'unit';
  leaseholder_name?: string;
  start_date?: string;
  end_date?: string;
  apportionment?: number;
  ground_rent?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  buildings?: { name: string; address?: string };
  units?: { unit_number: string; floor?: string };
  analysis_json?: any;
}

interface BuildingLeasesSectionProps {
  buildingId: number;
  buildingName: string;
}

export default function BuildingLeasesSection({ buildingId, buildingName }: BuildingLeasesSectionProps) {
  const { supabase } = useSupabase();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [filter, setFilter] = useState<'all' | 'building' | 'unit'>('all');

  useEffect(() => {
    fetchLeases();
  }, [buildingId]);

  const fetchLeases = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('leases')
        .select(`
          id,
          building_id,
          unit_id,
          scope,
          leaseholder_name,
          start_date,
          end_date,
          apportionment,
          ground_rent,
          status,
          created_at,
          updated_at,
          analysis_json,
          buildings!inner(name, address),
          units(unit_number, floor)
        `)
        .eq('building_id', buildingId)
        .order('scope', { ascending: true }) // Building-level leases first
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leases:', error);
        toast.error('Failed to load leases');
        setLeases([]);
      } else {
        setLeases(data || []);
      }
    } catch (error) {
      console.error('Exception fetching leases:', error);
      toast.error('Failed to load leases');
      setLeases([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeases = leases.filter(lease => {
    if (filter === 'all') return true;
    return lease.scope === filter;
  });

  const buildingLeases = leases.filter(lease => lease.scope === 'building');
  const unitLeases = leases.filter(lease => lease.scope === 'unit');

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).getFullYear().toString();
  };

  const renderLeaseCard = (lease: Lease) => (
    <BlocIQCard key={lease.id} className="hover:shadow-lg transition-shadow">
      <BlocIQCardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {lease.scope === 'building' ? (
                <Building2 className="h-5 w-5 text-blue-600" />
              ) : (
                <Home className="h-5 w-5 text-green-600" />
              )}
              <div>
                <h4 className="font-semibold text-gray-900">
                  {lease.scope === 'building'
                    ? 'Building Head Lease'
                    : `Unit ${lease.units?.unit_number || 'Unknown'}`}
                </h4>
                <p className="text-sm text-gray-500">
                  {lease.leaseholder_name || 'Leaseholder not specified'}
                </p>
              </div>
              <BlocIQBadge
                variant={lease.scope === 'building' ? 'default' : 'outline'}
                className="text-xs"
              >
                {lease.scope === 'building' ? 'Building-wide' : 'Unit-specific'}
              </BlocIQBadge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Lease Term</p>
                  <p className="text-sm font-medium">
                    {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                  </p>
                </div>
              </div>

              {lease.apportionment && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Apportionment</p>
                    <p className="text-sm font-medium">{lease.apportionment}%</p>
                  </div>
                </div>
              )}

              {lease.ground_rent && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Ground Rent</p>
                    <p className="text-sm font-medium">{lease.ground_rent}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium">{lease.status || 'Active'}</p>
                </div>
              </div>
            </div>

            {/* Key clauses preview for building-level leases */}
            {lease.scope === 'building' && lease.analysis_json && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium mb-1">Building-wide Clauses Apply To:</p>
                <p className="text-sm text-blue-800">
                  All units • Rights of way • Landlord powers • Common areas • General restrictions
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setSelectedLease(lease)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              View Analysis
            </button>
          </div>
        </div>
      </BlocIQCardContent>
    </BlocIQCard>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Leases</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Leases</h3>
          <p className="text-sm text-gray-500">
            {leases.length === 0
              ? 'No leases linked to this building'
              : `${buildingLeases.length} building-level, ${unitLeases.length} unit-specific`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter buttons */}
          <div className="flex rounded-lg border border-gray-200 p-1">
            {[
              { key: 'all', label: 'All', count: leases.length },
              { key: 'building', label: 'Building', count: buildingLeases.length },
              { key: 'unit', label: 'Units', count: unitLeases.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as typeof filter)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  filter === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredLeases.length === 0 ? (
        <BlocIQCard>
          <BlocIQCardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No leases found' : `No ${filter}-level leases found`}
            </h4>
            <p className="text-gray-500 mb-6">
              {filter === 'all'
                ? 'Upload and analyze lease documents to get started'
                : `Upload ${filter}-level lease documents to see them here`}
            </p>
            <div className="text-left max-w-md mx-auto">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-blue-900 mb-1">How to link leases:</h5>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. Go to Lease Lab and upload a lease document</li>
                      <li>2. After analysis, click "Link to Building"</li>
                      <li>3. Choose building-wide or unit-specific scope</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      ) : (
        <div className="space-y-4">
          {filteredLeases.map(renderLeaseCard)}
        </div>
      )}

      {/* Lease Analysis Viewer Modal */}
      {selectedLease && (
        <LeaseAnalysisViewer
          lease={selectedLease}
          onClose={() => setSelectedLease(null)}
        />
      )}
    </div>
  );
}