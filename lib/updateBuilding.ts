import { supabase } from '@/lib/supabaseClient'

export interface BuildingUpdate {
  id: string
  name?: string
  address?: string
  notes?: string
  is_hrb?: boolean
  unit_count?: number
}

export interface BuildingSetupUpdate {
  building_id: string
  structure_type?: 'Freehold' | 'RMC' | 'Tripartite'
  operational_notes?: string
  client_type?: string
  client_name?: string
  client_contact?: string
  client_email?: string
}

export async function updateBuilding(updates: BuildingUpdate): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('buildings')
      .update(updates)
      .eq('id', updates.id)
    
    if (error) {
      console.error('Failed to update building:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating building:', error)
    return { success: false, error: 'Failed to update building' }
  }
}

export async function updateBuildingSetup(updates: BuildingSetupUpdate): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if setup record exists
    const { data: existingSetup } = await supabase
      .from('building_setup')
      .select('id')
      .eq('building_id', updates.building_id)
      .single()

    if (existingSetup) {
      // Update existing setup
      const { error } = await supabase
        .from('building_setup')
        .update(updates)
        .eq('building_id', updates.building_id)
      
      if (error) {
        console.error('Failed to update building setup:', error)
        return { success: false, error: error.message }
      }
    } else {
      // Create new setup
      const { error } = await supabase
        .from('building_setup')
        .insert(updates)
      
      if (error) {
        console.error('Failed to create building setup:', error)
        return { success: false, error: error.message }
      }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error updating building setup:', error)
    return { success: false, error: 'Failed to update building setup' }
  }
}

export async function getBuildingContext(buildingId: string): Promise<{
  building: any
  units: any[]
  leaseholders: any[]
  setup: any
} | null> {
  try {
    // Fetch building with setup
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single()

    if (buildingError) {
      console.error('Error fetching building:', buildingError)
      return null
    }

    // Fetch building setup
    const { data: setup, error: setupError } = await supabase
      .from('building_setup')
      .select('*')
      .eq('building_id', buildingId)
      .single()

    if (setupError && setupError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching building setup:', setupError)
    }

    // Fetch units
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('*')
      .eq('building_id', buildingId)
      .order('unit_number')

    if (unitsError) {
      console.error('Error fetching units:', unitsError)
      return null
    }

    // Fetch leaseholders for units
    const leaseholderIds = units
      .filter(unit => unit.leaseholder_id)
      .map(unit => unit.leaseholder_id!)
      .filter((id, index, arr) => arr.indexOf(id) === index) // unique IDs

    let leaseholders: any[] = []
    if (leaseholderIds.length > 0) {
      const { data: leaseholderData, error: leaseholderError } = await supabase
        .from('leaseholders')
        .select('*')
        .in('id', leaseholderIds)

      if (!leaseholderError && leaseholderData) {
        leaseholders = leaseholderData
      }
    }

    return {
      building,
      units: units || [],
      leaseholders: leaseholders || [],
      setup: setup || null
    }
  } catch (error) {
    console.error('Error getting building context:', error)
    return null
  }
}
