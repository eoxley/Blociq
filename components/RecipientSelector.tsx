"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Download, 
  Mail, 
  Building2, 
  Users,
  Filter,
  Plus,
  X
} from 'lucide-react';
import { saveAs } from 'file-saver';

export interface Recipient {
  id: string;
  name: string;
  email: string;
  unit: string;
  type: 'leaseholder' | 'resident' | 'owner' | 'tenant';
  building_name: string;
  selected?: boolean;
}

interface RecipientSelectorProps {
  buildingId?: string;
  onRecipientsChange?: (recipients: Recipient[]) => void;
  initialSelected?: string[];
}

export default function RecipientSelector({ 
  buildingId, 
  onRecipientsChange,
  initialSelected = []
}: RecipientSelectorProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);

  useEffect(() => {
    fetchRecipients();
  }, [buildingId]);

  useEffect(() => {
    // Initialize selected recipients from props
    if (initialSelected.length > 0) {
      const selected = recipients.filter(r => initialSelected.includes(r.id));
      setSelectedRecipients(selected);
    }
  }, [recipients, initialSelected]);

  const fetchRecipients = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      let query = supabase
        .from('leases')
        .select(`
          id,
          leaseholder_name,
          leaseholder_email,
          unit,
          building_name
        `)
        .not('leaseholder_email', 'is', null);

      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recipients:', error);
        return;
      }

      const formattedRecipients: Recipient[] = (data || []).map(lease => ({
        id: lease.id,
        name: lease.leaseholder_name || 'Unknown',
        email: lease.leaseholder_email,
        unit: lease.unit || 'Unknown',
        type: 'leaseholder' as const,
        building_name: lease.building_name || 'Unknown'
      }));

      setRecipients(formattedRecipients);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = 
      recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipient.building_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || recipient.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const handleRecipientToggle = (recipient: Recipient) => {
    const isSelected = selectedRecipients.some(r => r.id === recipient.id);
    
    if (isSelected) {
      const updated = selectedRecipients.filter(r => r.id !== recipient.id);
      setSelectedRecipients(updated);
      onRecipientsChange?.(updated);
    } else {
      const updated = [...selectedRecipients, recipient];
      setSelectedRecipients(updated);
      onRecipientsChange?.(updated);
    }
  };

  const handleSelectAll = () => {
    const allSelected = [...selectedRecipients, ...filteredRecipients.filter(r => 
      !selectedRecipients.some(sr => sr.id === r.id)
    )];
    setSelectedRecipients(allSelected);
    onRecipientsChange?.(allSelected);
  };

  const handleDeselectAll = () => {
    setSelectedRecipients([]);
    onRecipientsChange?.([]);
  };

  const exportRecipientsToCSV = () => {
    if (selectedRecipients.length === 0) {
      alert('Please select at least one recipient to export');
      return;
    }

    const header = 'Name,Email,Unit,Type,Building\n';
    const rows = selectedRecipients.map(r => 
      `"${r.name}","${r.email}","${r.unit}","${r.type}","${r.building_name}"`
    ).join('\n');
    
    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    const timestamp = new Date().toISOString().split('T')[0];
    saveAs(blob, `recipients_${timestamp}.csv`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'leaseholder':
        return 'bg-blue-100 text-blue-800';
      case 'resident':
        return 'bg-green-100 text-green-800';
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'tenant':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center min-h-32">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading recipients...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-dark">Select Recipients</h3>
          <p className="text-sm text-gray-600">
            {selectedRecipients.length} of {recipients.length} recipients selected
          </p>
        </div>
        
        <div className="flex space-x-2">
          {selectedRecipients.length > 0 && (
            <Button
              onClick={exportRecipientsToCSV}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
          
          <Button
            onClick={handleSelectAll}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Select All
          </Button>
          
          <Button
            onClick={handleDeselectAll}
            variant="outline"
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Search Recipients</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, unit..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="typeFilter">Filter by Type</Label>
              <select
                id="typeFilter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="leaseholder">Leaseholders</option>
                <option value="resident">Residents</option>
                <option value="owner">Owners</option>
                <option value="tenant">Tenants</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients List */}
      <Card>
        <CardContent className="p-0">
          {filteredRecipients.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recipients found</h3>
              <p className="text-gray-600">
                {searchTerm || typeFilter !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'No recipients available for this building.'
                }
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredRecipients.map((recipient) => {
                const isSelected = selectedRecipients.some(r => r.id === recipient.id);
                
                return (
                  <div
                    key={recipient.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                      <Checkbox
                          id={`recipient-${recipient.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleRecipientToggle(recipient)}
                      />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-dark truncate">
                              {recipient.name}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {recipient.email}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge className={getTypeColor(recipient.type)}>
                              {recipient.type}
                            </Badge>
                            <Badge variant="outline">
                              {recipient.unit}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <Building2 className="w-3 h-3 mr-1" />
                          {recipient.building_name}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Recipients Summary */}
      {selectedRecipients.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">
                  Selected Recipients ({selectedRecipients.length})
                </h4>
                <p className="text-sm text-blue-700">
                  {selectedRecipients.map(r => r.name).join(', ')}
                </p>
              </div>
              
              <Button
                onClick={exportRecipientsToCSV}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 