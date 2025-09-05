#!/bin/bash

echo "🧪 Testing Document AI Integration"
echo "=================================="

APP_URL="https://blociq-h3xv-k6bhbkx0l-eleanoroxley-9774s-projects.vercel.app"

echo ""
echo "1️⃣ Testing processor creation endpoint..."
response1=$(curl -s -X POST "$APP_URL/api/setup-document-ai" -H "Accept: application/json")
echo "Response: $response1"

if echo "$response1" | grep -q '"success":true'; then
    echo "✅ Processor setup successful"
    
    # Extract processor ID if present
    processor_id=$(echo "$response1" | grep -o '"processorId":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$processor_id" ]; then
        echo "🔑 Processor ID: $processor_id"
        echo "📋 Add this to Vercel: DOCUMENT_AI_PROCESSOR_ID=$processor_id"
    fi
else
    echo "❌ Processor setup failed"
fi

echo ""
echo "2️⃣ Testing status endpoint..."
response2=$(curl -s "$APP_URL/api/setup-document-ai")
echo "Response: $response2"

echo ""
echo "3️⃣ Testing OCR endpoint (requires processor ID to be set)..."
echo "Use this command with your PDF file:"
echo "curl -X POST $APP_URL/api/ocr-document-ai -F \"file=@your-lease.pdf\""

echo ""
echo "🏁 Integration test complete!"
echo "Next steps:"
echo "1. If processor was created, add DOCUMENT_AI_PROCESSOR_ID to Vercel"
echo "2. Redeploy application"
echo "3. Test OCR with actual lease document"