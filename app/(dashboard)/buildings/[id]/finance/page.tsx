'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  BarChart3,
  PiggyBank,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AskBlocIQButton } from '@/components/finance/AskBlocIQButton';
import { DeadlinesWidget } from '@/components/finance/DeadlinesWidget';

interface FinanceSummary {
  arrears: {
    total: number;
    overdue_units: Array<{
      unit_id: string;
      unit_number: string;
      amount: number;
      days_overdue: number;
    }>;
  };
  budget_vs_actual: Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
    variancePercent: number;
  }>;
  reserve_fund: {
    balance: number;
    fund_id: string;
  };
  deadlines: Array<{
    id: string;
    title: string;
    due_date: string;
    type: string;
    status: 'green' | 'amber' | 'red';
  }>;
  building_id: string;
  year: number;
}

interface VarianceDetail {
  variances: Array<{
    account_id: string;
    account_code: string;
    account_name: string;
    budget: number;
    actual: number;
    variance: number;
    variance_percent: number;
    narrative: string;
    transactions: Array<{
      date: string;
      amount: number;
      memo: string;
      type: string;
    }>;
  }>;
  totals: {
    budget: number;
    actual: number;
    variance: number;
    variance_percent: number;
  };
}

export default function FinanceDashboardPage() {
  const params = useParams();
  const buildingId = params.id as string;
  
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [varianceDetail, setVarianceDetail] = useState<VarianceDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Load finance summary
  const loadSummary = async () => {
    try {
      const response = await fetch(`/api/finance/summary?building_id=${buildingId}`);
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
      } else {
        setError(data.error || 'Failed to load finance summary');
      }
    } catch (err) {
      setError('Failed to load finance summary');
    } finally {
      setIsLoading(false);
    }
  };

  // Load variance detail for category
  const loadVarianceDetail = async (category: string) => {
    try {
      const response = await fetch(`/api/finance/variance?building_id=${buildingId}&category=${category}`);
      const data = await response.json();
      
      if (data.success) {
        setVarianceDetail(data.data);
        setSelectedCategory(category);
      } else {
        setError(data.error || 'Failed to load variance detail');
      }
    } catch (err) {
      setError('Failed to load variance detail');
    }
  };


  // Export PDF
  const handleExportPDF = () => {
    // This would generate a PDF report
    console.log('Exporting PDF report...');
    alert('PDF export functionality would be implemented here');
  };

  useEffect(() => {
    if (buildingId) {
      loadSummary();
    }
  }, [buildingId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="container mx-auto py-8">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finance Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Financial overview for {summary.year}
            </p>
          </div>
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Arrears Widget */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Arrears</CardTitle>
              <AskBlocIQButton
                context="arrears"
                data={summary.arrears}
                buildingId={buildingId}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-destructive">
                £{summary.arrears.total.toLocaleString()}
              </div>
              {summary.arrears.overdue_units.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Overdue Units:</p>
                  <div className="space-y-1">
                    {summary.arrears.overdue_units.slice(0, 3).map((unit) => (
                      <div key={unit.unit_id} className="flex justify-between text-sm">
                        <span>Unit {unit.unit_number}</span>
                        <span className="text-destructive">£{unit.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {summary.arrears.overdue_units.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{summary.arrears.overdue_units.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reserve Fund Widget */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Reserve Fund</CardTitle>
              <AskBlocIQButton
                context="reserve_fund"
                data={summary.reserve_fund}
                buildingId={buildingId}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-3xl font-bold text-green-600">
                £{summary.reserve_fund.balance.toLocaleString()}
              </div>
              <div className="flex items-center space-x-2">
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Reserve Fund</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget vs Actual Widget */}
        <Card className="relative overflow-hidden md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Budget vs Actual</CardTitle>
              <AskBlocIQButton
                context="budget_vs_actual"
                data={summary.budget_vs_actual}
                buildingId={buildingId}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.budget_vs_actual.slice(0, 4).map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        £{category.actual.toLocaleString()}
                      </span>
                      <span className="text-sm font-medium">
                        / £{category.budget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress 
                      value={category.budget > 0 ? (category.actual / category.budget) * 100 : 0} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs">
                      <span className={category.variance >= 0 ? 'text-destructive' : 'text-green-600'}>
                        {category.variance >= 0 ? '+' : ''}£{category.variance.toLocaleString()}
                      </span>
                      <span className={category.variance >= 0 ? 'text-destructive' : 'text-green-600'}>
                        {category.variancePercent >= 0 ? '+' : ''}{category.variancePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deadlines Widget */}
      <DeadlinesWidget buildingId={buildingId} />

      {/* Expandable Variance Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Budget Variance Analysis</CardTitle>
              <CardDescription>Click on a category to see detailed variance analysis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.budget_vs_actual.map((category) => (
              <div key={category.category} className="border rounded-lg">
                <div 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (expandedCategory === category.category) {
                      setExpandedCategory(null);
                      setVarianceDetail(null);
                    } else {
                      setExpandedCategory(category.category);
                      loadVarianceDetail(category.category);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedCategory === category.category ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">{category.category}</span>
                      <Badge variant={category.variance >= 0 ? 'destructive' : 'default'}>
                        {category.variance >= 0 ? '+' : ''}£{category.variance.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        £{category.actual.toLocaleString()} / £{category.budget.toLocaleString()}
                      </span>
                      <AskBlocIQButton
                        context="variance_analysis"
                        data={{ category, varianceDetail }}
                        buildingId={buildingId}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
                
                {expandedCategory === category.category && varianceDetail && (
                  <div className="border-t p-4 bg-muted/25">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Total Budget</p>
                          <p className="text-2xl font-bold">£{varianceDetail.totals.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Total Actual</p>
                          <p className="text-2xl font-bold">£{varianceDetail.totals.actual.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-medium">Total Variance</p>
                          <p className={`text-2xl font-bold ${varianceDetail.totals.variance >= 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {varianceDetail.totals.variance >= 0 ? '+' : ''}£{varianceDetail.totals.variance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium">Account Breakdown:</p>
                        {varianceDetail.variances.map((account) => (
                          <div key={account.account_id} className="flex justify-between items-center p-2 bg-background rounded">
                            <div>
                              <p className="font-medium">{account.account_name}</p>
                              <p className="text-sm text-muted-foreground">{account.account_code}</p>
                              {account.narrative && (
                                <p className="text-xs text-muted-foreground mt-1">{account.narrative}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">£{account.actual.toLocaleString()}</p>
                              <p className={`text-sm ${account.variance >= 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {account.variance >= 0 ? '+' : ''}£{account.variance.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
