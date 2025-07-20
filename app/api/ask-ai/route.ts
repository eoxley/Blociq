import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { building_id, prompt } = body

    if (!building_id) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 })
    }

    // Fetch building data for context
    const { data: building } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', building_id)
      .single()

    // Fetch compliance data
    const { data: complianceAssets } = await supabase
      .from('building_compliance_assets')
      .select(`
        *,
        compliance_assets (
          name,
          category
        )
      `)
      .eq('building_id', building_id)

    // Fetch recent tasks
    const { data: tasks } = await supabase
      .from('building_todos')
      .select('*')
      .eq('building_id', building_id)
      .order('due_date', { ascending: true })
      .limit(10)

    // Fetch recent emails
    const { data: emails } = await supabase
      .from('incoming_emails')
      .select('*')
      .eq('building_id', building_id)
      .order('received_at', { ascending: false })
      .limit(5)

    // Calculate compliance summary
    const now = new Date()
    const complianceSummary = {
      total: complianceAssets?.length || 0,
      compliant: complianceAssets?.filter(asset => asset.status === 'compliant').length || 0,
      dueSoon: complianceAssets?.filter(asset => {
        if (!asset.next_due_date) return false
        const dueDate = new Date(asset.next_due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilDue <= 30 && daysUntilDue > 0
      }).length || 0,
      overdue: complianceAssets?.filter(asset => {
        if (!asset.next_due_date) return false
        const dueDate = new Date(asset.next_due_date)
        return dueDate < now
      }).length || 0
    }

    // Prepare context for AI
    const context = {
      building: building,
      compliance: {
        summary: complianceSummary,
        assets: complianceAssets || []
      },
      tasks: tasks || [],
      emails: emails || []
    }

    // For now, return a structured summary
    // In a real implementation, you would send this to an AI service
    const summary = generateBuildingSummary(context, prompt)

    return NextResponse.json({ 
      success: true, 
      summary,
      context 
    })
  } catch (error) {
    console.error('Error in ask-ai API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateBuildingSummary(context: any, prompt?: string) {
  const { building, compliance, tasks, emails } = context
  
  let summary = `# Building Summary: ${building?.name}\n\n`
  
  if (prompt?.toLowerCase().includes('compliance')) {
    summary += `## Compliance Status\n`
    summary += `- Total items: ${compliance.summary.total}\n`
    summary += `- Compliant: ${compliance.summary.compliant}\n`
    summary += `- Due soon: ${compliance.summary.dueSoon}\n`
    summary += `- Overdue: ${compliance.summary.overdue}\n\n`
    
    if (compliance.summary.overdue > 0) {
      summary += `⚠️ **Action Required**: ${compliance.summary.overdue} compliance items are overdue.\n\n`
    }
  }
  
  if (prompt?.toLowerCase().includes('task') || tasks.length > 0) {
    summary += `## Recent Tasks\n`
    const incompleteTasks = tasks.filter((task: any) => !task.is_complete)
    const overdueTasks = incompleteTasks.filter((task: any) => {
      if (!task.due_date) return false
      return new Date(task.due_date) < new Date()
    })
    
    summary += `- Incomplete tasks: ${incompleteTasks.length}\n`
    summary += `- Overdue tasks: ${overdueTasks.length}\n`
    
    if (overdueTasks.length > 0) {
      summary += `\n**Overdue Tasks:**\n`
      overdueTasks.slice(0, 3).forEach((task: any) => {
        summary += `- ${task.title} (${task.priority} priority)\n`
      })
    }
    summary += `\n`
  }
  
  if (prompt?.toLowerCase().includes('email') || emails.length > 0) {
    summary += `## Recent Communications\n`
    summary += `- Recent emails: ${emails.length}\n`
    const unreadEmails = emails.filter((email: any) => email.unread)
    if (unreadEmails.length > 0) {
      summary += `- Unread emails: ${unreadEmails.length}\n`
    }
    summary += `\n`
  }
  
  if (prompt?.toLowerCase().includes('draft')) {
    summary += `## Suggested Actions\n`
    if (compliance.summary.overdue > 0) {
      summary += `1. Address overdue compliance items immediately\n`
    }
    if (tasks.filter((t: any) => !t.is_complete && t.priority === 'High').length > 0) {
      summary += `2. Prioritize high-priority tasks\n`
    }
    if (emails.filter((e: any) => e.unread).length > 0) {
      summary += `3. Review unread emails for urgent matters\n`
    }
  }
  
  return summary
} 