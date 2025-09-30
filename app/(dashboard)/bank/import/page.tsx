'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface BankStatement {
  id: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  closing_balance: number;
  transaction_count: number;
}

export default function BankImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bankAccountId, setBankAccountId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BankStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Parse CSV for preview
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      const text = await selectedFile.text();
      try {
        const lines = text.trim().split('\n');
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const transactions = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 transactions
          const row = lines[i].split(',').map(cell => cell.trim());
          if (row.length >= 3) {
            transactions.push({
              date: row[0],
              description: row[1],
              amount: row[2],
            });
          }
        }

        setPreview({
          totalLines: lines.length - 1,
          sampleTransactions: transactions,
          headers: header,
        });
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    }
  };

  const handleImport = async () => {
    if (!file || !bankAccountId || !periodStart || !periodEnd || !openingBalance || !closingBalance) {
      setError('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Parse CSV content
      const text = await file.text();
      const lines = text.trim().split('\n');
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const dateIndex = header.findIndex(h => h.includes('date'));
      const descIndex = header.findIndex(h => h.includes('description') || h.includes('desc'));
      const amountIndex = header.findIndex(h => h.includes('amount') || h.includes('value'));
      const refIndex = header.findIndex(h => h.includes('reference') || h.includes('ref'));

      if (dateIndex === -1 || descIndex === -1 || amountIndex === -1) {
        throw new Error('Invalid CSV format. Expected columns: Date, Description, Amount, Reference');
      }

      const transactions = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim());
        if (row.length < 3) continue;

        const date = row[dateIndex];
        const description = row[descIndex];
        const amount = parseFloat(row[amountIndex].replace(/[£,]/g, ''));
        const reference = refIndex !== -1 ? row[refIndex] : undefined;

        if (isNaN(amount)) continue;

        transactions.push({
          date,
          amount,
          description,
          external_ref: reference,
        });
      }

      if (transactions.length === 0) {
        throw new Error('No valid transactions found in CSV');
      }

      // Import statement
      const response = await fetch('/api/accounting/bank/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_account_id: bankAccountId,
          period_start: periodStart,
          period_end: periodEnd,
          opening_balance: parseFloat(openingBalance),
          closing_balance: parseFloat(closingBalance),
          transactions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.statement);
        setFile(null);
        setPreview(null);
        // Reset form
        setPeriodStart('');
        setPeriodEnd('');
        setOpeningBalance('');
        setClosingBalance('');
      } else {
        setError(data.error || 'Failed to import statement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import statement');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bank Statement Import</h1>
          <p className="text-muted-foreground mt-2">
            Import bank statements and transactions for reconciliation
          </p>
        </div>

        <div className="grid gap-6">
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle>Import Bank Statement</CardTitle>
              <CardDescription>
                Upload a CSV file with bank transactions and statement details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank-account">Bank Account</Label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank-1">123 Main Street - Current Account</SelectItem>
                      <SelectItem value="bank-2">456 Oak Avenue - Reserve Fund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file">Statement File (CSV)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period-start">Period Start</Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <Label htmlFor="period-end">Period End</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opening-balance">Opening Balance (£)</Label>
                  <Input
                    id="opening-balance"
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  <Label htmlFor="closing-balance">Closing Balance (£)</Label>
                  <Input
                    id="closing-balance"
                    type="number"
                    step="0.01"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <Button 
                onClick={handleImport} 
                disabled={isProcessing || !file || !bankAccountId || !periodStart || !periodEnd || !openingBalance || !closingBalance}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing Statement...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Statement
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* File Preview */}
          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>File Preview</span>
                </CardTitle>
                <CardDescription>
                  Preview of the CSV file to be imported
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">Total Transactions</Label>
                      <p>{preview.totalLines}</p>
                    </div>
                    <div>
                      <Label className="font-medium">Detected Headers</Label>
                      <p>{preview.headers.join(', ')}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium">Sample Transactions</Label>
                    <div className="mt-2 space-y-2">
                      {preview.sampleTransactions.map((txn: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                          <div>
                            <p className="font-medium">{txn.date}</p>
                            <p className="text-muted-foreground">{txn.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">£{txn.amount}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Processing State */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Processing bank statement...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success State */}
          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Statement imported successfully!</span>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">Statement ID</Label>
                    <p className="font-mono text-xs">{result.id}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Period</Label>
                    <p>{result.period_start} to {result.period_end}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Transactions</Label>
                    <p>{result.transaction_count}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Closing Balance</Label>
                    <p>£{result.closing_balance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


