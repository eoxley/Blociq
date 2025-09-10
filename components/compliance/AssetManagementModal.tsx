'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Settings, Plus, Building2, Shield, Zap, Flame, Wrench, AlertTriangle, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceTemplate {
  id: string;
  asset_type: string;
  asset_name: string;
  category: string;
  description: string;
  default_frequency: string;
  is_required_by_default: boolean;
  is_hrb_only: boolean;
  priority: string;
}

interface ComplianceAsset {
  id: string;
  building_id: string;
  user_id: string;
  asset_type: string;
  asset_name: string;
  category: string;
  description: string;
  status: string;
  next_due_date: string;
  last_inspection_date: string;
  inspection_frequency: string;
  is_hrb_only: boolean;
  is_required: boolean;
  priority: string;
}

interface Building {
  id: string;
  name: string;
  is_hrb?: boolean;
}

interface AssetManagementModalProps {
  building: Building;
  isOpen: boolean;
  onClose: () => void;
  onAssetsUpdated: () => void;
}

const CATEGORY_ICONS = {
  fire_safety: <Flame className="h-4 w-4 text-red-500" />,
  electrical: <Zap className="h-4 w-4 text-yellow-500" />,
  gas: <Flame className="h-4 w-4 text-orange-500" />,
  building_safety: <Shield className="h-4 w-4 text-blue-500" />,
  health_safety: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  structural: <Building2 className="h-4 w-4 text-gray-500" />,
  general: <Wrench className="h-4 w-4 text-green-500" />
};

const CATEGORY_COLORS = {
  fire_safety: 'bg-red-50 border-red-200 text-red-800',
  electrical: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  gas: 'bg-orange-50 border-orange-200 text-orange-800',
  building_safety: 'bg-blue-50 border-blue-200 text-blue-800',
  health_safety: 'bg-amber-50 border-amber-200 text-amber-800',
  structural: 'bg-gray-50 border-gray-200 text-gray-800',
  general: 'bg-green-50 border-green-200 text-green-800'
};

export default function AssetManagementModal({ building, isOpen, onClose, onAssetsUpdated }: AssetManagementModalProps) {
  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [currentAssets, setCurrentAssets] = useState<ComplianceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('configure');
  const [removingAssets, setRemovingAssets] = useState<Set<string>>(new Set());
  const [customAsset, setCustomAsset] = useState({
    asset_name: '',
    category: 'general',
    description: '',
    inspection_frequency: 'annual',
    is_required: true,
    priority: 'medium'
  });

  // Load compliance templates and current assets
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadCurrentAssets();
    }
  }, [isOpen, building.id]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/compliance/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadCurrentAssets = async () => {
    try {
      const response = await fetch(`/api/buildings/${building.id}/compliance`);
      if (response.ok) {
        const data = await response.json();
        setCurrentAssets(data.data.assets || []);
      }
    } catch (error) {
      console.error('Failed to load current assets:', error);
    }
  };

  const toggleAsset = async (template: ComplianceTemplate, isEnabled: boolean) => {
    setIsLoading(true);
    try {
      if (isEnabled) {
        // Add asset to building
        const response = await fetch('/api/compliance/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            building_id: building.id,
            asset_type: template.asset_type,
            asset_name: template.asset_name,
            category: template.category,
            description: template.description,
            inspection_frequency: template.default_frequency,
            is_required: template.is_required_by_default,
            priority: template.priority,
            is_hrb_only: template.is_hrb_only
          })
        });

        if (response.ok) {
          toast.success(`${template.asset_name} added to ${building.name}`);
          await loadCurrentAssets();
          onAssetsUpdated();
        } else {
          throw new Error('Failed to add asset');
        }
      } else {
        // Remove asset from building
        const asset = currentAssets.find(a => a.asset_type === template.asset_type);
        if (asset) {
          const response = await fetch('/api/compliance/assets', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: asset.id })
          });

          if (response.ok) {
            toast.success(`${template.asset_name} removed from ${building.name}`);
            await loadCurrentAssets();
            onAssetsUpdated();
          } else {
            throw new Error('Failed to remove asset');
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle asset:', error);
      toast.error('Failed to update asset configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomAsset = async () => {
    if (!customAsset.asset_name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/compliance/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: building.id,
          asset_type: `custom_${Date.now()}`,
          asset_name: customAsset.asset_name,
          category: customAsset.category,
          description: customAsset.description,
          inspection_frequency: customAsset.inspection_frequency,
          is_required: customAsset.is_required,
          priority: customAsset.priority,
          is_hrb_only: false
        })
      });

      if (response.ok) {
        toast.success(`Custom asset "${customAsset.asset_name}" added`);
        setCustomAsset({
          asset_name: '',
          category: 'general',
          description: '',
          inspection_frequency: 'annual',
          is_required: true,
          priority: 'medium'
        });
        await loadCurrentAssets();
        onAssetsUpdated();
      } else {
        throw new Error('Failed to add custom asset');
      }
    } catch (error) {
      console.error('Failed to add custom asset:', error);
      toast.error('Failed to add custom asset');
    } finally {
      setIsLoading(false);
    }
  };

  const removeAsset = async (assetId: string) => {
    setRemovingAssets(prev => new Set([...prev, assetId]));
    
    try {
      const response = await fetch('/api/compliance/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId })
      });

      if (response.ok) {
        toast.success('Asset removed successfully');
        await loadCurrentAssets();
        onAssetsUpdated();
      } else {
        throw new Error('Failed to remove asset');
      }
    } catch (error) {
      console.error('Failed to remove asset:', error);
      toast.error('Failed to remove asset');
    } finally {
      setRemovingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(assetId);
        return newSet;
      });
    }
  };

  const isAssetEnabled = (template: ComplianceTemplate) => {
    return currentAssets.some(asset => asset.asset_type === template.asset_type);
  };

  const getAssetStatus = (asset: ComplianceAsset) => {
    if (!asset.next_due_date) return { status: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4" />, color: 'text-gray-500' };
    
    const dueDate = new Date(asset.next_due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return { status: 'overdue', label: 'Overdue', icon: <XCircle className="h-4 w-4" />, color: 'text-red-500' };
    if (daysUntilDue <= 30) return { status: 'due_soon', label: 'Due Soon', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-500' };
    return { status: 'compliant', label: 'Compliant', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' };
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, ComplianceTemplate[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Compliance Asset Management - {building.name}
          </DialogTitle>
          <DialogDescription>
            Configure which compliance assets are required for this building. 
            {building.is_hrb && (
              <span className="block mt-2 text-amber-600 font-medium">
                🏢 This is a High Risk Building (HRB) - Building Safety Act requirements will be auto-enabled
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configure">Configure Assets</TabsTrigger>
            <TabsTrigger value="current">Current Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-6">
            {/* Predefined Assets */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Predefined Compliance Assets</h3>
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <AccordionItem key={category} value={category} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3">
                        {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
                        <span className="capitalize">{category.replace('_', ' ')}</span>
                        <Badge variant="outline" className={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}>
                          {categoryTemplates.length} assets
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {categoryTemplates.map((template) => {
                          const isEnabled = isAssetEnabled(template);
                          const isRequired = template.is_hrb_only && building.is_hrb;
                          
                          return (
                            <Card key={template.id} className="border-l-4 border-l-blue-500">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-medium">{template.asset_name}</h4>
                                      {template.is_hrb_only && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                          HRB Only
                                        </Badge>
                                      )}
                                      {template.is_required_by_default && (
                                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                                          Required
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <span>Frequency: {template.default_frequency}</span>
                                      <span>Priority: {template.priority}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {isRequired && (
                                      <Badge variant="outline" className="text-amber-600">
                                        Auto-enabled (HRB)
                                      </Badge>
                                    )}
                                    <Switch
                                      checked={isEnabled || isRequired}
                                      onCheckedChange={(checked) => !isRequired && toggleAsset(template, checked)}
                                      disabled={isRequired || isLoading}
                                    />
                                    <Label className="text-sm">
                                      {isRequired ? 'Required' : isEnabled ? 'Enabled' : 'Disabled'}
                                    </Label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Custom Asset Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Custom Asset
                </CardTitle>
                <CardDescription>
                  Create a building-specific compliance requirement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="asset-name">Asset Name</Label>
                    <Input
                      id="asset-name"
                      value={customAsset.asset_name}
                      onChange={(e) => setCustomAsset(prev => ({ ...prev, asset_name: e.target.value }))}
                      placeholder="e.g., Custom Fire Door Inspection"
                    />
                  </div>
                  <div>
                    <Label htmlFor="asset-category">Category</Label>
                    <Select value={customAsset.category} onValueChange={(value) => setCustomAsset(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fire_safety">Fire Safety</SelectItem>
                        <SelectItem value="electrical">Electrical</SelectItem>
                        <SelectItem value="gas">Gas</SelectItem>
                        <SelectItem value="building_safety">Building Safety</SelectItem>
                        <SelectItem value="health_safety">Health & Safety</SelectItem>
                        <SelectItem value="structural">Structural</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="asset-description">Description</Label>
                  <Textarea
                    id="asset-description"
                    value={customAsset.description}
                    onChange={(e) => setCustomAsset(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the compliance requirement..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="asset-frequency">Inspection Frequency</Label>
                    <Select value={customAsset.inspection_frequency} onValueChange={(value) => setCustomAsset(prev => ({ ...prev, inspection_frequency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="biannual">Bi-annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="quinquennial">5-Yearly</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="asset-priority">Priority</Label>
                    <Select value={customAsset.priority} onValueChange={(value) => setCustomAsset(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="asset-required"
                      checked={customAsset.is_required}
                      onCheckedChange={(checked) => setCustomAsset(prev => ({ ...prev, is_required: checked }))}
                    />
                    <Label htmlFor="asset-required">Required by default</Label>
                  </div>
                </div>

                <Button onClick={addCustomAsset} disabled={isLoading || !customAsset.asset_name.trim()}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Add Custom Asset
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="current" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Currently Configured Assets</h3>
              <Badge variant="outline">
                {currentAssets.length} assets configured
              </Badge>
            </div>

            {currentAssets.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Assets Configured</h4>
                  <p className="text-gray-600 mb-4">
                    This building doesn't have any compliance assets configured yet.
                  </p>
                  <Button onClick={() => setActiveTab('configure')}>
                    Configure Assets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {currentAssets.map((asset) => {
                  const status = getAssetStatus(asset);
                  return (
                    <Card key={asset.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{asset.asset_name}</h4>
                              <Badge variant="outline" className={CATEGORY_COLORS[asset.category as keyof typeof CATEGORY_COLORS]}>
                                {asset.category.replace('_', ' ')}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                                {asset.inspection_frequency}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Priority: {asset.priority}</span>
                              {asset.next_due_date && (
                                <span>Next Due: {new Date(asset.next_due_date).toLocaleDateString()}</span>
                              )}
                              {asset.last_inspection_date && (
                                <span>Last Inspection: {new Date(asset.last_inspection_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 ${status.color}`}>
                              {status.icon}
                              <span className="text-sm font-medium">{status.label}</span>
                            </div>
                            <button
                              onClick={() => removeAsset(asset.id)}
                              disabled={removingAssets.has(asset.id)}
                              className="ml-2 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove asset"
                            >
                              {removingAssets.has(asset.id) ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => setActiveTab('configure')}>
            Configure More Assets
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
