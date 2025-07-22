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
OUTLOOK_CLIENT_ID=your_microsoft_client_id
OUTLOOK_CLIENT_SECRET=your_microsoft_client_secret
OUTLOOK_TENANT_ID=your_tenant_id_or_common
OUTLOOK_REDIRECT_URI=https://your-domain.com/auth/callback

# Client-side variables (for OAuth flow)
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=https://your-domain.com/auth/callback
```

#### OpenAI Configuration
```bash
OPENAI_API_KEY=your_openai_api_key
```

#### Cron Job Configuration
```bash
CRON_SECRET=your_cron_secret_key_for_vercel_cron_jobs
```

#### Site Configuration
```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### Google Cloud Configuration (Optional - for OCR)
```bash
GOOGLE_APPLICATION_CREDENTIALS=path_to_your_service_account_key.json
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
5. **Cron Jobs**: Added CRON_SECRET for secure Vercel cron job authentication

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
2. **Add CRON_SECRET**: Generate a secure random string for cron job authentication
3. **Run Database Migration**: Execute the `outlook_tokens` table creation
4. **Update Application**: The code now uses user-specific tokens instead of hardcoded email
5. **User Connection**: Users will need to connect their Outlook accounts individually

### Benefits

- ✅ **Multi-tenant**: Each user has their own Outlook connection
- ✅ **Secure**: No hardcoded credentials in environment variables
- ✅ **Scalable**: Supports multiple users with different Outlook accounts
- ✅ **Automatic**: Token refresh and management is handled automatically
- ✅ **User-friendly**: Simple OAuth flow for connecting accounts
- ✅ **Cron Security**: Secure authentication for automated email sync

### Deployment Checklist

Before deploying, ensure all these environment variables are set in your Vercel project:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OUTLOOK_CLIENT_ID`
- [ ] `OUTLOOK_CLIENT_SECRET`
- [ ] `OUTLOOK_TENANT_ID`
- [ ] `OUTLOOK_REDIRECT_URI`
- [ ] `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`
- [ ] `NEXT_PUBLIC_MICROSOFT_REDIRECT_URI`
- [ ] `OPENAI_API_KEY`
- [ ] `CRON_SECRET`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` (optional) 