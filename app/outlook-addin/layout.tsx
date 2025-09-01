import React from 'react'
import Script from 'next/script'

export default function OutlookAddinLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>BlocIQ - Outlook Add-in</title>
        
        {/* Office.js - Must be loaded in head for proper initialization */}
        <script 
          src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"
          async
        />
        
        {/* CSP and Frame permissions for Outlook */}
        <meta 
          httpEquiv="Content-Security-Policy" 
          content="frame-ancestors 'self' https://outlook.office.com https://outlook.office365.com https://*.office.com https://*.office365.com;" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}