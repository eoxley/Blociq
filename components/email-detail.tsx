'use client';

interface EmailDetailProps {
  email: any;
  onReply: () => void;
}

export function EmailDetail({ email, onReply }: EmailDetailProps) {
  return (
    <div className="p-6 h-full flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-semibold">{email.subject}</h2>
        <p className="text-sm text-gray-500 mb-2">From: {email.from_email}</p>
        <p className="text-sm text-gray-600">{email.body_preview}</p>
      </div>

      <div className="mt-6">
        <button
          onClick={onReply}
          className="bg-[#0F5D5D] text-white px-4 py-2 rounded hover:opacity-90"
        >
          📩 Reply
        </button>
      </div>
    </div>
  );
}
