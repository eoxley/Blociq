'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';

interface InvoiceLine {
  description: string;
  net: number;
  vat: number;
  account_code?: string;
}

interface InvoicePreview {
  id: string;
  status: string;
  invoice_number: string;
  gross_total: number;
  net_total: number;
  vat_total: number;
  contractor: string;
  lines: InvoiceLine[];
}

export default function InvoiceUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [buildingId, setBuildingId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [fund, setFund] = useState<'Operational' | 'Reserve' | 'Major Works'>('Operational');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreview(null);

    // Simulate OCR processing
    setIsProcessing(true);
    
    try {
      // In a real implementation, this would call your OCR service
      // For now, we'll simulate with a mock response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockInvoiceData = {
        supplier_name: "Interphone Ltd",
        invoice_number: "INV-10422",
        invoice_date: "2025-09-15",
        due_date: "2025-10-15",
        building_id: buildingId || "mock-building-id",
        schedule_id: scheduleId || undefined,
        fund: fund,
        lines: [
          {
            description: "Lift maintenance Sep 2025",
            net: 850.00,
            vat: 170.00,
            account_code: "5000"
          }
        ],
        gross_total: 1020.00,
        attachment_url: "https://storage.blociq.co.uk/invoices/interphone.pdf"
      };

      const response = await fetch('/api/accounting/invoices/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockInvoiceData),
      });

      const result = await response.json();

      if (result.success) {
        setPreview(result.invoice);
      } else {
        setError(result.error || 'Failed to process invoice');
      }
    } catch (err) {
      setError('Failed to process invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!preview) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/accounting/invoices/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: preview.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPreview({ ...preview, status: 'posted' });
      } else {
        setError(result.error || 'Failed to approve invoice');
      }
    } catch (err) {
      setError('Failed to approve invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    setPreview(null);
    setFile(null);
    setError(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Invoice Upload</h1>
          <p className="text-muted-foreground mt-2">
            Upload and process supplier invoices with OCR
          </p>
        </div>

        <div className="grid gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Invoice</CardTitle>
              <CardDescription>
                Select a PDF invoice to process with OCR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="building">Building</Label>
                  <Select value={buildingId} onValueChange={setBuildingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="building-1">123 Main Street</SelectItem>
                      <SelectItem value="building-2">456 Oak Avenue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="schedule">Service Charge Schedule</Label>
                  <Select value={scheduleId} onValueChange={setScheduleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="schedule-1">Residential Schedule</SelectItem>
                      <SelectItem value="schedule-2">Commercial Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="fund">Fund</Label>
                <Select value={fund} onValueChange={(value: any) => setFund(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operational">Operational</SelectItem>
                    <SelectItem value="Reserve">Reserve</SelectItem>
                    <SelectItem value="Major Works">Major Works</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file">Invoice File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Processing State */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Processing invoice with OCR...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview Section */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Invoice Preview</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    preview.status === 'posted' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {preview.status.toUpperCase()}
                  </span>
                </CardTitle>
                <CardDescription>
                  Review the extracted invoice data before approving
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Invoice Number</Label>
                    <p className="text-sm">{preview.invoice_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contractor</Label>
                    <p className="text-sm">{preview.contractor}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Net Total</Label>
                    <p className="text-sm">£{preview.net_total.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">VAT Total</Label>
                    <p className="text-sm">£{preview.vat_total.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Gross Total</Label>
                    <p className="text-sm font-semibold">£{preview.gross_total.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Line Items</Label>
                  <div className="mt-2 space-y-2">
                    {preview.lines.map((line, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">{line.description}</p>
                          {line.account_code && (
                            <p className="text-xs text-muted-foreground">Account: {line.account_code}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">£{line.net.toFixed(2)}</p>
                          {line.vat > 0 && (
                            <p className="text-xs text-muted-foreground">+ £{line.vat.toFixed(2)} VAT</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  {preview.status === 'draft' && (
                    <>
                      <Button onClick={handleApprove} disabled={isProcessing}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Post
                      </Button>
                      <Button variant="outline" onClick={handleReject} disabled={isProcessing}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  {preview.status === 'posted' && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Invoice posted to GL successfully</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

