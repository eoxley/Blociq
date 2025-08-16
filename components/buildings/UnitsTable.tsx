"use client";
import { useEffect, useState } from "react";
import TagChip from "@/components/ui/TagChip";
import { displayUnit, fmtPct, safe } from "@/components/buildings/format";
import { UnitLeaseholderRow } from "@/lib/queries/getUnitsLeaseholders";
import { Search, Phone, Mail, FileText, X, Save } from "lucide-react";

export default function UnitsTable({ buildingId }: { buildingId: string }) {
  const [rows, setRows] = useState<UnitLeaseholderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<UnitLeaseholderRow | null>(null);
  const [showLogCall, setShowLogCall] = useState(false);
  const [callDetails, setCallDetails] = useState({
    callType: "incoming",
    duration: "",
    notes: "",
    followUpRequired: false,
    followUpDate: ""
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`/api/buildings/${buildingId}/units`);
        if (!response.ok) throw new Error('Failed to fetch units');
        const data = await response.json();
        if (alive) setRows(data.units || []);
      } catch (error) {
        console.error('Error fetching units:', error);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [buildingId]);

  // Filter and sort units
  const filteredAndSortedRows = rows
    .filter(row => {
      const searchLower = searchTerm.toLowerCase();
      return (
        displayUnit(row.unit_label, row.unit_number).toLowerCase().includes(searchLower) ||
        safe(row.leaseholder_name).toLowerCase().includes(searchLower) ||
        safe(row.leaseholder_email).toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      // Sort by unit number ascending
      const aNum = parseInt(a.unit_number || "0") || 0;
      const bNum = parseInt(b.unit_number || "0") || 0;
      return aNum - bNum;
    });

  const handleUnitClick = (unit: UnitLeaseholderRow) => {
    setSelectedUnit(unit);
  };

  const closeUnitDetails = () => {
    setSelectedUnit(null);
  };

  if (loading) return <div className="text-sm text-neutral-500">Loading units…</div>;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search units, leaseholders, or emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent text-sm"
        />
      </div>

      {/* Units Table with Reduced Height and Scroll */}
      <div className="overflow-auto rounded-xl border border-neutral-200 max-h-64">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left">Unit</th>
              <th className="px-4 py-2 text-left">Leaseholder</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Apportionment</th>
              <th className="px-4 py-2 text-left">Tags</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredAndSortedRows.map((r) => (
              <tr 
                key={r.unit_id} 
                className="hover:bg-neutral-50/60 cursor-pointer"
                onClick={() => handleUnitClick(r)}
              >
                <td className="px-4 py-2 font-medium">{displayUnit(r.unit_label, r.unit_number)}</td>
                <td className="px-4 py-2">{safe(r.leaseholder_name)}</td>
                <td className="px-4 py-2">{safe(r.leaseholder_email)}</td>
                <td className="px-4 py-2">{fmtPct(r.apportionment_percent)}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {r.is_director ? <TagChip label={r.director_role || "Director"} /> : null}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button 
                    className="text-blue-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Keep existing action
                    }}
                  >
                    Log call
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedRows.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>{searchTerm ? 'No units found matching your search' : 'No units found for this building'}</p>
          </div>
        )}
      </div>

      {/* Unit Details Popup */}
      {selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-800">
                  {displayUnit(selectedUnit.unit_label, selectedUnit.unit_number)} - Unit Details
                </h3>
                <button
                  onClick={closeUnitDetails}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Unit Information */}
              <div>
                <h4 className="text-md font-medium text-neutral-700 mb-3">Unit Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">Unit Number:</span>
                    <div className="font-medium">{displayUnit(selectedUnit.unit_label, selectedUnit.unit_number)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-500">Apportionment:</span>
                    <div className="font-medium">{fmtPct(selectedUnit.apportionment_percent)}</div>
                  </div>
                </div>
              </div>

              {/* Leaseholder Information */}
              <div>
                <h4 className="text-md font-medium text-neutral-700 mb-3">Leaseholder Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-neutral-500">Name:</span>
                    <div className="font-medium">{safe(selectedUnit.leaseholder_name)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-500">Email:</span>
                    <div className="font-medium">{safe(selectedUnit.leaseholder_email)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-500">Phone:</span>
                    <div className="font-medium">{safe(selectedUnit.leaseholder_phone)}</div>
                  </div>
                  <div>
                    <span className="text-neutral-500">Director Role:</span>
                    <div className="font-medium">
                      {selectedUnit.is_director ? (
                        <TagChip label={selectedUnit.director_role || "Director"} />
                      ) : (
                        "Not a director"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Director Details (if applicable) */}
              {selectedUnit.is_director && (
                <div>
                  <h4 className="text-md font-medium text-neutral-700 mb-3">Director Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-500">Director Since:</span>
                      <div className="font-medium">{selectedUnit.director_since ? new Date(selectedUnit.director_since).toLocaleDateString() : "—"}</div>
                    </div>
                    <div>
                      <span className="text-neutral-500">Notes:</span>
                      <div className="font-medium">{safe(selectedUnit.director_notes)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Historic Correspondence (Placeholder) */}
              <div>
                <h4 className="text-md font-medium text-neutral-700 mb-3">Historic Correspondence</h4>
                <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600">
                  <p>Correspondence history will be implemented here.</p>
                  <p className="mt-2">This will show:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Email communications</li>
                    <li>Phone call logs</li>
                    <li>Maintenance requests</li>
                    <li>Complaint history</li>
                  </ul>
                </div>
              </div>

              {/* Financial History (Placeholder) */}
              <div>
                <h4 className="text-md font-medium text-neutral-700 mb-3">Financial History</h4>
                <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600">
                  <p>Financial history will be implemented here.</p>
                  <p className="mt-2">This will show:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Service charge payments</li>
                    <li>Ground rent payments</li>
                    <li>Arrears history</li>
                    <li>Payment plans</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-neutral-200">
                <button className="flex-1 bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors text-sm">
                  Log Call
                </button>
                <button className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm">
                  Send Email
                </button>
                <button className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm">
                  View Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
