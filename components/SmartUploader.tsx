"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import DocumentTypeSelector from "./DocumentTypeSelector";
import { useRouter } from 'next/navigation';

type Props = {
  table: "leases" | "compliance_docs";
  docTypePreset?: string;
  buildingId?: number;
  unitId?: number;
  uploadedBy?: string;
  onSaveSuccess?: (saved: any) => void;
};

export default function SmartUploader({
  table,
  docTypePreset,
  buildingId,
  unitId,
  uploadedBy,
  onSaveSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string>("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const router = useRouter();

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/documents/confirm-file', {
      method: 'POST',
      body: form,
    });

    if (res.ok) {
      setToastVisible(true);
      const { building_id } = await res.json();
              setTimeout(() => {
          if (building_id) {
            router.push(`/buildings/${building_id}/documents`);
          } else {
            router.push('/ai-documents');
          }
        }, 1500);
    } else {
      alert('Failed to save document. Please try again.');
    }
  }

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);

    try {
      // Use the new upload-and-analyse endpoint
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload-and-analyse', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload and analysis failed: ${errorText.slice(0, 200)}`);
      }

      const data = await res.json();
      console.log("🧠 AI Analysis Result:", data);

      // Set AI result for display
      setAiResult(data.ai);
      setUploadedFileUrl(data.file_url);

      // Set metadata for saving
      setMetadata({
        doc_type: docTypePreset || data.ai.type || "",
        building_name: data.ai.building_name || "",
        start_date: "", // Will be extracted from document content
        expiry_date: "", // Will be extracted from document content
        reminder_days: 30,
        doc_url: data.file_url,
      });
    } catch (error: any) {
      console.error("❌ Upload and analysis error:", error.message);
      toast.error(`Upload failed: ${error.message}`);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!metadata) return;
    setLoading(true);

    const insertPayload = {
      doc_type: metadata.doc_type,
      start_date: metadata.start_date || null,
      expiry_date: metadata.expiry_date || null,
      reminder_days: metadata.reminder_days || null,
      doc_url: metadata.doc_url,
      uploaded_by: uploadedBy || null,
      building_id: buildingId || null,
      unit_id: unitId || null,
      is_headlease: unitId ? false : true,
    };

    const { data, error } = await supabase.from(table).insert([insertPayload]).select();

    if (error) {
      console.error("❌ Save error:", error.message);
      toast.error("Failed to save document");
    } else {
      setSaved(true);
      
      // For compliance documents, trigger the new extract-summary analysis
      if (table === "compliance_docs" && data?.[0]?.id) {
        try {
          console.log("🤖 Triggering compliance document analysis...");
          toast.info("Analyzing document with AI...");
          
          const res = await fetch('/api/extract-summary', {
            method: 'POST',
            body: JSON.stringify({ documentId: data[0].id }),
            headers: { 'Content-Type': 'application/json' }
          });

          if (res.ok) {
            const analysisResult = await res.json();
            console.log("✅ Compliance analysis complete:", analysisResult);
            
            // Check if AI couldn't detect the document type
            if (!analysisResult.doc_type || analysisResult.doc_type === 'Unknown' || analysisResult.doc_type === 'null') {
              console.log("⚠️ AI couldn't detect document type, showing manual selector");
              setCurrentDocumentId(data[0].id);
              setShowTypeSelector(true);
              return; // Don't update the database yet, wait for user selection
            }
            
            // Update with AI-extracted data if it's better than what we have
            const updateData: any = {};
            if (analysisResult.doc_type && analysisResult.doc_type !== 'Unknown') {
              updateData.doc_type = analysisResult.doc_type;
            }
            if (analysisResult.issue_date && analysisResult.issue_date !== 'Not found') {
              updateData.start_date = analysisResult.issue_date;
            }
            if (analysisResult.expiry_date && analysisResult.expiry_date !== 'Not found') {
              updateData.expiry_date = analysisResult.expiry_date;
            }
            
            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('compliance_docs')
                .update(updateData)
                .eq('id', data[0].id);
                
              if (!updateError) {
                console.log("✅ Document updated with AI analysis results");
                toast.success(`Document analyzed! Type: ${analysisResult.doc_type || 'Unknown'}`);
              }
            } else {
              toast.success("Document saved successfully");
            }
          } else {
            console.warn("⚠️ Compliance analysis failed, but document was saved");
            toast.warning("Document saved, but AI analysis failed");
          }
        } catch (aiError) {
          console.error("❌ Compliance analysis error:", aiError);
          toast.error("Document saved, but AI analysis failed");
        }
      } else {
        toast.success("Document saved successfully");
      }
      
      onSaveSuccess?.(data[0]);
    }

    setLoading(false);
  };

  const handleTypeSelected = (docType: string) => {
    console.log("✅ User selected document type:", docType);
    toast.success(`Document type updated to ${docType}`);
    onSaveSuccess?.({ id: currentDocumentId, doc_type: docType });
  };

  const handleReanalyze = async () => {
    if (!currentDocumentId) return;
    
    try {
      toast.info("Re-analyzing document with AI...");
      
      const res = await fetch('/api/extract-summary', {
        method: 'POST',
        body: JSON.stringify({ documentId: currentDocumentId }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const analysisResult = await res.json();
        
        if (analysisResult.doc_type && analysisResult.doc_type !== 'Unknown' && analysisResult.doc_type !== 'null') {
          // AI found a type, update the database
          const { error: updateError } = await supabase
            .from('compliance_docs')
            .update({ doc_type: analysisResult.doc_type })
            .eq('id', currentDocumentId);
            
          if (!updateError) {
            toast.success(`AI re-analysis successful! Type: ${analysisResult.doc_type}`);
            onSaveSuccess?.({ id: currentDocumentId, doc_type: analysisResult.doc_type });
          }
        } else {
          // AI still couldn't detect, show selector again
          setShowTypeSelector(true);
        }
      } else {
        toast.error("Re-analysis failed");
      }
    } catch (error) {
      console.error("Re-analysis error:", error);
      toast.error("Re-analysis failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Upload PDF</Label>
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] || null;
            setFile(selectedFile);
            setSaved(false);
            setMetadata(null);
          }}
        />
      </div>

      {file && !metadata && (
        <Button onClick={handleExtract} disabled={loading}>
          {loading ? "Extracting..." : "Extract Metadata"}
        </Button>
      )}

      {metadata && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-gray-50">
          <div>
            <Label>Document Type</Label>
            <Input
              value={metadata.doc_type}
              onChange={(e) => setMetadata({ ...metadata, doc_type: e.target.value })}
            />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={metadata.start_date}
              onChange={(e) => setMetadata({ ...metadata, start_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={metadata.expiry_date}
              onChange={(e) => setMetadata({ ...metadata, expiry_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Reminder Days</Label>
            <Input
              type="number"
              value={metadata.reminder_days}
              onChange={(e) =>
                setMetadata({ ...metadata, reminder_days: parseInt(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {aiResult && (
        <div className="bg-muted p-4 mt-4 rounded-lg shadow-sm space-y-2">
          <h3 className="text-lg font-semibold">AI Document Summary</h3>
          <p><strong>Type:</strong> {aiResult.type}</p>
          <p><strong>Building:</strong> {aiResult.building_name || 'Not identified'}</p>
          <p><strong>Confidence:</strong> {aiResult.confidence}</p>
          <p><strong>Suggested Action:</strong> {aiResult.suggested_action}</p>

          <Button 
            onClick={() => setShowModal(true)}
            className="mt-2 bg-blue-600 hover:bg-blue-700"
          >
            Review & File
          </Button>
        </div>
      )}

      {metadata && (
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save to Supabase"}
        </Button>
      )}

      {saved && <p className="text-green-600 text-sm">✅ Document saved successfully.</p>}

      {/* Document Type Selector Modal */}
      <DocumentTypeSelector
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        documentId={currentDocumentId}
        onTypeSelected={handleTypeSelected}
        onReanalyze={handleReanalyze}
      />

      {/* AI Review Modal */}
      {aiResult && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review AI Classification</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <Label>Document Type</Label>
                <Input name="type" defaultValue={aiResult.type} />
              </div>
              
              <div>
                <Label>Building Name</Label>
                <Input name="building_name" defaultValue={aiResult.building_name || ''} />
              </div>

              <div>
                <Label>Suggested Action</Label>
                <Input name="suggested_action" defaultValue={aiResult.suggested_action} />
              </div>

              <input type="hidden" name="confidence" value={aiResult.confidence} />
              <input type="hidden" name="file_url" value={uploadedFileUrl} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Accept & File
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {toastVisible && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow z-50">
          Document saved successfully! Redirecting...
        </div>
      )}
    </div>
  );
}
