/**
 * Email Service Integration
 * Handles email sending for production communications
 */

import { logCommunication } from '@/lib/utils/communications-logger'

export interface EmailRecipient {
  email: string
  name?: string
  building_id?: string
  leaseholder_id?: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface SendEmailOptions {
  to: EmailRecipient[]
  template: EmailTemplate
  from?: {
    email: string
    name: string
  }
  metadata?: Record<string, any>
  testMode?: boolean
}

export interface EmailServiceResult {
  success: boolean
  messageId?: string
  error?: string
  details?: any
}

/**
 * Main email service class - supports multiple providers
 */
export class EmailService {
  private provider: EmailProvider

  constructor(provider?: EmailProvider) {
    // Auto-detect provider based on environment variables
    if (provider) {
      this.provider = provider
    } else if (process.env.SENDGRID_API_KEY) {
      this.provider = new SendGridProvider(process.env.SENDGRID_API_KEY)
    } else if (process.env.SMTP_HOST) {
      this.provider = new SMTPProvider({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        username: process.env.SMTP_USERNAME!,
        password: process.env.SMTP_PASSWORD!,
        secure: process.env.SMTP_SECURE === 'true'
      })
    } else {
      this.provider = new ConsoleProvider() // Fallback for development
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailServiceResult> {
    try {
      console.log(`📧 Sending email to ${options.to.length} recipients...`)

      if (options.testMode) {
        console.log('🧪 Test mode: Email not actually sent')
        return {
          success: true,
          messageId: `test-${Date.now()}`,
          details: { testMode: true, recipients: options.to.length }
        }
      }

      const result = await this.provider.send(options)

      // Log each email communication
      for (const recipient of options.to) {
        await logCommunication({
          building_id: recipient.building_id,
          leaseholder_id: recipient.leaseholder_id,
          direction: 'outbound',
          subject: options.template.subject,
          body: options.template.html,
          metadata: {
            email_service: 'production',
            message_id: result.messageId,
            provider: this.provider.name,
            ...options.metadata
          }
        })
      }

      console.log('✅ Email sent successfully:', result.messageId)
      return result

    } catch (error) {
      console.error('❌ Email sending failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }
    }
  }
}

/**
 * Abstract email provider interface
 */
export abstract class EmailProvider {
  abstract name: string
  abstract send(options: SendEmailOptions): Promise<EmailServiceResult>
}

/**
 * SendGrid email provider
 */
export class SendGridProvider extends EmailProvider {
  name = 'sendgrid'
  private apiKey: string

  constructor(apiKey: string) {
    super()
    this.apiKey = apiKey
  }

  async send(options: SendEmailOptions): Promise<EmailServiceResult> {
    const sgMail = await import('@sendgrid/mail')
    sgMail.default.setApiKey(this.apiKey)

    try {
      const messages = options.to.map(recipient => ({
        to: {
          email: recipient.email,
          name: recipient.name
        },
        from: options.from || {
          email: process.env.FROM_EMAIL || 'noreply@blociq.co.uk',
          name: process.env.FROM_NAME || 'BlocIQ'
        },
        subject: options.template.subject,
        html: options.template.html,
        text: options.template.text
      }))

      const results = await sgMail.default.send(messages)

      return {
        success: true,
        messageId: results[0]?.[0]?.headers?.['x-message-id'] || 'sendgrid-success',
        details: results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'SendGrid error',
        details: error
      }
    }
  }
}

/**
 * SMTP email provider
 */
export class SMTPProvider extends EmailProvider {
  name = 'smtp'
  private config: SMTPConfig

  constructor(config: SMTPConfig) {
    super()
    this.config = config
  }

  async send(options: SendEmailOptions): Promise<EmailServiceResult> {
    const nodemailer = await import('nodemailer')

    const transporter = nodemailer.default.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.username,
        pass: this.config.password
      }
    })

    try {
      const results = await Promise.all(
        options.to.map(recipient =>
          transporter.sendMail({
            from: `"${options.from?.name || 'BlocIQ'}" <${options.from?.email || process.env.FROM_EMAIL}>`,
            to: `"${recipient.name || ''}" <${recipient.email}>`,
            subject: options.template.subject,
            html: options.template.html,
            text: options.template.text
          })
        )
      )

      return {
        success: true,
        messageId: results[0]?.messageId || 'smtp-success',
        details: results
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'SMTP error',
        details: error
      }
    }
  }
}

/**
 * Console provider for development
 */
export class ConsoleProvider extends EmailProvider {
  name = 'console'

  async send(options: SendEmailOptions): Promise<EmailServiceResult> {
    console.log('📧 [CONSOLE EMAIL PROVIDER]')
    console.log('To:', options.to.map(r => r.email).join(', '))
    console.log('Subject:', options.template.subject)
    console.log('HTML:', options.template.html.substring(0, 200) + '...')
    console.log('Recipients:', options.to.length)

    return {
      success: true,
      messageId: `console-${Date.now()}`,
      details: { provider: 'console', recipients: options.to.length }
    }
  }
}

interface SMTPConfig {
  host: string
  port: number
  username: string
  password: string
  secure: boolean
}

// Export singleton instance
export const emailService = new EmailService()

/**
 * Helper function for template-based email sending
 */
export async function sendTemplateEmail({
  recipients,
  template,
  testMode = false,
  metadata = {}
}: {
  recipients: EmailRecipient[]
  template: EmailTemplate
  testMode?: boolean
  metadata?: Record<string, any>
}): Promise<EmailServiceResult> {
  return emailService.sendEmail({
    to: recipients,
    template,
    testMode,
    metadata: {
      sent_via: 'template_email',
      ...metadata
    }
  })
}