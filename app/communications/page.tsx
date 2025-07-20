import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import Link from 'next/link';
import { ArrowLeft, Mail, FileText, Send, Clock, Search, Filter, Plus, MessageSquare, Phone, Calendar, Users, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CommunicationsPage() {
  // Example communications data
  const recentEmails = [
    {
      id: 1,
      subject: "Service Charge Reminder - Q1 2024",
      from: "finance@blociq.co.uk",
      to: "residents@testproperty.com",
      date: "2024-03-15T10:30:00Z",
      status: "sent",
      building: "Test Property",
      type: "service_charge"
    },
    {
      id: 2,
      subject: "Fire Safety Inspection Notice",
      from: "safety@blociq.co.uk",
      to: "all-residents@xxbuilding.com",
      date: "2024-03-14T14:15:00Z",
      status: "sent",
      building: "XX Building",
      type: "safety"
    },
    {
      id: 3,
      subject: "Maintenance Update - Lift Repairs",
      from: "maintenance@blociq.co.uk",
      to: "residents@samplecomplex.com",
      date: "2024-03-13T09:45:00Z",
      status: "draft",
      building: "Sample Complex",
      type: "maintenance"
    },
    {
      id: 4,
      subject: "AGM Meeting Invitation",
      from: "admin@blociq.co.uk",
      to: "leaseholders@testproperty.com",
      date: "2024-03-12T16:20:00Z",
      status: "sent",
      building: "Test Property",
      type: "meeting"
    },
    {
      id: 5,
      subject: "Welcome to Your New Home",
      from: "welcome@blociq.co.uk",
      to: "newresident@xxbuilding.com",
      date: "2024-03-11T11:00:00Z",
      status: "sent",
      building: "XX Building",
      type: "welcome"
    }
  ];

  const letterTemplates = [
    {
      id: 1,
      name: "Service Charge Reminder",
      category: "Financial",
      lastUsed: "2024-03-15",
      usageCount: 45,
      description: "Standard reminder for outstanding service charges"
    },
    {
      id: 2,
      name: "Fire Safety Notice",
      category: "Safety",
      lastUsed: "2024-03-14",
      usageCount: 12,
      description: "Notification about fire safety inspections"
    },
    {
      id: 3,
      name: "Maintenance Update",
      category: "Maintenance",
      lastUsed: "2024-03-13",
      usageCount: 28,
      description: "Update residents about ongoing maintenance work"
    },
    {
      id: 4,
      name: "AGM Invitation",
      category: "Meetings",
      lastUsed: "2024-03-12",
      usageCount: 8,
      description: "Invitation to Annual General Meeting"
    },
    {
      id: 5,
      name: "Welcome Letter",
      category: "Resident",
      lastUsed: "2024-03-11",
      usageCount: 15,
      description: "Welcome new residents to the building"
    }
  ];

  const communicationStats = {
    totalSent: 156,
    thisMonth: 23,
    pendingDrafts: 5,
    responseRate: 78
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service_charge':
        return <span className="text-green-600">💰</span>;
      case 'safety':
        return <span className="text-red-600">🚨</span>;
      case 'maintenance':
        return <span className="text-blue-600">🔧</span>;
      case 'meeting':
        return <span className="text-purple-600">📅</span>;
      case 'welcome':
        return <span className="text-orange-600">👋</span>;
      default:
        return <span className="text-gray-600">📧</span>;
    }
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-[#0F5D5D]">Communications</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              New Communication
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-teal-600">{communicationStats.totalSent}</div>
                  <div className="text-sm text-gray-600">Total Sent</div>
                </div>
                <Send className="h-8 w-8 text-teal-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{communicationStats.thisMonth}</div>
                  <div className="text-sm text-gray-600">This Month</div>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{communicationStats.pendingDrafts}</div>
                  <div className="text-sm text-gray-600">Drafts</div>
                </div>
                <FileText className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{communicationStats.responseRate}%</div>
                  <div className="text-sm text-gray-600">Response Rate</div>
                </div>
                <MessageSquare className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 border-0">
            <TabsTrigger value="recent" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Recent Communications
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Letter Templates
            </TabsTrigger>
            <TabsTrigger value="buildings" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Building Communications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Recent Communications Tab */}
          <TabsContent value="recent" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search communications..." 
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>

            <Card className="border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Communications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentEmails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl">
                          {getTypeIcon(email.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{email.subject}</h3>
                            {getStatusBadge(email.status)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>From: {email.from} → To: {email.to}</div>
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                {email.building}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(email.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-1" />
                          Resend
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Letter Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Letter Templates</h2>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {letterTemplates.map((template) => (
                <Card key={template.id} className="border-0 shadow-soft hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge className="bg-blue-100 text-blue-800">{template.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>Used {template.usageCount} times</span>
                      <span>Last: {template.lastUsed}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <FileText className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Send className="h-4 w-4 mr-1" />
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Building Communications Tab */}
          <TabsContent value="buildings" className="space-y-4">
            <h2 className="text-xl font-semibold">Building-Specific Communications</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-soft hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Building className="h-12 w-12 text-teal-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Test Property</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📧 12 communications</div>
                    <div>📅 Last: 2 days ago</div>
                    <div>👥 45 residents</div>
                  </div>
                  <Button className="mt-4 w-full bg-teal-600 hover:bg-teal-700">
                    Manage Communications
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Building className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">XX Building</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📧 8 communications</div>
                    <div>📅 Last: 1 week ago</div>
                    <div>👥 23 residents</div>
                  </div>
                  <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700">
                    Manage Communications
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Building className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Sample Complex</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📧 15 communications</div>
                    <div>📅 Last: 3 days ago</div>
                    <div>👥 67 residents</div>
                  </div>
                  <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">
                    Manage Communications
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <h2 className="text-xl font-semibold">Communication Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle>Communication Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Service Charge</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Safety Notices</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm font-medium">60%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Maintenance</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-soft">
                <CardHeader>
                  <CardTitle>Response Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Letters</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">SMS</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Portal</span>
                      <span className="text-sm font-medium">65%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutWithSidebar>
  );
} 