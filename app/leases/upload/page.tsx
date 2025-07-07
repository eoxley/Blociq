"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox"; // Adjust if different
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LeaseUploadPage() {
  const [isHeadlease, setIsHeadlease] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file.");
      return;
    }

    // Placeholder: send file to Supabase or API route
    console.log("Uploading lease:", {
      file,
      isHeadlease,
    });

    // TODO: add actual upload logic here
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload Lease</h1>

      <div className="mb-4">
        <Label htmlFor="leaseFile">Select Lease File (PDF)</Label>
        <input
          id="leaseFile"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mt-2 block"
        />
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <Checkbox
          id="headlease"
          checked={isHeadlease}
          onCheckedChange={(v: boolean | undefined) => setIsHeadlease(!!v)}
        />
        <Label htmlFor="headlease">This is the headlease</Label>
      </div>

      <Button onClick={handleUpload} disabled={!file}>
        Upload Lease
      </Button>
    </div>
  );
}
