import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  console.log("🔍 Starting duplicate Ashwood House removal...")
  
  const supabase = createRouteHandlerClient({ cookies: () => cookies() })
  
  try {
    // Get all Ashwood House entries
    const { data: ashwoodEntries, error: fetchError } = await supabase
      .from('buildings')
      .select('*')
      .eq('name', 'Ashwood House')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('❌ Error fetching Ashwood House entries:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 })
    }

    console.log(`📊 Found ${ashwoodEntries?.length || 0} Ashwood House entries`)

    if (!ashwoodEntries || ashwoodEntries.length <= 1) {
      console.log('✅ No duplicates found')
      return NextResponse.json({ 
        message: 'No duplicates found', 
        count: ashwoodEntries?.length || 0 
      })
    }

    // Keep the first entry (oldest) and remove the rest
    const entriesToRemove = ashwoodEntries.slice(1)
    console.log(`🗑️ Removing ${entriesToRemove.length} duplicate entries`)

    let removedCount = 0
    for (const entry of entriesToRemove) {
      console.log(`🗑️ Removing Ashwood House with ID: ${entry.id}`)
      
      // Delete the building entry
      const { error: deleteError } = await supabase
        .from('buildings')
        .delete()
        .eq('id', entry.id)

      if (deleteError) {
        console.error(`❌ Error deleting building ${entry.id}:`, deleteError)
      } else {
        console.log(`✅ Successfully deleted building ${entry.id}`)
        removedCount++
      }
    }

    // Verify the cleanup
    const { data: remainingEntries, error: verifyError } = await supabase
      .from('buildings')
      .select('*')
      .eq('name', 'Ashwood House')

    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError)
      return NextResponse.json({ error: 'Failed to verify cleanup' }, { status: 500 })
    }

    console.log(`✅ Cleanup complete! ${remainingEntries?.length || 0} Ashwood House entries remaining`)

    return NextResponse.json({
      success: true,
      removed: removedCount,
      remaining: remainingEntries?.length || 0,
      message: `Successfully removed ${removedCount} duplicate Ashwood House entries`
    })

  } catch (error) {
    console.error('❌ Error in duplicate removal process:', error)
    return NextResponse.json({ 
      error: 'Failed to remove duplicates',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 