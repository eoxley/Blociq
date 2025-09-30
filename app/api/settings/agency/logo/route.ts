import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const agencyId = formData.get('agency_id') as string;

    if (!file || !agencyId) {
      return NextResponse.json({
        error: 'file and agency_id are required'
      }, { status: 400 });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agency_id')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.agency_id !== agencyId) {
      return NextResponse.json({
        error: 'Forbidden: You can only upload logos for your own agency'
      }, { status: 403 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `logo_${agencyId}_${Date.now()}.${fileExt}`;
    const filePath = `agency-logos/${agencyId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('agency-logos')
      .upload(filePath, file);

    if (uploadError) {
      return NextResponse.json({
        error: 'Failed to upload logo',
        message: uploadError.message
      }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('agency-logos')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      logo_url: publicUrl
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to upload logo',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
