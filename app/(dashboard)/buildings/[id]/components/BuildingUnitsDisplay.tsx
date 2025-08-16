'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  Search, 
  Building,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

interface Unit {
  id: number;
  unit_number: string;
  floor: string | null;
  type: string | null;
  leaseholder_id: string | null;
  leaseholders: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  }[] | null;
  leases: {
    id: string;
    start_date: string | null;
    expiry_date: string | null;
    doc_type: string | null;
    is_headlease: boolean | null;
  }[] | null;
}

interface BuildingUnitsDisplayProps {
  units: Unit[];
  buildingName: string;
}

export default function BuildingUnitsDisplay({ units, buildingName }: BuildingUnitsDisplayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'unit_number' | 'floor'>('unit_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set());

  // Ensure units is an array and filter with safe defaults
  const safeUnits = Array.isArray(units) ? units : [];
  
  // Filter units based on search with null checks
  const filteredUnits = safeUnits.filter(unit => {
    if (!unit?.unit_number) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const unitNumberMatch = unit.unit_number.toLowerCase().includes(searchLower);
    const leaseholderMatch = unit.leaseholders?.some(lh => 
      lh?.name?.toLowerCase().includes(searchLower) ||
      lh?.email?.toLowerCase().includes(searchLower)
    ) || false;
    const floorMatch = unit.floor?.toLowerCase().includes(searchLower) || false;
    
    return unitNumberMatch || leaseholderMatch || floorMatch;
  });

  // Sort units with safe defaults
  const sortedUnits = [...filteredUnits].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortBy === 'floor') {
      aValue = a.floor || '';
      bValue = b.floor || '';
    } else {
      aValue = a.unit_number || '';
      bValue = b.unit_number || '';
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const toggleUnitExpansion = (unitId: number) => {
    setExpandedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (error) {
      console.warn('Invalid date format:', dateString);
      return 'Invalid date';
    }
  };

  const getLeaseStatus = (lease: any) => {
    if (!lease.expiry_date) return { status: 'unknown', label: 'No expiry date' };
    
    const expiryDate = new Date(lease.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days` };
    } else {
      return { status: 'active', label: 'Active' };
    }
  };

  if (safeUnits.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Home className="h-5 w-5 text-blue-600" />
            Units ({buildingName})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center">
            <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No units found</h3>
            <p className="text-gray-500">This building doesn't have any units configured yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900">
            <Home className="h-5 w-5 text-blue-600" />
            Units ({buildingName})
          </div>
          <Badge variant="outline" className="text-sm">
            {sortedUnits.length} unit{sortedUnits.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search units, leaseholders, or floors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'unit_number' | 'floor')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unit_number">Sort by Unit</option>
              <option value="floor">Sort by Floor</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Units Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedUnits.map((unit) => {
            const leaseholder = unit.leaseholders?.[0];
            const lease = unit.leases?.[0];
            const leaseStatus = lease ? getLeaseStatus(lease) : null;
            const isExpanded = expandedUnits.has(unit.id);

            return (
              <div
                key={unit.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Unit Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Flat {unit.unit_number}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleUnitExpansion(unit.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Unit Basic Info */}
                <div className="space-y-2 mb-3">
                  {unit.floor && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="h-3 w-3" />
                      <span>Floor: {unit.floor}</span>
                    </div>
                  )}
                  {unit.type && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Type: {unit.type}</span>
                    </div>
                  )}
                </div>

                {/* Leaseholder Info */}
                {leaseholder ? (
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {leaseholder.name || 'Unnamed Leaseholder'}
                      </span>
                    </div>
                    {leaseholder.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-3 w-3" />
                        <a 
                          href={`mailto:${leaseholder.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {leaseholder.email}
                        </a>
                      </div>
                    )}
                    {leaseholder.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        <a 
                          href={`tel:${leaseholder.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {leaseholder.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-xs">
                      No leaseholder assigned
                    </Badge>
                  </div>
                )}

                {/* Lease Info - Expanded View */}
                {isExpanded && (
                  <div className="border-t pt-3 space-y-3">
                    {lease ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-purple-600" />
                          <span className="text-sm font-medium text-gray-900">Lease Information</span>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Start Date:</span>
                            <span>{formatDate(lease.start_date)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Expiry Date:</span>
                            <span>{formatDate(lease.expiry_date)}</span>
                          </div>
                          {lease.doc_type && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Document Type:</span>
                              <span>{lease.doc_type}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span>{lease.is_headlease ? 'Head Lease' : 'Sub Lease'}</span>
                          </div>
                        </div>

                        {/* Lease Status */}
                        {leaseStatus && (
                          <div className="mt-2">
                            <Badge 
                              variant={
                                leaseStatus.status === 'expired' ? 'destructive' :
                                leaseStatus.status === 'expiring' ? 'outline' :
                                'default'
                              }
                              className="text-xs"
                            >
                              {leaseStatus.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        <FileText className="h-3 w-3 inline mr-1" />
                        No lease information available
                      </div>
                    )}
                  </div>
                )}

                {/* Lease Status Badge - Collapsed View */}
                {!isExpanded && leaseStatus && (
                  <div className="mt-2">
                    <Badge 
                      variant={
                        leaseStatus.status === 'expired' ? 'destructive' :
                        leaseStatus.status === 'expiring' ? 'outline' :
                        'default'
                      }
                      className="text-xs"
                    >
                      {leaseStatus.label}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredUnits.length === 0 && (
          <div className="text-center py-8">
            <Search className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">No units found matching your search.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 