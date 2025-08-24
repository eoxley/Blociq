# BlocIQ Assistant Outlook Add-in

This folder contains the files needed to host the BlocIQ Assistant add-in at `https://www.blociq.co.uk/addin/`.

## Deploy to Vercel
1. Ensure the contents of this folder are deployed to your Vercel project so they are available under `/addin/`.
2. The manifest will then be reachable at `https://www.blociq.co.uk/addin/manifest.xml`.

## Sideload in Outlook Desktop
1. Download `manifest.xml` from the URL above.
2. In Outlook go to **Get Add-ins** ➜ **My Add-ins**.
3. Choose **Add a custom add-in** ➜ **Add from file** and select the downloaded manifest.
4. The **BlocIQ Assistant** button will appear in the ribbon on read and compose forms.

## Files
- `manifest.xml` – Outlook add-in manifest
- `taskpane.html` – taskpane UI
- `taskpane.js` – client logic
- `function.js` – command handler
- `../assets/icon-32.png` – placeholder icon
