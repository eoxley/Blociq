#!/usr/bin/env bash

echo "🧪 Testing Build Detection Logic"
echo "================================"

# Test 1: Frontend files should trigger build
echo "Test 1: Frontend files (should trigger build)"
echo "app/page.tsx" | grep -q "^app/" && ! echo "app/page.tsx" | grep -q "^app/api/" && echo "✅ app/page.tsx triggers build" || echo "❌ app/page.tsx should trigger build"

# Test 2: Public files (excluding addin) should trigger build
echo "Test 2: Public files excluding addin (should trigger build)"
echo "public/image.png" | grep -q "^public/" && ! echo "public/image.png" | grep -q "^public/addin/" && echo "✅ public/image.png triggers build" || echo "❌ public/image.png should trigger build"

# Test 3: Addin files should NOT trigger build
echo "Test 3: Addin files (should NOT trigger build)"
echo "public/addin/test.js" | grep -q "^public/" && ! echo "public/addin/test.js" | grep -q "^public/addin/" && echo "❌ public/addin/test.js should NOT trigger build" || echo "✅ public/addin/test.js does NOT trigger build"

# Test 4: API files should NOT trigger build
echo "Test 4: API files (should NOT trigger build)"
echo "app/api/test/route.ts" | grep -q "^app/" && ! echo "app/api/test/route.ts" | grep -q "^app/api/" && echo "❌ app/api/test/route.ts should NOT trigger build" || echo "✅ app/api/test/route.ts does NOT trigger build"

echo ""
echo "📋 Summary:"
echo "- Frontend files (app/, components/, pages/, etc.) → TRIGGER BUILD"
echo "- Public files (excluding addin/) → TRIGGER BUILD"  
echo "- Addin files (public/addin/) → NO BUILD"
echo "- API files (app/api/) → NO BUILD"
echo "- Backend-only changes → NO BUILD"
