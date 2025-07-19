"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  ArrowLeft,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  X,
  Plus,
  CalendarDays,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";

interface MajorWorksProject {
  id: string;
  name: string;
  description: string;
  status: string;
  notice_of_intention_date: string;
  statement_of_estimates_date: string;
  contractor_appointed_date: string;
  expected_completion_date: string;
  actual_completion_date: string;
  estimated_cost: number | undefined;
  actual_cost: number | undefined;
  contractor_name: string;
  contractor_contact: string;
  notes: string;
  created_at: string;
  updated_at: string;
  building_name: string;
}

interface ProjectDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_tag: string;
  uploaded_at: string;
  description: string;
  uploaded_by: string;
}

interface TimelineEvent {
  id: string;
  event_name: string;
  event_date: string;
  event_type: string;
  description: string;
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<MajorWorksProject | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<MajorWorksProject>>({});

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchDocuments();
      fetchTimelineEvents();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('major_works_projects')
        .select(`
          *,
          buildings:building_id(name)
        `)
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project details');
      } else {
        const transformedData = {
          ...data,
          building_name: data.buildings?.[0]?.name || 'Unknown'
        };
        setProject(transformedData);
        setEditData(transformedData);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('major_works_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchTimelineEvents = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('major_works_timeline_events')
        .select('*')
        .eq('project_id', projectId)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Error fetching timeline events:', error);
      } else {
        setTimelineEvents(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { error } = await supabase
        .from('major_works_projects')
        .update(editData)
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      toast.success('Project updated successfully');
      setEditing(false);
      fetchProject();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "works_in_progress":
        return <Play className="w-4 h-4 text-blue-600" />;
      case "contractor_appointed":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "statement_of_estimates":
        return <FileText className="w-4 h-4 text-purple-600" />;
      case "notice_of_intention":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "on_hold":
        return <Pause className="w-4 h-4 text-gray-600" />;
      case "cancelled":
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "works_in_progress":
        return "bg-blue-100 text-blue-800";
      case "contractor_appointed":
        return "bg-yellow-100 text-yellow-800";
      case "statement_of_estimates":
        return "bg-purple-100 text-purple-800";
      case "notice_of_intention":
        return "bg-orange-100 text-orange-800";
      case "on_hold":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "notice_of_intention":
        return "Notice of Intention";
      case "statement_of_estimates":
        return "Statement of Estimates";
      case "contractor_appointed":
        return "Contractor Appointed";
      case "works_in_progress":
        return "Works in Progress";
      case "completed":
        return "Completed";
      case "on_hold":
        return "On Hold";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getDocumentIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
    if (fileType.includes('docx')) return <FileText className="w-4 h-4 text-blue-500" />;
    if (fileType.includes('xlsx')) return <FileText className="w-4 h-4 text-green-500" />;
    if (fileType.includes('image')) return <FileText className="w-4 h-4 text-purple-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getDocumentTagColor = (tag: string) => {
    switch (tag) {
      case 'scope':
        return 'bg-blue-100 text-blue-800';
      case 'quote':
        return 'bg-green-100 text-green-800';
      case 'notice':
        return 'bg-yellow-100 text-yellow-800';
      case 'correspondence':
        return 'bg-purple-100 text-purple-800';
      case 'contract':
        return 'bg-orange-100 text-orange-800';
      case 'invoice':
        return 'bg-red-100 text-red-800';
      case 'photo':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark mb-4">Project not found</h1>
          <Link href="/major-works">
            <Button className="bg-primary hover:bg-dark text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Major Works
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/major-works" className="inline-flex items-center text-primary hover:text-dark mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Major Works
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-brand font-bold text-dark mb-2">
              {project.name}
            </h1>
            <p className="text-gray-600">
              {project.description}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
            <Button
              onClick={() => setEditing(!editing)}
              variant="outline"
            >
              <Edit className="w-4 h-4 mr-2" />
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={editData.name || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editData.description || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimated_cost">Estimated Cost</Label>
                      <Input
                        id="estimated_cost"
                        type="number"
                        value={editData.estimated_cost || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || undefined }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="actual_cost">Actual Cost</Label>
                      <Input
                        id="actual_cost"
                        type="number"
                        value={editData.actual_cost || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, actual_cost: parseFloat(e.target.value) || undefined }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contractor_name">Contractor Name</Label>
                      <Input
                        id="contractor_name"
                        value={editData.contractor_name || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, contractor_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contractor_contact">Contractor Contact</Label>
                      <Input
                        id="contractor_contact"
                        value={editData.contractor_contact || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, contractor_contact: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSave} className="bg-primary hover:bg-dark text-white">
                      Save Changes
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Project Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Building:</span> {project.building_name}</div>
                      <div><span className="font-medium">Status:</span> {getStatusLabel(project.status)}</div>
                      <div><span className="font-medium">Estimated Cost:</span> {formatCurrency(project.estimated_cost)}</div>
                      <div><span className="font-medium">Actual Cost:</span> {formatCurrency(project.actual_cost)}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contractor Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Name:</span> {project.contractor_name || 'Not appointed'}</div>
                      <div><span className="font-medium">Contact:</span> {project.contractor_contact || 'Not provided'}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Timeline Progress Bar */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium">Notice of Intention</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm font-medium">Statement of Estimates</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium">Contractor Appointed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium">Works in Progress</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  </div>
                  
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-purple-500 via-yellow-500 via-blue-500 to-green-500 transition-all duration-500"
                      style={{ 
                        width: `${(() => {
                          switch (project.status) {
                            case 'notice_of_intention': return 20;
                            case 'statement_of_estimates': return 40;
                            case 'contractor_appointed': return 60;
                            case 'works_in_progress': return 80;
                            case 'completed': return 100;
                            default: return 0;
                          }
                        })()}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">Key Dates</h4>
                    <Button variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <div>
                          <div className="font-medium">Notice of Intention</div>
                          <div className="text-sm text-gray-600">{formatDate(project.notice_of_intention_date)}</div>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">Required</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="font-medium">Statement of Estimates</div>
                          <div className="text-sm text-gray-600">{formatDate(project.statement_of_estimates_date)}</div>
                        </div>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">Required</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-yellow-600" />
                        <div>
                          <div className="font-medium">Contractor Appointed</div>
                          <div className="text-sm text-gray-600">{formatDate(project.contractor_appointed_date)}</div>
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">Optional</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Expected Completion</div>
                          <div className="text-sm text-gray-600">{formatDate(project.expected_completion_date)}</div>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">Target</Badge>
                    </div>
                    
                    {project.actual_completion_date && (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <div>
                            <div className="font-medium">Actual Completion</div>
                            <div className="text-sm text-gray-600">{formatDate(project.actual_completion_date)}</div>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Completed</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Documents</CardTitle>
                <Link href={`/major-works/${projectId}/upload`}>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
                  <p className="text-gray-600 mb-4">
                    Upload project documents, quotes, and correspondence.
                  </p>
                  <Link href={`/major-works/${projectId}/upload`}>
                    <Button className="bg-primary hover:bg-dark text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload First Document
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        {getDocumentIcon(doc.file_type)}
                        <div>
                          <div className="font-medium">{doc.file_name}</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(doc.uploaded_at)} • {doc.file_type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getDocumentTagColor(doc.document_tag)}>
                          {doc.document_tag}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div>
                  <Textarea
                    value={editData.notes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add project notes..."
                    rows={6}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  {project.notes || 'No notes added yet.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={`/major-works/${projectId}/upload`} className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
              
              <Link href={`/major-works/${projectId}/edit`} className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </Button>
              </Link>
              
              <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Project
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 