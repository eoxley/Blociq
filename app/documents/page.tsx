"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DocumentTable from "@/components/DocumentTable";

type DocumentEntry = {
  id: string;
  file_name: string;
  doc_type: string;
  uploaded_by: string;
  doc_url: string;
  created_at: string;
  building_name: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const loadDocuments = async () => {
      const { data, error } = await supabase
        .from("compliance_docs")
        .select(`
          id,
          doc_type,
          doc_url,
          created_at,
          uploaded_by,
          building_id,
          buildings(name),
          profiles(full_name)
        `);

      if (error) {
        console.error("❌ Error loading documents:", error.message);
        return;
      }

      const formattedDocs: DocumentEntry[] = (data || []).map((doc: any) => ({
        id: doc.id,
        file_name: doc.doc_url?.split("/").pop() || "Unnamed File",
        doc_type: doc.doc_type || "Unknown",
        uploaded_by: doc.profiles?.full_name || "Unknown",
        doc_url: doc.doc_url,
        created_at: doc.created_at,
        building_name: doc.buildings?.name || "Unknown",
      }));

      setDocuments(formattedDocs);
    };

    loadDocuments();
  }, []);

  const filteredDocs = filter
    ? documents.filter((doc) => doc.building_name === filter)
    : documents;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">📁 Documents</h1>
      <DocumentTable
        documents={filteredDocs}
        filter={filter}
        onFilterChange={setFilter}
      />
    </main>
  );
}
