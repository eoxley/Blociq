# Environment Variables Setup

## Updated Configuration (After Outlook Token Integration)

### Required Environment Variables

#### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Microsoft OAuth Configuration
```bash
# Server-side variables
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/outlook/callback

# Client-side variables (for OAuth flow)
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:3000/api/outlook/callback
```

#### OpenAI Configuration
```bash
OPENAI_API_KEY=your_openai_api_key
```

#### Other Configuration
```bash
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Removed Variables

The following variable has been **removed** as it's no longer needed:

```bash
# ❌ REMOVED - No longer needed
OUTLOOK_USER_EMAIL=hardcoded_email@example.com
```

### What Changed

1. **Multi-tenant Outlook Integration**: Each user now stores their own Outlook tokens in the database
2. **OAuth Flow**: Users connect their Outlook accounts individually through OAuth
3. **Token Management**: Tokens are automatically refreshed and managed per user
4. **Security**: No more hardcoded email addresses in environment variables

### Database Schema

The system now uses the `outlook_tokens` table:

```sql
CREATE TABLE outlook_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);
```

### Migration Steps

1. **Update Environment Variables**: Remove `OUTLOOK_USER_EMAIL` and add Microsoft OAuth variables
2. **Run Database Migration**: Execute the `outlook_tokens` table creation
3. **Update Application**: The code now uses user-specific tokens instead of hardcoded email
4. **User Connection**: Users will need to connect their Outlook accounts individually

### Benefits

- ✅ **Multi-tenant**: Each user has their own Outlook connection
- ✅ **Secure**: No hardcoded credentials in environment variables
- ✅ **Scalable**: Supports multiple users with different Outlook accounts
- ✅ **Automatic**: Token refresh and management is handled automatically
- ✅ **User-friendly**: Simple OAuth flow for connecting accounts 