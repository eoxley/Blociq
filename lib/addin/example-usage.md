# Name Extraction Usage Example

The new name extraction utility reliably extracts sender names from email sign-offs to create personalized salutations.

## Usage in Draft Generation

```typescript
// In /app/api/outlook/draft/route.ts
import { extractSenderNameFromLatestMessage } from '@/lib/addin/name-extraction';

// Extract sender name from email sign-off
const extractedName = extractSenderNameFromLatestMessage(
  rawEmailBody,           // Full email HTML/text
  outlookDisplayName      // Fallback from Outlook
);

// Use in salutation
const salutation = `Dear ${extractedName},`;
```

## Example Extractions

### Example 1: Standard Sign-off
**Input:**
```
Hello,

I have a leak in my bathroom that started yesterday.
Can someone please come and take a look?

Kind regards,
Jennifer Smith
Flat 4B
```

**Extracted Name:** `Jennifer Smith`
**Salutation:** `Dear Jennifer Smith,`

### Example 2: Multi-line Sign-off
**Input:**
```
Hi there,

The heating in my unit isn't working properly.

Best regards,

Emma Johnson
Unit 12A
Riverside Building
```

**Extracted Name:** `Emma Johnson`
**Salutation:** `Dear Emma Johnson,`

### Example 3: HTML Email with Quoted Reply
**Input:**
```html
<div>
  <p>Hello,</p>
  <p>Following up on my previous email about the broken lift.</p>
  <p>Thanks,<br>David Wilson</p>
</div>

<div style="border-top:1px solid #ccc">
  <p>From: building@management.com</p>
  <p>Sent: Monday, 23 September 2024</p>
  <p>We'll look into this issue...</p>
</div>
```

**Extracted Name:** `David Wilson`
**Salutation:** `Dear David Wilson,`

### Example 4: No Sign-off, Uses Last Line
**Input:**
```
Hello,

My fire alarm has been beeping all night.
Please send someone urgently.

Maria Rodriguez
```

**Extracted Name:** `Maria Rodriguez`
**Salutation:** `Dear Maria Rodriguez,`

### Example 5: Fallback to Outlook Display Name
**Input:**
```
Hello,

The door lock is broken.
Please fix ASAP.
```

**Outlook Display Name:** `Thomas Brown`
**Extracted Name:** `Thomas Brown`
**Salutation:** `Dear Thomas Brown,`

### Example 6: Final Fallback
**Input:**
```
Hello,

Need help with maintenance issue.
```

**Outlook Display Name:** `user@email.com` (ignored)
**Extracted Name:** `Resident`
**Salutation:** `Dear Resident,`

## Integration Points

1. **Taskpane UI** (`/app/addin/reply/page.tsx`):
   - Fetches both HTML and text versions of email body
   - Captures sender display name from Outlook
   - Passes both to draft generation API

2. **Draft API** (`/app/api/outlook/draft/route.ts`):
   - Receives raw email body and Outlook display name
   - Uses name extraction utility with fallback chain
   - Generates personalized salutation

3. **Legacy Route** (`/app/api/addin/generate-reply/route.ts`):
   - Backwards compatible with existing calls
   - Passes email body to draft generation for name extraction

## Fallback Chain

1. **Sign-off extraction** from latest message (e.g., "Kind regards, John Smith")
2. **Last line analysis** for likely names if no sign-off found
3. **Outlook display name** if provided and valid
4. **"Resident"** as final fallback

This ensures every generated reply has a proper salutation, making the AI responses feel more personal and professional.