'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Building2, 
  User, 
  Calendar,
  X,
  RefreshCw
} from 'lucide-react';

interface Building {
  id: string;
  name: string;
  address: string;
}

interface InboxFiltersProps {
  buildings: Building[];
  onFiltersChange: (filters: {
    search: string;
    buildingId: string | null;
    showUnreadOnly: boolean;
    dateFrom: string | null;
    dateTo: string | null;
  }) => void;
  onRefresh: () => void;
}

export default function InboxFilters({
  buildings,
  onFiltersChange,
  onRefresh
}: InboxFiltersProps) {
  const [search, setSearch] = useState('');
  const [buildingId, setBuildingId] = useState<string | null>('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>('');
  const [dateTo, setDateTo] = useState<string | null>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Apply filters when they change
  useEffect(() => {
    onFiltersChange({
      search,
      buildingId: buildingId || null,
      showUnreadOnly,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null
    });
  }, [search, buildingId, showUnreadOnly, dateFrom, dateTo, onFiltersChange]);

  const clearFilters = () => {
    setSearch('');
    setBuildingId('');
    setShowUnreadOnly(false);
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = search || buildingId || showUnreadOnly || dateFrom || dateTo;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      {/* Basic Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Building Filter */}
        <div className="w-full md:w-48">
          <select
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </div>

        {/* Unread Only Toggle */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Unread only</span>
          </label>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Filter className="h-4 w-4" />
          {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Date From */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo || ''}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Active filters:</span>
            {search && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Search: "{search}"
              </span>
            )}
            {buildingId && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Building: {buildings.find(b => b.id === buildingId)?.name}
              </span>
            )}
            {showUnreadOnly && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Unread only
              </span>
            )}
            {dateFrom && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                From: {new Date(dateFrom).toLocaleDateString()}
              </span>
            )}
            {dateTo && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                To: {new Date(dateTo).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
