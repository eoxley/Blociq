"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import TemplateUploader from "@/components/TemplateUploader";

export default function TemplateUploadPage() {
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleUploadComplete = () => {
    setUploadComplete(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/communications/templates" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Template
        </h1>
        <p className="text-gray-600">
          Upload a .docx template with placeholders to create personalized communications.
        </p>
      </div>

      {/* Upload Success Message */}
      {uploadComplete && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-medium text-green-800">
                  Template uploaded successfully!
                </h3>
                <p className="text-green-700">
                  Your template is now available for document generation.
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Link href="/communications/templates">
                <Button variant="outline" size="sm">
                  View All Templates
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadComplete(false)}
              >
                Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Instructions */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <Info className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Template Requirements
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• <strong>File Format:</strong> Only .docx files are supported</p>
                <p>• <strong>Placeholders:</strong> Use {{placeholder_name}} format for dynamic content</p>
                <p>• <strong>File Size:</strong> Maximum 10MB per template</p>
                <p>• <strong>Content:</strong> Templates should be professional and legally compliant</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Placeholders Guide */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Common Placeholders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Basic Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {{leaseholder_name}}</p>
                <p>• {{building_name}}</p>
                <p>• {{unit_number}}</p>
                <p>• {{today_date}}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Contact Details</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {{property_manager_name}}</p>
                <p>• {{contact_email}}</p>
                <p>• {{contact_phone}}</p>
                <p>• {{office_address}}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-800">Financial</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>• {{service_charge_amount}}</p>
                <p>• {{due_date}}</p>
                <p>• {{invoice_number}}</p>
                <p>• {{payment_details}}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Uploader */}
      <TemplateUploader onUploadComplete={handleUploadComplete} />

      {/* Template Examples */}
      <div className="mt-12">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Template Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-800">Welcome Letter</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Welcome new leaseholders with building information and contact details.
                </p>
                <div className="text-xs text-gray-500">
                  Placeholders: leaseholder_name, building_name, unit_number, property_manager_name
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-gray-800">Service Charge Notice</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Inform leaseholders about service charge changes with detailed breakdown.
                </p>
                <div className="text-xs text-gray-500">
                  Placeholders: leaseholder_name, service_charge_amount, effective_date, reason_for_change
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-gray-800">Section 20 Notice</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Legal notice for major works requiring leaseholder consultation.
                </p>
                <div className="text-xs text-gray-500">
                  Placeholders: works_description, estimated_cost, contractor_name, consultation_period
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 