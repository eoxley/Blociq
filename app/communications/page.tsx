"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Plus,
  Download,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-brand font-bold text-dark mb-2">
          Communications
        </h1>
        <p className="text-gray-600">
          Create professional letters, notices, and forms for your properties. Generate personalized communications with our template system.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Link href="/communications/templates">
          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-dark mb-2">Browse Templates</h3>
              <p className="text-sm text-gray-600">View all available templates</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/communications/templates">
          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-dark mb-2">Create Document</h3>
              <p className="text-sm text-gray-600">Generate a new document</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/communications/log">
          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <History className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-dark mb-2">Document History</h3>
              <p className="text-sm text-gray-600">View generated documents</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/communications/templates">
          <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-dark mb-2">Upload Template</h3>
              <p className="text-sm text-gray-600">Add custom templates</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Communication Types */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-dark mb-6">Communication Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communicationTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <Link key={type.name} href={type.href}>
                <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${type.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-dark">{type.name}</h3>
                          <Badge variant="outline">{type.count} templates</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {type.description}
                        </p>
                        <Button variant="outline" size="sm">
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
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-dark">Recent Documents</h2>
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
                      <h3 className="font-medium text-dark">{doc.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{doc.building}</span>
                        <span>{doc.date}</span>
                        <Badge variant="outline" className="text-xs">
                          {doc.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">
                      {doc.status}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-primary transition-colors duration-200">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-dark mb-2">
            Ready to Create Your First Document?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Start with our pre-built templates for welcome letters, notices, and forms. 
            All templates use placeholders that you can easily customize for your properties.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/communications/templates">
              <Button className="bg-primary hover:bg-dark text-white">
                <FileText className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
            </Link>
            <Link href="/communications/log">
              <Button variant="outline">
                <History className="w-4 h-4 mr-2" />
                View Examples
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 