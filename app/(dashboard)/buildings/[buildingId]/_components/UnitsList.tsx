"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

interface Unit {
  id: string;
  unit_number: string;
  type: string | null;
  floor: string | null;
  building_id: string;
  leaseholder_id: string | null;
  created_at: string | null;
}

interface UnitsListProps {
  units: Unit[];
  buildingId: string;
}

export default function UnitsList({ units, buildingId }: UnitsListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter units locally based on search query
  const filteredUnits = units.filter(unit => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      unit.unit_number.toLowerCase().includes(query) ||
      (unit.type && unit.type.toLowerCase().includes(query)) ||
      (unit.floor && unit.floor.toLowerCase().includes(query))
    );
  });

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <h3 className="text-lg font-semibold mb-2">Units</h3>
      
      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search units..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Units List */}
      <div className="max-h-[500px] overflow-y-auto space-y-2">
        {filteredUnits.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchQuery ? 'No units match your search' : 'No units found'}
          </div>
        ) : (
          filteredUnits.map((unit) => (
            <Link
              key={unit.id}
              href={`/buildings/${buildingId}/units/${unit.id}`}
              className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Unit {unit.unit_number}</p>
                  {unit.floor && (
                    <p className="text-sm text-gray-600">Floor {unit.floor}</p>
                  )}
                  {unit.type && (
                    <p className="text-sm text-gray-600">{unit.type}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    unit.leaseholder_id ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      
      {/* Search Results Count */}
      {searchQuery && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          Showing {filteredUnits.length} of {units.length} units
        </div>
      )}
    </div>
  );
}
