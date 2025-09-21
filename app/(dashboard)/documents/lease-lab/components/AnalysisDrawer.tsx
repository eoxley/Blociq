'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, Shield, AlertTriangle, Edit3, CheckCircle, Link, Download, Minimize2, Maximize2, Building2, Home } from 'lucide-react';
import { DocumentJob } from '../LeaseLabClient';
import jsPDF from 'jspdf';

interface AnalysisDrawerProps {
  job: DocumentJob;
  onClose: () => void;
}

export default function AnalysisDrawer({ job, onClose }: AnalysisDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [linkScope, setLinkScope] = useState<'building' | 'unit'>('unit');

  const summary = job.summary_json || {};

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    // Store original overflow style
    const originalOverflow = document.body.style.overflow;

    // Disable scrolling on body
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'property', label: 'Property Details', icon: FileText },
    { id: 'sections', label: 'Detailed Sections', icon: FileText },
    { id: 'provisions', label: 'Other Provisions', icon: Shield },
  ];


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

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings || []);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchUnits = async (buildingId: string) => {
    try {
      const response = await fetch(`/api/buildings/${buildingId}/units`);
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units || []);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const handleShowLinkModal = () => {
    setShowLinkModal(true);
    fetchBuildings();
  };

  const handleLinkLease = async () => {
    if (!selectedBuilding || (linkScope === 'unit' && !selectedUnit)) {
      return;
    }

    setIsLinking(true);
    try {
      const response = await fetch('/api/leases/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentJobId: job.id,
          buildingId: selectedBuilding,
          unitId: linkScope === 'unit' ? selectedUnit : null,
          scope: linkScope,
          analysisJson: summary
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Lease linked successfully:', data);

        // Show success message
        alert(`Lease successfully linked to ${linkScope === 'building' ? 'building' : 'unit'}!`);

        setShowLinkModal(false);
        // Optionally refresh or update UI
      } else {
        const error = await response.json();
        console.error('❌ Failed to link lease:', error);
        alert(error.message || 'Failed to link lease');
      }
    } catch (error) {
      console.error('❌ Error linking lease:', error);
      alert('Failed to link lease');
    } finally {
      setIsLinking(false);
    }
  };

  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuilding(buildingId);
    if (buildingId) {
      fetchUnits(buildingId);
    }
    setSelectedUnit('');
  };

  const exportToPDF = async () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Lease Analysis Summary', margin, yPosition);
    yPosition += 15;

    // Document info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Document: ${job.filename}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Analyzed: ${new Date(job.updated_at).toLocaleDateString('en-GB')}`, margin, yPosition);
    yPosition += 15;

    // Executive Summary
    if (summary.executive_summary || summary.overview) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const summaryText = summary.executive_summary || summary.overview;
      const splitSummary = pdf.splitTextToSize(summaryText, pageWidth - 2 * margin);
      pdf.text(splitSummary, margin, yPosition);
      yPosition += splitSummary.length * 5 + 10;
    }

    // Key Details
    if (summary.basic_property_details) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Details', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      const details = summary.basic_property_details;
      if (details.property_address) {
        pdf.text(`Property: ${details.property_address}`, margin, yPosition);
        yPosition += 6;
      }
      if (details.lease_term) {
        pdf.text(`Lease Term: ${details.lease_term}`, margin, yPosition);
        yPosition += 6;
      }
      if (details.parties) {
        pdf.text('Parties:', margin, yPosition);
        yPosition += 6;
        details.parties.forEach((party: string) => {
          pdf.text(`  • ${party}`, margin + 10, yPosition);
          yPosition += 5;
        });
      }
      yPosition += 10;
    }

    // Financial Information
    if (summary.financial_obligations) {
      if (yPosition > 250) { // Check if we need a new page
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Financial Obligations', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      summary.financial_obligations.forEach((obligation: any) => {
        if (obligation.type && obligation.amount) {
          pdf.text(`${obligation.type}: ${obligation.amount}`, margin, yPosition);
          yPosition += 6;
        }
      });
      yPosition += 10;
    }

    // Save the PDF
    pdf.save(`lease-analysis-${job.filename.replace(/\.[^/.]+$/, '')}.pdf`);
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
                onClick={handleShowLinkModal}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-green-600 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>Link to Building/Unit</span>
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

      {/* Link to Building/Unit Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Link Lease to Building/Unit</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Scope Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link Scope
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="building"
                      checked={linkScope === 'building'}
                      onChange={(e) => setLinkScope(e.target.value as 'building' | 'unit')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Building-wide (head lease)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="unit"
                      checked={linkScope === 'unit'}
                      onChange={(e) => setLinkScope(e.target.value as 'building' | 'unit')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Specific unit</span>
                  </label>
                </div>
              </div>

              {/* Building Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Building
                </label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a building...</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name} {building.address && `- ${building.address}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Selection (only if scope is unit) */}
              {linkScope === 'unit' && selectedBuilding && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Unit
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a unit...</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.unit_number} {unit.floor && `(Floor ${unit.floor})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Information */}
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-xs text-blue-800">
                  {linkScope === 'building'
                    ? 'Building-wide leases store clauses that apply to all units (e.g., no pets, landlord powers).'
                    : 'Unit-specific leases store individual lease terms (e.g., apportionment %, leaseholder name).'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkLease}
                disabled={isLinking || !selectedBuilding || (linkScope === 'unit' && !selectedUnit)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isLinking && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>{isLinking ? 'Linking...' : 'Link Lease'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
