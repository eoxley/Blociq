#!/bin/bash

echo "📦 Installing OCR dependencies for PDF processing..."

# Install required packages for OCR functionality
npm install --save tesseract.js pdfjs-dist google-auth-library

# Install development dependencies for PDF workers
npm install --save-dev @types/pdfjs-dist

echo "✅ OCR dependencies installed successfully!"
echo ""
echo "📋 Installed packages:"
echo "  - tesseract.js: Local OCR processing"
echo "  - pdfjs-dist: PDF text extraction"
echo "  - google-auth-library: Google Vision API authentication"
echo "  - @types/pdfjs-dist: TypeScript definitions"
echo ""
echo "🔧 Next steps:"
echo "  1. Add PDF.js worker to public directory"
echo "  2. Configure environment variables for APIs"
echo "  3. Test the OCR endpoints"