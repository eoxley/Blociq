// Email notification service for lease processing jobs
// This integrates with Resend (or can be adapted for other email services)

interface EmailNotificationData {
  userEmail: string;
  userName?: string;
  jobId: string;
  filename: string;
  success: boolean;
  analysis?: any;
  processingTime?: string;
  errorMessage?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailNotificationService {
  private apiKey: string;
  private fromEmail: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@blociq.co.uk';
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }

  /**
   * Send notification email when lease processing completes
   */
  async sendCompletionNotification(data: EmailNotificationData): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('⚠️ Email notifications disabled - RESEND_API_KEY not configured');
      return false;
    }

    try {
      const template = data.success 
        ? this.generateSuccessTemplate(data)
        : this.generateFailureTemplate(data);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [data.userEmail],
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: [
            { name: 'category', value: 'lease-processing' },
            { name: 'status', value: data.success ? 'success' : 'failure' },
            { name: 'jobId', value: data.jobId }
          ]
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Email sent successfully to ${data.userEmail}:`, result.id);
        return true;
      } else {
        const error = await response.text();
        console.error(`❌ Failed to send email to ${data.userEmail}:`, error);
        return false;
      }
    } catch (error) {
      console.error('❌ Email sending error:', error);
      return false;
    }
  }

  /**
   * Generate success email template
   */
  private generateSuccessTemplate(data: EmailNotificationData): EmailTemplate {
    const resultsUrl = `${this.baseUrl}/lease-analysis/${data.jobId}`;
    const userName = data.userName || 'there';
    
    let analysisHighlights = '';
    if (data.analysis) {
      const highlights = [];
      if (data.analysis.keyTerms?.monthlyRent) {
        highlights.push(`• Monthly Rent: ${data.analysis.keyTerms.monthlyRent}`);
      }
      if (data.analysis.keyTerms?.tenantName) {
        highlights.push(`• Tenant: ${data.analysis.keyTerms.tenantName}`);
      }
      if (data.analysis.keyTerms?.leaseStartDate) {
        highlights.push(`• Lease Start: ${data.analysis.keyTerms.leaseStartDate}`);
      }
      if (data.analysis.keyTerms?.propertyAddress) {
        highlights.push(`• Property: ${data.analysis.keyTerms.propertyAddress}`);
      }
      if (data.analysis.clauses?.length > 0) {
        highlights.push(`• ${data.analysis.clauses.length} lease clauses identified`);
      }
      
      if (highlights.length > 0) {
        analysisHighlights = `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2563eb; margin-top: 0; font-size: 16px;">📊 Key Information Extracted:</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #374151;">
              ${highlights.map(h => `<li style="margin: 5px 0;">${h}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    }

    const subject = `✅ Lease Analysis Complete: ${data.filename}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Lease Analysis Complete</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
                📄 Lease Analysis Complete
              </h1>
              <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">
                Your document has been successfully processed
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-top: 0;">Hi ${userName},</p>
              
              <p style="font-size: 16px;">
                Great news! We've successfully analyzed your lease document and extracted all the key information.
              </p>
              
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #059669; margin-top: 0; font-size: 18px;">📋 Processing Summary</h3>
                <ul style="margin: 0; padding-left: 20px; color: #047857;">
                  <li><strong>Document:</strong> ${data.filename}</li>
                  <li><strong>Analysis Confidence:</strong> ${data.analysis?.confidence ? Math.round(data.analysis.confidence * 100) + '%' : 'High'}</li>
                  <li><strong>Processing Time:</strong> ${data.processingTime || 'A few minutes'}</li>
                  <li><strong>Completed:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              ${analysisHighlights}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resultsUrl}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  📊 View Complete Analysis
                </a>
              </div>
              
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  💡 <strong>What's Next?</strong> You can now view detailed lease clauses, download reports, 
                  and integrate this analysis with your property management workflow.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                If you have any questions about your analysis or need help, 
                please don't hesitate to contact our support team.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 0;">
                Best regards,<br>
                The Blociq Team
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This is an automated notification from Blociq Lease Processing System<br>
                Job ID: ${data.jobId}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Lease Analysis Complete - ${data.filename}
      
      Hi ${userName},
      
      Great news! We've successfully analyzed your lease document and extracted all the key information.
      
      Processing Summary:
      - Document: ${data.filename}
      - Analysis Confidence: ${data.analysis?.confidence ? Math.round(data.analysis.confidence * 100) + '%' : 'High'}
      - Processing Time: ${data.processingTime || 'A few minutes'}
      - Completed: ${new Date().toLocaleString()}
      
      View your complete analysis at: ${resultsUrl}
      
      What's Next? You can now view detailed lease clauses, download reports, and integrate this analysis with your property management workflow.
      
      If you have any questions about your analysis or need help, please don't hesitate to contact our support team.
      
      Best regards,
      The Blociq Team
      
      ---
      This is an automated notification from Blociq Lease Processing System
      Job ID: ${data.jobId}
    `;

    return { subject, html, text };
  }

  /**
   * Generate failure email template
   */
  private generateFailureTemplate(data: EmailNotificationData): EmailTemplate {
    const userName = data.userName || 'there';
    const supportEmail = 'support@blociq.co.uk';
    
    const subject = `❌ Lease Analysis Failed: ${data.filename}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Lease Analysis Failed</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
                ⚠️ Processing Issue
              </h1>
              <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">
                We encountered a problem processing your document
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px; margin-top: 0;">Hi ${userName},</p>
              
              <p style="font-size: 16px;">
                We're sorry, but we weren't able to process your lease document "${data.filename}" at this time.
              </p>
              
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0; font-size: 18px;">📋 Issue Details</h3>
                <ul style="margin: 0; padding-left: 20px; color: #b91c1c;">
                  <li><strong>Document:</strong> ${data.filename}</li>
                  <li><strong>Issue:</strong> ${data.errorMessage || 'Processing failed'}</li>
                  <li><strong>Attempted:</strong> ${new Date().toLocaleString()}</li>
                </ul>
              </div>
              
              <div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1d4ed8; margin-top: 0; font-size: 18px;">💡 What You Can Do</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                  <li><strong>Check the document format:</strong> Ensure your file is a clear PDF, JPEG, or PNG</li>
                  <li><strong>Try a smaller file:</strong> Large files (>20MB) may have processing issues</li>
                  <li><strong>Upload again:</strong> Sometimes a simple retry resolves temporary issues</li>
                  <li><strong>Contact support:</strong> We're happy to help troubleshoot specific documents</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.baseUrl}/lease-upload" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
                  🔄 Try Again
                </a>
                <a href="mailto:${supportEmail}?subject=Lease Processing Issue - Job ${data.jobId}" 
                   style="display: inline-block; background-color: #6b7280; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  📧 Contact Support
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                Our system automatically retried processing your document, but the issue persisted. 
                This is often due to document formatting or quality issues that prevent text extraction.
              </p>
              
              <p style="font-size: 16px; margin-bottom: 0;">
                We apologize for the inconvenience,<br>
                The Blociq Team
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This is an automated notification from Blociq Lease Processing System<br>
                Job ID: ${data.jobId}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Lease Analysis Failed - ${data.filename}
      
      Hi ${userName},
      
      We're sorry, but we weren't able to process your lease document "${data.filename}" at this time.
      
      Issue Details:
      - Document: ${data.filename}
      - Issue: ${data.errorMessage || 'Processing failed'}
      - Attempted: ${new Date().toLocaleString()}
      
      What You Can Do:
      - Check the document format: Ensure your file is a clear PDF, JPEG, or PNG
      - Try a smaller file: Large files (>20MB) may have processing issues  
      - Upload again: Sometimes a simple retry resolves temporary issues
      - Contact support: We're happy to help troubleshoot specific documents
      
      Try again: ${this.baseUrl}/lease-upload
      Contact support: ${supportEmail}
      
      Our system automatically retried processing your document, but the issue persisted. This is often due to document formatting or quality issues that prevent text extraction.
      
      We apologize for the inconvenience,
      The Blociq Team
      
      ---
      This is an automated notification from Blociq Lease Processing System
      Job ID: ${data.jobId}
    `;

    return { subject, html, text };
  }

  /**
   * Send a simple test notification
   */
  async sendTestNotification(email: string): Promise<boolean> {
    return this.sendCompletionNotification({
      userEmail: email,
      userName: 'Test User',
      jobId: 'test-job-123',
      filename: 'sample-lease.pdf',
      success: true,
      analysis: {
        confidence: 0.95,
        keyTerms: {
          monthlyRent: '£1,200',
          tenantName: 'John Smith',
          leaseStartDate: '1st January 2024'
        },
        clauses: [
          { term: 'rent', text: 'Monthly rent shall be £1,200 payable in advance' }
        ]
      },
      processingTime: '2 minutes'
    });
  }
}