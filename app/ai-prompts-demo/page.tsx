'use client'

import { useState } from 'react'
import { AIContextHandler } from '@/lib/ai-context-handler'
import { getPromptForContext } from '@/lib/ai-prompts'

export default function AIPromptsDemoPage() {
  const [selectedContext, setSelectedContext] = useState<'core' | 'doc_summary' | 'auto_polish' | 'complaints'>('core')
  const [userInput, setUserInput] = useState('')
  const [buildingContext, setBuildingContext] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')

  const contextExamples = {
    core: "What are the key compliance requirements for residential properties?",
    doc_summary: "Summarise this document",
    auto_polish: "Dear Mr. Smith, I hope this email finds you well. I am writing to inform you about the recent developments regarding the maintenance work that has been scheduled for your building. We have received several complaints from residents about the noise levels during the construction work, and I wanted to take this opportunity to address these concerns and provide you with a comprehensive update on the current situation and our plans moving forward.",
    complaints: "I want to raise a complaint about the ongoing noise from the construction work. It's been going on for weeks and no one is responding to my emails."
  }

  const generatePrompt = () => {
    const prompt = AIContextHandler.buildPrompt(
      selectedContext,
      userInput || contextExamples[selectedContext],
      buildingContext || undefined
    )
    setGeneratedPrompt(prompt)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          BlocIQ AI Prompts Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Context Selection</h2>
              
              <div className="space-y-3">
                {(['core', 'doc_summary', 'auto_polish', 'complaints'] as const).map((context) => (
                  <label key={context} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="context"
                      value={context}
                      checked={selectedContext === context}
                      onChange={(e) => setSelectedContext(e.target.value as any)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium capitalize">{context.replace('_', ' ')}</span>
                      <p className="text-sm text-gray-600">
                        {context === 'core' && 'General UK leasehold block management advice'}
                        {context === 'doc_summary' && 'Document analysis and summary generation'}
                        {context === 'auto_polish' && 'Email polishing and refinement'}
                        {context === 'complaints' && 'Complaints handling procedure'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">User Input</h2>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={contextExamples[selectedContext]}
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Building Context (Optional)</h2>
              <textarea
                value={buildingContext}
                onChange={(e) => setBuildingContext(e.target.value)}
                placeholder="Building name: Example Court&#10;Address: 123 Main Street&#10;Units: 25&#10;Status: HRB"
                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={generatePrompt}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Generate Prompt
            </button>
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Generated System Prompt</h2>
              {generatedPrompt && (
                <button
                  onClick={copyToClipboard}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Copy to Clipboard
                </button>
              )}
            </div>
            
            {generatedPrompt ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {generatedPrompt}
                </pre>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                <p>Select a context and click "Generate Prompt" to see the system prompt</p>
              </div>
            )}
          </div>
        </div>

        {/* Context Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Context Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Core Context</h3>
              <p className="text-sm text-gray-600 mb-2">
                General UK leasehold block management advice following RICS and TPI standards.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Identifies demised vs common parts</li>
                <li>• Flags Section 20 consultation requirements</li>
                <li>• Explains FTT routes for disputes</li>
                <li>• References CHP and redress schemes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Document Summary</h3>
              <p className="text-sm text-gray-600 mb-2">
                Analyzes uploaded documents and extracts key information.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Detects document type automatically</li>
                <li>• Extracts compliance dates and actions</li>
                <li>• Flags governance requirements</li>
                <li>• Outputs structured JSON data</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Auto-Polish</h3>
              <p className="text-sm text-gray-600 mb-2">
                Refines long emails to be more concise and professional.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Reduces word count while keeping facts</li>
                <li>• Uses active voice and short sentences</li>
                <li>• Maintains UK English style</li>
                <li>• Includes proper formatting</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Complaints Handling</h3>
              <p className="text-sm text-gray-600 mb-2">
                Follows RICS CHP and government redress schemes.
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Generates resident-facing replies</li>
                <li>• Creates internal log entries</li>
                <li>• Tracks escalation timelines</li>
                <li>• Signposts to PRS/TPO when needed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
