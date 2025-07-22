'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import { ArrowLeft, Send, Download, Building, Users, Mail, FileText, Eye, EyeOff, Sparkles } from 'lucide-react';
import Link from 'next/link';

type Template = Database['public']['Tables']['communication_templates']['Row'];
type Building = Database['public']['Tables']['buildings']['Row'];
type Unit = Database['public']['Tables']['units']['Row'];
type Leaseholder = Database['public']['Tables']['leaseholders']['Row'];

interface LeaseholderWithUnit extends Leaseholder {
  unit: Unit | null;
}

export default function ComposeMessagePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;
  const supabase = createClientComponentClient<Database>();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [leaseholders, setLeaseholders] = useState<LeaseholderWithUnit[]>([]);
  const [selectedLeaseholders, setSelectedLeaseholders] = useState<string[]>([]);
  const [sendMethod, setSendMethod] = useState<'email' | 'letter' | 'both'>('email');
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Draft Generator states
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftPurpose, setDraftPurpose] = useState('');
  const [draftCategory, setDraftCategory] = useState('general');

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
      fetchBuildings();
    }
  }, [templateId]);

  useEffect(() => {
    if (selectedBuilding) {
      fetchLeaseholders();
    } else {
      setLeaseholders([]);
      setSelectedLeaseholders([]);
    }
  }, [selectedBuilding]);

  const fetchTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('id', parseInt(templateId))
        .single();

      if (error) {
        throw error;
      }

      setTemplate(data);
    } catch (err: any) {
      console.error('Error fetching template:', err);
      setError(err.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setBuildings(data || []);
    } catch (err: any) {
      console.error('Error fetching buildings:', err);
    }
  };

  const fetchLeaseholders = async () => {
    try {
      const { data, error } = await supabase
        .from('leaseholders')
        .select(`
          *,
          unit:units(*)
        `)
        .eq('unit.building_id', selectedBuilding)
        .order('name');

      if (error) {
        throw error;
      }

      const leaseholdersWithUnits = data || [];
      setLeaseholders(leaseholdersWithUnits);
      
      // Default select all leaseholders
      const defaultSelected = leaseholdersWithUnits
        .map(l => l.id);
      setSelectedLeaseholders(defaultSelected);
    } catch (err: any) {
      console.error('Error fetching leaseholders:', err);
    }
  };

  const resolveMergeFields = (content: string, building: Building | null, leaseholder: LeaseholderWithUnit | null) => {
    let resolved = content;
    
    // Building fields
    if (building) {
      resolved = resolved.replace(/\{\{building_name\}\}/g, building.name || '');
      resolved = resolved.replace(/\{\{building_address\}\}/g, building.address || '');
      resolved = resolved.replace(/\{\{building_manager_name\}\}/g, building.building_manager_name || '');
      resolved = resolved.replace(/\{\{building_manager_email\}\}/g, building.building_manager_email || '');
      resolved = resolved.replace(/\{\{building_manager_phone\}\}/g, building.building_manager_phone || '');
      resolved = resolved.replace(/\{\{emergency_contact_name\}\}/g, building.emergency_contact_name || '');
      resolved = resolved.replace(/\{\{emergency_contact_phone\}\}/g, building.emergency_contact_phone || '');
    }

    // Leaseholder fields
    if (leaseholder) {
      resolved = resolved.replace(/\{\{leaseholder_name\}\}/g, leaseholder.name || '');
      resolved = resolved.replace(/\{\{leaseholder_email\}\}/g, leaseholder.email || '');
      resolved = resolved.replace(/\{\{unit_number\}\}/g, leaseholder.unit?.unit_number || '');
    }

    // Date fields
    resolved = resolved.replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('en-GB'));

    // Agency fields (placeholder)
    resolved = resolved.replace(/\{\{agency_name\}\}/g, 'BlocIQ Property Management');
    resolved = resolved.replace(/\{\{agency_contact\}\}/g, 'info@blociq.co.uk');

    return resolved;
  };

  const getPreviewContent = () => {
    if (!template || !selectedBuilding) return template?.content || '';
    
    const building = buildings.find(b => b.id === selectedBuilding);
    const sampleLeaseholder = leaseholders[0];
    
    return resolveMergeFields(template.content, building || null, sampleLeaseholder || null);
  };

  const handleSendCommunication = async () => {
    if (!template || !selectedBuilding || selectedLeaseholders.length === 0) {
      setError('Please select a building and at least one leaseholder');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const building = buildings.find(b => b.id === selectedBuilding);
      const selectedLeaseholderData = leaseholders.filter(l => selectedLeaseholders.includes(l.id));

      const communications = selectedLeaseholderData.map(leaseholder => ({
        type: template.type,
        subject: template.subject,
        content: resolveMergeFields(template.content, building || null, leaseholder),
        building_id: selectedBuilding,
        unit_id: leaseholder.unit?.id,
        leaseholder_id: leaseholder.id,
        template_id: template.id,
        send_method: sendMethod,
      }));

      const response = await fetch('/api/send-communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communications,
          sendMethod,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send communication');
      }

      const result = await response.json();
      
      if (sendMethod === 'letter' || sendMethod === 'both') {
        // Download PDF letters
        const letterResponse = await fetch('/api/generate-letters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            communications,
          }),
        });

        if (letterResponse.ok) {
          const blob = await letterResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `letters-${Date.now()}.zip`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }
      }

      router.push('/dashboard/communications');
    } catch (err: any) {
      console.error('Error sending communication:', err);
      setError(err.message || 'Failed to send communication');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadLetters = async () => {
    if (!template || !selectedBuilding || selectedLeaseholders.length === 0) {
      setError('Please select a building and at least one leaseholder');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const building = buildings.find(b => b.id === selectedBuilding);
      const selectedLeaseholderData = leaseholders.filter(l => selectedLeaseholders.includes(l.id));

      const communications = selectedLeaseholderData.map(leaseholder => ({
        type: template.type,
        subject: template.subject,
        content: resolveMergeFields(template.content, building || null, leaseholder),
        building_id: selectedBuilding,
        unit_id: leaseholder.unit?.id,
        leaseholder_id: leaseholder.id,
        template_id: template.id,
        send_method: 'letter',
      }));

      const response = await fetch('/api/generate-letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate letters');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `letters-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error generating letters:', err);
      setError(err.message || 'Failed to generate letters');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!template || !selectedBuilding || !draftPurpose.trim()) {
      setError('Please select a building and enter a purpose for the draft');
      return;
    }

    setGeneratingDraft(true);
    setError(null);

    try {
      const building = buildings.find(b => b.id === selectedBuilding);
      if (!building) {
        throw new Error('Building not found');
      }

      // Map category to relevant tags
      const categoryToTags: Record<string, string[]> = {
        'maintenance': ['Maintenance'],
        'service_charge': ['Financial'],
        'emergency': ['Emergency', 'Urgent'],
        'complaint': ['Leaseholder'],
        'general': ['General'],
        'reminder': ['Routine'],
        'update': ['General']
      };

      const tags = categoryToTags[draftCategory] || [];

      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: template.name,
          buildingName: building.name,
          leaseholderCount: selectedLeaseholders.length || leaseholders.length,
          category: draftCategory,
          purpose: draftPurpose,
          tags: tags,
          buildingType: building.construction_type || undefined,
          buildingAge: building.building_age || undefined,
          specialFeatures: [
            building.lift_available && 'Lift Available',
            building.heating_type && `Heating: ${building.heating_type}`,
            building.hot_water_type && `Hot Water: ${building.hot_water_type}`,
            building.total_floors && `${building.total_floors} Floors`,
            building.parking_info && 'Parking Available'
          ].filter(Boolean) as string[],
          complianceIssues: [
            building.fire_safety_status && `Fire Safety: ${building.fire_safety_status}`,
            building.asbestos_status && `Asbestos: ${building.asbestos_status}`,
            building.energy_rating && `Energy Rating: ${building.energy_rating}`
          ].filter(Boolean) as string[],
          maintenanceHistory: building.building_insurance_expiry ? `Insurance expires: ${new Date(building.building_insurance_expiry).toLocaleDateString()}` : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate draft');
      }

      const result = await response.json();
      
      if (result.success && result.content) {
        // Update the template content with the AI-generated draft
        setTemplate(prev => prev ? {
          ...prev,
          content: result.content
        } : null);
        
        // Clear the purpose field
        setDraftPurpose('');
      } else {
        throw new Error('No content generated');
      }
    } catch (err: any) {
      console.error('Error generating draft:', err);
      setError(err.message || 'Failed to generate draft');
    } finally {
      setGeneratingDraft(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/communications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Compose Message</h1>
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/communications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-destructive mb-2">Error Loading Template</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button asChild>
                <Link href="/dashboard/communications">Back to Templates</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/communications">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Compose Message</h1>
          <p className="text-muted-foreground">
            Send "{template?.name}" to selected leaseholders
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {template?.type === 'email' ? <Mail className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                Template Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Template Name</Label>
                <p className="text-sm text-muted-foreground">{template?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Type</Label>
                <p className="text-sm text-muted-foreground capitalize">{template?.type}</p>
              </div>
              {template?.subject && (
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <p className="text-sm text-muted-foreground">{template.subject}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Draft Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Draft Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="draft-category" className="text-sm font-medium">Category</Label>
                <Select 
                  id="draft-category"
                  value={draftCategory} 
                  onChange={(e) => setDraftCategory(e.target.value)}
                >
                  <option value="general">General Communication</option>
                  <option value="maintenance">Maintenance Notice</option>
                  <option value="service_charge">Service Charge</option>
                  <option value="emergency">Emergency Notice</option>
                  <option value="reminder">Reminder</option>
                  <option value="update">Update</option>
                  <option value="complaint">Complaint Response</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="draft-purpose" className="text-sm font-medium">Purpose</Label>
                <Textarea
                  id="draft-purpose"
                  placeholder="e.g., inform leaseholders about overdue service charges, notify about upcoming maintenance work, etc."
                  value={draftPurpose}
                  onChange={(e) => setDraftPurpose(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleGenerateDraft}
                disabled={generatingDraft || !selectedBuilding || !draftPurpose.trim()}
                className="w-full"
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingDraft ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    Generating Draft...
                  </>
                ) : (
                  '💡 Generate Draft'
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                <p>AI will generate a professional message based on your purpose and automatically include appropriate merge tags.</p>
              </div>
            </CardContent>
          </Card>

          {/* Building Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Select Building
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="building">Building *</Label>
                <Select 
                  id="building"
                  value={selectedBuilding} 
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  <option value="">Select a building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Leaseholder Selection */}
          {selectedBuilding && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Leaseholders ({selectedLeaseholders.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Leaseholders</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedLeaseholders.length === leaseholders.length) {
                          setSelectedLeaseholders([]);
                        } else {
                          setSelectedLeaseholders(leaseholders.map(l => l.id));
                        }
                      }}
                    >
                      {selectedLeaseholders.length === leaseholders.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {leaseholders.map((leaseholder) => (
                      <label key={leaseholder.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLeaseholders.includes(leaseholder.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeaseholders(prev => [...prev, leaseholder.id]);
                            } else {
                              setSelectedLeaseholders(prev => prev.filter(id => id !== leaseholder.id));
                            }
                          }}
                          className="rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{leaseholder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Unit {leaseholder.unit?.unit_number} • {leaseholder.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Send Method */}
          <Card>
            <CardHeader>
              <CardTitle>Send Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>How would you like to send this communication?</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="email"
                      checked={sendMethod === 'email'}
                      onChange={(e) => setSendMethod(e.target.value as 'email')}
                      className="rounded"
                    />
                    <span className="text-sm">Email only</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="letter"
                      checked={sendMethod === 'letter'}
                      onChange={(e) => setSendMethod(e.target.value as 'letter')}
                      className="rounded"
                    />
                    <span className="text-sm">Letter only (PDF)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      value="both"
                      checked={sendMethod === 'both'}
                      onChange={(e) => setSendMethod(e.target.value as 'both')}
                      className="rounded"
                    />
                    <span className="text-sm">Both email and letter</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card>
              <CardContent className="p-4">
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSendCommunication}
              disabled={sending || !selectedBuilding || selectedLeaseholders.length === 0}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Communication'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleDownloadLetters}
              disabled={sending || !selectedBuilding || selectedLeaseholders.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Letters
            </Button>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {showPreview ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  Message Preview
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showPreview ? (
                <div className="space-y-4">
                  {template?.subject && (
                    <div>
                      <Label className="text-sm font-medium">Subject</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedBuilding 
                          ? resolveMergeFields(template.subject, buildings.find(b => b.id === selectedBuilding) || null, null)
                          : template.subject
                        }
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Content</Label>
                    <div className="mt-2 p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                      {getPreviewContent()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Merge fields will be replaced with actual data for each leaseholder.</p>
                    {selectedLeaseholders.length > 0 && (
                      <p>This message will be sent to {selectedLeaseholders.length} leaseholder{selectedLeaseholders.length > 1 ? 's' : ''}.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <EyeOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Preview hidden</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 