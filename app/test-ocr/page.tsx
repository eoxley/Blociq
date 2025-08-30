import OcrUploadSimple from '@/components/OcrUploadSimple';

export default function TestOcrPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">OCR Test Page</h1>
        <p className="text-gray-600">
          This is a simple test page for the OCR upload component. Upload a PDF and see the raw extracted text.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Simple OCR Upload</h2>
        <OcrUploadSimple />
      </div>
      
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Upload a PDF file</li>
          <li>• See the raw extracted text</li>
          <li>• Copy text to clipboard</li>
          <li>• Download as .txt file</li>
          <li>• Know if OCR was used</li>
        </ul>
      </div>
    </div>
  );
}
