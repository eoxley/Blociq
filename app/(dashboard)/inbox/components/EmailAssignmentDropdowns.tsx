'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Building, Home, User, Save, Loader2 } from 'lucide-react';

interface Building {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  unit_number: string;
  leaseholder_id: string | null;
  leaseholders: {
    name: string;
  }[] | null;
}

interface Leaseholder {
  id: string;
  name: string;
  email: string;
}

interface EmailAssignmentDropdownsProps {
  emailId: string;
  currentBuildingId?: number | null;
  currentUnitId?: number | null;
  currentLeaseholderId?: string | null;
  onAssignmentChange: (assignment: {
    buildingId: number | null;
    unitId: number | null;
    leaseholderId: string | null;
    assignmentLabel: string;
  }) => void;
}

export default function EmailAssignmentDropdowns({
  emailId,
  currentBuildingId,
  currentUnitId,
  currentLeaseholderId,
  onAssignmentChange
}: EmailAssignmentDropdownsProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([]);
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(currentBuildingId || null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(currentUnitId || null);
  const [selectedLeaseholderId, setSelectedLeaseholderId] = useState<string | null>(currentLeaseholderId || null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchBuildings();
  }, []);

  // Fetch units when building changes
  useEffect(() => {
    if (selectedBuildingId) {
      fetchUnits(selectedBuildingId);
    } else {
      setUnits([]);
      setLeaseholders([]);
    }
  }, [selectedBuildingId]);

  // Fetch leaseholders when unit changes
  useEffect(() => {
    if (selectedUnitId) {
      fetchLeaseholders(selectedUnitId);
    } else {
      setLeaseholders([]);
    }
  }, [selectedUnitId]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/emails/assign');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setError('Failed to load buildings');
    }
  };

  const fetchUnits = async (buildingId: number) => {
    try {
      const response = await fetch(`/api/emails/assign?buildingId=${buildingId}`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
      setError('Failed to load units');
    }
  };

  const fetchLeaseholders = async (unitId: number) => {
    try {
      const response = await fetch(`/api/emails/assign?buildingId=${selectedBuildingId}&unitId=${unitId}`);
      if (response.ok) {
        const data = await response.json();
        setLeaseholders(data.leaseholders);
      }
    } catch (error) {
      console.error('Error fetching leaseholders:', error);
      setError('Failed to load leaseholders');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/emails/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          buildingId: selectedBuildingId,
          unitId: selectedUnitId,
          leaseholderId: selectedLeaseholderId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create assignment label
        let assignmentLabel = 'Unassigned';
        if (selectedUnitId && selectedLeaseholderId) {
          const unit = units.find(u => u.id === selectedUnitId);
          const leaseholder = leaseholders.find(l => l.id === selectedLeaseholderId);
          if (unit && leaseholder) {
            assignmentLabel = `Flat ${unit.unit_number} – ${leaseholder.name}`;
          }
        } else if (selectedUnitId) {
          const unit = units.find(u => u.id === selectedUnitId);
          if (unit) {
            assignmentLabel = `Flat ${unit.unit_number} – Unassigned`;
          }
        }

        onAssignmentChange({
          buildingId: selectedBuildingId,
          unitId: selectedUnitId,
          leaseholderId: selectedLeaseholderId,
          assignmentLabel
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save assignment');
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      setError('Failed to save assignment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuildingChange = (buildingId: number | null) => {
    setSelectedBuildingId(buildingId);
    setSelectedUnitId(null);
    setSelectedLeaseholderId(null);
  };

  const handleUnitChange = (unitId: number | null) => {
    setSelectedUnitId(unitId);
    setSelectedLeaseholderId(null);
  };

  const handleLeaseholderChange = (leaseholderId: string | null) => {
    setSelectedLeaseholderId(leaseholderId);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {/* Building Dropdown */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Building className="h-4 w-4" />
          Building
        </label>
        <select
          value={selectedBuildingId || ''}
          onChange={(e) => handleBuildingChange(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="">Select a building</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </div>

      {/* Unit Dropdown */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Home className="h-4 w-4" />
          Unit
        </label>
        <select
          value={selectedUnitId || ''}
          onChange={(e) => handleUnitChange(e.target.value ? parseInt(e.target.value) : null)}
          disabled={!selectedBuildingId}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select a unit</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              Flat {unit.unit_number}
            </option>
          ))}
        </select>
      </div>

      {/* Leaseholder Dropdown */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <User className="h-4 w-4" />
          Leaseholder
        </label>
        <select
          value={selectedLeaseholderId || ''}
          onChange={(e) => handleLeaseholderChange(e.target.value || null)}
          disabled={!selectedUnitId}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select a leaseholder</option>
          {leaseholders.map((leaseholder) => (
            <option key={leaseholder.id} value={leaseholder.id}>
              {leaseholder.name} ({leaseholder.email})
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {isSaving ? 'Saving...' : 'Save Assignment'}
      </button>
    </div>
  );
} 