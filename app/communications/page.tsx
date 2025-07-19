"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { 
  FileText, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Plus,
  Download,
  History,
  Search
} from "lucide-react";

const communicationTypes = [
  {
    name: "Welcome Letters",
    description: "Create personalized welcome letters for new leaseholders",
    icon: Mail,
    color: "bg-blue-100 text-blue-600",
    href: "/communications/templates?type=welcome_letter",
    count: 3
  },
  {
    name: "Notices",
    description: "Generate formal notices for maintenance, rent increases, and compliance",
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-600",
    href: "/communications/templates?type=notice",
    count: 5
  },
  {
    name: "Forms",
    description: "Create standardized forms for applications, requests, and surveys",
    icon: CheckCircle,
    color: "bg-green-100 text-green-600",
    href: "/communications/templates?type=form",
    count: 2
  },
  {
    name: "Invoices",
    description: "Generate service charge invoices and payment reminders",
    icon: Calendar,
    color: "bg-purple-100 text-purple-600",
    href: "/communications/templates?type=invoice",
    count: 1
  }
];

const recentDocuments = [
  {
    id: 1,
    name: "Welcome Letter - Flat 3B",
    type: "welcome_letter",
    building: "Ashwood House",
    date: "2024-01-15",
    status: "Generated"
  },
  {
    id: 2,
    name: "Service Charge Notice",
    type: "notice",
    building: "Kings Court",
    date: "2024-01-14",
    status: "Generated"
  },
  {
    id: 3,
    name: "Maintenance Request Form",
    type: "form",
    building: "Westbridge Mews",
    date: "2024-01-13",
    status: "Generated"
  }
];

export default function CommunicationsPage() {
  const handleSearch = (query: string) => {
    // Implement search functionality
    console.log('Searching for:', query);
  };

  return (
    <LayoutWithSidebar 
      title="Communications" 
      subtitle="Create professional letters, notices, and forms for your properties"
      showSearch={true}
      onSearch={handleSearch}
    >
      <div className="p-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/communications/templates">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Browse Templates</h3>
                <p className="text-sm text-gray-600">View all available templates</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/communications/templates">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Create Document</h3>
                <p className="text-sm text-gray-600">Generate a new document</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/communications/log">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <History className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Document History</h3>
                <p className="text-sm text-gray-600">View generated documents</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/communications/templates">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
                  <Download className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Upload Template</h3>
                <p className="text-sm text-gray-600">Add custom templates</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Communication Types */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Communication Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {communicationTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <Link key={type.name} href={type.href}>
                  <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${type.color} group-hover:scale-110 transition-transform`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{type.name}</h3>
                            <Badge variant="outline">{type.count} templates</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {type.description}
                          </p>
                          <Button variant="outline" size="sm" className="group-hover:bg-gray-50">
                            Browse Templates
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Recent Documents</h2>
            <Link href="/communications/log">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{doc.building}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
} 