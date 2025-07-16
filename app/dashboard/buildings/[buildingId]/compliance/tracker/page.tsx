'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, Clock, Download, Upload, Eye, Calendar, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ComplianceAsset {
  id: number;
  item_type: string;
  category: string;
  frequency: string;
  status: string;
  applies: boolean;
  last_checked: string | null;
  next_due: string | null;
}

interface ComplianceDocument {
  id: string;
  doc_type: string;
  doc_url: string | null;
  start_date: string | null;
  expiry_date: string | null;
  created_at: string;
  uploaded_by: string | null;
}

interface BuildingAsset {
  id: number;
  building_id: number;
  compliance_item_id: number;
  applies: boolean;
  last_checked: string | null;
  next_due: string | null;
  notes: string | null;
  compliance_item: ComplianceAsset;
}

export default function ComplianceTrackerPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const buildingId = params?.buildingId as string;
  
  const [building, setBuilding] = useState<{
    id: number;
    name: string;
    address: string | null;
  } | null>(null);
  const [buildingAssets, setBuildingAssets] = useState<BuildingAsset[]>([]);
  const [complianceDocs, setComplianceDocs] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch building details
        const { data: buildingData } = await supabase
          .from('buildings')
          .select('id, name, address')
          .eq('id', buildingId)
          .single();

        if (buildingData) {
          setBuilding(buildingData);
        }

        // Fetch building assets (compliance items applied to this building)
        const { data: assetsData } = await supabase
          .from('building_assets')
          .select(`
            id,
            building_id,
            compliance_item_id,
            applies,
            last_checked,
            next_due,
            notes,
            compliance_item:compliance_items (
              id,
              item_type,
              category,
              frequency,
              status
            )
          `)
          .eq('building_id', buildingId)
          .eq('applies', true);

        if (assetsData) {
          // Fix: compliance_item is sometimes an array, ensure it's an object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setBuildingAssets(
            assetsData.map((asset: any) => ({
              ...asset,
              compliance_item: Array.isArray(asset.compliance_item)
                ? asset.compliance_item[0]
                : asset.compliance_item,
            }))
          );
        }

        // Fetch compliance documents for this building
        const { data: docsData } = await supabase
          .from('compliance_docs')
          .select('*')
          .eq('building_id', buildingId)
          .order('created_at', { ascending: false });

        if (docsData) {
          setComplianceDocs(docsData);
        }

      } catch (error) {
        console.error('Error fetching compliance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [buildingId, supabase]);

  const getStatusBadge = (asset: BuildingAsset, doc: ComplianceDocument | null) => {
    if (!asset.applies) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="h-3 w-3 mr-1" />
          Not Required
        </span>
      );
    }

    if (!doc) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Missing
        </span>
      );
    }

    if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date);
      const today = new Date();
      
      if (expiryDate < today) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        );
      } else if (expiryDate.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) {
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Due Soon
          </span>
        );
      }
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Compliant
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Safety': return 'border-red-200 bg-red-50';
      case 'Electrical': return 'border-yellow-200 bg-yellow-50';
      case 'Gas': return 'border-orange-200 bg-orange-50';
      case 'Health': return 'border-green-200 bg-green-50';
      case 'Insurance': return 'border-blue-200 bg-blue-50';
      case 'Structural': return 'border-purple-200 bg-purple-50';
      case 'Equipment': return 'border-gray-200 bg-gray-50';
      case 'Energy': return 'border-teal-200 bg-teal-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDownload = async (docUrl: string, docType: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('compliance-documents')
        .download(docUrl);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const getOverdueAndMissingItems = () => {
    const today = new Date();
    return buildingAssets.filter(asset => {
      const doc = complianceDocs.find(d => d.doc_type === asset.compliance_item.item_type);
      return !doc || (doc.expiry_date && new Date(doc.expiry_date) < today);
    });
  };

  const sendReminderEmails = async () => {
    const overdueItems = getOverdueAndMissingItems();
    
    if (overdueItems.length === 0) {
      setToastMessage('No overdue or missing items to send reminders for.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setSendingReminders(true);

    try {
      // Create email content
      const subject = `Compliance Reminder: ${building?.name} - ${overdueItems.length} items require attention`;
      
      let body = `Dear Team,\n\n`;
      body += `This is an automated reminder for compliance items that require attention at ${building?.name}.\n\n`;
      body += `The following ${overdueItems.length} compliance items are overdue or missing:\n\n`;

      overdueItems.forEach((asset, index) => {
        const doc = complianceDocs.find(d => d.doc_type === asset.compliance_item.item_type);
        const status = !doc ? 'Missing' : 'Overdue';
        const expiryInfo = doc?.expiry_date ? ` (Expired: ${formatDate(doc.expiry_date)})` : '';
        
        body += `${index + 1}. ${asset.compliance_item.item_type} - ${status}${expiryInfo}\n`;
        body += `   Category: ${asset.compliance_item.category}\n`;
        body += `   Frequency: ${asset.compliance_item.frequency}\n`;
        body += `   Upload Link: ${window.location.origin}/dashboard/buildings/${buildingId}/compliance/tracker\n\n`;
      });

      body += `Please review and upload the required documents as soon as possible.\n\n`;
      body += `Best regards,\nBlocIQ Compliance System`;

      // Save to email_drafts table
      const { error: draftError } = await supabase
        .from('email_drafts')
        .insert({
          subject: subject,
          draft_text: body,
          created_at: new Date().toISOString()
        });

      if (draftError) {
        console.error('Error saving email draft:', draftError);
        throw new Error('Failed to save email draft');
      }

      // Show success message
      setToastMessage(`Reminders queued for ${overdueItems.length} overdue/missing items`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

    } catch (error) {
      console.error('Error sending reminder emails:', error);
      setToastMessage('Failed to send reminder emails. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Compliance status summary logic ---
  const today = new Date();
  let compliant = 0, overdue = 0, missing = 0;
  buildingAssets.forEach(asset => {
    const doc = complianceDocs.find(d => d.doc_type === asset.compliance_item.item_type);
    if (!doc) {
      missing++;
    } else if (doc.expiry_date) {
      const expiryDate = new Date(doc.expiry_date);
      if (expiryDate < today) {
        overdue++;
      } else {
        compliant++;
      }
    } else {
      compliant++;
    }
  });
  const total = buildingAssets.length;
  const percentCompliant = total > 0 ? Math.round((compliant / total) * 100) : 0;

  // --- End compliance status summary logic ---

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-teal-600" />
            Compliance Tracker
          </h1>
          <p className="text-gray-600 mt-1">
            {building?.name} • {building?.address}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getOverdueAndMissingItems().length > 0 && (
            <button
              onClick={sendReminderEmails}
              disabled={sendingReminders}
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingReminders ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {sendingReminders ? 'Sending...' : `Send Reminder Emails (${getOverdueAndMissingItems().length})`}
            </button>
          )}
          <Link
            href={`/dashboard/buildings/${buildingId}`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Building
          </Link>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-gray-700">{toastMessage}</p>
            <button
              onClick={() => setShowToast(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Compliance Status Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 shadow-sm relative">
        <div className="flex items-center gap-4 flex-1">
          <span className="inline-flex items-center gap-1 text-green-700 font-semibold text-sm">
            <CheckCircle className="h-5 w-5 text-green-500" /> {compliant} Compliant
          </span>
          <span className="inline-flex items-center gap-1 text-yellow-700 font-semibold text-sm">
            <AlertTriangle className="h-5 w-5 text-yellow-500" /> {overdue} Overdue
          </span>
          <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-sm">
            <Clock className="h-5 w-5 text-red-500" /> {missing} Missing
          </span>
          <span className="inline-flex items-center gap-1 text-gray-500 font-medium text-xs ml-2 cursor-pointer group">
            <span className="underline decoration-dotted">How is this calculated?</span>
            <div className="absolute left-1/2 md:left-auto md:right-0 top-full mt-2 z-10 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg p-4 w-72 text-xs text-gray-700">
              Status is determined based on uploaded documents and expiry dates:
              <ul className="list-disc ml-5 mt-2">
                <li><b>Compliant</b>: Latest document exists and expiry date (if any) is in the future</li>
                <li><b>Overdue</b>: Latest document exists but expiry date is past</li>
                <li><b>Missing</b>: No document uploaded for this asset</li>
              </ul>
            </div>
          </span>
        </div>
        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-2 min-w-[120px]">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${percentCompliant}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-700 font-semibold ml-2 min-w-[32px]">{percentCompliant}%</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-teal-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">{buildingAssets.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Compliant</p>
              <p className="text-2xl font-semibold text-gray-900">
                {buildingAssets.filter(asset => {
                  const doc = complianceDocs.find(d => d.doc_type === asset.compliance_item.item_type);
                  return doc && (!doc.expiry_date || new Date(doc.expiry_date) > new Date());
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Missing/Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {buildingAssets.filter(asset => {
                  const doc = complianceDocs.find(d => d.doc_type === asset.compliance_item.item_type);
                  return !doc || (doc.expiry_date && new Date(doc.expiry_date) < new Date());
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Documents</p>
              <p className="text-2xl font-semibold text-gray-900">{complianceDocs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Items Grid */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Requirements</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track compliance documents and their status for this building
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {buildingAssets.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Compliance Items</h3>
              <p className="text-gray-500 mb-4">
                No compliance requirements have been set up for this building yet.
              </p>
              <Link
                href="/compliance"
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                Set Up Compliance
              </Link>
            </div>
          ) : (
            buildingAssets.map((asset) => {
              const doc = complianceDocs.find(d => d.doc_type === asset.compliance_item.item_type);
              const isOverdue = doc?.expiry_date && new Date(doc.expiry_date) < new Date();
              const isDueSoon = doc?.expiry_date && 
                new Date(doc.expiry_date).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

              return (
                <div key={asset.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {asset.compliance_item.item_type}
                        </h3>
                        {getStatusBadge(asset, doc || null)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(asset.compliance_item.category)}`}>
                          {asset.compliance_item.category}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Frequency:</span> {asset.compliance_item.frequency}
                        </div>
                        <div>
                          <span className="font-medium">Last Checked:</span> {formatDate(asset.last_checked)}
                        </div>
                        <div>
                          <span className="font-medium">Next Due:</span> {formatDate(asset.next_due)}
                        </div>
                      </div>

                      {doc && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">Latest Document</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Uploaded:</span> {formatDate(doc.created_at)}
                                </div>
                                {doc.start_date && (
                                  <div>
                                    <span className="font-medium">Start Date:</span> {formatDate(doc.start_date)}
                                  </div>
                                )}
                                {doc.expiry_date && (
                                  <div>
                                    <span className="font-medium">Expiry Date:</span> {formatDate(doc.expiry_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {doc.doc_url && (
                                <>
                                  <button
                                    onClick={() => handleDownload(doc.doc_url!, doc.doc_type)}
                                    className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </button>
                                  <button
                                    onClick={() => window.open(doc.doc_url as string, '_blank')}
                                    className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {asset.notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">Notes:</span> {asset.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center gap-3">
                    {(!doc || isOverdue || isDueSoon) && (
                      <Link
                        href={`/compliance/documents?building=${buildingId}&type=${asset.compliance_item.item_type}`}
                        className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {doc ? 'Upload New' : 'Upload Document'}
                      </Link>
                    )}
                    
                    <Link
                      href={`/compliance/documents?building=${buildingId}&type=${asset.compliance_item.item_type}`}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All Documents
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 