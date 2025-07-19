"use client";

import { useState, useEffect } from "react";
import { Calculator, Copy, Info, Building, Percent, AlertTriangle, Upload, FileSpreadsheet, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import * as XLSX from 'xlsx';

interface LeaseholderData {
  unit: string;
  name: string;
  apportionment: number;
  threshold: number;
  triggersConsultation: boolean;
}

interface BulkCalculationResult {
  buildingThreshold: number;
  leaseholders: LeaseholderData[];
  totalUnits: number;
  unitsTriggeringConsultation: number;
  highestApportionment: number;
  hasCommercial: boolean;
  commercialPercentage?: number;
  residentialPercentage?: number;
}

export default function Section20ThresholdCalculator() {
  const [highestApportionment, setHighestApportionment] = useState<string>("");
  const [hasCommercial, setHasCommercial] = useState<boolean>(false);
  const [commercialPercentage, setCommercialPercentage] = useState<string>("");
  const [threshold, setThreshold] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Excel upload states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [bulkResult, setBulkResult] = useState<BulkCalculationResult | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [showBulkResults, setShowBulkResults] = useState<boolean>(false);

  // Calculate threshold whenever inputs change
  useEffect(() => {
    calculateThreshold();
  }, [highestApportionment, hasCommercial, commercialPercentage]);

  const calculateThreshold = () => {
    const apportionment = parseFloat(highestApportionment);
    
    if (!apportionment || apportionment <= 0 || apportionment > 100) {
      setThreshold(null);
      return;
    }

    let calculatedThreshold: number;

    if (!hasCommercial) {
      // Residential-only building
      calculatedThreshold = 250 / (apportionment / 100);
    } else {
      // Mixed-use building
      const commercialPct = parseFloat(commercialPercentage) || 0;
      if (commercialPct < 0 || commercialPct > 100) {
        setThreshold(null);
        return;
      }
      
      const residentialPct = 100 - commercialPct;
      calculatedThreshold = (250 / (apportionment / 100)) * (residentialPct / 100);
    }

    setThreshold(calculatedThreshold);
  };

  const copyResult = async () => {
    if (threshold) {
      const result = `Section 20 Consultation Threshold: £${threshold.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-GB', { 
      style: 'currency', 
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getDescription = () => {
    if (!threshold) return "";
    
    if (threshold <= 250) {
      return "⚠️ This threshold is very low. Consider reviewing lease terms or consulting with legal advisors.";
    } else if (threshold <= 1000) {
      return "This means any qualifying works above this value will require formal consultation under Section 20.";
    } else {
      return "This threshold provides good flexibility for routine maintenance and minor works without requiring consultation.";
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError("");
    setBulkResult(null);

    try {
      // Read the Excel file
      const data = await readExcelFile(file);
      
      // Process the data
      const result = await processBulkCalculation(data);
      setBulkResult(result);
      setShowBulkResults(true);
      
    } catch (error) {
      console.error('File processing error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Skip header row and process data
          const processedData = jsonData.slice(1).map((row: any) => ({
            unit: row[0] || '',
            name: row[1] || '',
            apportionment: parseFloat(row[2]) || 0
          })).filter(item => item.unit && item.apportionment > 0);
          
          resolve(processedData);
        } catch (error) {
          reject(new Error('Invalid Excel file format'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processBulkCalculation = async (leaseholderData: any[]): Promise<BulkCalculationResult> => {
    // Find highest apportionment
    const highestApportionment = Math.max(...leaseholderData.map(item => item.apportionment));
    
    // Calculate building threshold (assuming residential-only for now)
    const buildingThreshold = 250 / (highestApportionment / 100);
    
    // Calculate individual thresholds and check consultation triggers
    const processedLeaseholders: LeaseholderData[] = leaseholderData.map(item => ({
      unit: item.unit,
      name: item.name,
      apportionment: item.apportionment,
      threshold: 250 / (item.apportionment / 100),
      triggersConsultation: (250 / (item.apportionment / 100)) <= 250
    }));
    
    const unitsTriggeringConsultation = processedLeaseholders.filter(item => item.triggersConsultation).length;
    
    return {
      buildingThreshold,
      leaseholders: processedLeaseholders,
      totalUnits: processedLeaseholders.length,
      unitsTriggeringConsultation,
      highestApportionment,
      hasCommercial: false, // Default to residential-only
      residentialPercentage: 100
    };
  };

  const downloadResults = () => {
    if (!bulkResult) return;
    
    const worksheet = XLSX.utils.json_to_sheet(bulkResult.leaseholders.map(item => ({
      'Unit': item.unit,
      'Leaseholder': item.name,
      'Apportionment %': item.apportionment,
      'Individual Threshold': formatCurrency(item.threshold),
      'Triggers Consultation': item.triggersConsultation ? 'Yes' : 'No'
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Section 20 Analysis');
    
    // Add summary sheet
    const summaryData = [
      { 'Metric': 'Building Threshold', 'Value': formatCurrency(bulkResult.buildingThreshold) },
      { 'Metric': 'Total Units', 'Value': bulkResult.totalUnits },
      { 'Metric': 'Units Triggering Consultation', 'Value': bulkResult.unitsTriggeringConsultation },
      { 'Metric': 'Highest Apportionment', 'Value': `${bulkResult.highestApportionment}%` },
      { 'Metric': 'Building Type', 'Value': bulkResult.hasCommercial ? 'Mixed-use' : 'Residential-only' }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    XLSX.writeFile(workbook, 'section20-analysis.xlsx');
  };

  const generateSampleTemplate = () => {
    const sampleData = [
      ['Unit', 'Leaseholder Name', 'Apportionment %'],
      ['Flat 1', 'John Smith', '15.5'],
      ['Flat 2', 'Jane Doe', '12.3'],
      ['Flat 3', 'Bob Wilson', '18.7'],
      ['Flat 4', 'Alice Brown', '14.2'],
      ['Flat 5', 'Charlie Davis', '13.8']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leaseholder Data');
    
    XLSX.writeFile(workbook, 'section20-template.xlsx');
  };

  return (
    <LayoutWithSidebar 
      title="Section 20 Calculator" 
      subtitle="Calculate consultation thresholds for leasehold properties"
    >
      <TooltipProvider>
        <div className="p-6">
          {/* Excel Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Bulk Calculation (Excel Upload)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="excel-upload" className="flex items-center gap-2">
                      Upload Excel File
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Upload an Excel file with columns: Unit, Leaseholder Name, Apportionment %. 
                            Download the template for the correct format.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="excel-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="mt-1"
                      disabled={isUploading}
                    />
                  </div>
                  <Button
                    onClick={generateSampleTemplate}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">{uploadError}</p>
                  </div>
                )}
                
                {isUploading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Processing Excel file...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Results */}
          {bulkResult && showBulkResults && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bulk Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(bulkResult.buildingThreshold)}
                      </div>
                      <div className="text-sm text-blue-700">Building Threshold</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {bulkResult.totalUnits}
                      </div>
                      <div className="text-sm text-green-700">Total Units</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {bulkResult.unitsTriggeringConsultation}
                      </div>
                      <div className="text-sm text-orange-700">Units Requiring Consultation</div>
                    </div>
                  </div>

                  {/* Leaseholder Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left">Unit</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Leaseholder</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Apportionment %</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Individual Threshold</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResult.leaseholders.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-200 px-4 py-2">{item.unit}</td>
                            <td className="border border-gray-200 px-4 py-2">{item.name}</td>
                            <td className="border border-gray-200 px-4 py-2">{item.apportionment}%</td>
                            <td className="border border-gray-200 px-4 py-2">{formatCurrency(item.threshold)}</td>
                            <td className="border border-gray-200 px-4 py-2">
                              <Badge variant={item.triggersConsultation ? "destructive" : "default"}>
                                {item.triggersConsultation ? "Requires Consultation" : "No Consultation"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button onClick={downloadResults} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Download Results
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBulkResults(false)}
                    >
                      Hide Results
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator Card */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Single Calculation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Highest Residential Apportionment */}
                <div>
                  <Label htmlFor="apportionment" className="flex items-center gap-2">
                    Highest Residential Apportionment %
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          The highest percentage of service charge costs that any single residential leaseholder is responsible for.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="apportionment"
                    type="number"
                    placeholder="e.g. 15.5"
                    value={highestApportionment}
                    onChange={(e) => setHighestApportionment(e.target.value)}
                    className="mt-1"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                {/* Commercial Elements Toggle */}
                <div>
                  <Label className="flex items-center gap-2">
                    Does the building contain commercial elements?
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Commercial elements include shops, offices, or other non-residential units that contribute to service charges.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      variant={hasCommercial ? "outline" : "default"}
                      onClick={() => setHasCommercial(true)}
                      className="flex-1"
                    >
                      Yes
                    </Button>
                    <Button
                      variant={!hasCommercial ? "outline" : "default"}
                      onClick={() => setHasCommercial(false)}
                      className="flex-1"
                    >
                      No
                    </Button>
                  </div>
                </div>

                {/* Commercial Percentage */}
                {hasCommercial && (
                  <div>
                    <Label htmlFor="commercial" className="flex items-center gap-2">
                      Total Commercial %
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            The total percentage of service charge costs attributable to commercial units.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="commercial"
                      type="number"
                      placeholder="e.g. 40"
                      value={commercialPercentage}
                      onChange={(e) => setCommercialPercentage(e.target.value)}
                      className="mt-1"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Card */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Section 20 Threshold
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {threshold ? (
                  <>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {formatCurrency(threshold)}
                      </div>
                      <Badge variant={threshold <= 250 ? "destructive" : "default"} className="mb-4">
                        {threshold <= 250 ? "Low Threshold" : "Standard Threshold"}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {getDescription()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={copyResult}
                        className="flex-1"
                        variant="outline"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {copied ? "Copied!" : "Copy Result"}
                      </Button>
                    </div>

                    {/* Calculation Details */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Calculation Details:</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>Base threshold: £250 per leaseholder</p>
                        <p>Highest apportionment: {highestApportionment}%</p>
                        {hasCommercial && (
                          <>
                            <p>Commercial percentage: {commercialPercentage}%</p>
                            <p>Residential percentage: {100 - parseFloat(commercialPercentage || "0")}%</p>
                          </>
                        )}
                        <p className="font-medium mt-2">
                          Formula: £250 ÷ ({highestApportionment}% ÷ 100)
                          {hasCommercial && ` × (${100 - parseFloat(commercialPercentage || "0")}% ÷ 100)`}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Enter the highest residential apportionment percentage to calculate the threshold.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Information Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                About Section 20 Consultation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 mb-4">
                  Section 20 of the Landlord and Tenant Act 1985 requires landlords to consult with leaseholders 
                  before carrying out qualifying works that will cost any leaseholder more than £250.
                </p>
                
                <h4 className="font-semibold text-gray-900 mb-2">Key Points:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                  <li>The £250 threshold applies per leaseholder, not per building</li>
                  <li>For mixed-use buildings, only residential leaseholders are considered</li>
                  <li>Works below the threshold don't require formal consultation</li>
                  <li>Works above the threshold require a three-stage consultation process</li>
                </ul>

                <h4 className="font-semibold text-gray-900 mb-2">When to Use This Calculator:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  <li>Planning major works or improvements</li>
                  <li>Reviewing service charge budgets</li>
                  <li>Assessing consultation requirements</li>
                  <li>Preparing Section 20 notices</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </LayoutWithSidebar>
  );
} 