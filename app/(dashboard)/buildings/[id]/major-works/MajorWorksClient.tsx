'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Calendar, User, FileText, ToggleLeft, ToggleRight, Brain, Send } from 'lucide-react'

type Building = {
  id: string
  name: string
  address: string
}

type MajorWork = {
  id: string
  title: string
  description: string
  status: 'Planning' | 'Consultation' | 'Delivery' | 'Complete'
  start_date: string
  end_date: string
  s20_notice_date: string
  contractor: string
  s20_required: boolean
  s20_completed: boolean
}

interface MajorWorksClientProps {
  building: Building
  majorWorks: MajorWork[]
}

export default function MajorWorksClient({ building, majorWorks }: MajorWorksClientProps) {
  const [isAddingWork, setIsAddingWork] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [s20Toggles, setS20Toggles] = useState<Record<string, boolean>>({})
  const [aiLetterContent, setAiLetterContent] = useState<string>('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-blue-100 text-blue-800'
      case 'Consultation': return 'bg-yellow-100 text-yellow-800'
      case 'Delivery': return 'bg-orange-100 text-orange-800'
      case 'Complete': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingWork(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsAddingWork(false)
    setShowAddForm(false)
    alert('Major work item added successfully!')
  }

  const handleS20Toggle = (workId: string) => {
    setS20Toggles(prev => ({
      ...prev,
      [workId]: !prev[workId]
    }))
  }

  const generateLeaseholderNotice = async (work: MajorWork) => {
    // Simulate AI letter generation
    const letter = `Dear Leaseholder,

Re: Major Works - ${work.title}

I am writing to inform you about upcoming major works at ${building.name}.

Project Details:
- Work: ${work.title}
- Description: ${work.description}
- Contractor: ${work.contractor}
- Start Date: ${formatDate(work.start_date)}
- End Date: ${formatDate(work.end_date)}

${work.s20_required ? `Section 20 Notice issued: ${formatDate(work.s20_notice_date)}` : 'Section 20 Notice will be issued in due course.'}

We will keep you updated on progress and any disruption to services.

Kind regards,
Property Management Team`

    setAiLetterContent(letter)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href={`/buildings/${building.id}`}
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to {building.name}
          </Link>
        </div>
        
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
            Major Works - {building.name}
          </h1>
          <p className="text-lg text-gray-600">
            Manage major works projects and Section 20 notices
          </p>
        </div>
      </div>

      {/* Add New Work Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Major Work
        </button>
      </div>

      {/* Add Work Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Major Work</h2>
          
          <form onSubmit={handleAddWork} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="e.g., Roof Replacement"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="Planning">Planning</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                required
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Describe the major work project..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  S20 Notice Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contractor
              </label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., ABC Construction Ltd"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span className="text-sm font-medium text-gray-700">Section 20 Required</span>
              </label>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isAddingWork}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAddingWork ? 'Adding...' : 'Add Major Work'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Major Works List */}
      <div className="space-y-6">
        {majorWorks.map((work) => (
          <div key={work.id} className="bg-white rounded-xl shadow-lg p-6 border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{work.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(work.status)}`}>
                    {work.status}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{work.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Start Date</p>
                      <p className="text-sm text-gray-600">{formatDate(work.start_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">End Date</p>
                      <p className="text-sm text-gray-600">{formatDate(work.end_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">S20 Notice</p>
                      <p className="text-sm text-gray-600">{formatDate(work.s20_notice_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Contractor</p>
                      <p className="text-sm text-gray-600">{work.contractor}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Section 20</span>
                <button
                  onClick={() => handleS20Toggle(work.id)}
                  className={`p-1 rounded-full transition-colors ${
                    s20Toggles[work.id] ? 'bg-teal-600' : 'bg-gray-300'
                  }`}
                >
                  {s20Toggles[work.id] ? (
                    <ToggleRight className="h-4 w-4 text-white" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => generateLeaseholderNotice(work)}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                <Brain className="h-4 w-4" />
                Generate Leaseholder Notice
              </button>
              
              <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                <FileText className="h-4 w-4" />
                Upload S20 Notice
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* AI Letter Display */}
      {aiLetterContent && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Generated Leaseholder Notice</h3>
            <button
              onClick={() => setAiLetterContent('')}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 border">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
              {aiLetterContent}
            </pre>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
              <Send className="h-4 w-4" />
              Send to Leaseholders
            </button>
            
            <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
              <FileText className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 