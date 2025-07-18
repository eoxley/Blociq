"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Mail, 
  Building2, 
  Calendar,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  storage_path: string;
  created_at: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface FormData {
  building_name: string;
  property_manager_name: string;
  today_date: string;
  leaseholder_name: string;
  unit_number: string;
  service_charge_amount: string;
  notice_period: string;
  contact_email: string;
  contact_phone: string;
  [key: string]: string;
}

export default function TemplateGenerationPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedFileUrl, setGeneratedFileUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    building_name: "",
    property_manager_name: "",
    today_date: new Date().toLocaleDateString(),
    leaseholder_name: "",
    unit_number: "",
    service_charge_amount: "",
    notice_period: "30 days",
    contact_email: "",
    contact_phone: ""
  });

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
      fetchBuildings();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        console.error('Error fetching template:', error);
        toast.error('Failed to load template');
      } else {
        setTemplate(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address')
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

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBuildingSelect = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (building) {
      setFormData(prev => ({
        ...prev,
        building_name: building.name
      }));
    }
  };

  const generateDocument = async () => {
    if (!template) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          buildingId: buildings.find(b => b.name === formData.building_name)?.id || null,
          placeholderData: formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const result = await response.json();
      setGeneratedFileUrl(result.fileUrl);
      toast.success('Document generated successfully!');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "welcome_letter":
        return <Mail className="w-5 h-5" />;
      case "notice":
        return <AlertTriangle className="w-5 h-5" />;
      case "form":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "welcome_letter":
        return "bg-blue-100 text-blue-800";
      case "notice":
        return "bg-yellow-100 text-yellow-800";
      case "form":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark mb-4">Template not found</h1>
          <Link href="/communications/templates">
            <Button className="bg-primary hover:bg-dark text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
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
        <Link href="/communications/templates" className="inline-flex items-center text-primary hover:text-dark mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-brand font-bold text-dark mb-2">
              Generate Document
            </h1>
            <p className="text-gray-600">
              Fill in the details below to generate your {template.name.toLowerCase()}.
            </p>
          </div>
          <Badge className={getTypeColor(template.type)}>
            {template.type.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Template Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                {getTypeIcon(template.type)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-dark">{template.name}</h2>
                <p className="text-sm text-gray-600">{template.type.replace('_', ' ')}</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              {template.description}
            </p>
            
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-dark mb-4">Document Details</h3>
            
            <div className="space-y-4">
              {/* Building Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building
                </label>
                <select
                  value={formData.building_name}
                  onChange={(e) => handleBuildingSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.name}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Manager Name
                </label>
                <Input
                  value={formData.property_manager_name}
                  onChange={(e) => handleFormChange('property_manager_name', e.target.value)}
                  placeholder="Enter property manager name"
                />
              </div>

              {/* Leaseholder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leaseholder Name
                </label>
                <Input
                  value={formData.leaseholder_name}
                  onChange={(e) => handleFormChange('leaseholder_name', e.target.value)}
                  placeholder="Enter leaseholder name"
                />
              </div>

              {/* Unit Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Number
                </label>
                <Input
                  value={formData.unit_number}
                  onChange={(e) => handleFormChange('unit_number', e.target.value)}
                  placeholder="e.g., Flat 3B"
                />
              </div>

              {/* Service Charge Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Charge Amount
                </label>
                <Input
                  value={formData.service_charge_amount}
                  onChange={(e) => handleFormChange('service_charge_amount', e.target.value)}
                  placeholder="e.g., £1,200.00"
                />
              </div>

              {/* Notice Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notice Period
                </label>
                <Input
                  value={formData.notice_period}
                  onChange={(e) => handleFormChange('notice_period', e.target.value)}
                  placeholder="e.g., 30 days"
                />
              </div>

              {/* Contact Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email
                </label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleFormChange('contact_email', e.target.value)}
                  placeholder="Enter contact email"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => handleFormChange('contact_phone', e.target.value)}
                  placeholder="Enter contact phone"
                />
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-6">
              <Button
                onClick={generateDocument}
                disabled={generating}
                className="w-full bg-primary hover:bg-dark text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Document...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Document
                  </>
                )}
              </Button>
            </div>

            {/* Generated File */}
            {generatedFileUrl && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Document generated successfully!</span>
                  </div>
                  <a
                    href={generatedFileUrl}
                    download
                    className="inline-flex items-center text-green-600 hover:text-green-800"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 