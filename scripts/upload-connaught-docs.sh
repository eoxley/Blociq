#!/bin/bash

# BlocIQ Connaught Square Document Upload - One Command
# This script uploads all 318 documents to Supabase Storage

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════╗"
echo "║  BlocIQ Connaught Square Document Upload      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if source directory exists
if [ ! -d "/Users/ellie/Downloads/219.01 CONNAUGHT SQUARE" ]; then
    echo -e "${RED}❌ Source directory not found:${NC}"
    echo "   /Users/ellie/Downloads/219.01 CONNAUGHT SQUARE"
    echo ""
    echo "Please ensure the folder exists and try again."
    exit 1
fi

# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://xqxaatvykmaaynqeoemy.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeGFhdHZ5a21hYXlucWVvZW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE5Mzk5NCwiZXhwIjoyMDY2NzY5OTk0fQ.4Qza6DOdmF8s6jFMIkMwKgaU_DkIUspap8bOVldwMmk"

echo -e "${YELLOW}📦 Step 1/3: Uploading documents to Supabase Storage...${NC}"
echo ""

# Run upload script
node scripts/upload-documents-to-supabase.js

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Upload completed successfully!${NC}"
    echo ""

    echo -e "${YELLOW}📋 Step 2/3: Verifying upload...${NC}"
    echo ""

    # Verify upload
    node scripts/verify-storage-upload.js

    echo ""
    echo -e "${YELLOW}🔐 Step 3/3: Apply storage policies${NC}"
    echo ""
    echo "Next, run these SQL commands in Supabase SQL Editor:"
    echo ""
    echo -e "${GREEN}cat /Users/ellie/Desktop/BlocIQ_Output/storage_policies.sql${NC}"
    echo ""

    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              Upload Complete! 🎉               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Documents are now in Supabase Storage!"
    echo ""
    echo "To view in BlocIQ:"
    echo "  → Navigate to: /buildings/466b1264-275a-4bf0-85ce-26ab8b3839ea/documents"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Upload failed. Check the error messages above.${NC}"
    exit 1
fi
