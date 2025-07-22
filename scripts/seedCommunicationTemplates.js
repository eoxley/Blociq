// Script to seed communication templates for testing
// Run this manually to populate the communication_templates table

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const templates = [
  {
    name: 'Welcome Letter',
    description: 'Welcome new leaseholders to the building with important information',
    type: 'letter',
    category: 'General',
    subject: 'Welcome to [building_name] - Important Information',
    body: `
Dear [leaseholder_name],

Welcome to [building_name]! We're delighted to have you as part of our community.

**Important Information:**

**Building Management:**
- Building Manager: [manager_name]
- Emergency Contact: [emergency_contact]
- Office Hours: Monday-Friday, 9:00 AM - 5:00 PM

**Key Policies:**
- Quiet hours: 11:00 PM - 7:00 AM
- No smoking in common areas
- Pets must be registered with management
- Parking permits required for resident vehicles

**Facilities:**
- Laundry room: Located in basement
- Bin storage: Designated areas on each floor
- Intercom system: For visitor access

**Emergency Procedures:**
- Fire alarm: Evacuate immediately via nearest exit
- Power outage: Contact building manager
- Water leak: Turn off main valve and call emergency number

**Contact Information:**
- Building Manager: [manager_phone]
- Emergency: [emergency_phone]
- Email: [manager_email]

We're here to help ensure your stay is comfortable and enjoyable. Please don't hesitate to contact us with any questions or concerns.

Kind regards,
[manager_name]
Building Manager
[building_name]
    `,
    placeholders: ['[leaseholder_name]', '[building_name]', '[manager_name]', '[emergency_contact]', '[manager_phone]', '[emergency_phone]', '[manager_email]'],
    is_active: true,
    usage_count: 0
  },
  {
    name: 'Rent Reminder',
    description: 'Gentle reminder for upcoming rent payments',
    type: 'email',
    category: 'Reminders',
    subject: 'Rent Reminder - [building_name] - Due [due_date]',
    body: `
Dear [leaseholder_name],

This is a friendly reminder that your rent payment of £[rent_amount] is due on [due_date].

**Payment Details:**
- Amount Due: £[rent_amount]
- Due Date: [due_date]
- Payment Method: [payment_method]
- Reference: [payment_reference]

**Payment Options:**
1. Bank Transfer: [bank_details]
2. Standing Order: Set up automatic payments
3. Online Portal: [portal_link]

**Late Payment Policy:**
- Late fees apply after [late_fee_date]
- Late fee amount: £[late_fee_amount]

If you have any questions about your payment or need to discuss payment arrangements, please contact us immediately.

Thank you for your prompt attention to this matter.

Kind regards,
[manager_name]
Building Manager
[building_name]

Tel: [manager_phone]
Email: [manager_email]
    `,
    placeholders: ['[leaseholder_name]', '[building_name]', '[due_date]', '[rent_amount]', '[payment_method]', '[payment_reference]', '[bank_details]', '[portal_link]', '[late_fee_date]', '[late_fee_amount]', '[manager_name]', '[manager_phone]', '[manager_email]'],
    is_active: true,
    usage_count: 0
  },
  {
    name: 'Maintenance Notice',
    description: 'Inform residents about scheduled maintenance work',
    type: 'notice',
    category: 'Notices',
    subject: 'Scheduled Maintenance - [building_name] - [maintenance_date]',
    body: `
**MAINTENANCE NOTICE**

Dear Residents,

Please be advised that scheduled maintenance work will be carried out at [building_name] on [maintenance_date].

**Maintenance Details:**
- **Work Type:** [maintenance_type]
- **Date:** [maintenance_date]
- **Time:** [maintenance_time]
- **Duration:** [maintenance_duration]
- **Areas Affected:** [affected_areas]

**What to Expect:**
- [work_description]
- Noise levels: [noise_level]
- Access restrictions: [access_restrictions]

**Preparation Required:**
- [preparation_instructions]

**Contact Information:**
If you have any questions or concerns, please contact:
- Building Manager: [manager_name]
- Phone: [manager_phone]
- Email: [manager_email]

We apologise for any inconvenience and appreciate your cooperation.

Thank you,
[manager_name]
Building Manager
[building_name]
    `,
    placeholders: ['[building_name]', '[maintenance_date]', '[maintenance_type]', '[maintenance_time]', '[maintenance_duration]', '[affected_areas]', '[work_description]', '[noise_level]', '[access_restrictions]', '[preparation_instructions]', '[manager_name]', '[manager_phone]', '[manager_email]'],
    is_active: true,
    usage_count: 0
  },
  {
    name: 'Complaint Response',
    description: 'Professional response to resident complaints',
    type: 'email',
    category: 'Complaints',
    subject: 'Re: [complaint_subject] - [building_name]',
    body: `
Dear [resident_name],

Thank you for bringing your concern regarding [complaint_subject] to our attention. We take all feedback seriously and appreciate you taking the time to contact us.

**Your Complaint:**
[complaint_details]

**Our Response:**
[response_details]

**Actions Taken:**
[actions_taken]

**Next Steps:**
[next_steps]

**Follow-up:**
We will follow up on [follow_up_date] to ensure the matter has been resolved to your satisfaction.

**Prevention Measures:**
[prevention_measures]

If you have any further questions or if the situation is not resolved as expected, please don't hesitate to contact us.

We value your tenancy and are committed to maintaining a comfortable living environment for all residents.

Kind regards,
[manager_name]
Building Manager
[building_name]

Tel: [manager_phone]
Email: [manager_email]
    `,
    placeholders: ['[resident_name]', '[complaint_subject]', '[building_name]', '[complaint_details]', '[response_details]', '[actions_taken]', '[next_steps]', '[follow_up_date]', '[prevention_measures]', '[manager_name]', '[manager_phone]', '[manager_email]'],
    is_active: true,
    usage_count: 0
  },
  {
    name: 'Fire Safety Notice',
    description: 'Important fire safety information and procedures',
    type: 'notice',
    category: 'Notices',
    subject: 'Fire Safety Notice - [building_name]',
    body: `
**FIRE SAFETY NOTICE**

Dear Residents,

Your safety is our top priority. Please review the following fire safety information for [building_name].

**Fire Safety Equipment:**
- Smoke detectors: Located in all units and common areas
- Fire extinguishers: Located on each floor
- Fire alarm system: Tested monthly
- Emergency lighting: Installed in all stairwells

**Emergency Procedures:**
1. **If you discover a fire:**
   - Activate the nearest fire alarm
   - Call 999 immediately
   - Evacuate the building
   - Do not use lifts

2. **When fire alarm sounds:**
   - Leave your unit immediately
   - Close all doors behind you
   - Use designated fire exits
   - Proceed to assembly point: [assembly_point]

3. **Assembly Point:**
   - Location: [assembly_point]
   - Wait for emergency services
   - Do not re-enter building until cleared

**Fire Prevention:**
- Never leave cooking unattended
- Do not smoke in bedrooms
- Keep fire exits clear
- Report faulty equipment immediately

**Regular Checks:**
- Test smoke detectors monthly
- Check fire extinguisher locations
- Familiarise yourself with escape routes

**Contact Information:**
- Emergency: 999
- Building Manager: [manager_name]
- Phone: [manager_phone]

**Fire Safety Training:**
Annual fire safety training will be conducted on [training_date].

Please ensure all household members are familiar with these procedures.

Thank you for your cooperation in maintaining a safe environment.

[manager_name]
Building Manager
[building_name]
    `,
    placeholders: ['[building_name]', '[assembly_point]', '[training_date]', '[manager_name]', '[manager_phone]'],
    is_active: true,
    usage_count: 0
  },
  {
    name: 'Lease Renewal Notice',
    description: 'Notice of lease expiration and renewal options',
    type: 'letter',
    category: 'Notices',
    subject: 'Lease Renewal Notice - [building_name]',
    body: `
Dear [leaseholder_name],

This letter serves as formal notice regarding your lease at [building_name], Unit [unit_number].

**Current Lease Details:**
- Lease Start Date: [lease_start_date]
- Lease End Date: [lease_end_date]
- Current Rent: £[current_rent]

**Renewal Options:**

**Option 1: Renew for 12 Months**
- New Rent: £[renewal_rent]
- Lease Term: 12 months
- Start Date: [renewal_start_date]

**Option 2: Month-to-Month**
- New Rent: £[monthly_rent]
- Flexible term
- 30-day notice required

**Option 3: Vacate**
- Notice required: [notice_period]
- Final date: [final_date]
- Move-out inspection: [inspection_date]

**Renewal Process:**
1. Review the attached lease agreement
2. Complete the renewal form
3. Return signed documents by [response_deadline]
4. Pay any required fees

**Important Dates:**
- Response Deadline: [response_deadline]
- New Lease Start: [renewal_start_date]
- Current Lease End: [lease_end_date]

**Contact Information:**
For questions or to schedule a meeting:
- Building Manager: [manager_name]
- Phone: [manager_phone]
- Email: [manager_email]

We value your tenancy and hope you choose to renew. Please contact us if you need any clarification or have questions about the renewal process.

Kind regards,
[manager_name]
Building Manager
[building_name]

Tel: [manager_phone]
Email: [manager_email]
    `,
    placeholders: ['[leaseholder_name]', '[building_name]', '[unit_number]', '[lease_start_date]', '[lease_end_date]', '[current_rent]', '[renewal_rent]', '[renewal_start_date]', '[monthly_rent]', '[notice_period]', '[final_date]', '[inspection_date]', '[response_deadline]', '[manager_name]', '[manager_phone]', '[manager_email]'],
    is_active: true,
    usage_count: 0
  }
]

async function seedTemplates() {
  try {
    console.log('🌱 Seeding communication templates...')
    
    for (const template of templates) {
      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          ...template,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_used_at: null
        })
        .select()

      if (error) {
        console.error(`❌ Error inserting template "${template.name}":`, error)
      } else {
        console.log(`✅ Inserted template: ${template.name}`)
      }
    }

    console.log('🎉 Communication templates seeding completed!')
    console.log(`📊 Total templates seeded: ${templates.length}`)
    
    // List the seeded templates
    const { data: seededTemplates, error: fetchError } = await supabase
      .from('communication_templates')
      .select('name, type, category, is_active')
      .order('created_at')

    if (!fetchError && seededTemplates) {
      console.log('\n📋 Seeded Templates:')
      seededTemplates.forEach((template, index) => {
        console.log(`${index + 1}. ${template.name} (${template.type}) - ${template.category}`)
      })
    }

  } catch (error) {
    console.error('❌ Error seeding templates:', error)
  }
}

// Run the seeding function
seedTemplates() 