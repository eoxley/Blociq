'use client'

// Completely standalone test page with no dependencies
export default function OutlookTest() {
  return (
    <html lang="en">
      <head>
        <title>BlocIQ - Outlook Test</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body { margin: 0; padding: 0; font-family: system-ui; }
          .container { 
            height: 100vh; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .content {
            text-align: center;
            padding: 2rem;
          }
          .logo {
            width: 64px;
            height: 64px;
            background: rgba(255,255,255,0.2);
            border-radius: 16px;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
          }
          .btn {
            background: rgba(255,255,255,0.2);
            border: 2px solid rgba(255,255,255,0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 1rem;
          }
          .btn:hover {
            background: rgba(255,255,255,0.3);
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="content">
            <div className="logo">BQ</div>
            <h1>BlocIQ Outlook Add-in Test</h1>
            <p>Standalone Test - No Authentication Required</p>
            <p>Version: 2.0 - {new Date().toISOString()}</p>
            <button className="btn" onClick={() => alert('Test successful!')}>
              Test Button
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}