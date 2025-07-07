"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DocumentEntry = {
  id: string;
  file_name: string;
  doc_type: string;
  uploaded_by: string;
  doc_url: string;
  created_at: string;
  building_name: string;
};

type Props = {
  documents: DocumentEntry[];
  filter: string;
  onFilterChange: (building: string) => void;
};

const DocumentTable: React.FC<Props> = ({ documents, filter, onFilterChange }) => {
  const buildings = [...new Set(documents.map(doc => doc.building_name))];

  return (
    <Card>
      <CardContent className="overflow-x-auto p-4">
        <div className="flex justify-between mb-4 items-center">
          <h2 className="text-xl font-semibold">📂 Compliance Documents</h2>
          <select
            className="border p-2 rounded text-sm"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          >
            <option value="">All Buildings</option>
            {buildings.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="border-b font-medium">
              <th className="p-2">File Name</th>
              <th className="p-2">Document Type</th>
              <th className="p-2">Uploaded By</th>
              <th className="p-2">Date</th>
              <th className="p-2">Building</th>
              <th className="p-2">Download</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{doc.file_name}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.doc_type === "Fire Risk Assessment" ? "bg-red-100 text-red-800" :
                    doc.doc_type === "EICR" ? "bg-yellow-100 text-yellow-800" :
                    doc.doc_type === "Asbestos Report" ? "bg-purple-100 text-purple-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {doc.doc_type}
                  </span>
                </td>
                <td className="p-2">{doc.uploaded_by}</td>
                <td className="p-2">{new Date(doc.created_at).toLocaleDateString("en-UK", {
                  year: "numeric", month: "short", day: "numeric"
                })}</td>
                <td className="p-2">
                  <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">
                    {doc.building_name}
                  </span>
                </td>
                <td className="p-2">
                  <Button asChild size="sm">
                    <a href={doc.doc_url} target="_blank" rel="noopener noreferrer">Download</a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default DocumentTable;
