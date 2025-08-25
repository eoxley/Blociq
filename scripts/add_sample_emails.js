// Script to add sample emails to the incoming_emails table for testing
// Run this in your Supabase SQL editor or via the API

const sampleEmails = [
  {
    subject: "Water leak in flat 12",
    from_name: "Sarah Johnson",
    from_email: "sarah.johnson@email.com",
    body_preview: "Hi, there's a water leak coming from the ceiling in my bathroom. It's quite bad and I'm worried about damage.",
    body_full: "Hi there,\n\nI'm writing to report a serious water leak in my bathroom. There's water coming through the ceiling and it's getting worse. I noticed it this morning and it's now dripping quite heavily.\n\nI'm concerned about potential damage to my property and the flat below. Could someone please come and look at this urgently?\n\nThanks,\nSarah",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["urgent", "maintenance"],
    unread: true,
    handled: false
  },
  {
    subject: "Lift not working",
    from_name: "Michael Chen",
    from_email: "m.chen@email.com",
    body_preview: "The lift has been out of order since yesterday. Elderly residents are struggling with the stairs.",
    body_full: "Hello,\n\nThe lift in our building has been out of order since yesterday afternoon. This is causing real problems for elderly residents and those with mobility issues who are having to use the stairs.\n\nI've reported it to the emergency number but haven't heard anything back. Could you please chase this up?\n\nMany thanks,\nMichael",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["urgent", "accessibility"],
    unread: true,
    handled: false
  },
  {
    subject: "Noise complaint - flat 8",
    from_name: "Emma Thompson",
    from_email: "emma.t@email.com",
    body_preview: "There's been excessive noise from flat 8 for the past week. It's affecting my sleep and work.",
    body_full: "Hi,\n\nI need to report excessive noise coming from flat 8. There's been loud music, shouting, and what sounds like furniture being moved around at all hours for the past week.\n\nThis is seriously affecting my sleep and ability to work from home. I've tried speaking to the residents but they don't seem to care.\n\nCould you please intervene? I'm at my wits' end.\n\nRegards,\nEmma",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["complaint", "noise"],
    unread: true,
    handled: false
  },
  {
    subject: "Insurance certificate request",
    from_name: "David Williams",
    from_email: "david.williams@email.com",
    body_preview: "I need a copy of the building insurance certificate for my mortgage renewal.",
    body_full: "Good morning,\n\nI'm in the process of renewing my mortgage and my lender has requested a copy of the building insurance certificate.\n\nCould you please provide this document? I need it by the end of the week to avoid any delays with my mortgage application.\n\nThanks in advance,\nDavid",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["document", "insurance"],
    unread: false,
    handled: false
  },
  {
    subject: "Section 20 consultation",
    from_name: "Lisa Rodriguez",
    from_email: "lisa.rodriguez@email.com",
    body_preview: "I have some questions about the upcoming Section 20 consultation for the roof replacement.",
    body_full: "Hello,\n\nI received the Section 20 consultation notice about the roof replacement project. I have a few questions:\n\n1. How long is the project expected to take?\n2. Will there be scaffolding around the building?\n3. What are the estimated costs per flat?\n4. Will there be a meeting to discuss this further?\n\nI'd appreciate any information you can provide.\n\nKind regards,\nLisa",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["section20", "consultation"],
    unread: false,
    handled: false
  },
  {
    subject: "Parking space issue",
    from_name: "Robert Brown",
    from_email: "robert.brown@email.com",
    body_preview: "Someone is parking in my allocated space again. This happens every week.",
    body_full: "Hi,\n\nI'm writing to report that someone is parking in my allocated parking space again. This is the third time this week and it's becoming very frustrating.\n\nI've left polite notes on the car but they keep doing it. I have photographic evidence of the car in my space.\n\nCould you please take action to prevent this from happening? I'm paying for this space and need to be able to use it.\n\nThanks,\nRobert",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["parking", "complaint"],
    unread: true,
    handled: false
  },
  {
    subject: "Heating not working",
    from_name: "Amanda Foster",
    from_email: "amanda.foster@email.com",
    body_preview: "The heating in my flat has stopped working. It's getting quite cold.",
    body_full: "Hello,\n\nThe heating in my flat has completely stopped working. I've tried resetting the thermostat and checking the fuse box, but nothing seems to help.\n\nIt's getting quite cold now and I'm worried about pipes freezing if this continues. Could someone please come and look at this?\n\nI'm available all day tomorrow if that helps.\n\nRegards,\nAmanda",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["heating", "maintenance"],
    unread: true,
    handled: false
  },
  {
    subject: "Thank you for quick response",
    from_name: "James Wilson",
    from_email: "james.wilson@email.com",
    body_preview: "Just wanted to say thanks for sorting out the lock issue so quickly yesterday.",
    body_full: "Hi there,\n\nI just wanted to say a big thank you for sorting out the lock issue in my flat so quickly yesterday.\n\nThe locksmith was here within an hour and got everything working perfectly. I really appreciate the prompt response and professional service.\n\nIt's great to know that when we have problems, they get resolved quickly.\n\nThanks again,\nJames",
    building_id: "your-building-id-here", // Replace with actual building ID
    tags: ["feedback", "positive"],
    unread: false,
    handled: true
  }
];

// SQL to insert these emails (run in Supabase SQL editor):
/*
INSERT INTO incoming_emails (
  subject, 
  from_name, 
  from_email, 
  body_preview, 
  body_full, 
  building_id, 
  tags, 
  unread, 
  handled, 
  received_at
) VALUES 
(
  'Water leak in flat 12',
  'Sarah Johnson',
  'sarah.johnson@email.com',
  'Hi, there''s a water leak coming from the ceiling in my bathroom. It''s quite bad and I''m worried about damage.',
  'Hi there,

I''m writing to report a serious water leak in my bathroom. There''s water coming through the ceiling and it''s getting worse. I noticed it this morning and it''s now dripping quite heavily.

I''m concerned about potential damage to my property and the flat below. Could someone please come and look at this urgently?

Thanks,
Sarah',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['urgent', 'maintenance'],
  true,
  false,
  NOW() - INTERVAL '2 hours'
),
(
  'Lift not working',
  'Michael Chen',
  'm.chen@email.com',
  'The lift has been out of order since yesterday. Elderly residents are struggling with the stairs.',
  'Hello,

The lift in our building has been out of order since yesterday afternoon. This is causing real problems for elderly residents and those with mobility issues who are having to use the stairs.

I''ve reported it to the emergency number but haven''t heard anything back. Could you please chase this up?

Many thanks,
Michael',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['urgent', 'accessibility'],
  true,
  false,
  NOW() - INTERVAL '6 hours'
),
(
  'Noise complaint - flat 8',
  'Emma Thompson',
  'emma.t@email.com',
  'There''s been excessive noise from flat 8 for the past week. It''s affecting my sleep and work.',
  'Hi,

I need to report excessive noise coming from flat 8. There''s been loud music, shouting, and what sounds like furniture being moved around at all hours for the past week.

This is seriously affecting my sleep and ability to work from home. I''ve tried speaking to the residents but they don''t seem to care.

Could you please intervene? I''m at my wits'' end.

Regards,
Emma',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['complaint', 'noise'],
  true,
  false,
  NOW() - INTERVAL '1 day'
),
(
  'Insurance certificate request',
  'David Williams',
  'david.williams@email.com',
  'I need a copy of the building insurance certificate for my mortgage renewal.',
  'Good morning,

I''m in the process of renewing my mortgage and my lender has requested a copy of the building insurance certificate.

Could you please provide this document? I need it by the end of the week to avoid any delays with my mortgage application.

Thanks in advance,
David',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['document', 'insurance'],
  false,
  false,
  NOW() - INTERVAL '2 days'
),
(
  'Section 20 consultation',
  'Lisa Rodriguez',
  'lisa.rodriguez@email.com',
  'I have some questions about the upcoming Section 20 consultation for the roof replacement.',
  'Hello,

I received the Section 20 consultation notice about the roof replacement project. I have a few questions:

1. How long is the project expected to take?
2. Will there be scaffolding around the building?
3. What are the estimated costs per flat?
4. Will there be a meeting to discuss this further?

I''d appreciate any information you can provide.

Kind regards,
Lisa',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['section20', 'consultation'],
  false,
  false,
  NOW() - INTERVAL '3 days'
),
(
  'Parking space issue',
  'Robert Brown',
  'robert.brown@email.com',
  'Someone is parking in my allocated space again. This happens every week.',
  'Hi,

I''m writing to report that someone is parking in my allocated parking space again. This is the third time this week and it''s becoming very frustrating.

I''ve left polite notes on the car but they keep doing it. I have photographic evidence of the car in my space.

Could you please take action to prevent this from happening? I''m paying for this space and need to be able to use it.

Thanks,
Robert',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['parking', 'complaint'],
  true,
  false,
  NOW() - INTERVAL '4 days'
),
(
  'Heating not working',
  'Amanda Foster',
  'amanda.foster@email.com',
  'The heating in my flat has stopped working. It''s getting quite cold.',
  'Hello,

The heating in my flat has completely stopped working. I''ve tried resetting the thermostat and checking the fuse box, but nothing seems to help.

It''s getting quite cold now and I''m worried about pipes freezing if this continues. Could someone please come and look at this?

I''m available all day tomorrow if that helps.

Regards,
Amanda',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['heating', 'maintenance'],
  true,
  false,
  NOW() - INTERVAL '5 days'
),
(
  'Thank you for quick response',
  'James Wilson',
  'james.wilson@email.com',
  'Just wanted to say thanks for sorting out the lock issue so quickly yesterday.',
  'Hi there,

I just wanted to say a big thank you for sorting out the lock issue in my flat so quickly yesterday.

The locksmith was here within an hour and got everything working perfectly. I really appreciate the prompt response and professional service.

It''s great to know that when we have problems, they get resolved quickly.

Thanks again,
James',
  'your-building-id-here', -- Replace with actual building ID
  ARRAY['feedback', 'positive'],
  false,
  true,
  NOW() - INTERVAL '1 week'
);
*/

console.log('Sample emails ready to insert. Copy the SQL above and run it in your Supabase SQL editor.');
console.log('Remember to replace "your-building-id-here" with an actual building ID from your database.');
