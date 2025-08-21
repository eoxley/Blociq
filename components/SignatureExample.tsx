import React from 'react';
import { useSignature } from '@/hooks/useSignature';

/**
 * Example component showing how to use the signature hook in email components
 * This demonstrates how the signature data can be integrated into emails
 */
export function SignatureExample() {
  const { 
    signature, 
    loading, 
    error, 
    getTextSignature, 
    getHTMLSignature, 
    getSignatureImage 
  } = useSignature();

  if (loading) {
    return <div>Loading signature...</div>;
  }

  if (error) {
    return <div>Error loading signature: {error}</div>;
  }

  if (!signature) {
    return <div>No signature configured</div>;
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Signature Integration Example</h3>
      
      {/* Text Signature */}
      <div className="mb-4">
        <h4 className="font-medium text-sm text-gray-600 mb-1">Text Signature:</h4>
        <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-line">
          {getTextSignature()}
        </pre>
      </div>

      {/* HTML Signature */}
      <div className="mb-4">
        <h4 className="font-medium text-sm text-gray-600 mb-1">HTML Signature:</h4>
        <div 
          className="text-xs bg-gray-50 p-2 rounded"
          dangerouslySetInnerHTML={{ __html: getHTMLSignature() }}
        />
      </div>

      {/* Signature Image */}
      {getSignatureImage() && (
        <div className="mb-4">
          <h4 className="font-medium text-sm text-gray-600 mb-1">Signature Image:</h4>
          <img 
            src={getSignatureImage()!} 
            alt="Signature" 
            className="max-h-16 border rounded"
          />
        </div>
      )}

      <p className="text-xs text-gray-500">
        This component demonstrates how email components can access and use the user's signature data.
      </p>
    </div>
  );
}
