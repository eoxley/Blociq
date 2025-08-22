"use client";
import { useEffect, useState } from "react";
import { 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Bell, 
  RefreshCw,
  Download,
  Eye,
  Edit3
} from "lucide-react";
import StatusPill from "./StatusPill";

type Row = {
  bca_id: string; 
  asset_id: string; 
  asset_name: string; 
  category: string;
  frequency_months: number | null;
  last_renewed_date: string | null; 
  next_due_date: string | null;
  status: string; 
  docs_count: number; 
  notes: string | null; 
  contractor: string | null;
};

export default function ComplianceTrackingPanel({
  buildingId, buildingName, inboxUserId
}: { buildingId: string; buildingName?: string; inboxUserId?: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const r = await fetch(`/api/buildings/${buildingId}/compliance`, { cache: "no-store" });
      const j = await r.json(); 
      if (!r.ok) throw new Error(j.error || "Failed to load compliance data");
      
      console.log("Compliance data loaded:", j.data);
      
      // Transform the data to match the expected Row type
      const transformedRows = (j.data || []).map((item: any) => ({
        bca_id: item.bca_id,
        asset_id: item.asset_id,
        asset_name: item.asset_name,
        category: item.category,
        frequency_months: item.frequency_months,
        last_renewed_date: item.last_renewed_date,
        next_due_date: item.next_due_date,
        status: item.status,
        docs_count: item.docs_count || 0,
        notes: item.notes,
        contractor: item.contractor
      }));
      
      setRows(transformedRows);
    } catch (error: any) {
      console.error("Error loading compliance data:", error);
      setErr(error.message);
    }
  }

  useEffect(() => { 
    setLoading(true); 
    load().finally(() => setLoading(false)); 
  }, [buildingId]);

  async function update(bca_id: string, patch: any) {
    try {
      const r = await fetch(`/api/compliance/${bca_id}/update`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(patch) 
      });
      if (r.ok) await load();
    } catch (error) {
      console.error("Failed to update compliance item:", error);
    }
  }

  async function reminder(row: Row) {
    try {
      const r = await fetch("/api/compliance/reminder", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bca: row, 
          building: { name: buildingName }, 
          inbox_user_id: inboxUserId || null 
        })
      });
      const j = await r.json();
      if (j.mode === "outlook_event" && j.draft?.webLink) window.open(j.draft.webLink, "_blank");
      else if (j.mode === "ics" && j.ics) {
        const blob = new Blob([j.ics], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob); 
        const a = document.createElement("a");
        a.href = url; 
        a.download = "compliance_reminder.ics"; 
        a.click(); 
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to create reminder:", error);
    }
  }

  async function refreshData() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading compliance tracking...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
        <p className="text-red-600 mb-4">{err}</p>
        <button 
          onClick={refreshData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assets Selected</h3>
        <p className="text-gray-600">Switch to Setup Mode to add compliance items to track.</p>
      </div>
    );
  }

  // Calculate summary statistics
  const total = rows.length;
  const compliant = rows.filter(r => r.status === 'compliant').length;
  const pending = rows.filter(r => r.status === 'pending').length;
  const overdue = rows.filter(r => r.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Compliant</p>
              <p className="text-2xl font-bold text-green-600">{compliant}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pending}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Compliance Tracking</h3>
            </div>
            <button 
              onClick={refreshData}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Asset</th>
                <th className="px-6 py-3 text-left font-medium">Category</th>
                <th className="px-6 py-3 text-left font-medium">Last Renewed</th>
                <th className="px-6 py-3 text-left font-medium">Next Due</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Documents</th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.bca_id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{r.asset_name}</div>
                      {r.contractor && (
                        <div className="text-xs text-gray-500">Contractor: {r.contractor}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="date" 
                      defaultValue={r.last_renewed_date || ""} 
                      onChange={e => update(r.bca_id, { last_renewed_date: e.target.value })} 
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="date" 
                      defaultValue={r.next_due_date || ""} 
                      onChange={e => update(r.bca_id, { next_due_date: e.target.value })} 
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    />
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill status={r.status as any} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{r.docs_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => reminder(r)} 
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                        title="Create reminder"
                      >
                        <Bell className="h-3 w-3" />
                        Reminder
                      </button>
                      <button 
                        onClick={() => update(r.bca_id, { status_override: "" })} 
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                        title="Clear status override"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Clear
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
