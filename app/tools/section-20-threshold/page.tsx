"use client";

import { useState, useEffect } from "react";
import { Calculator, Copy, Info, Building, Percent, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Section20ThresholdCalculator() {
  const [highestApportionment, setHighestApportionment] = useState<string>("");
  const [hasCommercial, setHasCommercial] = useState<boolean>(false);
  const [commercialPercentage, setCommercialPercentage] = useState<string>("");
  const [threshold, setThreshold] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

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

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Section 20 Consultation Threshold Calculator
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Calculate the spending threshold that triggers Section 20 consultation requirements 
              for leasehold properties based on apportionment percentages.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator Card */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Calculator
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
      </div>
    </TooltipProvider>
  );
} 