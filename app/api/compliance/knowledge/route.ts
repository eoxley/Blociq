import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const query = searchParams.get('query')
    const type = searchParams.get('type') // 'standards', 'guidance', or 'all'

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let result: any = {}

    // Get compliance standards
    if (!type || type === 'standards' || type === 'all') {
      const { data: standards, error: standardsError } = await supabase
        .from('compliance_standards')
        .select('*')
        .order('name', { ascending: true })

      if (standardsError) {
        console.error('Error fetching compliance standards:', standardsError)
        return NextResponse.json({ error: 'Failed to fetch compliance standards' }, { status: 500 })
      }

      result.standards = standards || []
    }

    // Get compliance guidance
    if (!type || type === 'guidance' || type === 'all') {
      let guidanceQuery = supabase
        .from('compliance_guidance')
        .select('*')
        .order('relevance_score', { ascending: false })

      if (category) {
        guidanceQuery = guidanceQuery.eq('category', category)
      }

      const { data: guidance, error: guidanceError } = await guidanceQuery

      if (guidanceError) {
        console.error('Error fetching compliance guidance:', guidanceError)
        return NextResponse.json({ error: 'Failed to fetch compliance guidance' }, { status: 500 })
      }

      result.guidance = guidance || []
    }

    // Search functionality if query is provided
    if (query) {
      const searchQuery = query.toLowerCase()
      
      // Search in standards
      if (result.standards) {
        result.standards = result.standards.filter((standard: any) =>
          standard.name.toLowerCase().includes(searchQuery) ||
          standard.description.toLowerCase().includes(searchQuery) ||
          standard.requirements.some((req: string) => req.toLowerCase().includes(searchQuery))
        )
      }

      // Search in guidance
      if (result.guidance) {
        result.guidance = result.guidance.filter((guide: any) =>
          guide.title.toLowerCase().includes(searchQuery) ||
          guide.description.toLowerCase().includes(searchQuery) ||
          guide.content.toLowerCase().includes(searchQuery) ||
          guide.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery))
        )
      }
    }

    // Filter by category if specified
    if (category) {
      if (result.standards) {
        result.standards = result.standards.filter((standard: any) => 
          standard.category === category
        )
      }
      if (result.guidance) {
        result.guidance = result.guidance.filter((guide: any) => 
          guide.category === category
        )
      }
    }

    // Add metadata
    result.metadata = {
      totalStandards: result.standards?.length || 0,
      totalGuidance: result.guidance?.length || 0,
      category: category || 'all',
      query: query || null,
      type: type || 'all'
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Compliance knowledge API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin privileges (you can customize this logic)
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole || !['admin', 'manager'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { type, data } = body

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result: any

    if (type === 'standard') {
      const { data: insertedStandard, error: insertError } = await supabase
        .from('compliance_standards')
        .insert(data)
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting compliance standard:', insertError)
        return NextResponse.json({ error: 'Failed to insert compliance standard' }, { status: 500 })
      }

      result = insertedStandard
    } else if (type === 'guidance') {
      const { data: insertedGuidance, error: insertError } = await supabase
        .from('compliance_guidance')
        .insert(data)
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting compliance guidance:', insertError)
        return NextResponse.json({ error: 'Failed to insert compliance guidance' }, { status: 500 })
      }

      result = insertedGuidance
    } else {
      return NextResponse.json({ error: 'Invalid type specified' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Compliance ${type} added successfully`,
      data: result
    })

  } catch (error) {
    console.error('Compliance knowledge POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
