// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for emailId
// - Supabase query with proper .eq() filter
// - Try/catch with detailed error handling
// - Used in inbox components

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/database.types';
import { serverTrace } from '@/lib/trace';

export async function POST(req: NextRequest) {
  serverTrace("API hit", { route: "app/api/mark-read/route.ts", build: process.env.VERCEL_GIT_COMMIT_SHA ?? null });
  
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });
    
    // Validate request body
    const body = await req.json();
    const { emailId } = body;

    if (!emailId) {
      console.error('❌ No email ID provided in request');
      const json = { error: 'Email ID is required', routeId: "app/api/mark-read/route.ts", build: process.env.VERCEL_GIT_COMMIT_SHA ?? null };
      const res = NextResponse.json(json, { status: 400 });
      res.headers.set("x-blociq-route", "app/api/mark-read/route.ts");
      return res;
    }

    console.log('📧 Marking email as read:', emailId);

    const { error } = await supabase
      .from('incoming_emails')
      .update({ 
        is_read: true,
        status: 'read'
      })
      .eq('id', emailId);

    if (error) {
      console.error('❌ Failed to mark as read:', error.message);
      const json = { error: error.message, routeId: "app/api/mark-read/route.ts", build: process.env.VERCEL_GIT_COMMIT_SHA ?? null };
      const res = NextResponse.json(json, { status: 500 });
      res.headers.set("x-blociq-route", "app/api/mark-read/route.ts");
      return res;
    }

    console.log('✅ Email marked as read successfully');
    const json = { success: true, routeId: "app/api/mark-read/route.ts", build: process.env.VERCEL_GIT_COMMIT_SHA ?? null };
    const res = NextResponse.json(json);
    res.headers.set("x-blociq-route", "app/api/mark-read/route.ts");
    return res;

  } catch (error) {
    console.error('❌ Error in mark-read route:', error);
    const json = { 
      error: 'Failed to mark email as read',
      details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined,
      routeId: "app/api/mark-read/route.ts",
      build: process.env.VERCEL_GIT_COMMIT_SHA ?? null
    };
    const res = NextResponse.json(json, { status: 500 });
    res.headers.set("x-blociq-route", "app/api/mark-read/route.ts");
    return res;
  }
}
