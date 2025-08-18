import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { canonicaliseCategory, canonicaliseTitle, deriveFrequencyLabel, normaliseText } from '@/lib/compliance/normalise'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, category, description, frequency_months, frequency } = body

    if (!title || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: title and category' },
        { status: 400 }
      )
    }

    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Canonicalise inputs
    const canonicalCategory = canonicaliseCategory(category)
    const canonicalTitle = canonicaliseTitle(title)
    const normCategory = normaliseText(canonicalCategory)
    const normTitle = normaliseText(canonicalTitle)
    
    // Derive frequency label if missing
    const derivedFrequency = deriveFrequencyLabel(frequency_months, frequency)

    // Check if a row with the same (norm_category, norm_title) exists
    const { data: existingAsset, error: checkError } = await supabase
      .from('compliance_assets')
      .select('id, title, category, frequency, frequency_months')
      .eq('norm_category', normCategory)
      .eq('norm_title', normTitle)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for existing asset:', checkError)
      return NextResponse.json(
        { error: 'Failed to check for existing asset' },
        { status: 500 }
      )
    }

    if (existingAsset) {
      // Update existing asset
      const { error: updateError } = await supabase
        .from('compliance_assets')
        .update({
          title: canonicalTitle,
          category: canonicalCategory,
          description: description || existingAsset.description,
          frequency: derivedFrequency || existingAsset.frequency,
          frequency_months: frequency_months || existingAsset.frequency_months,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAsset.id)

      if (updateError) {
        console.error('Error updating existing asset:', updateError)
        return NextResponse.json(
          { error: 'Failed to update existing asset' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        asset: {
          id: existingAsset.id,
          title: canonicalTitle,
          category: canonicalCategory,
          frequency: derivedFrequency || existingAsset.frequency
        },
        message: 'Asset updated successfully (merged with existing record)'
      })
    } else {
      // Insert new asset
      const { data: newAsset, error: insertError } = await supabase
        .from('compliance_assets')
        .insert({
          title: canonicalTitle,
          category: canonicalCategory,
          description: description || null,
          frequency: derivedFrequency,
          frequency_months: frequency_months || null,
          norm_title: normTitle,
          norm_category: normCategory
        })
        .select('id, title, category, frequency')
        .single()

      if (insertError) {
        console.error('Error inserting new asset:', insertError)
        return NextResponse.json(
          { error: 'Failed to insert new asset' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        asset: newAsset,
        message: 'New asset created successfully'
      })
    }

  } catch (error) {
    console.error('Compliance assets upsert API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies())

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all compliance assets with deduplication info
    const { data: assets, error } = await supabase
      .from('compliance_assets')
      .select('id, title, category, description, frequency, frequency_months, norm_title, norm_category, created_at, updated_at')
      .order('category', { ascending: true })
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching compliance assets:', error)
      return NextResponse.json({ error: 'Failed to fetch compliance assets' }, { status: 500 })
    }

    // Group by category for better UI organisation
    const groupedAssets = assets?.reduce((acc, asset) => {
      const category = asset.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(asset)
      return acc
    }, {} as Record<string, typeof assets>) || {}

    return NextResponse.json({
      assets: assets || [],
      groupedAssets,
      total: assets?.length || 0
    })

  } catch (error) {
    console.error('Error in compliance-assets upsert API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
