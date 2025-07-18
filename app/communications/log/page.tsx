"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Search, 
  Filter, 
  Calendar,
  Building2,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface CommunicationLog {
  id: string;
  to_email: string;
  subject: string;
  message: string;
  template_id: string;
  building_id: string;
  attachment_path: string;
  sent_by: string;
  sent_at: string;
  status: string;
  template_name?: string;
  building_name?: string;
}

export default function CommunicationsLogPage() {
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    fetchCommunications();
  }, []);

  const fetchCommunications = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      let query = supabase
        .from('communications_sent')
        .select(`
          *,
          templates:template_id(name),
          buildings:building_id(name)
        `)
        .order('sent_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching communications:', error);
        toast.error('Failed to load communications log');
      } else {
        // Transform the data to flatten the joined tables
        const transformedData = data?.map(item => ({
          ...item,
          template_name: item.templates?.name,
          building_name: item.buildings?.name
        })) || [];
        
        setCommunications(transformedData);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load communications log');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = 
      comm.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comm.building_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || comm.status === statusFilter;
    
    const matchesDate = dateFilter === "all" || 
      (dateFilter === "today" && new Date(comm.sent_at).toDateString() === new Date().toDateString()) ||
      (dateFilter === "week" && new Date(comm.sent_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === "month" && new Date(comm.sent_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Calendar className="w-4 h-4 text-yellow-600" />;
      default:
        return <Mail className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const downloadAttachment = async (attachmentPath: string, subject: string) => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase.storage
        .from('generated')
        .download(attachmentPath);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${subject.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Attachment downloaded successfully');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Failed to download attachment');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading communications log...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/communications" className="inline-flex items-center text-primary hover:text-dark mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Communications
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-brand font-bold text-dark mb-2">
              Communications Log
            </h1>
            <p className="text-gray-600">
              Track all sent emails and communications from BlocIQ templates.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-sm">
              {filteredCommunications.length} communications
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search emails, subjects, templates..."
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
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={fetchCommunications}
                variant="outline"
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communications List */}
      <div className="space-y-4">
        {filteredCommunications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all" 
                  ? "Try adjusting your filters or search terms."
                  : "No communications have been sent yet. Generate and send your first document!"
                }
              </p>
              {!searchTerm && statusFilter === "all" && dateFilter === "all" && (
                <Link href="/communications/templates">
                  <Button className="bg-primary hover:bg-dark text-white">
                    Create First Communication
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCommunications.map((comm) => (
            <Card key={comm.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(comm.status)}
                      <h3 className="text-lg font-semibold text-dark">{comm.subject}</h3>
                      <Badge className={getStatusColor(comm.status)}>
                        {comm.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">To:</span> {comm.to_email}
                      </div>
                      <div>
                        <span className="font-medium">Template:</span> {comm.template_name || 'Unknown'}
                      </div>
                      <div>
                        <span className="font-medium">Building:</span> {comm.building_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Sent by:</span> {comm.sent_by}
                      </div>
                    </div>
                    
                    {comm.message && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-700">Message:</span>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {comm.message}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-500">
                      Sent on {new Date(comm.sent_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    {comm.attachment_path && (
                      <Button
                        onClick={() => downloadAttachment(comm.attachment_path, comm.subject)}
                        variant="outline"
                        size="sm"
                        title="Download attachment"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 