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
  const [loggingCall, setLoggingCall] = useState(false);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailDetails, setEmailDetails] = useState({
    subject: "",
    body: ""
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [editingUnit, setEditingUnit] = useState(false);
  const [editingLeaseholder, setEditingLeaseholder] = useState(false);
  const [unitFormData, setUnitFormData] = useState({
    unit_number: '',
    apportionment_percent: 0
  });
  const [leaseholderFormData, setLeaseholderFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    is_director: false,
    director_role: '',
    director_since: '',
    director_notes: ''
  });
  const [savingUnit, setSavingUnit] = useState(false);
  const [savingLeaseholder, setSavingLeaseholder] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`/api/buildings/${buildingId}/units`);
        if (!response.ok) throw new Error('Failed to fetch units');
        const data = await response.json();
        console.log('Fetched units data:', data.units);
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
    console.log('Selected unit data:', unit);
    setSelectedUnit(unit);
    // Initialize form data
    setUnitFormData({
      unit_number: unit.unit_number || '',
      apportionment_percent: unit.apportionment_percent || 0
    });
    setLeaseholderFormData({
      full_name: unit.leaseholder_name || '',
      email: unit.leaseholder_email || '',
      phone: unit.leaseholder_phone || '',
      is_director: unit.is_director || false,
      director_role: unit.director_role || '',
      director_since: unit.director_since || '',
      director_notes: unit.director_notes || ''
    });
  };

  const handleSaveUnit = async () => {
    if (!selectedUnit) return;
    
    setSavingUnit(true);
    try {
      const response = await fetch(`/api/buildings/${buildingId}/units/${selectedUnit.unit_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unitFormData)
      });

      if (response.ok) {
        // Update the selected unit with new data
        setSelectedUnit({
          ...selectedUnit,
          unit_number: unitFormData.unit_number,
          apportionment_percent: unitFormData.apportionment_percent
        });
        setEditingUnit(false);
        // Refresh the units list
        const refreshResponse = await fetch(`/api/buildings/${buildingId}/units`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setRows(data.units || []);
        }
      } else {
        console.error('Failed to update unit');
      }
    } catch (error) {
      console.error('Error updating unit:', error);
    } finally {
      setSavingUnit(false);
    }
  };

  const handleSaveLeaseholder = async () => {
    if (!selectedUnit?.leaseholder_id) return;
    
    setSavingLeaseholder(true);
    try {
      const response = await fetch(`/api/leaseholders/${selectedUnit.leaseholder_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaseholderFormData)
      });

      if (response.ok) {
        // Update the selected unit with new leaseholder data
        setSelectedUnit({
          ...selectedUnit,
          leaseholder_name: leaseholderFormData.full_name,
          leaseholder_email: leaseholderFormData.email,
          leaseholder_phone: leaseholderFormData.phone,
          is_director: leaseholderFormData.is_director,
          director_role: leaseholderFormData.director_role,
          director_since: leaseholderFormData.director_since,
          director_notes: leaseholderFormData.director_notes
        });
        setEditingLeaseholder(false);
        // Refresh the units list
        const refreshResponse = await fetch(`/api/buildings/${buildingId}/units`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setRows(data.units || []);
        }
      } else {
        console.error('Failed to update leaseholder');
      }
    } catch (error) {
      console.error('Error updating leaseholder:', error);
    } finally {
      setSavingLeaseholder(false);
    }
  };

  const closeUnitDetails = () => {
    setSelectedUnit(null);
  };

  const handleLogCall = async () => {
    if (!selectedUnit || !callDetails.notes.trim()) return;
    
    setLoggingCall(true);
    try {
      const response = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: buildingId,
          unit_id: selectedUnit.unit_id,
          leaseholder_id: selectedUnit.leaseholder_id,
          call_type: callDetails.callType,
          duration_minutes: callDetails.duration ? parseInt(callDetails.duration) : null,
          notes: callDetails.notes,
          follow_up_required: callDetails.followUpRequired,
          follow_up_date: callDetails.followUpDate || null
        })
      });

      if (response.ok) {
        setShowLogCall(false);
        setCallDetails({
          callType: "incoming",
          duration: "",
          notes: "",
          followUpRequired: false,
          followUpDate: ""
        });
        // You could add a toast notification here
      } else {
        console.error('Failed to log call');
      }
    } catch (error) {
      console.error('Error logging call:', error);
    } finally {
      setLoggingCall(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedUnit || !emailDetails.subject.trim() || !emailDetails.body.trim()) return;
    
    setSendingEmail(true);
    try {
      // For now, we'll use the mailto: approach but with pre-filled content
      const mailtoUrl = `mailto:${selectedUnit.leaseholder_email}?subject=${encodeURIComponent(emailDetails.subject)}&body=${encodeURIComponent(emailDetails.body)}`;
      window.open(mailtoUrl, '_blank');
      
      // Close the modal
      setShowEmailCompose(false);
      setEmailDetails({ subject: "", body: "" });
      
      // You could add a toast notification here
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSendingEmail(false);
    }
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
                 className={`hover:bg-neutral-50/60 cursor-pointer ${
                   r.is_director ? 'bg-orange-50/50 hover:bg-orange-100/60' : ''
                 }`}
                 onClick={() => handleUnitClick(r)}
               >
                <td className="px-4 py-2 font-medium">{displayUnit(r.unit_label, r.unit_number)}</td>
                <td className="px-4 py-2">{safe(r.leaseholder_name)}</td>
                <td className="px-4 py-2">{safe(r.leaseholder_email)}</td>
                <td className="px-4 py-2">{fmtPct(r.apportionment_percent)}</td>
                                 <td className="px-4 py-2">
                   <div className="flex flex-wrap gap-1.5">
                     {r.is_director && <TagChip label={r.director_role || "Director"} />}
                     {r.leaseholder_name && r.leaseholder_name.includes('John') && <TagChip label="Chairman" />}
                     {r.leaseholder_name && r.leaseholder_name.includes('Sarah') && <TagChip label="Secretary" />}
                     {r.leaseholder_name && r.leaseholder_name.includes('Michael') && <TagChip label="Treasurer" />}
                     {r.leaseholder_name && r.leaseholder_name.includes('Emma') && <TagChip label="Committee Member" />}
                     {r.leaseholder_name && r.leaseholder_name.includes('David') && <TagChip label="Vice Chair" />}
                   </div>
                 </td>
                                 <td className="px-4 py-2">
                   <button 
                     className="text-blue-600 hover:underline"
                     onClick={(e) => {
                       e.stopPropagation();
                       setSelectedUnit(r);
                       setShowLogCall(true);
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
         <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
                 <div className="flex items-center justify-between mb-3">
                   <h4 className="text-md font-medium text-neutral-700">Unit Information</h4>
                   <button
                     onClick={() => setEditingUnit(!editingUnit)}
                     className="text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium"
                   >
                     {editingUnit ? 'Cancel' : 'Edit'}
                   </button>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-neutral-500">Unit Number:</span>
                     {editingUnit ? (
                       <input
                         type="text"
                         value={unitFormData.unit_number}
                         onChange={(e) => setUnitFormData(prev => ({ ...prev, unit_number: e.target.value }))}
                         className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
                       />
                     ) : (
                       <div className="font-medium">{displayUnit(selectedUnit.unit_label, selectedUnit.unit_number)}</div>
                     )}
                   </div>
                   <div>
                     <span className="text-neutral-500">Apportionment:</span>
                     {editingUnit ? (
                       <input
                         type="number"
                         step="0.1"
                         value={unitFormData.apportionment_percent}
                         onChange={(e) => setUnitFormData(prev => ({ ...prev, apportionment_percent: parseFloat(e.target.value) || 0 }))}
                         className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
                       />
                     ) : (
                       <div className="font-medium">{fmtPct(selectedUnit.apportionment_percent)}</div>
                     )}
                   </div>
                 </div>
                 {editingUnit && (
                   <div className="flex gap-2 mt-4">
                     <button
                       onClick={handleSaveUnit}
                       disabled={savingUnit}
                       className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition-colors text-sm disabled:opacity-50"
                     >
                       {savingUnit ? 'Saving...' : 'Save Changes'}
                     </button>
                     <button
                       onClick={() => setEditingUnit(false)}
                       className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                     >
                       Cancel
                     </button>
                   </div>
                 )}
               </div>

                             {/* Leaseholder Information */}
               <div>
                 <div className="flex items-center justify-between mb-3">
                   <h4 className="text-md font-medium text-neutral-700">Leaseholder Information</h4>
                   <button
                     onClick={() => setEditingLeaseholder(!editingLeaseholder)}
                     className="text-sm text-[#4f46e5] hover:text-[#4338ca] font-medium"
                   >
                     {editingLeaseholder ? 'Cancel' : 'Edit'}
                   </button>
                 </div>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-neutral-500">Name:</span>
                     {editingLeaseholder ? (
                       <input
                         type="text"
                         value={leaseholderFormData.full_name}
                         onChange={(e) => setLeaseholderFormData(prev => ({ ...prev, full_name: e.target.value }))}
                         className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
                       />
                     ) : (
                       <div className="font-medium">{safe(selectedUnit.leaseholder_name)}</div>
                     )}
                   </div>
                   <div>
                     <span className="text-neutral-500">Email:</span>
                     {editingLeaseholder ? (
                       <input
                         type="email"
                         value={leaseholderFormData.email}
                         onChange={(e) => setLeaseholderFormData(prev => ({ ...prev, email: e.target.value }))}
                         className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
                       />
                     ) : (
                       <div className="font-medium">{safe(selectedUnit.leaseholder_email)}</div>
                     )}
                   </div>
                   <div>
                     <span className="text-neutral-500">Phone:</span>
                     {editingLeaseholder ? (
                       <input
                         type="tel"
                         value={leaseholderFormData.phone}
                         onChange={(e) => setLeaseholderFormData(prev => ({ ...prev, phone: e.target.value }))}
                         className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
                       />
                     ) : (
                       <div className="font-medium">{safe(selectedUnit.leaseholder_phone)}</div>
                     )}
                   </div>
                   <div>
                     <span className="text-neutral-500">Director Role:</span>
                     {editingLeaseholder ? (
                       <div className="mt-1 space-y-2">
                         <div className="flex items-center gap-2">
                           <input
                             type="checkbox"
                             id="isDirector"
                             checked={leaseholderFormData.is_director}
                             onChange={(e) => setLeaseholderFormData(prev => ({ ...prev, is_director: e.target.checked }))}
                             className="h-4 w-4"
                           />
                           <label htmlFor="isDirector" className="text-sm">Is Director</label>
                         </div>
                         {leaseholderFormData.is_director && (
                           <input
                             type="text"
                             placeholder="Director role (e.g., Chairman, Secretary)"
                             value={leaseholderFormData.director_role}
                             onChange={(e) => setLeaseholderFormData(prev => ({ ...prev, director_role: e.target.value }))}
                             className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-sm"
                           />
                         )}
                       </div>
                     ) : (
                       <div className="font-medium">
                         {selectedUnit.is_director ? (
                           <TagChip label={selectedUnit.director_role || "Director"} />
                         ) : (
                           "Not a director"
                         )}
                       </div>
                     )}
                   </div>
                 </div>
                 {editingLeaseholder && (
                   <div className="flex gap-2 mt-4">
                     <button
                       onClick={handleSaveLeaseholder}
                       disabled={savingLeaseholder}
                       className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition-colors text-sm disabled:opacity-50"
                     >
                       {savingLeaseholder ? 'Saving...' : 'Save Changes'}
                     </button>
                     <button
                       onClick={() => setEditingLeaseholder(false)}
                       className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                     >
                       Cancel
                     </button>
                   </div>
                 )}
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
                 <button 
                   onClick={() => setShowLogCall(true)}
                   className="flex-1 bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors text-sm"
                 >
                   Log Call
                 </button>
                                   <button 
                    onClick={() => setShowEmailCompose(true)}
                    disabled={!selectedUnit.leaseholder_email}
                    className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Email
                  </button>
                                   <button 
                    onClick={() => setShowDocuments(true)}
                    className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                  >
                    View Documents
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Call Modal */}
      {showLogCall && selectedUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Log Call - {displayUnit(selectedUnit.unit_label, selectedUnit.unit_number)}
                </h3>
                <button
                  onClick={() => setShowLogCall(false)}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Call Type
                </label>
                <select
                  value={callDetails.callType}
                  onChange={(e) => setCallDetails(prev => ({ ...prev, callType: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                >
                  <option value="incoming">Incoming</option>
                  <option value="outgoing">Outgoing</option>
                  <option value="missed">Missed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={callDetails.duration}
                  onChange={(e) => setCallDetails(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Notes *
                </label>
                <textarea
                  value={callDetails.notes}
                  onChange={(e) => setCallDetails(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  rows={3}
                  placeholder="Enter call details..."
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="followUp"
                  checked={callDetails.followUpRequired}
                  onChange={(e) => setCallDetails(prev => ({ ...prev, followUpRequired: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="followUp" className="text-sm text-neutral-700">
                  Follow-up required
                </label>
              </div>

              {callDetails.followUpRequired && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={callDetails.followUpDate}
                    onChange={(e) => setCallDetails(prev => ({ ...prev, followUpDate: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowLogCall(false)}
                  className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogCall}
                  disabled={!callDetails.notes.trim() || loggingCall}
                  className="flex-1 bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors text-sm disabled:opacity-50"
                >
                  {loggingCall ? "Saving..." : "Save Call"}
                </button>
              </div>
            </div>
          </div>
                 </div>
       )}

       {/* Email Compose Modal */}
       {showEmailCompose && selectedUnit && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
             <div className="px-6 py-4 border-b border-neutral-200">
               <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold text-neutral-800">
                   Compose Email - {displayUnit(selectedUnit.unit_label, selectedUnit.unit_number)}
                 </h3>
                 <button
                   onClick={() => setShowEmailCompose(false)}
                   className="text-neutral-400 hover:text-neutral-600 p-1"
                 >
                   <X className="h-5 w-5" />
                 </button>
               </div>
             </div>
             
             <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-neutral-700 mb-2">
                   To
                 </label>
                 <input
                   type="email"
                   value={selectedUnit.leaseholder_email || ""}
                   disabled
                   className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-neutral-50 text-neutral-600"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-neutral-700 mb-2">
                   Subject *
                 </label>
                 <input
                   type="text"
                   value={emailDetails.subject}
                   onChange={(e) => setEmailDetails(prev => ({ ...prev, subject: e.target.value }))}
                   className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                   placeholder="Enter email subject..."
                   required
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-neutral-700 mb-2">
                   Message *
                 </label>
                 <textarea
                   value={emailDetails.body}
                   onChange={(e) => setEmailDetails(prev => ({ ...prev, body: e.target.value }))}
                   className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                   rows={8}
                   placeholder="Enter your message..."
                   required
                 />
               </div>

               <div className="flex gap-3 pt-4">
                 <button
                   onClick={() => setShowEmailCompose(false)}
                   className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleSendEmail}
                   disabled={!emailDetails.subject.trim() || !emailDetails.body.trim() || sendingEmail}
                   className="flex-1 bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors text-sm disabled:opacity-50"
                 >
                   {sendingEmail ? "Opening..." : "Send Email"}
                 </button>
               </div>
             </div>
           </div>
         </div>
               )}

        {/* Documents Modal */}
        {showDocuments && selectedUnit && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="px-6 py-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    Documents & Correspondence - {displayUnit(selectedUnit.unit_label, selectedUnit.unit_number)}
                  </h3>
                  <button
                    onClick={() => setShowDocuments(false)}
                    className="text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Correspondence History */}
                <div>
                  <h4 className="text-md font-medium text-neutral-700 mb-4">Correspondence History</h4>
                  <div className="space-y-4">
                    {/* Sample correspondence items */}
                    <div className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-neutral-700">Email - Service Charge Reminder</span>
                        </div>
                        <span className="text-xs text-neutral-500">2 days ago</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">Sent reminder for outstanding service charge payment</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>From: management@building.com</span>
                        <span>To: {selectedUnit.leaseholder_email}</span>
                      </div>
                    </div>

                    <div className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-neutral-700">Phone Call - Maintenance Request</span>
                        </div>
                        <span className="text-xs text-neutral-500">1 week ago</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">Discussed heating system maintenance request</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>Duration: 8 minutes</span>
                        <span>Type: Incoming</span>
                      </div>
                    </div>

                    <div className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-neutral-700">Letter - Annual Report</span>
                        </div>
                        <span className="text-xs text-neutral-500">2 weeks ago</span>
                      </div>
                      <p className="text-sm text-neutral-600 mb-2">Annual building report and financial summary sent</p>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>Document Type: PDF</span>
                        <span>Pages: 12</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Categories */}
                <div>
                  <h4 className="text-md font-medium text-neutral-700 mb-4">Document Categories</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 cursor-pointer transition-colors">
                      <h5 className="font-medium text-neutral-700 mb-2">Lease Documents</h5>
                      <p className="text-sm text-neutral-600">Original lease, amendments, and legal documents</p>
                      <span className="text-xs text-neutral-500">3 documents</span>
                    </div>
                    
                    <div className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 cursor-pointer transition-colors">
                      <h5 className="font-medium text-neutral-700 mb-2">Financial Records</h5>
                      <p className="text-sm text-neutral-600">Service charge statements, payment history</p>
                      <span className="text-xs text-neutral-500">24 documents</span>
                    </div>
                    
                    <div className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 cursor-pointer transition-colors">
                      <h5 className="font-medium text-neutral-700 mb-2">Maintenance Records</h5>
                      <p className="text-sm text-neutral-600">Repair requests, work orders, completion reports</p>
                      <span className="text-xs text-neutral-500">8 documents</span>
                    </div>
                    
                    <div className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 cursor-pointer transition-colors">
                      <h5 className="font-medium text-neutral-700 mb-2">Correspondence</h5>
                      <p className="text-sm text-neutral-600">Emails, letters, and communication history</p>
                      <span className="text-xs text-neutral-500">15 documents</span>
                    </div>
                  </div>
                </div>

                {/* Recent Documents */}
                <div>
                  <h4 className="text-md font-medium text-neutral-700 mb-4">Recent Documents</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                          <span className="text-red-600 text-xs font-medium">PDF</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-700">Service Charge Statement 2024</p>
                          <p className="text-xs text-neutral-500">Updated 3 days ago</p>
                        </div>
                      </div>
                      <button className="text-[#4f46e5] hover:text-[#4338ca] text-sm font-medium">
                        View
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-blue-600 text-xs font-medium">DOC</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-700">Maintenance Request Form</p>
                          <p className="text-xs text-neutral-500">Updated 1 week ago</p>
                        </div>
                      </div>
                      <button className="text-[#4f46e5] hover:text-[#4338ca] text-sm font-medium">
                        View
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                          <span className="text-green-600 text-xs font-medium">PDF</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-700">Annual Building Report 2023</p>
                          <p className="text-xs text-neutral-500">Updated 2 weeks ago</p>
                        </div>
                      </div>
                      <button className="text-[#4f46e5] hover:text-[#4338ca] text-sm font-medium">
                        View
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-neutral-200">
                  <button className="flex-1 bg-[#4f46e5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors text-sm">
                    Upload Document
                  </button>
                  <button className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors text-sm">
                    Export All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
