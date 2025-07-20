'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MergeTagHelperProps {
  onInsertTag: (tag: string) => void;
  className?: string;
}

const mergeTags = [
  { tag: '{{building_name}}', label: 'Building Name', category: 'Building' },
  { tag: '{{building_address}}', label: 'Building Address', category: 'Building' },
  { tag: '{{leaseholder_name}}', label: 'Leaseholder Name', category: 'Person' },
  { tag: '{{leaseholder_email}}', label: 'Leaseholder Email', category: 'Person' },
  { tag: '{{unit_number}}', label: 'Unit Number', category: 'Unit' },
  { tag: '{{service_charge_amount}}', label: 'Service Charge', category: 'Financial' },
  { tag: '{{ground_rent_amount}}', label: 'Ground Rent', category: 'Financial' },
  { tag: '{{building_manager_name}}', label: 'Building Manager', category: 'Person' },
  { tag: '{{building_manager_email}}', label: 'Manager Email', category: 'Person' },
  { tag: '{{building_manager_phone}}', label: 'Manager Phone', category: 'Person' },
  { tag: '{{emergency_contact_name}}', label: 'Emergency Contact', category: 'Person' },
  { tag: '{{emergency_contact_phone}}', label: 'Emergency Phone', category: 'Person' },
  { tag: '{{current_date}}', label: 'Current Date', category: 'Date' },
  { tag: '{{agency_name}}', label: 'Agency Name', category: 'Agency' },
  { tag: '{{agency_contact}}', label: 'Agency Contact', category: 'Agency' },
];

const categories = ['Building', 'Person', 'Unit', 'Financial', 'Date', 'Agency'];

export default function MergeTagHelper({ onInsertTag, className = '' }: MergeTagHelperProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const filteredTags = selectedCategory === 'all' 
    ? mergeTags 
    : mergeTags.filter(tag => tag.category === selectedCategory);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Merge Tags</CardTitle>
        <p className="text-sm text-muted-foreground">
          Click any tag to insert it into your content
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <div 
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            <Badge variant={selectedCategory === 'all' ? 'default' : 'outline'}>
              All
            </Badge>
          </div>
          {categories.map(category => (
            <div
              key={category}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              <Badge variant={selectedCategory === category ? 'default' : 'outline'}>
                {category}
              </Badge>
            </div>
          ))}
        </div>

        {/* Tags Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredTags.map(({ tag, label, category }) => (
            <Button
              key={tag}
              variant="outline"
              size="sm"
              className="justify-start text-left h-auto p-2"
              onClick={() => onInsertTag(tag)}
            >
              <div className="flex flex-col items-start">
                <span className="font-mono text-xs text-blue-600">{tag}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            </Button>
          ))}
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-medium mb-1">How to use:</p>
          <ul className="space-y-1">
            <li>• Click any tag above to insert it into your content</li>
            <li>• Tags will be replaced with actual data when sending</li>
            <li>• Use {'{{current_date}}'} for today's date</li>
            <li>• Building-specific tags work when a building is selected</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 