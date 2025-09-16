import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(cookies());

    console.log('🔍 Finding Ashwood House...');

    // Find Ashwood House
    const { data: building, error: findError } = await supabase
      .from('buildings')
      .select('id, name, unit_count')
      .ilike('name', '%ashwood%')
      .single();

    if (findError || !building) {
      console.error('❌ Ashwood House not found:', findError?.message);
      return NextResponse.json({
        error: 'Ashwood House not found',
        details: findError?.message
      }, { status: 404 });
    }

    console.log('✅ Found building:', building.name, 'Current unit count:', building.unit_count);

    // Update unit count to 31
    const { data: updated, error: updateError } = await supabase
      .from('buildings')
      .update({ unit_count: 31 })
      .eq('id', building.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update unit count:', updateError.message);
      return NextResponse.json({
        error: 'Failed to update unit count',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('✅ Updated Ashwood House unit count to 31');

    // Check existing units
    const { data: existingUnits, error: unitsError } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('building_id', building.id)
      .order('unit_number');

    if (unitsError) {
      console.error('❌ Failed to get existing units:', unitsError.message);
      return NextResponse.json({
        error: 'Failed to get existing units',
        details: unitsError.message
      }, { status: 500 });
    }

    console.log(`📋 Found ${existingUnits?.length || 0} existing units`);

    // If we need more units, create them
    const currentUnitCount = existingUnits?.length || 0;
    let newUnitsCreated = 0;

    if (currentUnitCount < 31) {
      const unitsToCreate = [];
      for (let i = currentUnitCount + 1; i <= 31; i++) {
        unitsToCreate.push({
          building_id: building.id,
          unit_number: `${i}`, // Just the number for Ashwood House
          floor: Math.floor((i - 1) / 4) + 1, // Assuming 4 units per floor
          type: 'apartment'
        });
      }

      const { data: newUnits, error: createError } = await supabase
        .from('units')
        .insert(unitsToCreate)
        .select();

      if (createError) {
        console.error('❌ Failed to create additional units:', createError.message);
        return NextResponse.json({
          error: 'Failed to create additional units',
          details: createError.message
        }, { status: 500 });
      }

      newUnitsCreated = newUnits?.length || 0;
      console.log(`✅ Created ${newUnitsCreated} additional units`);
    }

    // Verify final count
    const { data: finalUnits, error: finalError } = await supabase
      .from('units')
      .select('id, unit_number')
      .eq('building_id', building.id);

    const finalUnitCount = finalUnits?.length || 0;
    console.log(`🎉 Ashwood House now has ${finalUnitCount} units in the database`);

    return NextResponse.json({
      success: true,
      building: building.name,
      previousUnitCount: building.unit_count,
      newUnitCount: 31,
      unitsInDatabase: finalUnitCount,
      newUnitsCreated: newUnitsCreated,
      message: `Successfully updated ${building.name} to have 31 units (${finalUnitCount} units now in database)`
    });

  } catch (error) {
    console.error('❌ Error updating Ashwood units:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}