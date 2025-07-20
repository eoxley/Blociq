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
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Target,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        return <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-sm">
          <CheckCircle className="h-3 w-3 mr-1" />
          Sent
        </Badge>;
      case 'draft':
        return <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-sm">
          <Edit3 className="h-3 w-3 mr-1" />
          Draft
        </Badge>;
      case 'pending':
        return <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-sm">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-0">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Urgent
        </Badge>;
      case 'high':
        return <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-sm text-xs">
          <Target className="h-3 w-3 mr-1" />
          High
        </Badge>;
      case 'medium':
        return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-sm text-xs">
          <Info className="h-3 w-3 mr-1" />
          Medium
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">Normal</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service_charge':
        return <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          💰
        </div>;
      case 'safety':
        return <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          🚨
        </div>;
      case 'maintenance':
        return <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          🔧
        </div>;
      case 'meeting':
        return <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          📅
        </div>;
      case 'welcome':
        return <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          👋
        </div>;
      default:
        return <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          📧
        </div>;
    }
  };

  const getCategoryColor = (color: string) => {
    const colors = {
      green: "bg-gradient-to-r from-green-500 to-green-600",
      red: "bg-gradient-to-r from-red-500 to-red-600",
      blue: "bg-gradient-to-r from-blue-500 to-blue-600",
      purple: "bg-gradient-to-r from-purple-500 to-purple-600",
      orange: "bg-gradient-to-r from-orange-500 to-orange-600"
    };
    return colors[color as keyof typeof colors] || "bg-gray-500";
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
      <div className="p-6 space-y-8">
        {/* Enhanced Header with Gradient Background */}
        <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold">Communications Hub</h1>
                <p className="text-teal-100 text-lg">Send emails, letters, and updates to your leaseholders</p>
              </div>
              <div className="flex items-center gap-4">
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Send Letter
                </Button>
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Send
                </Button>
              </div>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-white/5 rounded-full"></div>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-green-50 to-green-100 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-green-700 mb-2">Send Email</h3>
              <p className="text-sm text-green-600">Quick email to leaseholders</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-blue-700 mb-2">Send Letter</h3>
              <p className="text-sm text-blue-600">Formal letter with template</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-purple-700 mb-2">Bulk Send</h3>
              <p className="text-sm text-purple-600">Send to multiple leaseholders</p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-gradient-to-br from-orange-50 to-orange-100 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-orange-700 mb-2">Create Template</h3>
              <p className="text-sm text-orange-600">Save reusable templates</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg">
              <Mail className="h-4 w-4 mr-2" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="buildings" className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg">
              <Building className="h-4 w-4 mr-2" />
              By Building
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-lg">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Recent Communications Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search communications..." 
                    className="pl-12 w-80 border-gray-200 focus:border-teal-500 focus:ring-teal-500 rounded-xl"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2 border-gray-200 hover:bg-gray-50 rounded-xl">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  All Sent
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% this week
                </Badge>
              </div>
            </div>

            <Card className="border-0 shadow-lg bg-white rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-teal-600" />
                  Recent Communications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {recentEmails.length > 0 ? (
                    recentEmails.map((email, index) => (
                      <div key={email.id} className="group p-6 hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="transform group-hover:scale-110 transition-transform duration-300">
                              {getTypeIcon(email.type)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors duration-300">
                                  {email.subject}
                                </h3>
                                {getStatusBadge(email.status)}
                                {getPriorityBadge(email.priority)}
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">From:</span> {email.from}
                                  <span className="text-gray-400">→</span>
                                  <span className="font-medium">To:</span> {email.to}
                                </div>
                                <div className="flex items-center gap-6">
                                  <span className="flex items-center gap-2 text-gray-500">
                                    <Building className="h-3 w-3" />
                                    {email.building}
                                  </span>
                                  <span className="flex items-center gap-2 text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(email.date)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button variant="outline" size="sm" className="border-teal-200 text-teal-700 hover:bg-teal-50 rounded-lg">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg">
                              <Send className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                            <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No Communications Yet</h3>
                      <p className="text-gray-600 mb-6">Start sending communications to see them here</p>
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Send className="h-4 w-4 mr-2" />
                        Send First Communication
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Letter Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Communication Templates</h2>
                <p className="text-gray-600 mt-1">Pre-built templates for leaseholder communications</p>
              </div>
              <Button className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-lg rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            {/* Template Categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-700">Email Templates</h3>
                      <p className="text-sm text-green-600">Quick emails for updates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-700">Letter Templates</h3>
                      <p className="text-sm text-blue-600">Formal letters & notices</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl cursor-pointer hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-700">Bulk Templates</h3>
                      <p className="text-sm text-purple-600">Mass communication</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {letterTemplates.length > 0 ? (
                letterTemplates.map((template) => (
                  <Card key={template.id} className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white rounded-2xl overflow-hidden">
                    <div className={`h-2 ${getCategoryColor(template.color)}`}></div>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-teal-700 transition-colors duration-300">
                          {template.name}
                        </CardTitle>
                        <Badge className={`${getCategoryColor(template.color)} text-white border-0 shadow-sm`}>
                          {template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
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
                        <Button variant="outline" size="sm" className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" className={`flex-1 ${getCategoryColor(template.color)} text-white border-0 shadow-sm rounded-lg`}>
                          <Send className="h-4 w-4 mr-1" />
                          Use
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No Templates Yet</h3>
                      <p className="text-gray-600 mb-6">Create your first template to speed up leaseholder communications</p>
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Enhanced Building Communications Tab */}
          <TabsContent value="buildings" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Building Communications</h2>
              <p className="text-gray-600 mt-1">Manage communications for each building and its leaseholders</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-full">
                <Card className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Building className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Buildings Found</h3>
                    <p className="text-gray-600 mb-6">Add buildings to your portfolio to start managing leaseholder communications</p>
                    <div className="flex gap-4 justify-center">
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Building
                      </Button>
                      <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                        <Users className="h-4 w-4 mr-2" />
                        Import Leaseholders
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Enhanced Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Communication Analytics</h2>
              <p className="text-gray-600 mt-1">Track leaseholder engagement and communication performance</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg bg-white rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                    <PieChart className="h-5 w-5 mr-2 text-teal-600" />
                    Communication Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <PieChart className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600">Start sending communications to see engagement analytics</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Leaseholder Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600">Response rates will appear once leaseholders engage</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-0 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-teal-700 mb-2">0</div>
                  <div className="text-sm text-teal-600">Total Sent</div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-700 mb-2">0%</div>
                  <div className="text-sm text-blue-600">Response Rate</div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-700 mb-2">0</div>
                  <div className="text-sm text-green-600">Active Leaseholders</div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-700 mb-2">0</div>
                  <div className="text-sm text-purple-600">Templates Used</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  );
} 