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
import { 
  Loader2, 
  Settings, 
  Plus, 
  Building2, 
  Shield, 
  Zap, 
  Flame, 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Save,
  RefreshCw,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface ComplianceAsset {
  id: string;
  name: string;
  description: string;
  frequency: string;
  required: boolean;
  hrb_only?: boolean;
  custom?: boolean;
  due_date?: string;
}

interface Building {
  id: string;
  name: string;
  is_hrb?: boolean;
  floors?: number;
}

interface ComplianceAssetManagerProps {
  building: Building;
  onAssetsUpdated: () => void;
}

const CATEGORY_ICONS = {
  fire_safety: <Flame className="h-5 w-5 text-red-500" />,
  electrical: <Zap className="h-5 w-5 text-yellow-500" />,
  gas: <Flame className="h-5 w-5 text-orange-500" />,
  structural: <Building2 className="h-5 w-5 text-gray-500" />,
  environmental: <Wrench className="h-5 w-5 text-green-500" />,
  building_safety: <Shield className="h-5 w-5 text-blue-500" />
};

const CATEGORY_COLORS = {
  fire_safety: 'bg-red-50 border-red-200 text-red-800',
  electrical: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  gas: 'bg-orange-50 border-orange-200 text-orange-800',
  structural: 'bg-gray-50 border-gray-200 text-gray-800',
  environmental: 'bg-green-50 border-green-200 text-green-800',
  building_safety: 'bg-blue-50 border-blue-200 text-blue-800'
};

const CATEGORY_NAMES = {
  fire_safety: 'Fire Safety',
  electrical: 'Electrical',
  gas: 'Gas Safety',
  structural: 'Structural',
  environmental: 'Environmental',
  building_safety: 'Building Safety Act'
};

// Predefined compliance assets by category
const COMPLIANCE_ASSETS = {
  fire_safety: [
    {
      id: 'fire_alarm_system',
      name: 'Fire Alarm System',
      description: 'Annual inspection and testing of fire alarm system',
      frequency: 'annual',
      required: true
    },
    {
      id: 'emergency_lighting',
      name: 'Emergency Lighting',
      description: 'Monthly testing of emergency lighting systems',
      frequency: 'monthly',
      required: true
    },
    {
      id: 'fire_extinguishers',
      name: 'Fire Extinguishers',
      description: 'Annual service and inspection of fire extinguishers',
      frequency: 'annual',
      required: true
    },
    {
      id: 'fire_door_inspection',
      name: 'Fire Door Inspection',
      description: 'Annual inspection of fire doors and seals',
      frequency: 'annual',
      required: true
    }
  ],
  electrical: [
    {
      id: 'electrical_installation',
      name: 'Electrical Installation Condition Report (EICR)',
      description: 'Comprehensive electrical safety inspection',
      frequency: 'quinquennial',
      required: true
    },
    {
      id: 'portable_appliance_testing',
      name: 'Portable Appliance Testing (PAT)',
      description: 'Testing of portable electrical appliances',
      frequency: 'annual',
      required: false
    }
  ],
  gas: [
    {
      id: 'gas_safety_check',
      name: 'Gas Safety Check',
      description: 'Annual gas appliance safety inspection',
      frequency: 'annual',
      required: true
    },
    {
      id: 'boiler_service',
      name: 'Boiler Service',
      description: 'Annual boiler service and maintenance',
      frequency: 'annual',
      required: true
    }
  ],
  structural: [
    {
      id: 'structural_survey',
      name: 'Structural Survey',
      description: 'Comprehensive structural condition assessment',
      frequency: 'quinquennial',
      required: false
    },
    {
      id: 'facade_inspection',
      name: 'Facade Inspection',
      description: 'External building facade safety inspection',
      frequency: 'annual',
      required: false
    }
  ],
  environmental: [
    {
      id: 'asbestos_survey',
      name: 'Asbestos Management Survey',
      description: 'Asbestos presence and condition assessment',
      frequency: 'triennial',
      required: false
    },
    {
      id: 'legionella_risk_assessment',
      name: 'Legionella Risk Assessment',
      description: 'Water system legionella risk evaluation',
      frequency: 'biennial',
      required: true
    }
  ],
  building_safety: [
    {
      id: 'building_safety_case',
      name: 'Building Safety Case',
      description: 'Comprehensive building safety case for HRB',
      frequency: 'ongoing',
      required: false,
      hrb_only: true
    },
    {
      id: 'golden_thread',
      name: 'Golden Thread Documentation',
      description: 'Maintenance of golden thread information',
      frequency: 'ongoing',
      required: false,
      hrb_only: true
    }
  ]
};

export default function ComplianceAssetManager({ building, onAssetsUpdated }: ComplianceAssetManagerProps) {
  const [activeAssets, setActiveAssets] = useState<Set<string>>(new Set());
  const [isHRB, setIsHRB] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customAssetModalOpen, setCustomAssetModalOpen] = useState(false);
  const [removingAssets, setRemovingAssets] = useState<Set<string>>(new Set());
  const [customAsset, setCustomAsset] = useState({
    name: '',
    category: 'general',
    description: '',
    frequency: 'annual',
    due_date: ''
  });

  // Initialize component
  useEffect(() => {
    initializeComponent();
  }, [building]);

  const initializeComponent = () => {
    // Check if building is HRB (High Risk Building)
    const isHighRisk = building.is_hrb || (building.floors && building.floors >= 18);
    setIsHRB(isHighRisk);

    // Auto-enable Building Safety Act assets for HRB
    if (isHighRisk) {
      const hrbAssets = COMPLIANCE_ASSETS.building_safety
        .filter(asset => asset.hrb_only)
        .map(asset => asset.id);
      
      setActiveAssets(prev => new Set([...prev, ...hrbAssets]));
    }

    // Load saved configuration
    loadSavedConfiguration();
  };

  const loadSavedConfiguration = async () => {
    try {
      const response = await fetch(`/api/buildings/${building.id}/compliance`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.assets) {
          const assetIds = data.data.assets.map((asset: any) => asset.asset_type);
          setActiveAssets(new Set(assetIds));
        }
      }
    } catch (error) {
      console.error('Error loading compliance configuration:', error);
    }
  };

  const toggleAsset = async (assetId: string) => {
    const newActiveAssets = new Set(activeAssets);
    
    if (newActiveAssets.has(assetId)) {
      newActiveAssets.delete(assetId);
    } else {
      newActiveAssets.add(assetId);
    }
    
    setActiveAssets(newActiveAssets);
    
    // Auto-save configuration
    await saveConfiguration(newActiveAssets);
  };

  const removeAsset = async (assetId: string) => {
    setRemovingAssets(prev => new Set([...prev, assetId]));
    
    try {
      // Remove from active assets
      const newActiveAssets = new Set(activeAssets);
      newActiveAssets.delete(assetId);
      setActiveAssets(newActiveAssets);
      
      // Save configuration
      await saveConfiguration(newActiveAssets);
      
      toast.success('Asset removed successfully');
      onAssetsUpdated();
    } catch (error) {
      console.error('Error removing asset:', error);
      toast.error('Failed to remove asset');
    } finally {
      setRemovingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(assetId);
        return newSet;
      });
    }
  };

  const toggleAllAssets = async () => {
    const allAssets = Object.values(COMPLIANCE_ASSETS).flat();
    const shouldActivateAll = activeAssets.size < allAssets.length;
    
    let newActiveAssets: Set<string>;
    
    if (shouldActivateAll) {
      newActiveAssets = new Set(
        allAssets
          .filter(asset => !asset.hrb_only || isHRB)
          .map(asset => asset.id)
      );
    } else {
      newActiveAssets = new Set();
    }
    
    setActiveAssets(newActiveAssets);
    await saveConfiguration(newActiveAssets);
  };

  const saveConfiguration = async (assetsToSave: Set<string> = activeAssets) => {
    setIsLoading(true);
    try {
      const configuration = {
        building_id: building.id,
        active_assets: Array.from(assetsToSave),
        is_hrb: isHRB,
        updated_at: new Date().toISOString()
      };

      const response = await fetch('/api/compliance/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuration)
      });

      if (response.ok) {
        toast.success('Compliance configuration saved successfully');
        onAssetsUpdated();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save compliance configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customAsset.name.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setIsLoading(true);
    try {
      const newAsset = {
        id: `custom_${Date.now()}`,
        name: customAsset.name,
        description: customAsset.description,
        frequency: customAsset.frequency,
        required: false,
        custom: true,
        due_date: customAsset.due_date || undefined
      };

      // Add to the appropriate category
      if (!COMPLIANCE_ASSETS[customAsset.category as keyof typeof COMPLIANCE_ASSETS]) {
        COMPLIANCE_ASSETS[customAsset.category as keyof typeof COMPLIANCE_ASSETS] = [];
      }
      (COMPLIANCE_ASSETS[customAsset.category as keyof typeof COMPLIANCE_ASSETS] as ComplianceAsset[]).push(newAsset);

      // Activate the new asset
      const newActiveAssets = new Set(activeAssets);
      newActiveAssets.add(newAsset.id);
      setActiveAssets(newActiveAssets);

      // Save configuration
      await saveConfiguration(newActiveAssets);

      // Reset form and close modal
      setCustomAsset({
        name: '',
        category: 'general',
        description: '',
        frequency: 'annual',
        due_date: ''
      });
      setCustomAssetModalOpen(false);

      toast.success(`Custom asset "${newAsset.name}" added successfully`);
    } catch (error) {
      console.error('Error adding custom asset:', error);
      toast.error('Failed to add custom asset');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFrequency = (frequency: string) => {
    const frequencies: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      biannual: 'Bi-Annual',
      annual: 'Annual',
      biennial: 'Every 2 Years',
      triennial: 'Every 3 Years',
      quinquennial: 'Every 5 Years',
      ongoing: 'Ongoing'
    };
    return frequencies[frequency] || frequency;
  };

  const getAssetStatus = (asset: ComplianceAsset) => {
    if (asset.hrb_only && !isHRB) {
      return { status: 'disabled', label: 'HRB Only', icon: <AlertCircle className="h-4 w-4" />, color: 'text-gray-400' };
    }
    
    if (activeAssets.has(asset.id)) {
      return { status: 'active', label: 'Active', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-500' };
    }
    
    return { status: 'inactive', label: 'Inactive', icon: <Clock className="h-4 w-4" />, color: 'text-gray-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {building.name} - Compliance Assets
            </h1>
            <p className="text-gray-600">
              Manage compliance assets and requirements for this building
            </p>
          </div>
          
          {isHRB && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <h4 className="font-semibold text-amber-800">High Risk Building (HRB)</h4>
                  <p className="text-sm text-amber-700">
                    Building Safety Act requirements automatically enabled
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setCustomAssetModalOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Asset
        </Button>
        
        <Button onClick={toggleAllAssets} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Toggle All
        </Button>
        
        <Button onClick={() => saveConfiguration()} variant="outline" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Configuration
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(COMPLIANCE_ASSETS).map(([category, assets]) => (
          <Card key={category} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
                  <CardTitle className="text-lg">{CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES]}</CardTitle>
                </div>
                <Badge variant="outline" className={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}>
                  {assets.length} assets
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {assets.map((asset) => {
                const status = getAssetStatus(asset);
                const isDisabled = asset.hrb_only && !isHRB;
                
                return (
                  <div key={asset.id} className={`border rounded-lg p-4 transition-all ${
                    activeAssets.has(asset.id) 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 bg-white'
                  } ${isDisabled ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{asset.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{asset.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Frequency: {formatFrequency(asset.frequency)}</span>
                          <Badge variant="outline" className="text-xs">
                            {asset.required ? 'Required' : 'Optional'}
                          </Badge>
                          {asset.hrb_only && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                              HRB Only
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-4">
                        {isDisabled && (
                          <Badge variant="outline" className="text-amber-600">
                            HRB Only
                          </Badge>
                        )}
                        <Switch
                          checked={activeAssets.has(asset.id)}
                          onCheckedChange={() => !isDisabled && toggleAsset(asset.id)}
                          disabled={isDisabled}
                        />
                        <Label className="text-sm">
                          {status.label}
                        </Label>
                        {activeAssets.has(asset.id) && !isDisabled && (
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Asset Modal */}
      <Dialog open={customAssetModalOpen} onOpenChange={setCustomAssetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Asset</DialogTitle>
            <DialogDescription>
              Create a custom compliance asset for this building
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={addCustomAsset} className="space-y-4">
            <div>
              <Label htmlFor="asset-name">Asset Name</Label>
              <Input
                id="asset-name"
                value={customAsset.name}
                onChange={(e) => setCustomAsset(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Custom Fire Door Inspection"
                required
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
                  <SelectItem value="gas">Gas Safety</SelectItem>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="building_safety">Building Safety Act</SelectItem>
                </SelectContent>
              </Select>
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
            
            <div>
              <Label htmlFor="asset-frequency">Inspection Frequency</Label>
              <Select value={customAsset.frequency} onValueChange={(value) => setCustomAsset(prev => ({ ...prev, frequency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="biannual">Bi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="biennial">Every 2 Years</SelectItem>
                  <SelectItem value="triennial">Every 3 Years</SelectItem>
                  <SelectItem value="quinquennial">Every 5 Years</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="asset-due-date">Next Due Date (Optional)</Label>
              <Input
                id="asset-due-date"
                type="date"
                value={customAsset.due_date}
                onChange={(e) => setCustomAsset(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Asset
              </Button>
              <Button type="button" variant="outline" onClick={() => setCustomAssetModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
