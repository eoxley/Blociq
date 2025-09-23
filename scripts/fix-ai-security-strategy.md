# AI Assistant Security Fix Strategy

## APPROACH: Safe Data Filtering at Source

### Step 1: Add Agency Context Parameter
- Pass user's agency_id to all gather functions
- Maintain existing function signatures for compatibility

### Step 2: Minimal Changes Per Function
- Add single `.eq('agency_id', userAgencyId)` filter
- Preserve all existing logic and error handling
- No changes to AI prompts or response logic

### Step 3: Test Each Function Individually
- Verify data filtering works
- Ensure AI responses remain accurate
- Check no functionality is broken

## EXAMPLE FIX (Low Risk):

```typescript
// BEFORE (vulnerable)
async function gatherBuildingData(supabase: any, buildingId?: string) {
  let query = supabase.from('buildings').select('*')
  if (buildingId) query = query.eq('id', buildingId)
  const { data: buildings } = await query
  return buildingId ? buildings?.[0] : buildings
}

// AFTER (secure)
async function gatherBuildingData(supabase: any, userAgencyId: string, buildingId?: string) {
  let query = supabase.from('buildings').select('*').eq('agency_id', userAgencyId)
  if (buildingId) query = query.eq('id', buildingId)
  const { data: buildings } = await query
  return buildingId ? buildings?.[0] : buildings
}
```

## BENEFITS:
- ✅ Complete security - no cross-agency data access
- ✅ Better performance - only loads relevant data
- ✅ Lower costs - fewer tokens to OpenAI
- ✅ Minimal risk - simple filter additions
- ✅ Maintains all existing AI functionality

## RISK LEVEL: LOW
- Simple database filter additions
- No AI logic changes
- Easy to test and verify
- Can be reverted quickly if issues arise