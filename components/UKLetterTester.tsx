"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function UKLetterTester() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [formData, setFormData] = useState({
    recipient_name: 'John Smith',
    letter_body: 'Thank you for your recent enquiry regarding the service charge increase at Ashwood House. I am writing to provide you with a detailed explanation of the changes and address any concerns you may have.\n\nThe increase of 8.5% is necessary due to rising utility costs and essential maintenance work required on the building\'s heating system. This work will ensure continued comfort for all residents and maintain the building\'s value.\n\nPlease do not hesitate to contact me if you require any clarification or have additional questions.',
    unit_number: '7',
    building_name: 'Ashwood House',
    building_address_line1: '123 High Street',
    building_city: 'London',
    building_postcode: 'SW1A 1AA',
    property_manager_name: 'Ellie Oxley',
    today_date: new Date().toISOString().split('T')[0]
  });

  const handleTestLetter = async () => {
    setLoading(true);
    setResult('');

    try {
      // This is a mock test since we don't have a real template ID
      // In a real scenario, you would use an actual template from the database
      const mockResponse = {
        success: true,
        formattedData: {
          today_date: formatUKDate(formData.today_date),
          address_block: generateAddressBlock(formData),
          recipient_name: formData.recipient_name,
          letter_body: formData.letter_body,
          sign_off: determineSignOff(formData)
        }
      };

      setResult(JSON.stringify(mockResponse, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (copied from replacePlaceholders.ts for demonstration)
  function formatUKDate(dateString: string): string {
    const date = new Date(dateString);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function generateAddressBlock(data: Record<string, string>): string {
    const addressParts = [];
    
    if (data.unit_number) {
      addressParts.push(`Flat ${data.unit_number}`);
    }
    if (data.building_name) {
      addressParts.push(data.building_name);
    }
    if (data.building_address_line1) {
      addressParts.push(data.building_address_line1);
    }
    if (data.building_city) {
      addressParts.push(data.building_city);
    }
    if (data.building_postcode) {
      addressParts.push(data.building_postcode);
    }
    
    return addressParts.join('\n');
  }

  function determineSignOff(data: Record<string, string>): string {
    const recipientName = data.recipient_name || '';
    const isGenericRecipient = !recipientName || 
      recipientName.toLowerCase().includes('sir') || 
      recipientName.toLowerCase().includes('madam') ||
      recipientName.toLowerCase().includes('occupier');
    
    const signOff = isGenericRecipient ? 'Yours faithfully,' : 'Yours sincerely,';
    const managerName = data.property_manager_name || 'Property Manager';
    
    return `${signOff}\n\n${managerName}\nBlocIQ Property Management`;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🇬🇧 UK Letter Formatting Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Recipient Name</Label>
              <Input
                value={formData.recipient_name}
                onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label>Unit Number</Label>
              <Input
                value={formData.unit_number}
                onChange={(e) => handleInputChange('unit_number', e.target.value)}
                placeholder="7"
              />
            </div>
            <div>
              <Label>Building Name</Label>
              <Input
                value={formData.building_name}
                onChange={(e) => handleInputChange('building_name', e.target.value)}
                placeholder="Ashwood House"
              />
            </div>
            <div>
              <Label>Address Line 1</Label>
              <Input
                value={formData.building_address_line1}
                onChange={(e) => handleInputChange('building_address_line1', e.target.value)}
                placeholder="123 High Street"
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={formData.building_city}
                onChange={(e) => handleInputChange('building_city', e.target.value)}
                placeholder="London"
              />
            </div>
            <div>
              <Label>Postcode</Label>
              <Input
                value={formData.building_postcode}
                onChange={(e) => handleInputChange('building_postcode', e.target.value)}
                placeholder="SW1A 1AA"
              />
            </div>
            <div>
              <Label>Property Manager</Label>
              <Input
                value={formData.property_manager_name}
                onChange={(e) => handleInputChange('property_manager_name', e.target.value)}
                placeholder="Ellie Oxley"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.today_date}
                onChange={(e) => handleInputChange('today_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Letter Body</Label>
            <Textarea
              value={formData.letter_body}
              onChange={(e) => handleInputChange('letter_body', e.target.value)}
              placeholder="Enter the main content of your letter..."
              rows={6}
            />
          </div>

          <Button 
            onClick={handleTestLetter} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Processing...' : 'Test UK Letter Formatting'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>📄 Formatted Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Generated Letter Preview:</h3>
              <div className="whitespace-pre-wrap font-mono text-sm">
                {formatUKDate(formData.today_date)}

                {generateAddressBlock(formData)}

                Dear {formData.recipient_name},

                {formData.letter_body}

                {determineSignOff(formData)}
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold mb-2">JSON Data:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                {result}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>📋 UK Letter Formatting Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><strong>✅ Date Format:</strong> 19 July 2025 (no comma)</div>
          <div><strong>✅ Address Block:</strong> Left-aligned, above salutation</div>
          <div><strong>✅ Body Formatting:</strong> Left-aligned, 1.15 spacing, no indentation</div>
          <div><strong>✅ Sign-Off Logic:</strong> &quot;Yours sincerely,&quot; for known recipients, &quot;Yours faithfully,&quot; for generic</div>
          <div><strong>✅ Professional Footer:</strong> Property manager name + &quot;BlocIQ Property Management&quot;</div>
        </CardContent>
      </Card>
    </div>
  );
} 