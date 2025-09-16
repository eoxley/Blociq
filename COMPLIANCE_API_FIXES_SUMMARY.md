# Compliance API 500 Errors - Fixes Summary

## Issues Identified

### 1. Asset Fetch Errors (500 Status)
**Problem**: The compliance asset fetch API was failing when the frontend passed `building_compliance_assets.id` instead of `compliance_asset_id`.

**Error Messages Seen**:
```
Failed to load resource: the server responded with a status of 500 () (b63c4eb1-2696-42b4-aa56-e50c2b811e10)
Error fetching asset data: Failed to fetch asset data: 500 {"error":"Failed to fetch asset details"}
```

**Root Cause**: The API endpoint `/api/compliance/assets/[assetId]/route.ts` was only querying by `compliance_asset_id`, but the frontend was sometimes passing the `building_compliance_assets.id` UUID instead.

### 2. Asset Save Errors (500 Status)
**Problem**: Similar issue with the PUT endpoint - it couldn't handle both types of IDs.

**Error Messages Seen**:
```
Error saving asset: Failed to save asset: 500 {"error":"Internal server error"}
```

### 3. Detailed Compliance API Errors (500 Status)
**Problem**: Import path issues and potential async/await problems in the detailed compliance endpoint.

**Error Messages Seen**:
```
Failed to load resource: the server responded with a status of 500 () (detailed)
Detailed API not available, skipping asset details
```

## Fixes Applied

### ✅ Fix 1: Asset Fetch API (`/api/compliance/assets/[assetId]/route.ts`)

**Changes Made**:
1. **Updated Supabase Import**: Changed from deprecated `@/utils/supabase/server` to `@/lib/supabase/server`
2. **Added Dual ID Lookup**: Now tries both lookup methods:
   - First: By `building_compliance_assets.id` (direct UUID match)
   - Fallback: By `building_compliance_assets.asset_id` (compliance asset reference)
3. **Fixed Foreign Key Relationship**: Used proper `compliance_assets!asset_id` syntax
4. **Dynamic Document Query**: Uses the correct asset ID for document lookup

**Code Changes**:
```typescript
// Before: Single lookup method
.eq('compliance_asset_id', assetId)

// After: Dual lookup with fallback
const { data: directAsset } = await supabase
  .eq('id', assetId)  // Try direct ID first

// If that fails, try asset reference
const { data: refAsset } = await supabase
  .eq('asset_id', assetId)  // Fallback to asset reference
```

### ✅ Fix 2: Asset Save API (Same file, PUT method)

**Changes Made**:
1. **Same dual ID approach** for updates
2. **Proper error handling** for both lookup methods
3. **Maintained existing update logic** while fixing ID resolution

### ✅ Fix 3: Detailed Compliance API (`/api/portfolio/compliance/detailed/route.ts`)

**Changes Made**:
1. **Added missing import**: `import { cookies } from 'next/headers'`
2. **Verified async/await pattern** is correct for the createClient function

## Expected Results

### Before Fixes
- ❌ Asset fetch fails with 500 error when frontend passes building compliance asset UUID
- ❌ Asset save fails with 500 error for same reason
- ❌ Buildings disappear from compliance page due to detailed API failures
- ❌ User cannot edit compliance asset details

### After Fixes
- ✅ Asset fetch works with both ID types (building compliance asset ID and compliance asset ID)
- ✅ Asset save operations work correctly
- ✅ Buildings remain visible even if detailed API has issues
- ✅ Users can successfully edit compliance asset details
- ✅ Error handling is more robust with proper fallbacks

## Deployment Requirements

### Files Changed
1. `/app/api/compliance/assets/[assetId]/route.ts` - Major refactor for dual ID support
2. `/app/api/portfolio/compliance/detailed/route.ts` - Import fix
3. `/app/(dashboard)/compliance/page.tsx` - Error handling improvement (from previous fix)

### Testing Checklist
After deployment, verify:

1. **Asset Fetch Test**:
   ```bash
   curl -X GET "https://www.blociq.co.uk/api/compliance/assets/b63c4eb1-2696-42b4-aa56-e50c2b811e10?buildingId=2beeec1d-a94e-4058-b881-213d74cc6830"
   ```
   Should return asset details instead of 500 error.

2. **Asset Save Test**:
   - Open compliance page
   - Click edit on any asset
   - Make a change and save
   - Should succeed without 500 error

3. **Buildings Visibility Test**:
   - Navigate to compliance page
   - Buildings should remain visible even if detailed API fails
   - No more "buildings disappearing" issue

4. **Console Error Check**:
   - Check browser console for the specific error messages
   - Should no longer see the 500 error logs mentioned above

## Impact Assessment

### User Experience
- **Critical Fix**: Users can now edit compliance assets without errors
- **Reliability**: No more random 500 errors when managing compliance
- **Data Integrity**: Buildings no longer disappear from compliance view

### Technical Benefits
- **Robust API**: Handles both ID formats the frontend might send
- **Better Error Handling**: More specific error messages for debugging
- **Future-Proof**: Won't break if frontend changes how it passes IDs

## Rollback Plan

If issues arise after deployment:

1. **Quick Rollback**: Revert the `/api/compliance/assets/[assetId]/route.ts` file
2. **Identify Issue**: Check server logs for new error patterns
3. **Incremental Fix**: Deploy fixes one at a time to isolate any problems

## Monitoring

After deployment, monitor:
- **API Response Times**: Ensure dual lookup doesn't impact performance significantly
- **Error Rates**: Should see dramatic reduction in 500 errors from compliance endpoints
- **User Feedback**: Users should report fewer "unable to save" issues

---

**Status**: ✅ Ready for deployment
**Priority**: High - Affects core compliance management functionality
**Risk Level**: Low - Fixes are defensive and maintain backward compatibility