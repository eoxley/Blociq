import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, name, email, phone, company, numberOfBuildings, message } = body

    // Validate required fields
    if (!name || !email || !company) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create email body
    const emailBody = `
New Demo Request from BlocIQ Website

Contact Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Company: ${company}
Number of Buildings: ${numberOfBuildings || 'Not specified'}

Message:
${message || 'No additional message provided'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Submitted: ${new Date().toLocaleString('en-GB', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'Europe/London'
})}
    `.trim()

    // For now, we'll use a simple email service or Resend
    // You can replace this with your preferred email service
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'BlocIQ Website <noreply@blociq.co.uk>',
        to: to,
        subject: `New Demo Request from ${name} at ${company}`,
        text: emailBody,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6A00F5; border-bottom: 3px solid #6A00F5; padding-bottom: 10px;">
              New Demo Request from BlocIQ Website
            </h2>

            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Contact Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Name:</td>
                  <td style="padding: 8px 0; color: #333;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                  <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #6A00F5;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Phone:</td>
                  <td style="padding: 8px 0; color: #333;">${phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Company:</td>
                  <td style="padding: 8px 0; color: #333;">${company}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #555;">Buildings:</td>
                  <td style="padding: 8px 0; color: #333;">${numberOfBuildings || 'Not specified'}</td>
                </tr>
              </table>
            </div>

            ${message ? `
              <div style="background: #fff; padding: 20px; border-left: 4px solid #6A00F5; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">Additional Message</h3>
                <p style="color: #666; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            ` : ''}

            <div style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Submitted: ${new Date().toLocaleString('en-GB', {
                dateStyle: 'full',
                timeStyle: 'long',
                timeZone: 'Europe/London'
              })}
            </div>
          </div>
        `
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Email send error:', errorData)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Demo request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}