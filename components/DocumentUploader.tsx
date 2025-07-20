"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { FileText, Calendar, User, Building, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AIAnalysisResult {
  classification: string;
  document_type: string;
  summary: string;
  inspection_date: string | null;
  next_due_date: string | null;
  responsible_party: string;
  action_required: string;
  confidence: number;
  suggested_compliance_asset: string | null;
  contractor_name: string | null;
  building_name: string | null;
  key_dates: string[];
  key_entities: string[];
  originalFileName: string;
  buildingId: string | null;
  extractedText: string;
  file_url?: string;
  // Lease-specific fields
  leaseholder_name: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  apportionment: string | null;
}

interface DocumentUploaderProps {
  buildingId?: string;
  unitId?: string;
  leaseholderId?: string;
  onSuccess?: (documentId: string) => void;
}

export default function DocumentUploader({
  buildingId,
  unitId,
  leaseholderId,
  onSuccess
}: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editableFields, setEditableFields] = useState<Partial<AIAnalysisResult>>({});
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are supported');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (buildingId) {
        formData.append('buildingId', buildingId);
      }

      const response = await fetch('/api/upload-and-analyse', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      console.log("🧠 AI Analysis Result:", data);

      setAiResult(data.ai);
      setEditableFields({
        document_type: data.ai.document_type,
        summary: data.ai.summary,
        inspection_date: data.ai.inspection_date,
        next_due_date: data.ai.next_due_date,
        responsible_party: data.ai.responsible_party,
        action_required: data.ai.action_required,
        contractor_name: data.ai.contractor_name,
        leaseholder_name: data.ai.leaseholder_name,
        lease_start_date: data.ai.lease_start_date,
        lease_end_date: data.ai.lease_end_date,
        apportionment: data.ai.apportionment,
      });
      setShowConfirmation(true);

    } catch (error: any) {
      console.error("❌ Upload error:", error);
      toast.error(error.message || 'Failed to upload and analyze document');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAndFile = async () => {
    if (!aiResult) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file_url', aiResult.file_url || aiResult.originalFileName);
      formData.append('document_type', editableFields.document_type || aiResult.document_type);
      formData.append('classification', aiResult.classification);
      formData.append('summary', editableFields.summary || aiResult.summary);
      formData.append('inspection_date', editableFields.inspection_date || '');
      formData.append('next_due_date', editableFields.next_due_date || '');
      formData.append('responsible_party', editableFields.responsible_party || aiResult.responsible_party);
      formData.append('action_required', editableFields.action_required || aiResult.action_required);
      formData.append('contractor_name', editableFields.contractor_name || '');
      formData.append('confidence', aiResult.confidence.toString());
      formData.append('suggested_compliance_asset', aiResult.suggested_compliance_asset || '');
      
      // Lease-specific fields
      formData.append('leaseholder_name', editableFields.leaseholder_name || '');
      formData.append('lease_start_date', editableFields.lease_start_date || '');
      formData.append('lease_end_date', editableFields.lease_end_date || '');
      formData.append('apportionment', editableFields.apportionment || '');
      
      if (buildingId) formData.append('building_id', buildingId);
      if (unitId) formData.append('unit_id', unitId);
      if (leaseholderId) formData.append('leaseholder_id', leaseholderId);

      const response = await fetch('/api/documents/confirm-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save document');
      }

      const result = await response.json();
      toast.success('Document saved successfully!');
      
      onSuccess?.(result.document_id);
      setShowConfirmation(false);
      setFile(null);
      setAiResult(null);
      setEditableFields({});

      // Navigate to documents page or building documents
      if (result.building_id) {
        router.push(`/buildings/${result.building_id}/documents`);
      } else {
        router.push('/ai-documents');
      }

    } catch (error: any) {
      console.error("❌ Save error:", error);
      toast.error(error.message || 'Failed to save document');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setFile(null);
    setAiResult(null);
    setEditableFields({});
    toast.info('Document upload cancelled');
  };

  const updateEditableField = (field: keyof AIAnalysisResult, value: string) => {
    setEditableFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Fire Risk Assessment':
        return 'destructive';
      case 'EICR':
        return 'default';
      case 'Insurance Certificate':
        return 'default';
      case 'Lift Maintenance':
        return 'outline';
      default:
        return 'default';
    }
  };

  const isComplianceDocument = (classification: string) => {
    return ['Fire Risk Assessment', 'EICR', 'Insurance Certificate', 'Lift Maintenance'].includes(classification);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">Select PDF Document</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              disabled={loading}
            />
          </div>
          
          {file && (
            <div className="flex items-center gap-2">
              <Badge variant="default">{file.name}</Badge>
              <span className="text-sm text-gray-500">
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Upload & Analyze'}
          </Button>
          
          <p className="text-xs italic text-gray-500 text-center mt-2">
            AI analysis is for guidance only. Please verify all extracted information.
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirm Document Details
            </DialogTitle>
          </DialogHeader>

          {aiResult && (
            <div className="space-y-6">
              {/* Document Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant={getClassificationColor(aiResult.classification)}>
                      {aiResult.classification}
                    </Badge>
                    <span>AI Analysis Results</span>
                    <Badge variant="outline">{aiResult.confidence}% confidence</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Original File</Label>
                      <p className="text-sm text-gray-600">{aiResult.originalFileName}</p>
                    </div>
                    <div>
                      <Label>Building</Label>
                      <p className="text-sm text-gray-600">{aiResult.building_name || 'Not detected'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Document Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editableFields.summary || aiResult.summary}
                    onChange={(e) => updateEditableField('summary', e.target.value)}
                    rows={4}
                    placeholder="Document summary..."
                    className="resize-none"
                  />
                </CardContent>
              </Card>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Document Type</Label>
                  <Input
                    value={editableFields.document_type || aiResult.document_type}
                    onChange={(e) => updateEditableField('document_type', e.target.value)}
                    placeholder="e.g., Fire Risk Assessment"
                  />
                </div>

                <div>
                  <Label>Responsible Party</Label>
                  <Select
                    value={editableFields.responsible_party || aiResult.responsible_party}
                    onChange={(e) => updateEditableField('responsible_party', e.target.value)}
                  >
                    <option value="Management Company">Management Company</option>
                    <option value="Leaseholder">Leaseholder</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Insurance Provider">Insurance Provider</option>
                    <option value="Local Authority">Local Authority</option>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="h-4 w-4" />
                    <Label>Inspection Date</Label>
                  </div>
                  <Input
                    type="date"
                    value={editableFields.inspection_date || aiResult.inspection_date || ''}
                    onChange={(e) => updateEditableField('inspection_date', e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="h-4 w-4" />
                    <Label>Next Due Date</Label>
                  </div>
                  <Input
                    type="date"
                    value={editableFields.next_due_date || aiResult.next_due_date || ''}
                    onChange={(e) => updateEditableField('next_due_date', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Contractor Name</Label>
                  <Input
                    value={editableFields.contractor_name || aiResult.contractor_name || ''}
                    onChange={(e) => updateEditableField('contractor_name', e.target.value)}
                    placeholder="Contractor name if applicable"
                  />
                </div>

                <div>
                  <Label>Action Required</Label>
                  <Input
                    value={editableFields.action_required || aiResult.action_required}
                    onChange={(e) => updateEditableField('action_required', e.target.value)}
                    placeholder="e.g., Review annually"
                  />
                </div>
              </div>

              {/* Lease-specific fields (only show if classification suggests it's a lease) */}
              {(aiResult.classification === 'Lease' || aiResult.leaseholder_name) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Lease Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Leaseholder Name</Label>
                        <Input
                          value={editableFields.leaseholder_name || aiResult.leaseholder_name || ''}
                          onChange={(e) => updateEditableField('leaseholder_name', e.target.value)}
                          placeholder="Leaseholder name"
                        />
                      </div>
                      <div>
                        <Label>Service Charge Apportionment (%)</Label>
                        <Input
                          value={editableFields.apportionment || aiResult.apportionment || ''}
                          onChange={(e) => updateEditableField('apportionment', e.target.value)}
                          placeholder="e.g., 2.5"
                        />
                      </div>
                      <div>
                        <Label>Lease Start Date</Label>
                        <Input
                          type="date"
                          value={editableFields.lease_start_date || aiResult.lease_start_date || ''}
                          onChange={(e) => updateEditableField('lease_start_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Lease End Date</Label>
                        <Input
                          type="date"
                          value={editableFields.lease_end_date || aiResult.lease_end_date || ''}
                          onChange={(e) => updateEditableField('lease_end_date', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Information */}
              {(aiResult.key_dates.length > 0 || aiResult.key_entities.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Key Information Extracted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiResult.key_dates.length > 0 && (
                      <div className="mb-4">
                        <Label>Important Dates</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {aiResult.key_dates.map((date, index) => (
                            <Badge key={index} variant="outline">{date}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiResult.key_entities.length > 0 && (
                      <div>
                        <Label>Key Entities</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {aiResult.key_entities.map((entity, index) => (
                            <Badge key={index} variant="default">{entity}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Compliance Asset Suggestion */}
              {isComplianceDocument(aiResult.classification) && aiResult.suggested_compliance_asset && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Compliance Asset Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      This document will be linked to: <strong>{aiResult.suggested_compliance_asset}</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      The compliance tracker will be updated with inspection and due dates.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Text Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Text Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {aiResult.extractedText}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAcceptAndFile} disabled={loading}>
              {loading ? 'Saving...' : 'Accept & File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 