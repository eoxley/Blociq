"use client";

import React, { useState, useEffect } from "react";
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  Clock, 
  X, 
  Sparkles,
  RefreshCw
} from "lucide-react";
import { UK_COMPLIANCE_ITEMS } from "@/lib/complianceUtils";
import { toast } from "sonner";

interface DocumentTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  onTypeSelected: (docType: string) => void;
  onReanalyse?: () => void;
}

interface ComplianceItem {
  id: number;
  name: string;
  description: string;
  required_if: 'always' | 'if present' | 'if HRB';
  default_frequency: string;
  category: string;
}

export default function DocumentTypeSelector({
  isOpen,
  onClose,
  documentId,
  onTypeSelected,
  onReanalyse
}: DocumentTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    if (isOpen) {
      // Use the UK compliance items from complianceUtils
      setComplianceItems(UK_COMPLIANCE_ITEMS);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedType) {
      toast.error("Please select a document type");
      return;
    }

    setLoading(true);
    try {
      // Update the document with the selected type
      const { error } = await supabase
        .from('compliance_docs')
        .update({ doc_type: selectedType })
        .eq('id', documentId);

      if (error) {
        throw error;
      }

      toast.success(`Document type updated to ${selectedType}`);
      onTypeSelected(selectedType);
      onClose();
    } catch (error) {
      console.error('Error updating document type:', error);
      toast.error("Failed to update document type");
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyse = async () => {
    if (onReanalyse) {
      onReanalyse();
    }
    onClose();
  };

  const getRequirementBadge = (requiredIf: string) => {
    switch (requiredIf) {
      case 'always':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Always Required
          </Badge>
        );
      case 'if present':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            If Present
          </Badge>
        );
      case 'if HRB':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Shield className="h-3 w-3 mr-1" />
            HRB Only
          </Badge>
        );
      default:
        return null;
    }
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

  // Filter compliance items
  const filteredItems = complianceItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase()) ||
                         item.description.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = category === "all" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(complianceItems.map(item => item.category)))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Type Not Detected</h2>
            <p className="text-sm text-gray-600 mt-1">
              We couldn't automatically detect the document type. Please choose the correct compliance asset.
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search compliance items..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Compliance Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`p-4 cursor-pointer transition-all border-2 ${
                  selectedType === item.name
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${getCategoryColor(item.category)}`}
                onClick={() => setSelectedType(item.name)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  {getRequirementBadge(item.required_if)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{item.category}</span>
                  <span>{item.default_frequency}</span>
                </div>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance items found</h3>
              <p className="text-gray-500">Try adjusting your search terms or category filter.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
                          {onReanalyse && (
              <Button
                onClick={handleReanalyse}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                                  Re-analyse with AI
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedType || loading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? "Updating..." : "Confirm Selection"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 