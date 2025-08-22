"use client";
import { useEffect, useState } from "react";
import { Shield, Settings, BarChart3, AlertTriangle, CheckCircle, Clock, Calendar, FileText, Building2 } from "lucide-react";
import SetupComplianceModalV2 from "@/components/compliance/SetupComplianceModalV2";
import ComplianceTrackingPanel from "@/components/compliance/ComplianceTrackingPanel";

interface Building {
  id: string;
  name: string;
  address: string | null;
}

export default function BuildingCompliancePage({ params }: { params: { id: string } }) {
  const buildingId = params.id;
  const [open, setOpen] = useState(false);
  const [hasRows, setHasRows] = useState(false);
  const [mode, setMode] = useState<"setup"|"tracking">("setup");
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      console.log("Refreshing compliance data for building:", buildingId);
      
      // Fetch building details
      const buildingResponse = await fetch(`/api/buildings/${buildingId}`, { cache: "no-store" });
      if (buildingResponse.ok) {
        const buildingData = await buildingResponse.json();
        setBuilding(buildingData.building);
        console.log("Building data:", buildingData.building);
      }

      // Fetch compliance data
      const complianceResponse = await fetch(`/api/buildings/${buildingId}/compliance`, { cache: "no-store" });
      const complianceData = await complianceResponse.json();
      console.log("Compliance data:", complianceData);
      
      const any = (complianceData.data || []).length > 0;
      console.log("Has rows:", any, "Data length:", complianceData.data?.length);
      
      // Debug: Log the actual data structure
      if (complianceData.data && complianceData.data.length > 0) {
        console.log("First compliance item:", complianceData.data[0]);
      }
      
      setHasRows(any);
      if (any) setMode("tracking");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    setLoading(true);
    refresh(); 
  }, [buildingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-pulse">
          <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mb-6"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="h-64 bg-white rounded-xl border border-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Main Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 mb-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute top-1/2 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
          <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-white rounded-full translate-y-10"></div>
        </div>

        <div className="relative px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Compliance Management
              </h1>
              <p className="text-blue-100 text-lg">
                {building?.name || "Building"} • {building?.address || "Address not available"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span className="text-white font-medium">Compliance Tracking</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Calendar className="h-5 w-5 text-blue-300" />
              <span className="text-white font-medium">Due Date Management</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <FileText className="h-5 w-5 text-purple-300" />
              <span className="text-white font-medium">Document Management</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection with Mini Hero Banner */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Compliance Mode</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">Choose how you want to manage compliance for this building</p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => setOpen(true)} 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Shield className="h-5 w-5" />
              Setup Compliance
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setMode("setup")} 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === "setup" 
                    ? "bg-blue-100 text-blue-700 border-2 border-blue-200" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                }`}
              >
                <Settings className="h-4 w-4" />
                Setup Mode
              </button>
              <button 
                onClick={() => setMode("tracking")} 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  mode === "tracking" 
                    ? "bg-green-100 text-green-700 border-2 border-green-200" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Tracking Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {mode === "tracking" && hasRows ? (
        <div className="space-y-6">
          {/* Tracking Mode Mini Hero */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-800">Compliance Tracking</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Monitor and manage compliance status for all building assets</p>
            </div>
            <div className="p-6">
              <ComplianceTrackingPanel buildingId={buildingId} buildingName={building?.name} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-800">Setup Required</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Configure compliance tracking for this building</p>
          </div>
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-amber-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Assets Selected Yet</h3>
              <p className="text-gray-600 mb-6">
                Click <strong>Setup Compliance</strong> to begin configuring compliance tracking for your building assets.
              </p>
              <button 
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Shield className="h-5 w-5" />
                Start Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup Modal */}
      <SetupComplianceModalV2
        open={open}
        buildingId={buildingId}
        onClose={() => setOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}