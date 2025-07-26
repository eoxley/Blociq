'use client';

export default function ConnectOutlookPage() {
  const connectOutlook = () => {
    const clientId = process.env.NEXT_PUBLIC_OUTLOOK_CLIENT_ID!;
    const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI!;
    const scopes = encodeURIComponent('https://graph.microsoft.com/Mail.Read offline_access openid');

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scopes}`;

    window.location.href = authUrl;
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