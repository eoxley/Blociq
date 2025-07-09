import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerActionClient<Database>({ cookies: () => cookieStore });

  // Demo user ID
  const demoUserId = 'b620aa93-4435-499f-82ea-a5074089706b';

  // Step 1: Delete everything
  await supabase.from('leases').delete().neq('id', '');
  await supabase.from('units').delete().neq('id', '');
  await supabase.from('buildings').delete().neq('id', '');
  await supabase.from('incoming_emails').delete().neq('id', '');
  await supabase.from('mail_templates').delete().neq('id', '');

  // Step 2: Reinsert buildings
  const buildingNames = [
    'The Oaks', 'Regency Heights', 'Windsor Court', 'Elm House',
    'Victoria Mansions', 'Hawthorne Lodge', 'Maple View',
    'Lancaster Rise', 'Chester Place', 'Kensington Heights',
  ];

  for (const name of buildingNames) {
    await supabase.from('buildings').insert({
      name,
      address: `${Math.floor(Math.random() * 100) + 1} Demo Street, London`,
    });
  }

  const { data: buildings } = await supabase.from('buildings').select('id');

  for (const b of buildings ?? []) {
    const unitTotal = Math.floor(Math.random() * 79) + 1;
    for (let i = 1; i <= unitTotal; i++) {
      const { data: unit } = await supabase.from('units').insert({
        unit_number: `Flat ${i}`,
        building_id: b.id,
      }).select().single();

      if (unit) {
        await supabase.from('leases').insert({
          id: crypto.randomUUID(),
          unit_id: unit.id,
          building_id: b.id,
          start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 2), // 2 years ago
        });
      }
    }
  }

  // Step 3: Add sample inbox emails
  await supabase.from('incoming_emails').insert([
    {
      id: crypto.randomUUID(),
      subject: '🔔 Fire Alarm Test Scheduled',
      from_email: 'compliance@blociq.co.uk',
      body_preview: 'Reminder: Fire system testing will occur next Thursday at 10am.',
      received_at: new Date(),
      handled: false,
    },
    {
      id: crypto.randomUUID(),
      subject: '💸 Q3 Service Charge Notice',
      from_email: 'accounts@blociq.co.uk',
      body_preview: 'Your Q3 invoice is available. Please check your portal.',
      received_at: new Date(),
      handled: false,
    },
  ]);

  // Step 4: Add mail template
  await supabase.from('mail_templates').insert({
    id: crypto.randomUUID(),
    title: 'Annual General Meeting Notice',
    template_body: 'Dear leaseholder,\n\nYou are invited to the AGM on {{date}} at {{location}}.\n\nKind regards,\nBlocIQ',
  });

  return NextResponse.json({ success: true });
}