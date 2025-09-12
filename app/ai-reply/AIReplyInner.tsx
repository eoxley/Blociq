"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function AIReplyInner() {
  const searchParams = useSearchParams();
  const [reply, setReply] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const subject = searchParams?.get("subject") || "";
  const from = searchParams?.get("from") || "";
  const body = searchParams?.get("body") || "";

  const generateReply = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/addin/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: "Generate a professional reply to this email",
          outlookContext: {
            subject,
            from,
            body
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setReply(data.bodyHtml || data.response || "Reply generated successfully");
      } else {
        setError(data.message || "Failed to generate reply");
      }
    } catch (err) {
      setError("An error occurred while generating the reply");
      console.error('Reply generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate reply when email content is available
  useEffect(() => {
    if (subject && from && body && !reply && !isLoading) {
      generateReply();
    }
  }, [subject, from, body]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Email Reply</h1>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-semibold mb-2">Original Email:</h2>
        <div className="mb-2">
          <strong>Subject:</strong> {subject}
        </div>
        <div className="mb-2">
          <strong>From:</strong> {from}
        </div>
        <div className="mb-2">
          <strong>Body:</strong>
          <pre className="whitespace-pre-wrap mt-1 text-sm">{body}</pre>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Generated Reply:</h2>
          <button 
            onClick={generateReply}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Generating..." : "Regenerate Reply"}
          </button>
        </div>
        
        {isLoading && (
          <div className="p-4 border rounded bg-blue-50">
            <div className="animate-pulse">Generating contextual reply...</div>
          </div>
        )}
        
        {error && (
          <div className="p-4 border rounded bg-red-50 text-red-700">
            {error}
          </div>
        )}
        
        {reply && !isLoading && (
          <div className="p-4 border rounded bg-white">
            <div dangerouslySetInnerHTML={{ __html: reply }} />
          </div>
        )}
      </div>
    </div>
  );
}
