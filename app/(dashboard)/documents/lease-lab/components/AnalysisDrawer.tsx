'use client';

import { useState } from 'react';
import { X, FileText, Calendar, DollarSign, Shield, AlertTriangle, Edit3, CheckCircle, Link, Download, Minimize2, Maximize2 } from 'lucide-react';
import { DocumentJob } from '../LeaseLabClient';

interface AnalysisDrawerProps {
  job: DocumentJob;
  onClose: () => void;
  onAttachToBuilding: (jobId: string, buildingId: string, unitId?: string) => void;
}

export default function AnalysisDrawer({ job, onClose, onAttachToBuilding }: AnalysisDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAttaching, setIsAttaching] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const summary = job.summary_json || {};

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'property', label: 'Property Details', icon: FileText },
    { id: 'sections', label: 'Detailed Sections', icon: FileText },
    { id: 'provisions', label: 'Other Provisions', icon: Shield },
  ];

  const handleAttachToBuilding = async () => {
    // This would open a building/unit selector in a real implementation
    // For now, we'll just show a placeholder
    setIsAttaching(true);
    setTimeout(() => {
      setIsAttaching(false);
      onClose();
    }, 1000);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsMinimized(false);
    onClose();
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h3>
        <p className="text-gray-700 leading-relaxed">
          {summary.executive_summary || summary.overview || 'No overview available.'}
        </p>
      </div>

      {summary.disclaimer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-md font-semibold text-yellow-800 mb-2">Important Disclaimer</h4>
          <p className="text-yellow-700 text-sm">
            {summary.disclaimer}
          </p>
        </div>
      )}

      {summary.unknowns && summary.unknowns.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-2">Areas Requiring Review</h4>
          <ul className="space-y-1">
            {summary.unknowns.map((unknown: any, index: number) => (
              <li key={index} className="text-gray-700">• {unknown}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderPropertyDetails = () => {
    const property = summary.basic_property_details || {};
    return (
      <div className="space-y-6">
        {property.property_description && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Property</h4>
            <p className="text-gray-700">{property.property_description}</p>
          </div>
        )}

        {property.lease_term && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Lease Term</h4>
            <p className="text-gray-700">{property.lease_term}</p>
          </div>
        )}

        {property.parties && property.parties.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Parties</h4>
            <ul className="space-y-1">
              {property.parties.map((party: any, index: number) => (
                <li key={index} className="text-gray-700">• {party}</li>
              ))}
            </ul>
          </div>
        )}

        {property.title_number && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Title Number</h4>
            <p className="text-gray-700">{property.title_number}</p>
          </div>
        )}

        {property.referenced_clauses && property.referenced_clauses.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-2">Referenced Clauses</h4>
            <div className="flex flex-wrap gap-2">
              {property.referenced_clauses.map((clause: string, index: number) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {clause}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetailedSections = () => {
    const sections = summary.detailed_sections || [];
    return (
      <div className="space-y-6">
        {sections.length > 0 ? (
          sections.map((section: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{section.section_title}</h4>
              
              {section.content && section.content.length > 0 && (
                <div className="space-y-3 mb-4">
                  {section.content.map((content: string, contentIndex: number) => (
                    <p key={contentIndex} className="text-gray-700 leading-relaxed">• {content}</p>
                  ))}
                </div>
              )}

              {section.referenced_clauses && section.referenced_clauses.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-gray-600 mb-2">Referenced Clauses:</h5>
                  <div className="flex flex-wrap gap-2">
                    {section.referenced_clauses.map((clause: string, clauseIndex: number) => (
                      <span key={clauseIndex} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {clause}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">No detailed sections available.</p>
        )}
      </div>
    );
  };

  const renderOtherProvisions = () => {
    const provisions = summary.other_provisions || [];
    return (
      <div className="space-y-4">
        {provisions.length > 0 ? (
          provisions.map((provision: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">{provision.title}</h4>
              <p className="text-gray-700 text-sm mb-2">{provision.description}</p>
              
              {provision.referenced_clauses && provision.referenced_clauses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {provision.referenced_clauses.map((clause: string, clauseIndex: number) => (
                    <span key={clauseIndex} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {clause}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-8">No other provisions identified.</p>
        )}
      </div>
    );
  };

  const renderListSection = (items: any[], emptyMessage: string) => (
    <div className="space-y-3">
      {items && items.length > 0 ? (
        items.map((item: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{item.title || item.name || `Item ${index + 1}`}</h4>
                <p className="text-gray-700 text-sm mb-2">{item.description || item.details || item.text}</p>
                {item.date && (
                  <p className="text-xs text-gray-500">Date: {item.date}</p>
                )}
                {item.amount && (
                  <p className="text-xs text-gray-500">Amount: {item.amount}</p>
                )}
              </div>
              {item.page_ref && (
                <button className="text-xs text-blue-600 hover:text-blue-500 ml-2">
                  View source
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'property':
        return renderPropertyDetails();
      case 'sections':
        return renderDetailedSections();
      case 'provisions':
        return renderOtherProvisions();
      default:
        return renderOverview();
    }
  };

  // If minimized, show a compact header at the bottom
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div 
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow"
          onClick={handleRestore}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900 truncate">{job.filename}</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestore();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Restore"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Analysis Complete • Click to restore
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose}></div>
      
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[90vh] w-[90vw] max-w-4xl bg-white rounded-lg shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{job.filename}</h2>
              <p className="text-sm text-gray-500">
                {job.doc_type_guess || 'Document'} • {job.page_count || 'Unknown'} pages
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAttachToBuilding}
                disabled={isAttaching || job.linked_building_id}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Link className="h-4 w-4" />
                <span>{job.linked_building_id ? 'Attached' : 'Attach to Building'}</span>
              </button>
              <button
                onClick={handleMinimize}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Minimize"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Analysis completed on {new Date(job.updated_at).toLocaleDateString('en-GB')}
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="h-4 w-4" />
                <span>Export Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
