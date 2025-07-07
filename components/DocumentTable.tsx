"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Document = {
  id: string;
  file_name: string;
  doc_type: string;
  doc_url: string;
  uploaded_by: string;
  building_name: string;
};

type Props = {
  documents: Document[];
  filter: string;
  onFilterChange: (value: string) => void;
};

const DocumentTable: React.FC<Props> = ({ documents, filter, onFilterChange }) => {
  // Extract unique building names
  const buildings = [...new Set(documents.map((doc) => doc.building_name))];

  // Filter documents by building
  const filteredDocs = filter
    ? documents.filter((doc) => doc.building_name === filter)
    : documents;

  return (
    <Card className="p-4">
      <div className="mb-4">
        <label htmlFor="building-filter" className="font-semibold mr-2">
          Filter by Building:
        </label>
        <select
          id="building-filter"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Buildings</option>
          {buildings.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">File Name</th>
            <th className="p-2">Type</th>
            <th className="p-2">Building</th>
            <th className="p-2">Uploaded By</th>
            <th className="p-2">Download</th>
          </tr>
        </thead>
        <tbody>
          {filteredDocs.map((doc) => (
            <tr key={doc.id} className="border-t">
              <td className="p-2">{doc.file_name}</td>
              <td className="p-2">{doc.doc_type}</td>
              <td className="p-2">{doc.building_name}</td>
              <td className="p-2">{doc.uploaded_by}</td>
              <td className="p-2">
                <Button asChild size="sm">
                  <a
                    href={doc.doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default DocumentTable;
