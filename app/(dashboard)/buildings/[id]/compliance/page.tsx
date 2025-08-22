"use client";
import { useEffect, useState } from "react";
import { Shield, Settings, BarChart3, AlertTriangle, CheckCircle, Clock, Calendar, FileText, Building2, Zap, Upload, Bell, TrendingUp, Info } from "lucide-react";
import SetupComplianceModalV2 from "@/components/compliance/SetupComplianceModalV2";
import ComprehensiveComplianceTracker from "@/components/compliance/ComprehensiveComplianceTracker";
import { BlocIQBadge } from "@/components/ui/blociq-badge";

interface Building {
  id: string;
  name: string;
  address?: string;
}

export default function BuildingCompliancePage({ params }: { params: { id: string } }) {
  const buildingId = params.id;
  const [open, setOpen] = useState(false);
  const [hasRows, setHasRows] = useState(false);
  const [mode, setMode] = useState<"setup"|"tracking">("setup");
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<any>({ data: [] });

  async function refresh() {
    try {
      console.log("Refreshing compliance data for building:", buildingId);
      
      // Fetch building details
      const buildingResponse = await fetch(`/api/buildings/${buildingId}`, { cache: "no-store" });
      if (buildingResponse.ok) {
        const buildingData = await buildingResponse.json();
        setBuilding(buildingData.building);
        console.log("Building data:", buildingData.building);
      } else {
        console.error("Failed to fetch building:", buildingResponse.status, buildingResponse.statusText);
        throw new Error(`Failed to fetch building: ${buildingResponse.status}`);
      }

      // Fetch compliance data
      const complianceResponse = await fetch(`/api/buildings/${buildingId}/compliance`, { cache: "no-store" });
      if (!complianceResponse.ok) {
        console.error("Failed to fetch compliance data:", complianceResponse.status, complianceResponse.statusText);
        throw new Error(`Failed to fetch compliance data: ${complianceResponse.status}`);
      }
      
      const complianceData = await complianceResponse.json();
      console.log("Compliance data:", complianceData);
      
      if (complianceData.error) {
        throw new Error(complianceData.error);
      }
      
      setComplianceData(complianceData);
      
      const hasComplianceData = (complianceData.data || []).length > 0;
      console.log("Has compliance data:", hasComplianceData, "Data length:", complianceData.data?.length);
      
      // Debug: Log the actual data structure
      if (complianceData.data && complianceData.data.length > 0) {
        console.log("First compliance item:", complianceData.data[0]);
      }
      
      setHasRows(hasComplianceData);
      if (hasComplianceData) setMode("tracking");
    } catch (error) {
      console.error("Error fetching data:", error);
      // Set error state but don't crash the page
      setComplianceData({ data: [], error: error instanceof Error ? error.message : 'Unknown error' });
      setHasRows(false);
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

      {/* Error Display */}
      {complianceData.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Compliance System Error</h3>
              <p className="text-red-700 mb-4">{complianceData.error}</p>
              <div className="flex gap-3">
                <button
                  onClick={refresh}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setComplianceData({ data: [], error: null })}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {mode === "tracking" && hasRows ? (
        <div className="space-y-6">
          {/* Compliance Overview */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-800">Compliance Overview</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Key metrics and insights for {building?.name}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-2">
                    {complianceData.data?.length || 0}
                  </div>
                  <p className="text-sm text-gray-600">Total Assets</p>
                  <p className="text-xs text-gray-500">Being tracked</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {complianceData.data?.filter((a: any) => a.status === 'compliant').length || 0}
                  </div>
                  <p className="text-sm text-gray-600">Compliant</p>
                  <p className="text-xs text-gray-500">Up to date</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {complianceData.data?.filter((a: any) => a.status === 'due_soon').length || 0}
                  </div>
                  <p className="text-sm text-gray-600">Due Soon</p>
                  <p className="text-xs text-gray-500">Next 30 days</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {complianceData.data?.filter((a: any) => a.status === 'overdue').length || 0}
                  </div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-xs text-gray-500">Action required</p>
                </div>
              </div>
              
              {/* Compliance Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Compliance</span>
                  <span className="text-sm text-gray-500">
                    {complianceData.data?.length > 0 
                      ? Math.round((complianceData.data.filter((a: any) => a.status === 'compliant').length / complianceData.data.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${complianceData.data?.length > 0 
                        ? Math.round((complianceData.data.filter((a: any) => a.status === 'compliant').length / complianceData.data.length) * 100)
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Common compliance management tasks</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-green-800">Schedule Inspections</p>
                    <p className="text-sm text-green-600">Book upcoming compliance checks</p>
                  </div>
                </button>
                
                <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium text-blue-800">Upload Documents</p>
                    <p className="text-sm text-blue-600">Add compliance certificates</p>
                  </div>
                </button>
                
                <button className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                  <Bell className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <p className="font-medium text-purple-800">Set Reminders</p>
                    <p className="text-sm text-purple-600">Configure due date alerts</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Upcoming Compliance Items */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-800">Items Requiring Attention</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Compliance items that need your immediate attention</p>
            </div>
            <div className="p-6">
              {(() => {
                const attentionItems = (complianceData.data || []).filter((item: any) => 
                  item.status === 'overdue' || item.status === 'due_soon'
                ).slice(0, 5); // Show top 5 items
                
                if (attentionItems.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <p className="text-gray-600">All compliance items are up to date!</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {attentionItems.map((item: any) => {
                      const daysUntilDue = item.next_due_date 
                        ? Math.ceil((new Date(item.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : 999;
                      const isOverdue = daysUntilDue < 0;
                      
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              isOverdue ? 'bg-red-500' : 'bg-yellow-500'
                            }`}></div>
                            <div>
                              <p className="font-medium text-gray-900">{item.asset_name}</p>
                              <p className="text-sm text-gray-600">{item.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              isOverdue ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `Due in ${daysUntilDue} days`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.next_due_date ? new Date(item.next_due_date).toLocaleDateString('en-GB') : 'No due date'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Recent Compliance Activities */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">Recent Activities</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">Latest updates and changes to compliance items</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {(() => {
                  // Get recent activities (last 5 updated items)
                  const recentItems = (complianceData.data || [])
                    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                    .slice(0, 5);
                  
                  if (recentItems.length === 0) {
                    return (
                      <div className="text-center py-6 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No recent activities</p>
                      </div>
                    );
                  }
                  
                  return recentItems.map((item: any) => {
                    const updatedDate = new Date(item.updated_at);
                    const timeAgo = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {item.asset_name} updated
                          </p>
                          <p className="text-xs text-gray-500">
                            {timeAgo === 0 ? 'Today' : 
                             timeAgo === 1 ? 'Yesterday' : 
                             `${timeAgo} days ago`}
                          </p>
                        </div>
                        <div className="text-right">
                          <BlocIQBadge variant="secondary" className="text-xs">
                            {item.status}
                          </BlocIQBadge>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Compliance Trends & Insights */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-semibold text-gray-800">Insights & Recommendations</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">AI-powered insights to improve compliance management</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority Actions */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Priority Actions</h3>
                  {(() => {
                    const overdueItems = (complianceData.data || []).filter((item: any) => item.status === 'overdue');
                    const dueSoonItems = (complianceData.data || []).filter((item: any) => item.status === 'due_soon');
                    
                    if (overdueItems.length === 0 && dueSoonItems.length === 0) {
                      return (
                        <div className="text-sm text-gray-500 italic">
                          No urgent actions required at this time.
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {overdueItems.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-800">Address overdue: {item.asset_name}</p>
                              <p className="text-xs text-red-600">Immediate action required</p>
                            </div>
                          </div>
                        ))}
                        
                        {dueSoonItems.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-800">Plan for: {item.asset_name}</p>
                              <p className="text-xs text-yellow-600">Due within 30 days</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Compliance Tips */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Best Practices</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Regular Reviews</p>
                        <p className="text-xs text-blue-600">Review compliance status monthly to catch issues early</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Document Everything</p>
                        <p className="text-xs text-green-600">Keep all certificates and reports organized</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <Bell className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">Set Reminders</p>
                        <p className="text-xs text-purple-600">Use calendar reminders for upcoming due dates</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              <ComprehensiveComplianceTracker 
                building={building!}
                complianceAssets={complianceData.data || []}
                onRefresh={refresh}
              />
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