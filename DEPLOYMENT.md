# BlocIQ Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project**: Set up at [supabase.com](https://supabase.com)
3. **OpenAI API Key**: Get from [platform.openai.com](https://platform.openai.com)

## Environment Variables

You'll need to set up these environment variables in Vercel:

### Required Variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Steps

### Method 1: Quick Deploy (Recommended)

1. **Install Vercel CLI globally:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to production:**
   ```bash
   npm run deploy
   ```

### Method 2: Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Set environment variables in the dashboard
5. Click "Deploy"

### Method 3: GitHub Integration

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set environment variables in Vercel dashboard
4. Auto-deploy on every push to main branch

## Post-Deployment Setup

### 1. Configure Supabase Auth

In your Supabase dashboard:

1. Go to **Authentication > URL Configuration**
2. Add your Vercel domain to **Site URL**:
   ```
   https://your-app-name.vercel.app
   ```
3. Add to **Redirect URLs**:
   ```
   https://your-app-name.vercel.app/home
   https://your-app-name.vercel.app/login
   ```

### 2. Test Authentication

1. Visit your deployed app
2. Try logging in with test credentials
3. Verify redirect to `/home` works

### 3. Set up Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains" tab
3. Add your custom domain
4. Update Supabase URLs accordingly

## Environment Variables Setup

### In Vercel Dashboard:

1. Go to your project settings
2. Click "Environment Variables"
3. Add each variable:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Your Supabase anon key |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key |

### Finding Your Supabase Keys:

1. Go to your Supabase project dashboard
2. Click "Settings" → "API"
3. Copy the "URL" and "anon public" key

## Troubleshooting

### Common Issues:

1. **Build fails**: Check environment variables are set correctly
2. **Auth not working**: Verify Supabase redirect URLs
3. **API routes fail**: Check OpenAI API key is valid

### Debug Commands:

```bash
# Check local build
npm run build

# Check deployment status
vercel logs

# Redeploy
npm run deploy
```

## Commands Reference

```bash
# Development
npm run dev

# Production build
npm run build

# Deploy to production
npm run deploy

# Deploy preview
npm run deploy-preview

# Check deployment logs
vercel logs
```

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Enable row-level security in Supabase
- Set up proper CORS policies

## Live Application

After deployment, your app will be available at:
- Production: `https://your-app-name.vercel.app`
- Preview deployments: `https://your-app-name-git-branch.vercel.app`

---

**Ready to deploy?** Run `npm run deploy` to get started!