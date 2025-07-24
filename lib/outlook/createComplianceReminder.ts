import { supabase } from '../supabase';

/**
 * Interface for compliance reminder creation parameters
 */
export interface CreateComplianceReminderParams {
  buildingName: string;
  assetName: string;
  nextDueDate: string; // ISO format (YYYY-MM-DD)
  outlookAccessToken: string;
  buildingId?: number;
  complianceAssetId?: string;
  userId?: string;
}

/**
 * Interface for the reminder event response
 */
export interface ComplianceReminderResponse {
  success: boolean;
  eventId?: string;
  message: string;
  error?: string;
  reminderType?: 'single' | 'multiple';
  eventsCreated?: number;
}

/**
 * Interface for storing reminder metadata in Supabase
 */
interface ReminderMetadata {
  building_id?: number;
  compliance_asset_id?: string;
  user_id?: string;
  outlook_event_id: string;
  reminder_date: string;
  reminder_type: string;
  created_at: string;
}

/**
 * Create a compliance reminder calendar event in Outlook
 * 
 * Strategy: Create 3 separate events for 90, 60, and 30-day reminders
 * since Outlook only supports 1 reminder per event
 */
export async function createComplianceReminder({
  buildingName,
  assetName,
  nextDueDate,
  outlookAccessToken,
  buildingId,
  complianceAssetId,
  userId
}: CreateComplianceReminderParams): Promise<ComplianceReminderResponse> {
  try {
    // Validate inputs
    if (!buildingName || !assetName || !nextDueDate || !outlookAccessToken) {
      throw new Error('Missing required parameters: buildingName, assetName, nextDueDate, or outlookAccessToken');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(nextDueDate)) {
      throw new Error('nextDueDate must be in ISO format (YYYY-MM-DD)');
    }

    // Calculate reminder dates
    const dueDate = new Date(nextDueDate);
    const reminderDates = [
      {
        date: new Date(dueDate.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days before
        label: '90-Day',
        reminderMinutes: 0 // All-day event
      },
      {
        date: new Date(dueDate.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days before
        label: '60-Day',
        reminderMinutes: 0 // All-day event
      },
      {
        date: new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days before
        label: '30-Day',
        reminderMinutes: 0 // All-day event
      }
    ];

    // Filter out past dates
    const currentDate = new Date();
    const validReminders = reminderDates.filter(reminder => reminder.date > currentDate);

    if (validReminders.length === 0) {
      return {
        success: false,
        message: 'All reminder dates are in the past',
        error: 'No valid reminder dates'
      };
    }

    const createdEvents: string[] = [];
    const errors: string[] = [];

    // Create each reminder event
    for (const reminder of validReminders) {
      try {
        const eventId = await createSingleReminderEvent({
          buildingName,
          assetName,
          nextDueDate,
          reminderDate: reminder.date,
          reminderLabel: reminder.label,
          outlookAccessToken,
          buildingId,
          complianceAssetId,
          userId
        });

        if (eventId) {
          createdEvents.push(eventId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${reminder.label} reminder: ${errorMessage}`);
        console.error(`❌ Failed to create ${reminder.label} reminder:`, error);
      }
    }

    // Return results
    if (createdEvents.length > 0) {
      return {
        success: true,
        eventId: createdEvents[0], // Return first event ID for backward compatibility
        message: `Successfully created ${createdEvents.length} compliance reminder(s)`,
        reminderType: 'multiple',
        eventsCreated: createdEvents.length
      };
    } else {
      return {
        success: false,
        message: 'Failed to create any compliance reminders',
        error: errors.join('; ')
      };
    }

  } catch (error) {
    console.error('❌ Error in createComplianceReminder:', error);
    return {
      success: false,
      message: 'Failed to create compliance reminder',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a single reminder event in Outlook calendar
 */
async function createSingleReminderEvent({
  buildingName,
  assetName,
  nextDueDate,
  reminderDate,
  reminderLabel,
  outlookAccessToken,
  buildingId,
  complianceAssetId,
  userId
}: {
  buildingName: string;
  assetName: string;
  nextDueDate: string;
  reminderDate: Date;
  reminderLabel: string;
  outlookAccessToken: string;
  buildingId?: number;
  complianceAssetId?: string;
  userId?: string;
}): Promise<string | null> {
  try {
    // Format the reminder date for all-day event
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    // Create event payload
    const eventPayload = {
      subject: `[Compliance Reminder] ${reminderLabel} - ${assetName} due at ${buildingName}`,
      start: {
        date: reminderDateStr,
        timeZone: 'Europe/London'
      },
      end: {
        date: reminderDateStr,
        timeZone: 'Europe/London'
      },
      isAllDay: true,
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #d32f2f;">🚨 Compliance Reminder</h2>
            <p><strong>Asset:</strong> ${assetName}</p>
            <p><strong>Building:</strong> ${buildingName}</p>
            <p><strong>Due Date:</strong> ${formatDate(nextDueDate)}</p>
            <p><strong>Reminder Type:</strong> ${reminderLabel} reminder</p>
            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              This is a compliance reminder generated by BlocIQ.
              Please ensure this compliance requirement is addressed before the due date.
            </p>
            <p style="color: #666; font-size: 12px;">
              Generated on ${new Date().toLocaleDateString('en-GB')}
            </p>
          </div>
        `
      },
      importance: 'high',
      showAs: 'busy',
      categories: ['Compliance', 'BlocIQ', reminderLabel],
      reminderMinutesBeforeStart: 0 // All-day events don't need reminder offset
    };

    // Create the event via Microsoft Graph API
    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${outlookAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Graph API error for ${reminderLabel} reminder:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    const eventData = await response.json();
    const eventId = eventData.id;

    if (!eventId) {
      throw new Error('No event ID returned from Microsoft Graph API');
    }

    // Store reminder metadata in Supabase if we have the required data
    if (buildingId && complianceAssetId && userId) {
      try {
        await storeReminderMetadata({
          building_id: buildingId,
          compliance_asset_id: complianceAssetId,
          user_id: userId,
          outlook_event_id: eventId,
          reminder_date: reminderDateStr,
          reminder_type: reminderLabel,
          created_at: new Date().toISOString()
        });
      } catch (metadataError) {
        console.warn(`⚠️ Failed to store reminder metadata for ${reminderLabel} reminder:`, metadataError);
        // Don't fail the whole operation if metadata storage fails
      }
    }

    console.log(`✅ Created ${reminderLabel} compliance reminder:`, {
      eventId,
      assetName,
      buildingName,
      reminderDate: reminderDateStr,
      dueDate: nextDueDate
    });

    return eventId;

  } catch (error) {
    console.error(`❌ Error creating ${reminderLabel} reminder event:`, error);
    throw error;
  }
}

/**
 * Store reminder metadata in Supabase for tracking and updates
 */
async function storeReminderMetadata(metadata: ReminderMetadata): Promise<void> {
  try {
    const { error } = await supabase
      .from('compliance_reminders')
      .insert(metadata);

    if (error) {
      console.error('❌ Error storing reminder metadata:', error);
      throw new Error(`Failed to store reminder metadata: ${error.message}`);
    }

    console.log('✅ Stored reminder metadata:', metadata.outlook_event_id);
  } catch (error) {
    console.error('❌ Error in storeReminderMetadata:', error);
    throw error;
  }
}

/**
 * Alternative function for creating a single reminder event (simpler approach)
 * Use this if you only want one reminder per compliance item
 */
export async function createSingleComplianceReminder({
  buildingName,
  assetName,
  nextDueDate,
  outlookAccessToken,
  buildingId,
  complianceAssetId,
  userId
}: CreateComplianceReminderParams): Promise<ComplianceReminderResponse> {
  try {
    // Validate inputs
    if (!buildingName || !assetName || !nextDueDate || !outlookAccessToken) {
      throw new Error('Missing required parameters: buildingName, assetName, nextDueDate, or outlookAccessToken');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(nextDueDate)) {
      throw new Error('nextDueDate must be in ISO format (YYYY-MM-DD)');
    }

    // Calculate 30-day reminder date
    const dueDate = new Date(nextDueDate);
    const reminderDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before

    // Check if reminder date is in the past
    const currentDate = new Date();
    if (reminderDate <= currentDate) {
      return {
        success: false,
        message: 'Reminder date is in the past',
        error: 'Cannot create reminder for past date'
      };
    }

    // Create single reminder event
    const eventId = await createSingleReminderEvent({
      buildingName,
      assetName,
      nextDueDate,
      reminderDate,
      reminderLabel: '30-Day',
      outlookAccessToken,
      buildingId,
      complianceAssetId,
      userId
    });

    if (eventId) {
      return {
        success: true,
        eventId,
        message: 'Successfully created compliance reminder',
        reminderType: 'single',
        eventsCreated: 1
      };
    } else {
      return {
        success: false,
        message: 'Failed to create compliance reminder',
        error: 'No event ID returned'
      };
    }

  } catch (error) {
    console.error('❌ Error in createSingleComplianceReminder:', error);
    return {
      success: false,
      message: 'Failed to create compliance reminder',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update an existing compliance reminder event
 */
export async function updateComplianceReminder({
  eventId,
  buildingName,
  assetName,
  nextDueDate,
  outlookAccessToken
}: {
  eventId: string;
  buildingName: string;
  assetName: string;
  nextDueDate: string;
  outlookAccessToken: string;
}): Promise<ComplianceReminderResponse> {
  try {
    // Validate inputs
    if (!eventId || !buildingName || !assetName || !nextDueDate || !outlookAccessToken) {
      throw new Error('Missing required parameters');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(nextDueDate)) {
      throw new Error('nextDueDate must be in ISO format (YYYY-MM-DD)');
    }

    // Calculate new reminder date (30 days before due date)
    const dueDate = new Date(nextDueDate);
    const reminderDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    // Update event payload
    const updatePayload = {
      subject: `[Compliance Reminder] 30-Day - ${assetName} due at ${buildingName}`,
      start: {
        date: reminderDateStr,
        timeZone: 'Europe/London'
      },
      end: {
        date: reminderDateStr,
        timeZone: 'Europe/London'
      },
      body: {
        contentType: 'HTML',
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #d32f2f;">🚨 Compliance Reminder (Updated)</h2>
            <p><strong>Asset:</strong> ${assetName}</p>
            <p><strong>Building:</strong> ${buildingName}</p>
            <p><strong>Due Date:</strong> ${formatDate(nextDueDate)}</p>
            <p><strong>Reminder Type:</strong> 30-Day reminder</p>
            <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              This compliance reminder has been updated. Please ensure this requirement is addressed before the due date.
            </p>
            <p style="color: #666; font-size: 12px;">
              Updated on ${new Date().toLocaleDateString('en-GB')}
            </p>
          </div>
        `
      }
    };

    // Update the event via Microsoft Graph API
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${outlookAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Graph API error updating reminder:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Updated compliance reminder:', {
      eventId,
      assetName,
      buildingName,
      newReminderDate: reminderDateStr,
      dueDate: nextDueDate
    });

    return {
      success: true,
      eventId,
      message: 'Successfully updated compliance reminder'
    };

  } catch (error) {
    console.error('❌ Error updating compliance reminder:', error);
    return {
      success: false,
      message: 'Failed to update compliance reminder',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a compliance reminder event
 */
export async function deleteComplianceReminder({
  eventId,
  outlookAccessToken
}: {
  eventId: string;
  outlookAccessToken: string;
}): Promise<ComplianceReminderResponse> {
  try {
    if (!eventId || !outlookAccessToken) {
      throw new Error('Missing required parameters: eventId or outlookAccessToken');
    }

    // Delete the event via Microsoft Graph API
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${outlookAccessToken}`,
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Graph API error deleting reminder:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
    }

    // Also delete from Supabase if it exists
    try {
      await supabase
        .from('compliance_reminders')
        .delete()
        .eq('outlook_event_id', eventId);
    } catch (metadataError) {
      console.warn('⚠️ Failed to delete reminder metadata:', metadataError);
      // Don't fail the whole operation if metadata deletion fails
    }

    console.log('✅ Deleted compliance reminder:', eventId);

    return {
      success: true,
      message: 'Successfully deleted compliance reminder'
    };

  } catch (error) {
    console.error('❌ Error deleting compliance reminder:', error);
    return {
      success: false,
      message: 'Failed to delete compliance reminder',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Helper function to format dates for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
} 