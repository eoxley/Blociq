'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Calculator,
  Building,
  User
} from 'lucide-react';

interface WorksOrderLine {
  account_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

interface Contractor {
  id: string;
  name: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface WorksOrderFormProps {
  buildingId: string;
  onSuccess?: (worksOrder: any) => void;
  onCancel?: () => void;
}

export function WorksOrderForm({ buildingId, onSuccess, onCancel }: WorksOrderFormProps) {
  const [formData, setFormData] = useState({
    contractor_id: '',
    title: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    target_date: '',
  });
  
  const [lines, setLines] = useState<WorksOrderLine[]>([
    { account_id: '', description: '', quantity: 1, unit_cost: 0, total: 0 }
  ]);
  
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contractors and accounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load contractors
        const contractorsResponse = await fetch(`/api/contractors?building_id=${buildingId}`);
        const contractorsData = await contractorsResponse.json();
        if (contractorsData.success) {
          setContractors(contractorsData.contractors);
        }

        // Load accounts
        const accountsResponse = await fetch(`/api/accounting/accounts?building_id=${buildingId}`);
        const accountsData = await accountsResponse.json();
        if (accountsData.success) {
          setAccounts(accountsData.accounts);
        }
      } catch (err) {
        setError('Failed to load form data');
      }
    };

    loadData();
  }, [buildingId]);

  // Update line total when quantity or unit cost changes
  const updateLineTotal = (index: number, field: 'quantity' | 'unit_cost', value: number) => {
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      [field]: value,
      total: newLines[index].quantity * newLines[index].unit_cost,
    };
    setLines(newLines);
  };

  // Add new line
  const addLine = () => {
    setLines([...lines, { account_id: '', description: '', quantity: 1, unit_cost: 0, total: 0 }]);
  };

  // Remove line
  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  // Calculate total
  const totalAmount = lines.reduce((sum, line) => sum + line.total, 0);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/works-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          contractor_id: formData.contractor_id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          target_date: formData.target_date || null,
          lines: lines.map(line => ({
            account_id: line.account_id,
            description: line.description,
            quantity: line.quantity,
            unit_cost: line.unit_cost,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.(data.works_order);
      } else {
        setError(data.error || 'Failed to create works order');
      }
    } catch (err) {
      setError('Failed to create works order');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Works Order</CardTitle>
        <CardDescription>
          Create a new works order for contractor services
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractor">Contractor *</Label>
              <Select
                value={formData.contractor_id}
                onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contractor" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Lift door operator repair"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the work required..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Target Date</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          {/* Works Order Lines */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label htmlFor={`account-${index}`}>Account</Label>
                    <Select
                      value={line.account_id}
                      onValueChange={(value) => {
                        const newLines = [...lines];
                        newLines[index].account_id = value;
                        setLines(newLines);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-4">
                    <Label htmlFor={`description-${index}`}>Description</Label>
                    <Input
                      id={`description-${index}`}
                      value={line.description}
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].description = e.target.value;
                        setLines(newLines);
                      }}
                      placeholder="Work description"
                    />
                  </div>

                  <div className="col-span-1">
                    <Label htmlFor={`quantity-${index}`}>Qty</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLineTotal(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="col-span-1">
                    <Label htmlFor={`unit_cost-${index}`}>Unit Cost</Label>
                    <Input
                      id={`unit_cost-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_cost}
                      onChange={(e) => updateLineTotal(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="col-span-1">
                    <Label>Total</Label>
                    <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-muted">
                      <span className="text-sm font-medium">£{line.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="flex items-center space-x-2 text-lg font-semibold">
                <span>Total:</span>
                <span>£{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Works Order'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


