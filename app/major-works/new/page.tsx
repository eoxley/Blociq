"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Save
} from "lucide-react";
import { toast } from "sonner";

interface Building {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    building_id: '',
    status: 'notice_of_intention',
    notice_of_intention_date: '',
    statement_of_estimates_date: '',
    contractor_appointed_date: '',
    expected_completion_date: '',
    estimated_cost: '',
    contractor_name: '',
    contractor_contact: '',
    notes: ''
  });

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching buildings:', error);
        toast.error('Failed to load buildings');
      } else {
        setBuildings(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.building_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { supabase } = await import("@/utils/supabase");
      
      const { data, error } = await supabase
        .from('major_works_projects')
        .insert({
          name: formData.name,
          description: formData.description,
          building_id: formData.building_id,
          status: formData.status,
          notice_of_intention_date: formData.notice_of_intention_date || null,
          statement_of_estimates_date: formData.statement_of_estimates_date || null,
          contractor_appointed_date: formData.contractor_appointed_date || null,
          expected_completion_date: formData.expected_completion_date || null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          contractor_name: formData.contractor_name || null,
          contractor_contact: formData.contractor_contact || null,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Major works project created successfully!');
      router.push(`/major-works/${data.id}`);

    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading buildings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/major-works" className="inline-flex items-center text-primary hover:text-dark mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Major Works
        </Link>
        
        <div>
          <h1 className="text-3xl font-brand font-bold text-dark mb-2">
            Create New Major Works Project
          </h1>
          <p className="text-gray-600">
            Set up a new major works project for tracking and management.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Roof Replacement Project"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the major works project..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="building_id">Building *</Label>
                <select
                  id="building_id"
                  value={formData.building_id}
                  onChange={(e) => handleInputChange('building_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Select a building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status">Project Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="notice_of_intention">Notice of Intention</option>
                  <option value="statement_of_estimates">Statement of Estimates</option>
                  <option value="contractor_appointed">Contractor Appointed</option>
                  <option value="works_in_progress">Works in Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Timeline & Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Timeline & Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notice_of_intention_date">Notice of Intention Date</Label>
                <Input
                  id="notice_of_intention_date"
                  type="date"
                  value={formData.notice_of_intention_date}
                  onChange={(e) => handleInputChange('notice_of_intention_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="statement_of_estimates_date">Statement of Estimates Date</Label>
                <Input
                  id="statement_of_estimates_date"
                  type="date"
                  value={formData.statement_of_estimates_date}
                  onChange={(e) => handleInputChange('statement_of_estimates_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="contractor_appointed_date">Contractor Appointed Date</Label>
                <Input
                  id="contractor_appointed_date"
                  type="date"
                  value={formData.contractor_appointed_date}
                  onChange={(e) => handleInputChange('contractor_appointed_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="expected_completion_date">Expected Completion Date</Label>
                <Input
                  id="expected_completion_date"
                  type="date"
                  value={formData.expected_completion_date}
                  onChange={(e) => handleInputChange('expected_completion_date', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="estimated_cost">Estimated Cost (£)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  step="0.01"
                  value={formData.estimated_cost}
                  onChange={(e) => handleInputChange('estimated_cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contractor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Contractor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contractor_name">Contractor Name</Label>
                <Input
                  id="contractor_name"
                  value={formData.contractor_name}
                  onChange={(e) => handleInputChange('contractor_name', e.target.value)}
                  placeholder="e.g., ABC Construction Ltd"
                />
              </div>

              <div>
                <Label htmlFor="contractor_contact">Contractor Contact</Label>
                <Input
                  id="contractor_contact"
                  value={formData.contractor_contact}
                  onChange={(e) => handleInputChange('contractor_contact', e.target.value)}
                  placeholder="Phone or email"
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Project Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes or comments..."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end space-x-4">
          <Link href="/major-works">
            <Button variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-dark text-white"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating Project...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 