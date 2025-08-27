import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Create the missing function
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION get_user_compliance_overview(user_uuid UUID)
        RETURNS TABLE (
          building_id UUID,
          building_name TEXT,
          total_assets INTEGER,
          compliant_assets INTEGER,
          overdue_assets INTEGER,
          due_soon_assets INTEGER,
          pending_assets INTEGER
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            b.id as building_id,
            b.name as building_name,
            COUNT(ca.id)::INTEGER as total_assets,
            COUNT(CASE WHEN ca.status = 'compliant' THEN 1 END)::INTEGER as compliant_assets,
            COUNT(CASE WHEN ca.status = 'overdue' THEN 1 END)::INTEGER as overdue_assets,
            COUNT(CASE WHEN ca.status = 'due_soon' THEN 1 END)::INTEGER as due_soon_assets,
            COUNT(CASE WHEN ca.status = 'pending' THEN 1 END)::INTEGER as pending_assets
          FROM buildings b
          LEFT JOIN compliance_assets ca ON b.id = ca.building_id
          WHERE b.user_id = user_uuid OR EXISTS (
            SELECT 1 FROM building_members bm 
            WHERE bm.building_id = b.id AND bm.user_id = user_uuid
          )
          GROUP BY b.id, b.name
          ORDER BY b.name;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (functionError) {
      console.error('Error creating function:', functionError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create function',
        details: functionError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance overview function created successfully'
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
