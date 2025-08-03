// ✅ AUDIT COMPLETE [2025-08-03]
// - Field validation for buildingId (query parameter)
// - Supabase queries with proper .eq() filters
// - Try/catch with detailed error handling
// - Used in building summary components

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get('buildingId')

    if (!buildingId) {
      return NextResponse.json(
        { error: 'Building ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    // Get todos for the building
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

    // Get building name
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      return NextResponse.json(
        { error: 'Failed to fetch building details' },
        { status: 500 }
      )
    }

    // Calculate statistics
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const completedThisWeek = todos.filter(todo => 
      todo.is_complete && new Date(todo.updated_at) >= weekAgo
    ).length

    const overdueTasks = todos.filter(todo => 
      !todo.is_complete && todo.due_date && new Date(todo.due_date) < now
    ).length

    const highPriorityTasks = todos.filter(todo => 
      !todo.is_complete && todo.priority === 'High'
    ).length

    const totalTasks = todos.length
    const completedTasks = todos.filter(todo => todo.is_complete).length

    // Generate summary text
    let summaryText = `📊 ${building.name} Activity Summary\n\n`
    
    if (completedThisWeek > 0) {
      summaryText += `✅ ${completedThisWeek} tasks completed this week\n`
    }
    
    if (overdueTasks > 0) {
      summaryText += `⚠️ ${overdueTasks} tasks are overdue\n`
    }
    
    if (highPriorityTasks > 0) {
      summaryText += `🔥 ${highPriorityTasks} high priority tasks pending\n`
    }
    
    summaryText += `\n📈 Overall Progress: ${completedTasks}/${totalTasks} tasks completed (${Math.round((completedTasks / totalTasks) * 100)}%)`
    
    if (overdueTasks === 0 && highPriorityTasks === 0) {
      summaryText += `\n\n🎉 Great job! All tasks are on track.`
    } else if (overdueTasks > 0) {
      summaryText += `\n\n🚨 Action needed: Please address overdue tasks promptly.`
    } else if (highPriorityTasks > 0) {
      summaryText += `\n\n⚡ Focus on high priority tasks to maintain building standards.`
    }

    return NextResponse.json({
      summary: summaryText,
      statistics: {
        completedThisWeek,
        overdueTasks,
        highPriorityTasks,
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 