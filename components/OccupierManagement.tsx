'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Occupier {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  start_date: string;
  end_date?: string;
  notes?: string;
}

interface OccupierManagementProps {
  unitId: string;
}

export default function OccupierManagement({ unitId }: OccupierManagementProps) {
  const [occupiers, setOccupiers] = useState<Occupier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOccupier, setEditingOccupier] = useState<Occupier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
    start_date: '',
    end_date: '',
    notes: ''
  });
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchOccupiers();
  }, [unitId]);

  const fetchOccupiers = async () => {
    try {
      const { data, error } = await supabase
        .from('occupiers')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching occupiers:', error);
        toast.error('Failed to load occupiers');
      } else {
        setOccupiers(data || []);
      }
    } catch (error) {
      console.error('Error fetching occupiers:', error);
      toast.error('Failed to load occupiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const occupierData = {
        unit_id: unitId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null
      };

      if (editingOccupier) {
        // Update existing occupier
        const { error } = await supabase
          .from('occupiers')
          .update(occupierData)
          .eq('id', editingOccupier.id);

        if (error) {
          console.error('Error updating occupier:', error);
          toast.error('Failed to update occupier');
        } else {
          toast.success('Occupier updated successfully');
          fetchOccupiers();
        }
      } else {
        // Create new occupier
        const { error } = await supabase
          .from('occupiers')
          .insert([occupierData]);

        if (error) {
          console.error('Error creating occupier:', error);
          toast.error('Failed to create occupier');
        } else {
          toast.success('Occupier added successfully');
          fetchOccupiers();
        }
      }

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving occupier:', error);
      toast.error('Failed to save occupier');
    }
  };

  const handleEdit = (occupier: Occupier) => {
    setEditingOccupier(occupier);
    setFormData({
      name: occupier.name,
      email: occupier.email,
      phone: occupier.phone,
      status: occupier.status,
      start_date: occupier.start_date,
      end_date: occupier.end_date || '',
      notes: occupier.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (occupierId: string) => {
    if (!confirm('Are you sure you want to delete this occupier?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('occupiers')
        .delete()
        .eq('id', occupierId);

      if (error) {
        console.error('Error deleting occupier:', error);
        toast.error('Failed to delete occupier');
      } else {
        toast.success('Occupier deleted successfully');
        fetchOccupiers();
      }
    } catch (error) {
      console.error('Error deleting occupier:', error);
      toast.error('Failed to delete occupier');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'active',
      start_date: '',
      end_date: '',
      notes: ''
    });
    setEditingOccupier(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4">Loading occupiers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Occupiers</h3>
        <Button onClick={handleAddNew} size="sm">
          Add Occupier
        </Button>
      </div>

      {occupiers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No occupiers found for this unit.</p>
          <p className="text-sm">Add an occupier to track sub-tenancies.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {occupiers.map((occupier) => (
            <div key={occupier.id} className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{occupier.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      occupier.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {occupier.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{occupier.email}</p>
                  <p className="text-sm text-gray-600">{occupier.phone}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Start: {new Date(occupier.start_date).toLocaleDateString()}
                    {occupier.end_date && ` • End: ${new Date(occupier.end_date).toLocaleDateString()}`}
                  </p>
                  {occupier.notes && (
                    <p className="text-sm text-gray-600 mt-2">{occupier.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(occupier)} size="sm" variant="outline">
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(occupier.id)} size="sm" variant="destructive">
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <div style={{ display: 'none' }}></div>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOccupier ? 'Edit Occupier' : 'Add New Occupier'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingOccupier ? 'Update' : 'Add'} Occupier
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 