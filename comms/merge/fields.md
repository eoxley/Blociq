# Mail-Merge Fields Contract

This document defines the safe placeholders available for use in communication templates (letters and emails).

## Field Naming Convention

All merge fields use the format `{{namespace.field}}` with snake_case naming.

## Available Merge Fields

### Building Fields
- `{{building.name}}` - Building name (e.g., "Ashwood House")
- `{{building.address_line_1}}` - Primary address line
- `{{building.address_line_2}}` - Secondary address line (if available)
- `{{building.town}}` - Town/city
- `{{building.county}}` - County (if available)
- `{{building.postcode}}` - Postcode

### Unit Fields
- `{{unit.label}}` - Unit label (e.g., "Flat 8")
- `{{unit.number}}` - Unit number
- `{{unit.type}}` - Unit type (e.g., "Flat", "House")

### Lease Fields
- `{{lease.service_charge_percent}}` - Service charge percentage
- `{{lease.start_date}}` - Lease start date (DD/MM/YYYY format)
- `{{lease.end_date}}` - Lease end date (DD/MM/YYYY format)
- `{{lease.rent_amount}}` - Monthly rent amount
- `{{lease.deposit_amount}}` - Deposit amount
- `{{lease.type}}` - Lease type
- `{{lease.break_clause_date}}` - Break clause date (if applicable)
- `{{lease.renewal_date}}` - Renewal date (if applicable)
- `{{lease.insurance_required}}` - Insurance requirement (true/false)
- `{{lease.pet_clause}}` - Pet clause details
- `{{lease.subletting_allowed}}` - Subletting permission (true/false)

### Recipient Fields
- `{{recipient.salutation}}` - Resolved salutation (with fallback applied)
- `{{recipient.name}}` - Full name of leaseholder
- `{{recipient.postal_address}}` - Correspondence address (prefers correspondence, fallback to unit)
- `{{recipient.email}}` - Email address (lowercase)
- `{{recipient.uses_unit_as_postal}}` - Boolean flag if using unit address

### System Fields
- `{{today}}` - Current date (DD/MM/YYYY format, Europe/London timezone)

## Conditional Fields

### Address Handling
- `{{recipient.uses_unit_as_postal ? 'RESIDENT' : ''}}` - Shows "RESIDENT" if using unit address
- `{{recipient.postal_address ? recipient.postal_address : 'No address on file'}}` - Fallback for missing addresses

### Email Handling
- `{{recipient.email ? 'Email: ' + recipient.email : 'No email on file'}}` - Conditional email display

## Field Validation

### Required Fields
These fields are always present and safe to use:
- `{{building.name}}`
- `{{building.address_line_1}}`
- `{{building.town}}`
- `{{building.postcode}}`
- `{{unit.label}}`
- `{{recipient.salutation}}`
- `{{today}}`

### Optional Fields
These fields may be null/empty and should be handled with fallbacks:
- `{{building.address_line_2}}`
- `{{building.county}}`
- `{{recipient.postal_address}}`
- `{{recipient.email}}`
- `{{lease.break_clause_date}}`
- `{{lease.renewal_date}}`

## Template Examples

### Letter Template
```
Dear {{recipient.salutation}},

Re: {{building.name}} - {{unit.label}}

We are writing to inform you about upcoming maintenance work...

Yours sincerely,
Management Team
{{building.name}}
{{building.address_line_1}}
{{building.town}} {{building.postcode}}
```

### Email Template
```
Subject: {{building.name}} - {{unit.label}} - Important Notice

Dear {{recipient.salutation}},

We are writing to inform you about upcoming maintenance work...

Best regards,
Management Team
{{building.name}}
```

## Field Resolution Logic

### Salutation Resolution
1. Use `leaseholder.salutation` if present and not empty
2. If multiple leaseholders on same lease:
   - If names contain '&', join with ' & '
   - Otherwise, join with ', '
3. Fallback to individual names

### Address Resolution
1. Use `leaseholder.correspondence_address` if present
2. Fallback to `unit.postal_address`
3. Set `uses_unit_as_postal` flag accordingly

### Email Resolution
1. Convert to lowercase
2. Remove null/blank values
3. Apply opt-out filtering
4. Dedupe by address

## Error Handling

### Missing Fields
If a required field is missing, the merge engine will:
1. Log the missing field for that recipient
2. Use a fallback value if defined
3. Mark the recipient as having validation errors

### Invalid Data
If field data is invalid (e.g., malformed dates), the merge engine will:
1. Log the validation error
2. Use a safe fallback value
3. Continue processing other recipients

## Security Considerations

- All field values are HTML-escaped by default
- No user input is directly inserted into templates
- Field names are validated against the allowed list
- RLS ensures users only see their agency's data

## Performance Notes

- Fields are precomputed in the `v_building_recipients` view
- Complex calculations are done at query time
- Consider caching for large recipient lists
- Use pagination for very large datasets
