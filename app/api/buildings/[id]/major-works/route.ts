import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const buildingId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(buildingId)) {
      return NextResponse.json({ error: 'Invalid building ID format' }, { status: 400 })
    }

    // Get major works projects for this building
    let majorWorks = []
    let error = null

    try {
      const { data, error: majorWorksError } = await supabase
        .from('major_works')
        .select(`
          id,
          title,
          description,
          status,
          start_date,
          end_date,
          budget,
          spent,
          created_at,
          updated_at
        `)
        .eq('building_id', buildingId)
        .order('created_at', { ascending: false })

      if (majorWorksError && majorWorksError.code !== 'PGRST116') {
        // Only log if it's not a "table doesn't exist" error
        console.error('Error fetching major works:', majorWorksError)
        error = 'Failed to fetch major works'
      } else {
        majorWorks = data || []
      }
    } catch (fetchError) {
      console.error('Exception fetching major works:', fetchError)
      // Don't return error, just empty array
    }

    // Calculate statistics
    const stats = {
      total: majorWorks.length,
      byStatus: {
        planning: majorWorks.filter(mw => mw.status === 'planning').length,
        active: majorWorks.filter(mw => mw.status === 'active').length,
        completed: majorWorks.filter(mw => mw.status === 'completed').length,
        cancelled: majorWorks.filter(mw => mw.status === 'cancelled').length
      },
      financials: {
        totalBudget: majorWorks.reduce((sum, mw) => sum + (mw.budget || 0), 0),
        totalSpent: majorWorks.reduce((sum, mw) => sum + (mw.spent || 0), 0)
      }
    }

    stats.financials.remaining = stats.financials.totalBudget - stats.financials.totalSpent

    return NextResponse.json({
      majorWorks,
      stats,
      error
    })

  } catch (error) {
    console.error('Unexpected error in major works endpoint:', error)
    return NextResponse.json({
      majorWorks: [],
      stats: {
        total: 0,
        byStatus: { planning: 0, active: 0, completed: 0, cancelled: 0 },
        financials: { totalBudget: 0, totalSpent: 0, remaining: 0 }
      },
      error: 'Internal server error'
    }, { status: 500 })
  }
}