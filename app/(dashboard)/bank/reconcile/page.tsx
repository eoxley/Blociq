'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Search, AlertCircle, Clock } from 'lucide-react';

interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  external_ref?: string;
  statement_id: string;
  reconciled: boolean;
}

interface ReconciliationSuggestion {
  entity_type: string;
  entity_id: string;
  entity_ref: string;
  amount: number;
  date: string;
  match_score: number;
}

export default function BankReconcilePage() {
  const [bankAccountId, setBankAccountId] = useState('');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedTxn, setSelectedTxn] = useState<BankTransaction | null>(null);
  const [suggestions, setSuggestions] = useState<ReconciliationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load unreconciled transactions
  const loadTransactions = async () => {
    if (!bankAccountId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounting/bank/transactions?bank_account_id=${bankAccountId}&reconciled=false`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.transactions);
      } else {
        setError(data.error || 'Failed to load transactions');
      }
    } catch (err) {
      setError('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Load suggestions for selected transaction
  const loadSuggestions = async (txnId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/accounting/bank/reconcile?bank_txn_id=${txnId}&match_type=both`);
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
      } else {
        setError(data.error || 'Failed to load suggestions');
      }
    } catch (err) {
      setError('Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  // Reconcile transaction
  const reconcileTransaction = async (txnId: string, targetEntity: string, targetId: string) => {
    setIsReconciling(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/accounting/bank/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_txn_id: txnId,
          target_entity: targetEntity,
          target_id: targetId,
          override_amount_mismatch: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Transaction reconciled successfully!');
        // Reload transactions
        await loadTransactions();
        // Clear selection
        setSelectedTxn(null);
        setSuggestions([]);
      } else {
        setError(data.error || 'Failed to reconcile transaction');
      }
    } catch (err) {
      setError('Failed to reconcile transaction');
    } finally {
      setIsReconciling(false);
    }
  };

  // Handle transaction selection
  const handleSelectTransaction = (txn: BankTransaction) => {
    setSelectedTxn(txn);
    setSuggestions([]);
    setError(null);
    setSuccess(null);
    loadSuggestions(txn.id);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: ReconciliationSuggestion) => {
    if (!selectedTxn) return;
    reconcileTransaction(selectedTxn.id, suggestion.entity_type, suggestion.entity_id);
  };

  useEffect(() => {
    if (bankAccountId) {
      loadTransactions();
    }
  }, [bankAccountId]);

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
          <p className="text-muted-foreground mt-2">
            Match bank transactions with receipts and payments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Pane - Unreconciled Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Unreconciled Transactions</span>
              </CardTitle>
              <CardDescription>
                Select a transaction to see reconciliation suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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

                {isLoading && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Loading transactions...</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center space-x-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>{success}</span>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className={`p-3 border rounded cursor-pointer transition-colors ${
                        selectedTxn?.id === txn.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleSelectTransaction(txn)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{txn.date}</p>
                            <Badge variant={txn.amount > 0 ? 'default' : 'destructive'}>
                              {txn.amount > 0 ? 'Credit' : 'Debit'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{txn.description}</p>
                          {txn.external_ref && (
                            <p className="text-xs text-muted-foreground">Ref: {txn.external_ref}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.amount > 0 ? '+' : ''}£{Math.abs(txn.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {transactions.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>No unreconciled transactions found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Pane - Reconciliation Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Reconciliation Suggestions</span>
              </CardTitle>
              <CardDescription>
                {selectedTxn 
                  ? `Suggestions for ${selectedTxn.description}`
                  : 'Select a transaction to see suggestions'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTxn ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2" />
                  <p>Select a transaction to see reconciliation suggestions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected Transaction Summary */}
                  <div className="p-3 bg-muted rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{selectedTxn.description}</p>
                        <p className="text-sm text-muted-foreground">{selectedTxn.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${selectedTxn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedTxn.amount > 0 ? '+' : ''}£{Math.abs(selectedTxn.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Loading suggestions...</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <XCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No matching suggestions found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Badge variant={suggestion.entity_type === 'ar_receipt' ? 'default' : 'secondary'}>
                                  {suggestion.entity_type === 'ar_receipt' ? 'Receipt' : 'Payment'}
                                </Badge>
                                <Badge variant="outline">
                                  {Math.round(suggestion.match_score * 100)}% match
                                </Badge>
                              </div>
                              <p className="text-sm font-medium mt-1">{suggestion.entity_ref}</p>
                              <p className="text-xs text-muted-foreground">{suggestion.date}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">£{suggestion.amount.toFixed(2)}</p>
                              <Button
                                size="sm"
                                disabled={isReconciling}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSuggestion(suggestion);
                                }}
                              >
                                {isReconciling ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                  'Match'
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




