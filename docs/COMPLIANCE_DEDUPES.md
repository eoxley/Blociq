# Compliance Assets Deduplication System

## Overview

The compliance assets deduplication system prevents duplicate compliance items from being created while maintaining data consistency and user experience. It uses normalisation and canonicalisation to identify similar assets and merge them appropriately.

## How It Works

### 1. Text Normalisation

The `normaliseText()` function standardises text by:
- Converting to lowercase
- Replacing special characters (`–`, `—`, `&`, `/`, `()`, `{}`, `[]`, etc.)
- Normalising whitespace
- Removing punctuation

Example:
```
"Fire Risk Assessment (FRA)" → "fire risk assessment fra"
"EICR (Communal fixed wiring)" → "eicr communal fixed wiring"
"Lifts & Access" → "lifts and access"
```

### 2. Category Canonicalisation

The `canonicaliseCategory()` function maps similar category names to standard ones:

| Input | Canonical Output |
|-------|------------------|
| `Lifts` | `Lifts & Access` |
| `Lift` | `Lifts & Access` |
| `Water` | `Water Hygiene` |
| `Gas Safety` | `Gas & HVAC` |
| `Asbestos Survey` | `Asbestos` |

### 3. Title Canonicalisation

The `canonicaliseTitle()` function maps similar asset titles to standard ones:

| Input | Canonical Output |
|-------|------------------|
| `FRA` | `Fire Risk Assessment (FRA)` |
| `fire risk assessment` | `Fire Risk Assessment (FRA)` |
| `EICR` | `Electrical Installation Condition Report (EICR)` |
| `electrical installation condition report` | `Electrical Installation Condition Report (EICR)` |
| `Lift autodial` | `Lift Autodialler – Functional Test (EN 81-28)` |

### 4. Frequency Label Derivation

The `deriveFrequencyLabel()` function automatically generates human-readable frequency labels from numeric months:

| Months | Label |
|--------|-------|
| 1 | Monthly |
| 3 | Quarterly |
| 6 | 6-Monthly |
| 12 | Annual |
| 24 | 2-Yearly |
| 36 | 3-Yearly |
| 60 | 5-Yearly |
| 120 | 10-Yearly |

## Database Schema

The system relies on two additional columns in the `compliance_assets` table:

- `norm_category`: Normalised category for deduplication
- `norm_title`: Normalised title for deduplication

These columns have a unique constraint `(norm_category, norm_title)` to prevent duplicates.

## API Endpoints

### POST `/api/compliance-assets/upsert`

Creates or updates compliance assets with deduplication:

**Request Body:**
```json
{
  "title": "FRA",
  "category": "Fire Safety",
  "description": "Fire risk assessment",
  "frequency_months": 12,
  "frequency": "Annual"
}
```

**Response:**
```json
{
  "success": true,
  "action": "updated", // or "created"
  "asset": {
    "id": "uuid",
    "title": "Fire Risk Assessment (FRA)",
    "category": "Fire Safety",
    "frequency": "Annual"
  },
  "message": "Asset updated successfully (merged with existing record)"
}
```

### GET `/api/compliance-assets/upsert`

Returns all compliance assets grouped by category with deduplication information.

## Frontend Integration

### Duplicate Detection

The compliance setup modal automatically detects potential duplicates when users select assets:

1. **Real-time Warnings**: Shows amber warning boxes for assets that will be merged
2. **Clear Messaging**: Explains which assets will be merged and why
3. **Preventive UI**: Users can see duplicates before saving

### Example Warning

```
⚠️ Duplicate Warning
This asset will be merged with similar items in "Fire Safety" (e.g., "Fire Risk Assessment (FRA)")
```

## SQL Migration

The following SQL was run to set up the deduplication system:

```sql
-- Add normalisation columns
ALTER TABLE compliance_assets 
ADD COLUMN norm_title VARCHAR(255),
ADD COLUMN norm_category VARCHAR(255);

-- Create unique constraint
ALTER TABLE compliance_assets 
ADD CONSTRAINT unique_norm_asset UNIQUE (norm_category, norm_title);

-- Create indexes for performance
CREATE INDEX idx_compliance_assets_norm_title ON compliance_assets(norm_title);
CREATE INDEX idx_compliance_assets_norm_category ON compliance_assets(norm_category);

-- Populate existing data
UPDATE compliance_assets 
SET 
  norm_title = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', ' ', 'g'), '\s+', ' ')),
  norm_category = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(category, '[^a-zA-Z0-9\s]', ' ', 'g'), '\s+', ' '));
```

## Benefits

1. **Prevents Duplicates**: No more duplicate "FRA" vs "Fire Risk Assessment" entries
2. **Maintains Consistency**: Standardised naming across all buildings
3. **User Experience**: Clear warnings about what will happen
4. **Data Quality**: Clean, normalised compliance data
5. **Performance**: Fast lookups using normalised columns

## Testing

Run the test suite to verify normalisation works correctly:

```bash
npm test src/lib/compliance/normalise.test.ts
```

## Future Enhancements

1. **Machine Learning**: Use AI to suggest better canonical titles
2. **Bulk Import**: Handle CSV imports with automatic deduplication
3. **Audit Trail**: Track when assets are merged and by whom
4. **Custom Aliases**: Allow users to define building-specific aliases
5. **Internationalisation**: Support for multiple languages and compliance standards
