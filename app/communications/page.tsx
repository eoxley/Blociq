import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mail, 
  FileText, 
  Send, 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Users, 
  Building, 
  TrendingUp, 
  Eye, 
  Edit3, 
  Copy,
  Target,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card';
import { BlocIQBadge } from '@/components/ui/blociq-badge';
import { BlocIQButton } from '@/components/ui/blociq-button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CommunicationsPage() {
  // Real communications data - empty arrays for now
  const recentEmails: any[] = [];

  const letterTemplates: any[] = [];

  const communicationStats = {
    totalSent: 0,
    thisMonth: 0,
    pendingDrafts: 0,
    responseRate: 0,
    avgResponseTime: "0h",
    openRate: 0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <BlocIQBadge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Sent
        </BlocIQBadge>;
      case 'draft':
        return <BlocIQBadge variant="warning" className="flex items-center gap-1">
          <Edit3 className="h-3 w-3" />
          Draft
        </BlocIQBadge>;
      case 'pending':
        return <BlocIQBadge variant="primary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </BlocIQBadge>;
      default:
        return <BlocIQBadge variant="default">{status}</BlocIQBadge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <BlocIQBadge variant="destructive" size="sm" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Urgent
        </BlocIQBadge>;
      case 'high':
        return <BlocIQBadge variant="warning" size="sm" className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          High
        </BlocIQBadge>;
      case 'medium':
        return <BlocIQBadge variant="secondary" size="sm" className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Medium
        </BlocIQBadge>;
      default:
        return <BlocIQBadge variant="default" size="sm">Normal</BlocIQBadge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service_charge':
        return <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center text-white shadow-lg">
          💰
        </div>;
      case 'safety':
        return <div className="w-10 h-10 bg-gradient-to-br from-[#EF4444] to-[#DC2626] rounded-xl flex items-center justify-center text-white shadow-lg">
          🚨
        </div>;
      case 'maintenance':
        return <div className="w-10 h-10 bg-gradient-to-br from-[#2078F4] to-[#1D4ED8] rounded-xl flex items-center justify-center text-white shadow-lg">
          🔧
        </div>;
      case 'meeting':
        return <div className="w-10 h-10 bg-gradient-to-br from-[#7645ED] to-[#7C3AED] rounded-xl flex items-center justify-center text-white shadow-lg">
          📅
        </div>;
      case 'welcome':
        return <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center text-white shadow-lg">
          👋
        </div>;
      default:
        return <div className="w-10 h-10 bg-gradient-to-br from-[#64748B] to-[#475569] rounded-xl flex items-center justify-center text-white shadow-lg">
          📧
        </div>;
    }
  };

  const getCategoryColor = (color: string) => {
    const colors = {
      green: "bg-gradient-to-r from-[#008C8F] to-[#007BDB]",
      red: "bg-gradient-to-r from-[#EF4444] to-[#DC2626]",
      blue: "bg-gradient-to-r from-[#2078F4] to-[#1D4ED8]",
      purple: "bg-gradient-to-r from-[#7645ED] to-[#7C3AED]",
      orange: "bg-gradient-to-r from-[#F59E0B] to-[#D97706]"
    };
    return colors[color as keyof typeof colors] || "bg-[#64748B]";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        {/* Enhanced Header with Gradient Background */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold">Communications Hub</h1>
                <p className="text-white/80 text-lg">Send emails, letters, and updates to your leaseholders</p>
              </div>
              <div className="flex items-center gap-4">
                <BlocIQButton className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </BlocIQButton>
                <BlocIQButton className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Send Letter
                </BlocIQButton>
                <BlocIQButton variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Send
                </BlocIQButton>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <BlocIQCard className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] cursor-pointer">
            <BlocIQCardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-[#0F5D5D] mb-2">Send Email</h3>
              <p className="text-sm text-[#64748B]">Quick email to leaseholders</p>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] cursor-pointer">
            <BlocIQCardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2078F4] to-[#1D4ED8] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-[#0F5D5D] mb-2">Send Letter</h3>
              <p className="text-sm text-[#64748B]">Formal letter with template</p>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] cursor-pointer">
            <BlocIQCardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7645ED] to-[#7C3AED] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-[#0F5D5D] mb-2">Bulk Send</h3>
              <p className="text-sm text-[#64748B]">Send to multiple leaseholders</p>
            </BlocIQCardContent>
          </BlocIQCard>

          <BlocIQCard className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] cursor-pointer">
            <BlocIQCardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-[#0F5D5D] mb-2">Create Template</h3>
              <p className="text-sm text-[#64748B]">Save reusable templates</p>
            </BlocIQCardContent>
          </BlocIQCard>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-[#F3F4F6] p-1 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-[#0F5D5D] data-[state=active]:shadow-sm rounded-lg">
              <Mail className="h-4 w-4 mr-2" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:text-[#0F5D5D] data-[state=active]:shadow-sm rounded-lg">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="buildings" className="data-[state=active]:bg-white data-[state=active]:text-[#0F5D5D] data-[state=active]:shadow-sm rounded-lg">
              <Building className="h-4 w-4 mr-2" />
              By Building
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Recent Communications Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <Input 
                    placeholder="Search communications..." 
                    className="pl-12 w-80 border-[#E2E8F0] focus:border-[#008C8F] focus:ring-[#008C8F] rounded-xl"
                  />
                </div>
                <BlocIQButton variant="outline" className="flex items-center gap-2 border-[#E2E8F0] hover:bg-[#F0FDFA] rounded-xl">
                  <Filter className="h-4 w-4" />
                  Filter
                </BlocIQButton>
              </div>
              <div className="flex items-center gap-2">
                <BlocIQBadge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  All Sent
                </BlocIQBadge>
                <BlocIQBadge variant="primary" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% this week
                </BlocIQBadge>
              </div>
            </div>

            <BlocIQCard className="border-0 shadow-lg bg-white rounded-2xl overflow-hidden">
              <BlocIQCardHeader className="bg-gradient-to-r from-[#F0FDFA] to-[#E2E8F0] border-b border-[#E2E8F0]">
                <h2 className="text-xl font-bold text-[#333333] flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-[#008C8F]" />
                  Recent Communications
                </h2>
              </BlocIQCardHeader>
              <BlocIQCardContent className="p-0">
                <div className="divide-y divide-[#F3F4F6]">
                  {recentEmails.length > 0 ? (
                    recentEmails.map((email, index) => (
                      <div key={email.id} className="group p-6 hover:bg-gradient-to-r hover:from-[#F0FDFA] hover:to-[#E2E8F0] transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="transform group-hover:scale-110 transition-transform duration-300">
                              {getTypeIcon(email.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-[#333333] group-hover:text-[#008C8F] transition-colors duration-300">
                                  {email.subject}
                                </h3>
                                {getStatusBadge(email.status)}
                                {getPriorityBadge(email.priority)}
                              </div>
                              <div className="text-sm text-[#64748B] space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">From:</span> {email.from}
                                  <span className="text-[#64748B]">→</span>
                                  <span className="font-medium">To:</span> {email.to}
                                </div>
                                <div className="flex items-center gap-6">
                                  <span className="flex items-center gap-2 text-[#64748B]">
                                    <Building className="h-3 w-3" />
                                    {email.building}
                                  </span>
                                  <span className="flex items-center gap-2 text-[#64748B]">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(email.date)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <BlocIQButton variant="outline" size="sm" className="border-[#008C8F] text-[#008C8F] hover:bg-[#F0FDFA] rounded-lg">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </BlocIQButton>
                            <BlocIQButton variant="outline" size="sm" className="border-[#2078F4] text-[#2078F4] hover:bg-[#F0FDFA] rounded-lg">
                              <Send className="h-4 w-4 mr-1" />
                              Resend
                            </BlocIQButton>
                            <BlocIQButton variant="outline" size="sm" className="border-[#64748B] text-[#64748B] hover:bg-[#F0FDFA] rounded-lg">
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </BlocIQButton>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#64748B] to-[#475569] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-[#333333] mb-2">No Communications Yet</h3>
                      <p className="text-[#64748B] mb-6">Start sending communications to see them here</p>
                      <BlocIQButton className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white">
                        <Send className="h-4 w-4 mr-2" />
                        Send First Communication
                      </BlocIQButton>
                    </div>
                  )}
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          </TabsContent>

          {/* Enhanced Letter Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#333333]">Communication Templates</h2>
                <p className="text-[#64748B] mt-1">Pre-built templates for leaseholder communications</p>
              </div>
              <BlocIQButton className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white shadow-lg rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </BlocIQButton>
            </div>

            {/* Template Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BlocIQCard className="border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                <BlocIQCardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F5D5D]">Email Templates</h3>
                      <p className="text-sm text-[#64748B]">Quick emails for updates</p>
                    </div>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>

              <BlocIQCard className="border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                <BlocIQCardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2078F4] to-[#1D4ED8] rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F5D5D]">Letter Templates</h3>
                      <p className="text-sm text-[#64748B]">Formal letters & notices</p>
                    </div>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>

              <BlocIQCard className="border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                <BlocIQCardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#7645ED] to-[#7C3AED] rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F5D5D]">Bulk Templates</h3>
                      <p className="text-sm text-[#64748B]">Mass communication</p>
                    </div>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {letterTemplates.length > 0 ? (
                letterTemplates.map((template) => (
                  <BlocIQCard key={template.id} className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white rounded-2xl overflow-hidden">
                    <div className={`h-2 ${getCategoryColor(template.color)}`}></div>
                    <BlocIQCardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-bold text-[#333333] group-hover:text-[#008C8F] transition-colors duration-300">
                          {template.name}
                        </h3>
                        <BlocIQBadge className={`${getCategoryColor(template.color)} text-white border-0 shadow-sm`}>
                          {template.category}
                        </BlocIQBadge>
                      </div>
                    </BlocIQCardHeader>
                    <BlocIQCardContent className="pt-0 space-y-4">
                      <p className="text-sm text-[#64748B] leading-relaxed">{template.description}</p>
                      <div className="flex items-center justify-between text-xs text-[#64748B] bg-[#F3F4F6] p-3 rounded-lg">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Used {template.usageCount} times
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last: {template.lastUsed}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <BlocIQButton variant="outline" size="sm" className="flex-1 border-[#E2E8F0] text-[#64748B] hover:bg-[#F0FDFA] rounded-lg">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </BlocIQButton>
                        <BlocIQButton size="sm" className={`flex-1 ${getCategoryColor(template.color)} text-white border-0 shadow-sm rounded-lg`}>
                          <Send className="h-4 w-4 mr-1" />
                          Use
                        </BlocIQButton>
                      </div>
                    </BlocIQCardContent>
                  </BlocIQCard>
                ))
              ) : (
                <div className="col-span-full">
                  <BlocIQCard className="border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] rounded-2xl">
                    <BlocIQCardContent className="p-12 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-[#64748B] to-[#475569] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-[#333333] mb-2">No Templates Yet</h3>
                      <p className="text-[#64748B] mb-6">Create your first template to speed up leaseholder communications</p>
                      <BlocIQButton className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                      </BlocIQButton>
                    </BlocIQCardContent>
                  </BlocIQCard>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Enhanced Building Communications Tab */}
          <TabsContent value="buildings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#333333]">Building Communications</h2>
              <p className="text-[#64748B] mt-1">Manage communications for each building and its leaseholders</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-full">
                <BlocIQCard className="border-0 bg-gradient-to-br from-[#F0FDFA] to-[#E2E8F0] rounded-2xl">
                  <BlocIQCardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#64748B] to-[#475569] rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-[#333333] mb-2">No Buildings Found</h3>
                    <p className="text-[#64748B] mb-6">Add buildings to your portfolio to start managing leaseholder communications</p>
                    <div className="flex gap-4 justify-center">
                      <BlocIQButton className="bg-gradient-to-r from-[#008C8F] to-[#007BDB] text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Building
                      </BlocIQButton>
                      <BlocIQButton variant="outline" className="border-[#E2E8F0] text-[#64748B] hover:bg-[#F0FDFA]">
                        <Users className="h-4 w-4 mr-2" />
                        Import Leaseholders
                      </BlocIQButton>
                    </div>
                  </BlocIQCardContent>
                </BlocIQCard>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  );
} 