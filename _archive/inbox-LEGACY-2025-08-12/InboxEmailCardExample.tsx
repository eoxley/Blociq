import React, { useState } from 'react';
import InboxEmailCard from './InboxEmailCard';

// Example email data
const exampleEmails = [
  {
    id: '1',
    subject: 'Urgent: Building Maintenance Required',
    from_name: 'John Smith',
    from_email: 'john.smith@example.com',
    received_at: new Date().toISOString(),
    body_preview: 'We need to schedule urgent maintenance for the HVAC system. Please respond as soon as possible.',
    unread: true,
    handled: false,
    filed: false,
    outlook_id: 'outlook-123',
    buildings: { name: 'Ashwood House' },
    priority: 'high' as const,
    flagged: true,
    starred: false,
    tags: ['maintenance', 'urgent']
  },
  {
    id: '2',
    subject: 'Monthly Compliance Report',
    from_name: 'Sarah Johnson',
    from_email: 'sarah.johnson@example.com',
    received_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    body_preview: 'Please find attached the monthly compliance report for all properties. All items are up to date.',
    unread: false,
    handled: true,
    filed: false,
    outlook_id: 'outlook-456',
    buildings: { name: 'Maple Court' },
    priority: 'medium' as const,
    flagged: false,
    starred: true,
    tags: ['compliance', 'report']
  },
  {
    id: '3',
    subject: 'General Inquiry',
    from_name: 'Mike Wilson',
    from_email: 'mike.wilson@example.com',
    received_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    body_preview: 'I have a general question about the property management services. Could you please provide more information?',
    unread: false,
    handled: false,
    filed: true,
    outlook_id: 'outlook-789',
    buildings: { name: 'Oak Gardens' },
    priority: 'low' as const,
    flagged: false,
    starred: false,
    tags: ['inquiry']
  }
];

export default function InboxEmailCardExample() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  const [showActions, setShowActions] = useState(true);

  const handleEmailUpdated = () => {
    console.log('Email list should be refreshed');
    // In a real app, this would trigger a refresh of the email list
  };

  const handleEmailSelect = (email: any) => {
    setSelectedEmail(email.id);
    console.log('Selected email:', email);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">InboxEmailCard Examples</h1>
        <p className="text-gray-600 mb-6">
          This demonstrates the enhanced InboxEmailCard component with different configurations and features.
        </p>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">View Mode:</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as 'full' | 'compact')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="full">Full</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Show Actions:</label>
            <input 
              type="checkbox" 
              checked={showActions} 
              onChange={(e) => setShowActions(e.target.checked)}
              className="rounded"
            />
          </div>

          <div className="text-sm text-gray-500">
            Selected: {selectedEmail || 'None'}
          </div>
        </div>

        {/* Email Cards */}
        <div className="space-y-4">
          {exampleEmails.map((email) => (
            <InboxEmailCard
              key={email.id}
              email={email}
              onEmailUpdated={handleEmailUpdated}
              onSelect={handleEmailSelect}
              isSelected={selectedEmail === email.id}
              showActions={showActions}
              compact={viewMode === 'compact'}
              showBuildingInfo={true}
            />
          ))}
        </div>

        {/* Features Demo */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Features Demonstrated:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">Visual Features:</h3>
              <ul className="space-y-1">
                <li>• Priority indicators (🔴🟡🟢)</li>
                <li>• Star and flag status</li>
                <li>• Unread indicators</li>
                <li>• Building association</li>
                <li>• Tags display</li>
                <li>• Status badges (Handled, Filed)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Interactive Features:</h3>
              <ul className="space-y-1">
                <li>• Click to select</li>
                <li>• Keyboard navigation</li>
                <li>• Star/Unstar emails</li>
                <li>• Flag/Unflag emails</li>
                <li>• File emails</li>
                <li>• More actions dropdown</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Keyboard Shortcuts:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-600">
            <div>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-200 rounded">Space</kbd> - Select email</div>
            <div>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+F</kbd> - File email</div>
            <div>• <kbd className="px-1 py-0.5 bg-gray-200 rounded">Ctrl+S</kbd> - Star/Unstar email</div>
          </div>
        </div>
      </div>
    </div>
  );
} 