<<<<<<< HEAD
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  X,
  Upload,
  Eye,
  Edit,
  Trash2
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
  estimated_cost: number;
  actual_cost: number;
  contractor_name: string;
  contractor_contact: string;
  notes: string;
  created_at: string;
  updated_at: string;
  building_name: string;
  document_count: number;
}

interface Building {
  id: string;
  name: string;
}

export default function MajorWorksPage() {
  const [projects, setProjects] = useState<MajorWorksProject[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buildingFilter, setBuildingFilter] = useState<string>("all");

  useEffect(() => {
    fetchProjects();
    fetchBuildings();
  }, []);

  const fetchProjects = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('major_works_projects')
        .select(`
          *,
          buildings:building_id(name),
          documents:major_works_documents(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load major works projects');
      } else {
        // Transform the data to flatten the joined tables
        const transformedData = data?.map(project => ({
          ...project,
          building_name: project.buildings?.[0]?.name || 'Unknown',
          document_count: project.documents?.[0]?.count || 0
        })) || [];
        
        setProjects(transformedData);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load major works projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching buildings:', error);
      } else {
        setBuildings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.contractor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesBuilding = buildingFilter === "all" || project.building_name === buildingFilter;
    
    return matchesSearch && matchesStatus && matchesBuilding;
  });

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

  const formatCurrency = (amount: number | null) => {
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading major works projects...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-brand font-bold text-dark mb-2">
          Major Works
        </h1>
        <p className="text-gray-600">
          Track and manage major works projects across all buildings.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-dark">{projects.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-blue-600">
                  {projects.filter(p => p.status === 'works_in_progress').length}
                </p>
              </div>
              <Play className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter(p => p.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Estimated</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(projects.reduce((sum, p) => sum + (p.estimated_cost || 0), 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Projects
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, building, contractor..."
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="notice_of_intention">Notice of Intention</option>
                <option value="statement_of_estimates">Statement of Estimates</option>
                <option value="contractor_appointed">Contractor Appointed</option>
                <option value="works_in_progress">Works in Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Building
              </label>
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Buildings</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.name}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Link href="/major-works/new" className="w-full">
                <Button className="w-full bg-primary hover:bg-dark text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No major works projects found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all" || buildingFilter !== "all" 
                  ? "Try adjusting your filters or search terms."
                  : "No major works projects have been created yet."
                }
              </p>
              {!searchTerm && statusFilter === "all" && buildingFilter === "all" && (
                <Link href="/major-works/new">
                  <Button className="bg-primary hover:bg-dark text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Project
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(project.status)}
                      <h3 className="text-lg font-semibold text-dark">{project.name}</h3>
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{project.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Building:</span> {project.building_name}
                      </div>
                      <div>
                        <span className="font-medium">Contractor:</span> {project.contractor_name || 'Not appointed'}
                      </div>
                      <div>
                        <span className="font-medium">Estimated Cost:</span> {formatCurrency(project.estimated_cost)}
                      </div>
                      <div>
                        <span className="font-medium">Documents:</span> {project.document_count} files
                      </div>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500">
                      Created {formatDate(project.created_at)} • Last updated {formatDate(project.updated_at)}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Link href={`/major-works/${project.id}`}>
                      <Button variant="outline" size="sm" title="View project details">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    
                    <Link href={`/major-works/${project.id}/upload`}>
                      <Button variant="outline" size="sm" title="Upload documents">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </Link>
                    
                    <Link href={`/major-works/${project.id}/edit`}>
                      <Button variant="outline" size="sm" title="Edit project">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
=======
'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft, Plus, Building2, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface Project {
  id: string
  title: string
  description: string
  status: string
  start_date: string
  consultation_stage: string
  created_at: string
}

export default function MajorWorksPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProjects() {
      try {
        console.log('🔍 [MajorWorks] Fetching all projects...')
        
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        console.log('🔍 [MajorWorks] Testing database connection...')
        console.log('🔍 [MajorWorks] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
        console.log('🔍 [MajorWorks] Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
        
        const { data, error: fetchError } = await supabase
          .from('major_works')
          .select('*')
          .order('created_at', { ascending: false })
        
        console.log('🔍 [MajorWorks] Query completed')
        console.log('🔍 [MajorWorks] Raw response:', { data, error: fetchError })
        console.log('🔍 [MajorWorks] Fetched projects:', data?.length || 0)

        if (fetchError) {
          console.error('❌ [MajorWorks] Error fetching projects:', fetchError)
          setError(fetchError.message)
        } else {
          setProjects(data || [])
        }
      } catch (err) {
        console.error('💥 [MajorWorks] Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/home" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Major Works Tracker</h1>
                <p className="text-gray-600">Track and manage major works projects across your portfolio</p>
              </div>
            </div>
            
            {/* Start New Project Button */}
            <Link 
              href="/major-works/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-2xl hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Start New Project
            </Link>
          </div>

          {/* Loading State */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600 mr-3" />
              <span className="text-lg text-gray-600">Loading projects...</span>
            </div>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header with Back to Home navigation and Start New Project button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/home" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Major Works Tracker</h1>
              <p className="text-gray-600">Track and manage major works projects across your portfolio</p>
            </div>
          </div>
          
          {/* Start New Project Button */}
          <Link 
            href="/major-works/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-2xl hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <Plus className="h-5 w-5" />
            Start New Project
          </Link>
        </div>

        {/* Projects List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Projects</h2>
          </div>
          
          {error ? (
            <div className="px-6 py-8 text-center">
              <p className="text-red-500 text-lg mb-2">Error loading projects</p>
              <p className="text-gray-600 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500 text-lg">No projects found</p>
              <p className="text-gray-400 text-sm mt-1">Create your first major works project to get started.</p>
              <div className="mt-4 p-4 bg-gray-100 rounded text-left">
                <p className="text-sm text-gray-600">Debug Info:</p>
                <p className="text-xs text-gray-500">Projects count: {projects.length}</p>
                <p className="text-xs text-gray-500">Error: {error ? 'Yes' : 'No'}</p>
                <p className="text-xs text-gray-500">Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
                <p className="text-xs text-gray-500">Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {projects.map((project, index) => (
                <div 
                  key={project.id} 
                  className="group relative bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg hover:bg-slate-50 transition-all duration-300"
                >
                  {/* Status indicator bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                    project.status === 'planned' ? 'bg-blue-500' :
                    project.status === 'ongoing' ? 'bg-yellow-500' :
                    project.status === 'completed' ? 'bg-green-500' :
                    'bg-gray-500'
                  }`} />
                  
                  <Link href={`/major-works/${project.id}`} className="block">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 ml-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Building2 className="h-5 w-5 text-gray-400" />
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                            {project.title}
                          </h3>
                        </div>
                        
                        <p className="text-gray-600 leading-relaxed mb-3">
                          {project.description?.substring(0, 120)}
                          {project.description && project.description.length > 120 && '...'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'No start date'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-300">•</span>
                            <span>{project.consultation_stage || 'No stage set'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          project.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status === 'planned' && <Clock className="h-4 w-4 mr-1" />}
                          {project.status === 'ongoing' && <AlertTriangle className="h-4 w-4 mr-1" />}
                          {project.status === 'completed' && <CheckCircle className="h-4 w-4 mr-1" />}
                          {project.status?.charAt(0).toUpperCase() + project.status?.slice(1) || 'Unknown'}
                        </span>
                        
                        <div className="text-xs text-gray-400">
                          ID: {project.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LayoutWithSidebar>
  )
>>>>>>> locked-ui-baseline
} 