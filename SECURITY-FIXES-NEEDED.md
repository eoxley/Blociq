# CRITICAL SECURITY FIXES NEEDED

## 🚨 IMMEDIATE ACTION REQUIRED

The following API endpoints are exposing data across agencies and must be fixed immediately:

### 1. `/api/buildings` - LIST ALL BUILDINGS
**File**: `app/api/buildings/route.ts`
**Issue**: Returns ALL buildings from ALL agencies
**Fix**: Add agency filtering via user's profile

### 2. `/api/buildings/[id]` - GET SPECIFIC BUILDING
**File**: `app/api/buildings/[id]/route.ts`
**Issue**: Any user can access any building by ID
**Fix**: Verify building belongs to user's agency

### 3. `/api/buildings/search` - SEARCH BUILDINGS
**File**: `app/api/buildings/search/route.ts`
**Issue**: Search returns results from all agencies
**Fix**: Scope search to user's agency only

### 4. `/api/leaseholders` - LEASEHOLDER DATA
**File**: `app/api/leaseholders/route.ts`
**Issue**: Can access leaseholders from other agencies' units
**Fix**: Verify unit belongs to user's agency

### 5. POTENTIAL ISSUES TO VERIFY:
- All other building-related endpoints
- Unit-related endpoints
- Document access endpoints
- Communication endpoints

## ROOT CAUSE
These API endpoints use direct Supabase queries that bypass RLS policies. They need server-side agency filtering.

## IMPACT
- Users can see buildings from other agencies
- Users can access leaseholder data from other agencies
- Potential full data breach across agency boundaries

## STATUS: CRITICAL - FIX IMMEDIATELY