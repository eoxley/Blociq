'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import AskBlocIQ from '@/components/AskBlocIQ';
import AskBlocIQModal from '@/components/AskBlocIQModal';

export default function TestMajorWorksHubPage() {
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [isAskBlocIQOpen, setIsAskBlocIQOpen] = useState(false);

  const testProjects = [
    { id: '1', name: 'Roof Replacement Project' },
    { id: '2', name: 'Lift Modernization' },
    { id: '3', name: 'Fire Safety Upgrade' },
  ];

  const simulateProjectContext = (projectId: string) => {
    setCurrentProjectId(projectId);
    toast.success(`Switched to project context: ${projectId}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">🏗️ Ask BlocIQ Hub - Major Works Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Context Simulator */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Project Context Simulator</h2>
          <div className="space-y-2">
            {testProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => simulateProjectContext(project.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentProjectId === project.id
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-sm text-gray-600">ID: {project.id}</div>
              </button>
            ))}
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">ℹ️ How to Test</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Select a project to simulate Major Works context</li>
              <li>• Ask questions about the selected project</li>
              <li>• Look for the "Live major works data used" badge</li>
              <li>• Try the smart prompts in the sidebar</li>
            </ul>
          </div>
        </div>

        {/* Ask BlocIQ Hub */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Ask BlocIQ Hub</h2>
          <div className="space-y-4">
            <button
              onClick={() => setIsAskBlocIQOpen(true)}
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium text-lg"
            >
              🚀 Open Ask BlocIQ
            </button>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Quick Start</h3>
              <p className="text-sm text-blue-700">
                Click the button above to open Ask BlocIQ in a modal popout. You can ask questions about major works projects, 
                upload documents, and get AI-powered assistance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">✅ Features to Test</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• <strong>Context Detection:</strong> Automatically detects Major Works pages</li>
          <li>• <strong>Smart Prompts:</strong> Section 20 notices, project summaries</li>
          <li>• <strong>Live Data Badge:</strong> Shows when Major Works data is used</li>
          <li>• <strong>Project-Specific:</strong> Gets detailed project information</li>
          <li>• <strong>Document Integration:</strong> References project documents</li>
        </ul>
      </div>

      {/* Ask BlocIQ Modal */}
      <AskBlocIQModal
        open={isAskBlocIQOpen}
        onClose={() => setIsAskBlocIQOpen(false)}
      >
        <AskBlocIQ
          buildingId="1"
          buildingName="Test Building"
          placeholder="Ask about major works projects..."
        />
      </AskBlocIQModal>
    </div>
  );
} 