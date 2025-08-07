import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');

  console.log('[Outlook Callback] Callback URL:', req.url);
  console.log('[Outlook Callback] Query string:', searchParams.toString());
  console.log('[Outlook Callback] Code parameter:', code);

  if (!code) {
    console.error('[Outlook Callback] Missing code parameter');
    return new NextResponse('Missing code', { status: 400 });
  }

  // Return a temporary HTML page that handles the token exchange
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Connecting Outlook...</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>Connecting Outlook Account...</h2>
        <p>Please wait while we complete the authentication process.</p>
    </div>
    
    <script>
        (async function() {
            try {
                console.log('[Outlook Callback] Starting token exchange...');
                
                // Get the authorization code from URL
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                console.log('[Outlook Callback] Authorization code:', code ? 'found' : 'not found');
                
                if (!code) {
                    throw new Error('Authorization code not found in URL');
                }
                
                // POST to exchange endpoint
                console.log('[Outlook Callback] Sending POST to /api/auth/outlook/exchange');
                const response = await fetch('/api/auth/outlook/exchange', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code
                    })
                });
                
                console.log('[Outlook Callback] Exchange response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[Outlook Callback] Exchange failed:', errorText);
                    throw new Error('Token exchange failed: ' + errorText);
                }
                
                // Redirect to home page
                console.log('[Outlook Callback] Redirecting to /');
                window.location.href = '/';
                
            } catch (error) {
                console.error('[Outlook Callback] Error during token exchange:', error);
                document.body.innerHTML = \`
                    <div class="container">
                        <h2 style="color: #e74c3c;">Connection Failed</h2>
                        <p>Error: \${error.message}</p>
                        <button onclick="window.location.href='/outlook/connect'" style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Try Again
                        </button>
                    </div>
                \`;
            }
        })();
    </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 