import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    openaiKey: process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing',
    outlookTenantId: process.env.OUTLOOK_TENANT_ID ? '✅ Set' : '❌ Missing',
    outlookClientId: process.env.OUTLOOK_CLIENT_ID ? '✅ Set' : '❌ Missing',
    outlookClientSecret: process.env.OUTLOOK_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
    outlookUserEmail: process.env.OUTLOOK_USER_EMAIL ? '✅ Set' : '❌ Missing',
    googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Set' : '❌ Missing',
    syncApiKey: process.env.SYNC_API_KEY ? '✅ Set' : '❌ Missing',
  })
} 