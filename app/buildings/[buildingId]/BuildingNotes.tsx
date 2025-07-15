'use client';

import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface BuildingNotesProps {
  buildingId: string;
  initialNotes?: string;
}

export default function BuildingNotes({ buildingId, initialNotes = '' }: BuildingNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClientComponentClient();

  const handleUpdateNotes = async (value: string) => {
    setNotes(value);
    
    // Debounce the save operation
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('buildings')
        .update({ notes: value })
        .eq('id', buildingId);

      if (error) {
        console.error('Error updating building notes:', error);
      }
    } catch (error) {
      console.error('Error updating building notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 border rounded shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Building Notes</h2>
        {isSaving && (
          <span className="text-xs text-gray-500">Saving...</span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => handleUpdateNotes(e.target.value)}
        className="w-full p-2 border rounded text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        rows={6}
        placeholder="Write handover notes, reminders, or status updates here..."
      />
    </div>
  );
} 