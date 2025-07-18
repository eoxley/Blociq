# UK Letter Formatting for BlocIQ Templates

## Overview

BlocIQ now supports automatic UK letter formatting for templates with `type = "letter"`. When a letter template is processed, the system automatically applies British letter formatting conventions including proper date formatting, address blocks, and sign-offs.

## Implementation Details

### 1. Template Type Detection

The system checks if `template.type === "letter"` in the `/api/generate-doc` endpoint and applies UK formatting accordingly.

### 2. Date Formatting

**Input:** `{{today_date}}` (any date string)
**Output:** `19 July 2025` (no comma, British format)

```javascript
function formatUKDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
```

### 3. Address Block Generation

**Automatic Generation:** The system creates a properly formatted address block from available data:

```
Flat 7
Ashwood House
123 High Street
London
SW1A 1AA
```

**Required Fields:**
- `unit_number` (optional)
- `building_name`
- `building_address_line1`
- `building_city`
- `building_postcode`

**Placeholder:** `{{address_block}}` (automatically injected)

### 4. Sign-Off Logic

**Automatic Detection:**
- If `{{recipient_name}}` is known and not generic → `Yours sincerely,`
- If generic (Sir/Madam/Occupier) or unknown → `Yours faithfully,`

**Format:**
```
Yours sincerely,

Ellie Oxley
BlocIQ Property Management
```

### 5. Document Structure

**Standard UK Letter Layout:**
```
19 July 2025

Flat 7
Ashwood House
123 High Street
London
SW1A 1AA

Dear John Smith,

[Letter body content]

Yours sincerely,

Ellie Oxley
BlocIQ Property Management
```

## Template Creation

### Letter Template Example

```sql
INSERT INTO templates (name, type, description, storage_path, content_text, placeholders) VALUES
(
    'UK Standard Letter Template',
    'letter',
    'Professional UK-formatted letter template with proper address block, date formatting, and sign-off.',
    'templates/uk_letter_template.docx',
    '{{today_date}}\n\n{{address_block}}\n\nDear {{recipient_name}},\n\n{{letter_body}}\n\n{{sign_off}}',
    ARRAY['today_date', 'address_block', 'recipient_name', 'letter_body', 'sign_off', 'unit_number', 'building_name', 'building_address_line1', 'building_city', 'building_postcode', 'property_manager_name']
);
```

### Required Placeholders for Letters

- `{{today_date}}` - Automatically formatted as UK date
- `{{address_block}}` - Automatically generated from building data
- `{{recipient_name}}` - Used for salutation and sign-off logic
- `{{letter_body}}` - Main content of the letter
- `{{sign_off}}` - Automatically generated based on recipient

### Optional Building Data Placeholders

- `{{unit_number}}` - For address block
- `{{building_name}}` - For address block
- `{{building_address_line1}}` - For address block
- `{{building_city}}` - For address block
- `{{building_postcode}}` - For address block
- `{{property_manager_name}}` - For sign-off

## API Usage

### Generate Document with Letter Formatting

```javascript
const response = await fetch('/api/generate-doc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'letter-template-id',
    buildingId: 'building-id',
    placeholderData: {
      recipient_name: 'John Smith',
      letter_body: 'This is the main content of the letter...',
      unit_number: '7',
      building_name: 'Ashwood House',
      building_address_line1: '123 High Street',
      building_city: 'London',
      building_postcode: 'SW1A 1AA',
      property_manager_name: 'Ellie Oxley',
      today_date: new Date().toISOString()
    }
  })
});
```

## Database Schema Updates

### Template Type Constraint

```sql
-- Updated constraint to include 'letter' type
ALTER TABLE templates ADD CONSTRAINT templates_type_check 
CHECK (type IN ('welcome_letter', 'notice', 'form', 'invoice', 'legal_notice', 'section_20', 'letter'));
```

### Letter Templates View

```sql
CREATE OR REPLACE VIEW letter_templates AS
SELECT 
    id,
    name,
    description,
    content_text,
    placeholders,
    created_at
FROM templates 
WHERE type = 'letter'
ORDER BY created_at DESC;
```

## Code Implementation

### Core Functions

1. **`formatUKDate()`** - Converts any date to UK format
2. **`generateAddressBlock()`** - Creates formatted address from building data
3. **`determineSignOff()`** - Logic for Yours sincerely/faithfully
4. **`processLetterData()`** - Main processing function for letter templates

### File Locations

- **API Endpoint:** `app/api/generate-doc/route.ts`
- **Placeholder Processing:** `lib/replacePlaceholders.ts`
- **Database Migration:** `scripts/updateTemplateTypes.sql`

## Benefits

1. **Consistency** - All letters follow UK formatting standards
2. **Automation** - No manual formatting required
3. **Professional** - Proper British business letter format
4. **Flexible** - Works with existing template system
5. **Maintainable** - Centralized formatting logic

## Future Enhancements

1. **Document Styles** - Add base DOCX styles for letters (1.15 spacing, Times New Roman 11pt)
2. **Advanced Detection** - Better logic for generic vs specific recipients
3. **Custom Sign-offs** - Allow property manager customization
4. **Address Validation** - UK postcode validation
5. **Template Variants** - Different letter styles (formal, informal, legal)

## Testing

To test the UK letter formatting:

1. Create a template with `type = 'letter'`
2. Include the required placeholders
3. Generate a document through the API
4. Verify the output follows UK formatting standards

The system automatically applies all formatting rules when `template.type === "letter"`. 