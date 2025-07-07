"use client";

import { useEffect, useState } from "react";

type Document = {
  id: string;
  file_name: string;
  doc_url: string;
  doc_type: string;
  uploaded_by: string;
  building_name: string;
};

export default function DocumentsInner() {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const fetchDocs = async () => {
      const { supabase } = await import("@/utils/supabase");

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading documents:", error.message);
      } else {
        setDocuments(data || []);
      }
    };

    fetchDocs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Documents</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr>
            <th className="text-left border-b p-2">File Name</th>
            <th className="text-left border-b p-2">Type</th>
            <th className="text-left border-b p-2">Building</th>
            <th className="text-left border-b p-2">Uploaded By</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-t">
              <td className="p-2">{doc.file_name}</td>
              <td className="p-2">{doc.doc_type}</td>
              <td className="p-2">{doc.building_name}</td>
              <td className="p-2">{doc.uploaded_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
