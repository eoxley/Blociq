// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for building_id (query parameter)
// - Authentication check with session validation
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in building summary components
// - Includes OpenAI integration with error handling

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { getOpenAIClient } from '@/lib/openai-client';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('building_id')

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch building details
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .single()

    if (buildingError || !building) {
      return NextResponse.json(
        { error: 'Building not found' },
        { status: 404 }
      )
    }

    // Fetch all todos for the building
    const { data: todos, error: todosError } = await supabase
      .from('building_todos')
      .select('*')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: false })

    if (todosError) {
      console.error('Error fetching todos:', todosError)
      return NextResponse.json(
        { error: 'Failed to fetch building todos' },
        { status: 500 }
      )
    }

    // Group todos by status
    const pendingTodos = todos.filter(todo => todo.status === 'pending')
    const inProgressTodos = todos.filter(todo => todo.status === 'in_progress')
    const completedTodos = todos.filter(todo => todo.status === 'completed')

    // Find overdue items
    const now = new Date()
    const overdueItems = todos.filter(todo => 
      todo.status !== 'completed' && 
      todo.due_date && 
      new Date(todo.due_date) < now
    )

    // Prepare data for AI analysis
    const todoData = {
      buildingName: building.name,
      totalTasks: todos.length,
      pendingTasks: pendingTodos.length,
      inProgressTasks: inProgressTodos.length,
      completedTasks: completedTodos.length,
      overdueTasks: overdueItems.length,
      tasks: todos.map(todo => ({
        title: todo.title,
        status: todo.status,
        due_date: todo.due_date,
        priority: todo.priority,
        description: todo.description
      }))
    }

    // Generate AI summary
    const prompt = `Summarise the following building tasks for ${building.name}:

Building: ${building.name}
Total Tasks: ${todoData.totalTasks}
Pending: ${todoData.pendingTasks}
In Progress: ${todoData.inProgressTasks}
Completed: ${todoData.completedTasks}
Overdue: ${todoData.overdueTasks}

Tasks:
${todoData.tasks.map(task => `- ${task.title} (${task.status})${task.due_date ? ` - Due: ${task.due_date}` : ''}`).join('\n')}

Please provide a concise, professional summary (2-3 sentences) that highlights:
1. Overall progress and completion rate
2. Any overdue items that need immediate attention
3. Key priorities for the building management team

Make it actionable and informative for property managers.`

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful property management assistant. Provide concise, actionable summaries of building tasks and maintenance items."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    })

    const aiSummary = completion.choices[0]?.message?.content || 'Unable to generate summary at this time.'

    return NextResponse.json({
      summary: aiSummary,
      statistics: {
        total: todoData.totalTasks,
        pending: todoData.pendingTasks,
        inProgress: todoData.inProgressTasks,
        completed: todoData.completedTasks,
        overdue: todoData.overdueTasks,
        completionRate: todoData.totalTasks > 0 ? Math.round((todoData.completedTasks / todoData.totalTasks) * 100) : 0
      },
      overdueItems: overdueItems.map(item => ({
        title: item.title,
        due_date: item.due_date,
        daysOverdue: Math.floor((now.getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))
      })),
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in summarise-building-todos API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 