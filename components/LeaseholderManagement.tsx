"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Leaseholder {
  id: string;
  unit_id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  correspondence_address: string | null;
  created_at: string;
  updated_at: string;
}

interface LeaseholderFormData {
  full_name: string;
  email: string;
  phone_number: string;
  correspondence_address: string;
}

interface LeaseholderManagementProps {
  unitId: string;
  unitNumber: string;
  className?: string;
}

export default function LeaseholderManagement({ 
  unitId, 
  unitNumber, 
  className = "" 
}: LeaseholderManagementProps) {
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLeaseholder, setEditingLeaseholder] = useState<Leaseholder | null>(null);
  const [formData, setFormData] = useState<LeaseholderFormData>({
    full_name: '',
    email: '',
    phone_number: '',
    correspondence_address: ''
  });

  useEffect(() => {
    fetchLeaseholders();
  }, [unitId]);

  const fetchLeaseholders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('leaseholders')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching leaseholders:', error);
        setError(error.message);
      } else {
        setLeaseholders(data || []);
      }
    } catch (err) {
      console.error('Error in fetchLeaseholders:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      phone_number: '',
      correspondence_address: ''
    });
    setEditingLeaseholder(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const leaseholderData = {
        unit_id: unitId,
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        correspondence_address: formData.correspondence_address.trim() || null
      };

      if (editingLeaseholder) {
        // Update existing leaseholder
        const { error } = await supabase
          .from('leaseholders')
          .update(leaseholderData)
          .eq('id', editingLeaseholder.id);

        if (error) {
          console.error('Error updating leaseholder:', error);
          toast.error('Failed to update leaseholder');
        } else {
          toast.success('Leaseholder updated successfully');
          fetchLeaseholders();
        }
      } else {
        // Create new leaseholder
        const { error } = await supabase
          .from('leaseholders')
          .insert([leaseholderData]);

        if (error) {
          console.error('Error creating leaseholder:', error);
          toast.error('Failed to create leaseholder');
        } else {
          toast.success('Leaseholder added successfully');
          fetchLeaseholders();
        }
      }

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving leaseholder:', error);
      toast.error('Failed to save leaseholder');
    }
  };

  const handleEdit = (leaseholder: Leaseholder) => {
    setEditingLeaseholder(leaseholder);
    setFormData({
      full_name: leaseholder.full_name || '',
      email: leaseholder.email || '',
      phone_number: leaseholder.phone_number || '',
      correspondence_address: leaseholder.correspondence_address || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (leaseholderId: string) => {
    if (!confirm('Are you sure you want to delete this leaseholder?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leaseholders')
        .delete()
        .eq('id', leaseholderId);

      if (error) {
        console.error('Error deleting leaseholder:', error);
        toast.error('Failed to delete leaseholder');
      } else {
        toast.success('Leaseholder deleted successfully');
        fetchLeaseholders();
      }
    } catch (error) {
      console.error('Error deleting leaseholder:', error);
      toast.error('Failed to delete leaseholder');
    }
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-8 shadow-xl border border-gray-100 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Loading leaseholders...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-2xl p-8 shadow-xl border border-gray-100 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Error loading leaseholders</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchLeaseholders} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Leaseholders</h3>
              <p className="text-gray-600">
                Unit {unitNumber} • {leaseholders.length} leaseholder{leaseholders.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button onClick={openAddDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Leaseholder
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {leaseholders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">No leaseholders found</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              No leaseholders are currently associated with this unit. Add the first leaseholder to get started.
            </p>
            <Button onClick={openAddDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add First Leaseholder
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {leaseholders.map((leaseholder) => (
              <Card key={leaseholder.id} className="border border-gray-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {leaseholder.full_name || 'Unnamed Leaseholder'}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                            {leaseholder.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {leaseholder.email}
                              </div>
                            )}
                            {leaseholder.phone_number && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {leaseholder.phone_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {leaseholder.correspondence_address && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900">Correspondence Address</span>
                          </div>
                          <p className="text-sm text-gray-700">{leaseholder.correspondence_address}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Created: {new Date(leaseholder.created_at).toLocaleDateString()}</span>
                        {leaseholder.updated_at !== leaseholder.created_at && (
                          <span>• Updated: {new Date(leaseholder.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(leaseholder)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(leaseholder.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {editingLeaseholder ? 'Edit Leaseholder' : 'Add New Leaseholder'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  placeholder="Full name"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <Label htmlFor="correspondence_address">Correspondence Address</Label>
                <Textarea
                  id="correspondence_address"
                  value={formData.correspondence_address}
                  onChange={(e) => setFormData({...formData, correspondence_address: e.target.value})}
                  placeholder="Correspondence address"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button type="submit" className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {editingLeaseholder ? 'Update' : 'Add'} Leaseholder
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 