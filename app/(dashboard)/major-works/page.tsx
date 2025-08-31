"use client";
import { useEffect, useState } from "react";
import { 
  Building2, 
  Hammer, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Target,
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  Eye,
  Edit,
  Trash2,
  Download,
  Mail,
  Phone,
  MapPin,
  Star,
  Zap,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { StageBadge } from "@/components/ui/StatusDot";

type Project = {
  id: string;
  building_id: string;
  title: string;
  stage: string;
  s20_required: boolean;
  s20_stage: string | null;
  budget_estimate: number | null;
  next_milestone: string | null;
  next_milestone_date: string | null;
  buildings?: { name: string; address?: string };
  created_at?: string;
  updated_at?: string;
};

type Building = {
  id: string;
  name: string;
  address: string;
};

export default function MajorWorksPage() {
  const [rows, setRows] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  async function load() {
    try {
      const j = await fetch("/api/major-works/projects").then(r => r.json());
      setRows(j.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  }

  async function loadBuildings() {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .order('name');
      
      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error loading buildings:', error);
      toast.error('Failed to load buildings');
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([load(), loadBuildings()]).finally(() => setLoading(false));
  }, []);

  // Calculate statistics
  const totalProjects = rows.length;
  const activeProjects = rows.filter(p => p.stage !== 'complete' && p.stage !== 'cancelled').length;
  const s20Projects = rows.filter(p => p.s20_required).length;

  // Filter projects
  const filteredProjects = rows.filter(project => {
    const matchesSearch = !searchTerm || 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.buildings?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = filterStage === "all" || project.stage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'planning': return 'bg-blue-100 text-blue-700';
      case 's20_precons': return 'bg-purple-100 text-purple-700';
      case 'tender': return 'bg-orange-100 text-orange-700';
      case 'in_progress': return 'bg-green-100 text-green-700';
      case 'complete': return 'bg-gray-100 text-gray-700';
      case 'on_hold': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      {/* Main Hero Banner - Matching Inbox Page Style */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl mb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Hammer className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Major Works Hub
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Manage major works projects across your portfolio with comprehensive project management and Section 20 compliance.
            </p>
            <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 text-white/90">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {loading ? 'Loading projects...' : `${totalProjects} total projects, ${activeProjects} active`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hammer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-2xl font-bold text-green-600">{activeProjects}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Section 20 Projects</p>
              <p className="text-2xl font-bold text-purple-600">{s20Projects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Project Overview</h2>
                <p className="text-sm text-gray-600">Manage and track your major works projects</p>
              </div>
            </div>
            <button
              onClick={() => setOpenNew(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap gap-4">
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Stages</option>
                  <option value="planning">Planning</option>
                  <option value="s20_precons">Section 20 Pre-consultation</option>
                  <option value="tender">Tender</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>
          )}

          {/* Projects Grid */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map(project => (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{project.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Building2 className="h-4 w-4" />
                      <span>{project.buildings?.name || "Unknown Building"}</span>
                    </div>
                  </div>
                  <StageBadge stage={project.stage} />
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-purple-500" />
                    <span className="text-gray-600">Section 20:</span>
                    <span className={project.s20_required ? "text-purple-600 font-medium" : "text-gray-500"}>
                      {project.s20_required ? (project.s20_stage || "Required") : "Not required"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-medium">
                      {project.budget_estimate != null ? `£${Number(project.budget_estimate).toLocaleString()}` : "—"}
                    </span>
                  </div>
                  
                  {project.next_milestone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600">Next:</span>
                      <span className="font-medium">{project.next_milestone}</span>
                      {project.next_milestone_date && (
                        <span className="text-gray-500">({project.next_milestone_date})</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => schedule(project)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Calendar className="h-3 w-3" />
                    Schedule
                  </button>
                  <button
                    onClick={() => tender(project)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    <Mail className="h-3 w-3" />
                    Tender
                  </button>
                  <button
                    onClick={() => editProject(project)}
                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <Hammer className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-500">
                {searchTerm || filterStage !== "all" 
                  ? "Try adjusting your search or filters." 
                  : "Get started by creating your first major works project."}
              </p>
            </div>
          )}
        </div>
      </div>

      {openNew && (
        <div className="fixed inset-0 z-[9999]">
          <NewProjectModal 
            onClose={() => setOpenNew(false)} 
            onCreate={() => { setOpenNew(false); load(); }}
            buildings={buildings}
          />
        </div>
      )}
    </div>
  );

  async function schedule(project: Project) {
    try {
      const startISO = (project.next_milestone_date || new Date().toISOString().slice(0, 10)) + "T09:00:00";
      const endISO = (project.next_milestone_date || new Date().toISOString().slice(0, 10)) + "T10:00:00";
      const res = await fetch("/api/compliance/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bca: {
            asset_name: project.next_milestone || project.title,
            next_due_date: startISO.slice(0, 10)
          },
          building: { name: project.buildings?.name || "" },
          inbox_user_id: null
        })
      }).then(r => r.json());

      if (res.mode === "outlook_event" && res.draft?.webLink) {
        window.open(res.draft.webLink, "_blank");
        toast.success('Event added to Outlook calendar');
      } else if (res.mode === "ics" && res.ics) {
        downloadICS(res.ics, "major_works.ics");
        toast.success('Calendar file downloaded');
      }
    } catch (error) {
      console.error('Error scheduling:', error);
      toast.error('Failed to schedule event');
    }
  }

  async function tender(project: Project) {
    try {
      const payload = {
        building: { name: project.buildings?.name },
        work: { title: project.title, stage: project.stage },
        return_by: project.next_milestone_date,
        contact: {},
        extras: {}
      };
      const j = await fetch("/api/tender/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      const mailto = `mailto:?subject=${encodeURIComponent(j.subject)}&body=${encodeURIComponent(j.body)}`;
      window.location.href = mailto;
      toast.success('Tender email draft opened');
    } catch (error) {
      console.error('Error preparing tender:', error);
      toast.error('Failed to prepare tender email');
    }
  }

  function editProject(project: Project) {
    // TODO: Implement edit functionality
    toast.info('Edit functionality coming soon');
  }

  function downloadICS(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function NewProjectModal({ 
  onClose, 
  onCreate, 
  buildings 
}: { 
  onClose: () => void; 
  onCreate: () => void;
  buildings: Building[];
}) {
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    building_id: "",
    project_type: "general",
    priority: "medium",
    start_date: "",
    estimated_cost: "",
    expected_duration: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!form.title.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    if (!form.building_id) {
      toast.error('Please select a building');
      return;
    }

    if (!form.start_date) {
      toast.error('Please select a start date');
      return;
    }

    setSubmitting(true);
    try {
      // Use the updated API endpoint with new schema
      const response = await fetch("/api/major-works/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          building_id: form.building_id,
          start_date: form.start_date,
          estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
          expected_duration: form.expected_duration ? parseInt(form.expected_duration) : null,
          project_type: form.project_type,
          priority: form.priority
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      toast.success('Project created successfully');
      onCreate();
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Major Works Project</h2>
          <p className="text-sm text-gray-600 mt-1">Add a new Section 20 major works project</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Title *
            </label>
            <input
              type="text"
              placeholder="e.g., Roof Replacement Project"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              placeholder="Describe the project scope and objectives..."
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Building Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building *
            </label>
            <select
              value={form.building_id}
              onChange={e => setForm({...form, building_id: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} {building.address && `- ${building.address}`}
                </option>
              ))}
            </select>
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Type
            </label>
            <select
              value={form.project_type}
              onChange={e => setForm({...form, project_type: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="roofing">Roofing</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="structural">Structural</option>
              <option value="cosmetic">Cosmetic</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={form.priority}
              onChange={e => setForm({...form, priority: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setForm({...form, start_date: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost (£)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={form.estimated_cost}
              onChange={e => setForm({...form, estimated_cost: e.target.value})}
              step="0.01"
              min="0"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Expected Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Duration (days)
            </label>
            <input
              type="number"
              placeholder="30"
              value={form.expected_duration}
              onChange={e => setForm({...form, expected_duration: e.target.value})}
              min="1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Project Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Notes
            </label>
            <textarea
              placeholder="Additional project details..."
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
