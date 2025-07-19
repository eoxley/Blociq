"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import SendEmailForm from "@/components/SendEmailForm";
import RecipientSelector from "@/components/RecipientSelector";
import { 
  FileText, 
  Download, 
  Mail, 
  Building2, 
  Calendar,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Bot,
  Search,
  Edit3,
  Plus,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  storage_path: string;
  content_text?: string;
  placeholders?: string[];
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
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedFileUrl, setGeneratedFileUrl] = useState<string | null>(null);
  const [generatedFilePath, setGeneratedFilePath] = useState<string | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAction, setAiAction] = useState<'rewrite' | 'search' | 'create_new'>('rewrite');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, unknown>[]>([]);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
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
          placeholderData: formData,
          aiGenerated: false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const result = await response.json();
      setGeneratedFileUrl(result.fileUrl);
      setGeneratedFilePath(result.filePath);
      toast.success('Document generated successfully!');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const convertToPdf = async () => {
    if (!generatedFilePath) return;

    setConvertingPdf(true);
    try {
      const response = await fetch('/api/convert-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: generatedFilePath
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.fallback && generatedFileUrl) {
          toast.info('PDF conversion unavailable. Downloading DOCX instead.');
          window.open(generatedFileUrl, '_blank');
          return;
        }
        throw new Error('Failed to convert to PDF');
      }

      const result = await response.json();
      setPdfUrl(result.pdfUrl);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('Error converting to PDF:', error);
      toast.error('Failed to convert to PDF');
    } finally {
      setConvertingPdf(false);
    }
  };

  const askAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI');
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          buildingId: buildings.find(b => b.name === formData.building_name)?.id || null,
          templateId: aiAction === 'rewrite' ? templateId : null,
          action: aiAction
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const result = await response.json();
      setAiResponse(result.response);
      toast.success('AI response generated!');
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error('Failed to get AI response');
    } finally {
      setAiLoading(false);
    }
  };

  const handleEmailSent = (result: Record<string, unknown>) => {
    toast.success(`Email sent successfully to ${result.recipient}`);
    setShowEmailForm(false);
  };

  const handleRecipientsChange = (recipients: Record<string, unknown>[]) => {
    setSelectedRecipients(recipients);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "welcome_letter":
        return <Mail className="w-5 h-5" />;
      case "notice":
        return <AlertTriangle className="w-5 h-5" />;
      case "form":
        return <CheckCircle className="w-5 h-5" />;
      case "section_20":
        return <AlertTriangle className="w-5 h-5" />;
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
      case "section_20":
        return "bg-red-100 text-red-800";
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
          <div className="flex items-center space-x-2">
            <Badge className={getTypeColor(template.type)}>
              {template.type.replace('_', ' ')}
            </Badge>
            <Button
              onClick={() => setShowAiPanel(!showAiPanel)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Bot className="w-4 h-4" />
              <span>AI Assistant</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            
            {template.content_text && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Template Content:</h4>
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                  {template.content_text}
                </div>
              </div>
            )}
            
            {template.placeholders && template.placeholders.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Placeholders:</h4>
                                  <div className="flex flex-wrap gap-1">
                    {template.placeholders.map((placeholder, index) => (
                      <Badge key={index} className="text-xs bg-gray-100 text-gray-800">
                        {placeholder}
                      </Badge>
                    ))}
                  </div>
              </div>
            )}
            
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Document generated successfully!</span>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <a
                    href={generatedFileUrl}
                    download
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download DOCX
                  </a>
                  
                  <Button
                    onClick={() => setShowEmailForm(true)}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </Button>
                  
                  <Button
                    onClick={() => setShowRecipientSelector(true)}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Select Recipients
                  </Button>
                  
                  <Button
                    onClick={convertToPdf}
                    disabled={convertingPdf}
                    variant="outline"
                    size="sm"
                    className="text-purple-600 border-purple-600 hover:bg-purple-50"
                  >
                    {convertingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Download as PDF
                      </>
                    )}
                  </Button>
                </div>

                {pdfUrl && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <a
                      href={pdfUrl}
                      download
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      PDF Ready - Click to Download
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Assistant Panel */}
        {showAiPanel && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-dark">AI Assistant</h3>
              </div>
              
              <div className="space-y-4">
                {/* AI Action Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Action
                  </label>
                  <select
                    value={aiAction}
                    onChange={(e) => setAiAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="rewrite">Rewrite Template</option>
                    <option value="search">Search Templates</option>
                    <option value="create_new">Create New Template</option>
                  </select>
                </div>

                {/* AI Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What would you like AI to help with?
                  </label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={
                      aiAction === 'rewrite' 
                        ? "e.g., Make this more formal and add legal disclaimers"
                        : aiAction === 'search'
                        ? "e.g., Find templates for service charge increases"
                        : "e.g., Create a template for emergency maintenance notices"
                    }
                    rows={4}
                  />
                </div>

                {/* AI Action Button */}
                <Button
                  onClick={askAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-dark hover:to-blue-700 text-white"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI Thinking...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Ask AI
                    </>
                  )}
                </Button>

                {/* AI Response */}
                {aiResponse && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">AI Response:</h4>
                    <div className="text-sm text-blue-700 whitespace-pre-wrap">
                      {aiResponse}
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Copy to clipboard
                          navigator.clipboard.writeText(aiResponse);
                          toast.success('Copied to clipboard!');
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAiResponse(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recipient Selector */}
      {showRecipientSelector && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Select Email Recipients</span>
                <Button
                  onClick={() => setShowRecipientSelector(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecipientSelector
                buildingId={buildings.find(b => b.name === formData.building_name)?.id}
                onRecipientsChange={handleRecipientsChange}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Sending Form */}
      {showEmailForm && generatedFileUrl && generatedFilePath && (
        <div className="mt-8">
          <SendEmailForm
            generatedFileUrl={generatedFileUrl}
            generatedFilePath={generatedFilePath}
            templateName={template.name}
            templateId={template.id}
            buildingId={buildings.find(b => b.name === formData.building_name)?.id}
            buildingName={formData.building_name}
            unitNumber={formData.unit_number}
            leaseholderEmail={formData.contact_email}
            onEmailSent={handleEmailSent}
            onCancel={() => setShowEmailForm(false)}
          />
        </div>
      )}
    </div>
  );
} 