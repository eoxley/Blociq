"use client";

import { useState, useEffect } from "react";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Plus,
  Download,
  FileText,
  Building,
  Calendar,
  User,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface InspectionItem {
  id: string;
  asset_type: string;
  asset_name: string;
  status: 'OK' | 'Issue Found' | 'Not Inspected' | 'Needs Attention';
  notes: string | null;
  location: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface SiteInspection {
  id: string;
  building_id: string;
  inspected_by: string;
  inspection_date: string;
  notes: string | null;
  status: 'In Progress' | 'Completed' | 'Cancelled';
  inspection_items: InspectionItem[];
}

interface SiteInspectionProps {
  buildingId: string;
}

export default function SiteInspection({ buildingId }: SiteInspectionProps) {
  const [inspections, setInspections] = useState<SiteInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [currentInspection, setCurrentInspection] = useState<SiteInspection | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // New inspection form
  const [newInspection, setNewInspection] = useState({
    inspectedBy: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchInspections();
  }, [buildingId]);

  const fetchInspections = async () => {
    try {
      const response = await fetch(`/api/site-inspections?buildingId=${buildingId}`);
      const data = await response.json();

      if (data.success) {
        setInspections(data.inspections);
      } else {
        toast.error('Failed to fetch inspections');
      }
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast.error('Failed to fetch inspections');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = async () => {
    try {
      const response = await fetch('/api/site-inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          inspectedBy: newInspection.inspectedBy,
          inspectionDate: newInspection.inspectionDate,
          notes: newInspection.notes
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Inspection started successfully');
        setShowNewInspection(false);
        setCurrentInspection(data.inspection);
        setNewInspection({
          inspectedBy: '',
          inspectionDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchInspections();
      } else {
        toast.error('Failed to start inspection');
      }
    } catch (error) {
      console.error('Error starting inspection:', error);
      toast.error('Failed to start inspection');
    }
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<InspectionItem>) => {
    try {
      const response = await fetch(`/api/inspection-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Item updated successfully');
        fetchInspections();
        if (currentInspection) {
          const updatedInspection = { ...currentInspection };
          updatedInspection.inspection_items = updatedInspection.inspection_items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          );
          setCurrentInspection(updatedInspection);
        }
      } else {
        toast.error('Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleCompleteInspection = async (inspectionId: string, generateSummary: boolean = false) => {
    try {
      setGeneratingSummary(generateSummary);
      
      const response = await fetch(`/api/site-inspections/${inspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          generateSummary
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(generateSummary ? 'Inspection completed with AI summary' : 'Inspection completed');
        setCurrentInspection(null);
        fetchInspections();
      } else {
        toast.error('Failed to complete inspection');
      }
    } catch (error) {
      console.error('Error completing inspection:', error);
      toast.error('Failed to complete inspection');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Issue Found': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'Needs Attention': return <Clock className="h-5 w-5 text-yellow-600" />;
      default: return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-800';
      case 'Issue Found': return 'bg-red-100 text-red-800';
      case 'Needs Attention': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInspectionProgress = (inspection: SiteInspection) => {
    const total = inspection.inspection_items.length;
    const completed = inspection.inspection_items.filter(item => item.status !== 'Not Inspected').length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const downloadInspectionReport = (inspection: SiteInspection) => {
    const progress = getInspectionProgress(inspection);
    
    let report = `Site Inspection Report\n`;
    report += `Building: ${inspection.building_id}\n`;
    report += `Inspected By: ${inspection.inspected_by}\n`;
    report += `Date: ${inspection.inspection_date}\n`;
    report += `Status: ${inspection.status}\n`;
    report += `Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)\n\n`;
    
    report += `Inspection Items:\n`;
    inspection.inspection_items.forEach(item => {
      report += `- ${item.asset_name} (${item.asset_type}): ${item.status}\n`;
      if (item.notes) report += `  Notes: ${item.notes}\n`;
      if (item.location) report += `  Location: ${item.location}\n`;
    });
    
    if (inspection.notes) {
      report += `\nSummary:\n${inspection.notes}\n`;
    }
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-${inspection.inspection_date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Site Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🏢 Site Inspections
            <Badge variant="outline">{inspections.length}</Badge>
          </CardTitle>
          <Button onClick={() => setShowNewInspection(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Start Inspection
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current Active Inspection */}
        {currentInspection && (
          <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-blue-900">Active Inspection</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCompleteInspection(currentInspection.id, true)}
                  disabled={generatingSummary}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {generatingSummary ? 'Generating Summary...' : 'Complete with AI Summary'}
                </Button>
                <Button
                  onClick={() => handleCompleteInspection(currentInspection.id, false)}
                  variant="outline"
                >
                  Complete
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{currentInspection.inspected_by}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{currentInspection.inspection_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  {getInspectionProgress(currentInspection).completed}/{getInspectionProgress(currentInspection).total} items
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getInspectionProgress(currentInspection).percentage}%` }}
              ></div>
            </div>

            {/* Inspection Items */}
            <div className="space-y-3">
              {currentInspection.inspection_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.asset_name}</span>
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.asset_type} {item.location && `• ${item.location}`}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select 
                      value={item.status} 
                      onChange={(e) => handleUpdateItem(item.id, { status: e.target.value as InspectionItem['status'] })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem>Not Inspected</SelectItem>
                        <SelectItem>OK</SelectItem>
                        <SelectItem>Needs Attention</SelectItem>
                        <SelectItem>Issue Found</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      placeholder="Notes..."
                      value={item.notes || ''}
                      onChange={(e) => handleUpdateItem(item.id, { notes: e.target.value })}
                      className="w-40"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Inspections */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Past Inspections</h3>
          
          {inspections.filter(i => i.status !== 'In Progress').length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No past inspections found. Start your first inspection to get started!</p>
            </div>
          ) : (
            inspections
              .filter(inspection => inspection.status !== 'In Progress')
              .map((inspection) => {
                const progress = getInspectionProgress(inspection);
                return (
                  <div key={inspection.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{inspection.inspection_date}</h4>
                          <Badge className={getStatusColor(inspection.status)}>
                            {inspection.status}
                          </Badge>
                          <Badge variant="outline">
                            {progress.completed}/{progress.total} items
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{inspection.inspected_by}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            <span>{inspection.building_id}</span>
                          </div>
                        </div>
                        
                        {inspection.notes && (
                          <p className="text-sm text-gray-600 line-clamp-2">{inspection.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadInspectionReport(inspection)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </CardContent>

      {/* New Inspection Modal */}
      {showNewInspection && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Start New Site Inspection</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="inspectedBy">Inspected By</Label>
                <Input
                  id="inspectedBy"
                  value={newInspection.inspectedBy}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectedBy: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <Label htmlFor="inspectionDate">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={newInspection.inspectionDate}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectionDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Initial Notes</Label>
                <Textarea
                  id="notes"
                  value={newInspection.notes}
                  onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
                  placeholder="Any initial observations..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleStartInspection} className="flex-1">
                Start Inspection
              </Button>
              <Button variant="outline" onClick={() => setShowNewInspection(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 