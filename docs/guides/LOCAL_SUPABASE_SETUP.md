# 🚀 Local Supabase Development Setup

This guide will help you connect the BlocIQ project to a local Supabase instance running via Docker.

## ✅ Prerequisites

1. **Docker Desktop** - Make sure Docker is running
2. **Node.js** - Version 18 or higher
3. **Supabase CLI** - We'll install this automatically

## 📋 Step 1: Install Supabase CLI

The project includes an automated setup script. Run:

```bash
node scripts/setup-local-supabase.js
```

This script will:
- ✅ Check if Supabase CLI is installed
- ✅ Install Supabase CLI if needed
- ✅ Create local environment configuration
- ✅ Start local Supabase instance
- ✅ Test the connection

## 🔧 Manual Setup (Alternative)

If the automated script doesn't work, follow these manual steps:

### 1. Install Supabase CLI

```bash
npm install -g @supabase/cli
```

### 2. Start Local Supabase

```bash
supabase start
```

This will start:
- **API**: http://localhost:54321
- **Studio**: http://localhost:54323
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres

### 3. Configure Environment Variables

Create or update `.env.local` with:

```env
# Local Supabase Development Settings
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Keep existing settings
OPENAI_API_KEY=your-openai-key
MICROSOFT_TENANT_ID=your-tenant-id
# ... other existing settings
```

## 🧪 Step 2: Test Connection

Run the test script to verify everything is working:

```bash
node scripts/test-local-supabase.js
```

This will test:
- ✅ Basic connection to local Supabase
- ✅ Table access (buildings, incoming_emails, leaseholders, units)
- ✅ Authentication system

## 🚀 Step 3: Start Development

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - **App**: http://localhost:3000
   - **Supabase Studio**: http://localhost:54323

## 📊 Step 4: Verify Cursor Can Reach It

The local Supabase instance should be accessible to Cursor. Test with:

```javascript
// In any component or script
const { data, error } = await supabase.from('buildings').select('*')
console.log('Buildings:', data)
```

## 🔄 Database Migrations

The project includes migrations in `supabase/migrations/`. To apply them:

```bash
supabase db reset
```

This will:
- ✅ Apply all migrations
- ✅ Seed the database with sample data
- ✅ Set up the complete schema

## 🛠️ Useful Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# Reset database (apply migrations + seed)
supabase db reset

# View logs
supabase logs

# Open Studio
supabase studio
```

## 🌐 Available URLs

When running locally:

- **BlocIQ App**: http://localhost:3000
- **Supabase API**: http://localhost:54321
- **Supabase Studio**: http://localhost:54323
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres
- **Email Testing**: http://localhost:54324

## 🔍 Troubleshooting

### Issue: "Connection refused"
- Make sure Docker Desktop is running
- Run `supabase start` again
- Check if ports 54321-54324 are available

### Issue: "Table doesn't exist"
- Run `supabase db reset` to apply migrations
- Check `supabase/migrations/` for schema files

### Issue: "Environment variables not loading"
- Make sure `.env.local` exists in project root
- Restart the development server: `npm run dev`

### Issue: "Cursor can't reach localhost"
- If Cursor is running in a cloud environment, it cannot access localhost
- Consider using ngrok: `ngrok http 54321`
- Or deploy Supabase to a remote instance

## 📝 Next Steps

1. ✅ **Test the inbox page** - Should now work with local data
2. ✅ **Verify all features** - Buildings, communications, etc.
3. ✅ **Check authentication** - Sign up/sign in should work
4. ✅ **Test email sync** - Outlook integration with local data

## 🎉 Success!

You now have a fully functional local Supabase development environment! The BlocIQ application will now use local data instead of the production database.

---

**Note**: The local Supabase instance uses demo keys that are safe for development. Never use these keys in production. 