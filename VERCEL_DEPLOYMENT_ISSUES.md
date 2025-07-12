# Vercel Deployment Issues and Solutions

## 🚨 Critical Issues Found

### 1. **Build Failure - Missing Environment Variables**
**Issue:** The build fails because `OPENAI_API_KEY` environment variable is missing.
```
Error: The OPENAI_API_KEY environment variable is missing or empty
```

**Solution:**
- Add environment variables in your Vercel project settings
- Go to your Vercel dashboard → Your project → Settings → Environment Variables
- Add: `OPENAI_API_KEY` with your OpenAI API key

### 2. **Large File Problem - bfg.jar (14.7MB)**
**Issue:** The `bfg.jar` file (14.7MB) is not in `.gitignore` and is being committed to your repository.
- Vercel has deployment size limits
- Large files can cause deployment timeouts and failures

**Solution:**
Add `bfg.jar` to your `.gitignore` file:
```
# Add to .gitignore
bfg.jar
```

### 3. **CSS Build Error - Unknown Utility Class**
**Issue:** Tailwind CSS error with unknown utility class `font-brand`.
```
[Error: Cannot apply unknown utility class `font-brand`]
```

**Solution:**
- Define the `font-brand` utility in your `tailwind.config.js`
- Or find and replace `font-brand` with a standard Tailwind class

### 4. **Node.js Version Compatibility**
**Issue:** You're using React 19.0.0 and Next.js 15.3.4, which are very recent versions.
- Vercel might not fully support these versions yet
- Could cause compatibility issues

**Solution:**
Consider downgrading to more stable versions:
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "next": "^14.0.0"
}
```

### 5. **Security Vulnerability**
**Issue:** npm audit shows "1 high severity vulnerability"

**Solution:**
Run `npm audit fix` to resolve security issues before deployment.

## 🔧 Step-by-Step Fix Instructions

### Step 1: Fix Environment Variables
1. In Vercel dashboard, go to your project settings
2. Add these environment variables:
   - `OPENAI_API_KEY` (your OpenAI API key)
   - Microsoft Graph API credentials for email fetching
   - Any other API keys your app uses

**ALL Required Environment Variables:**
- `OPENAI_API_KEY` ✅ (already set)
- `OUTLOOK_CLIENT_ID` ❌ (missing - for email fetching)
- `OUTLOOK_CLIENT_SECRET` ❌ (missing - for email fetching)
- `OUTLOOK_TENANT_ID` ❌ (missing - for email fetching)
- `NEXT_PUBLIC_SUPABASE_URL` ❌ (missing - for database)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ❌ (missing - for database)
- `SUPABASE_SERVICE_ROLE_KEY` ❌ (missing - for server operations)
- `GOOGLE_APPLICATION_CREDENTIALS` ❌ (missing - for OCR/document processing)

### Step 2: Fix Large File Issue
1. Add `bfg.jar` to `.gitignore`
2. Remove it from git history:
   ```bash
   git rm --cached bfg.jar
   git commit -m "Remove large bfg.jar file from tracking"
   ```

### Step 3: Fix CSS Issue
1. Check your `tailwind.config.js`
2. Add the `font-brand` utility or replace it with a standard class

### Step 4: Fix Dependencies
1. Run `npm audit fix` to resolve vulnerabilities
2. Consider downgrading React/Next.js versions if issues persist

### Step 5: Test Build Locally
```bash
npm run build
```
Make sure it completes without errors before deploying.

## 📋 Additional Recommendations

1. **Add a vercel.json file** for better deployment configuration:
```json
{
  "functions": {
    "app/api/*/route.ts": {
      "maxDuration": 30
    }
  }
}
```

2. **Optimize your dependencies** - some packages like `@google-cloud/vision` are heavy and might cause issues

3. **Check your API routes** - ensure they handle errors gracefully and don't timeout

4. **Consider using Vercel's Edge Runtime** for better performance:
```typescript
export const runtime = 'edge'
```

## 🎯 Priority Order
1. **Fix environment variables** (Critical - prevents build)
2. **Remove large file** (Critical - prevents deployment)
3. **Fix CSS error** (High - causes build warnings)
4. **Fix dependencies** (Medium - security)
5. **Version compatibility** (Low - if deployment works)

Once you address these issues, your Vercel deployment should work successfully!