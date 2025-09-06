'use client';

export default function ConnectOutlookPage() {
  const connectOutlook = () => {
    // Use the API route instead of hardcoded OAuth URL to ensure correct configuration
    window.location.href = '/api/auth/outlook';
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <button
        onClick={connectOutlook}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700"
      >
        Connect Outlook
      </button>
    </div>
  );
} 