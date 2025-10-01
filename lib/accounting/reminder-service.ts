import { createClient } from '@/lib/supabase/server';

export interface ReminderData {
  id: string;
  title: string;
  description: string;
  due_date: string;
  reminder_days: number;
  status: string;
  priority: string;
  period_name: string;
  days_until_due: number;
  building_id: string;
  assigned_to?: string;
}

export class ReminderService {
  private supabase = createClient();

  /**
   * Get upcoming reminders for a building
   */
  async getUpcomingReminders(buildingId: string, daysAhead: number = 30): Promise<ReminderData[]> {
    const { data, error } = await this.supabase
      .rpc('get_upcoming_reminders', {
        building_uuid: buildingId,
        days_ahead: daysAhead
      });

    if (error) {
      throw new Error(`Failed to fetch reminders: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update reminder status
   */
  async updateReminderStatus(
    reminderId: string, 
    status: string, 
    actorId?: string, 
    notes?: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('update_reminder_status', {
        reminder_uuid: reminderId,
        new_status: status,
        actor_uuid: actorId,
        notes_text: notes
      });

    if (error) {
      throw new Error(`Failed to update reminder status: ${error.message}`);
    }

    return data;
  }

  /**
   * Create standard accounting periods for a building
   */
  async createStandardPeriods(buildingId: string, year?: number): Promise<void> {
    const { error } = await this.supabase
      .rpc('create_standard_accounting_periods', {
        building_uuid: buildingId,
        year: year || new Date().getFullYear()
      });

    if (error) {
      throw new Error(`Failed to create standard periods: ${error.message}`);
    }
  }

  /**
   * Generate reminders for a specific period
   */
  async generateRemindersForPeriod(periodId: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('generate_reminders_for_period', {
        period_uuid: periodId
      });

    if (error) {
      throw new Error(`Failed to generate reminders: ${error.message}`);
    }
  }

  /**
   * Get all periods for a building
   */
  async getPeriods(buildingId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('accounting_periods')
      .select('*')
      .eq('building_id', buildingId)
      .order('locked_before', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch periods: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get reminders due today
   */
  async getRemindersDueToday(): Promise<ReminderData[]> {
    const { data, error } = await this.supabase
      .from('accounting_reminders')
      .select(`
        *,
        accounting_periods!inner (
          period_name,
          building_id
        )
      `)
      .eq('due_date', new Date().toISOString().split('T')[0])
      .in('status', ['pending', 'sent']);

    if (error) {
      throw new Error(`Failed to fetch reminders due today: ${error.message}`);
    }

    return data?.map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      due_date: reminder.due_date,
      reminder_days: reminder.reminder_days,
      status: reminder.status,
      priority: reminder.priority,
      period_name: reminder.accounting_periods.period_name,
      days_until_due: 0,
      building_id: reminder.accounting_periods.building_id,
      assigned_to: reminder.assigned_to,
    })) || [];
  }

  /**
   * Get overdue reminders
   */
  async getOverdueReminders(): Promise<ReminderData[]> {
    const { data, error } = await this.supabase
      .from('accounting_reminders')
      .select(`
        *,
        accounting_periods!inner (
          period_name,
          building_id
        )
      `)
      .lt('due_date', new Date().toISOString().split('T')[0])
      .in('status', ['pending', 'sent', 'acknowledged']);

    if (error) {
      throw new Error(`Failed to fetch overdue reminders: ${error.message}`);
    }

    return data?.map(reminder => ({
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      due_date: reminder.due_date,
      reminder_days: reminder.reminder_days,
      status: reminder.status,
      priority: reminder.priority,
      period_name: reminder.accounting_periods.period_name,
      days_until_due: Math.floor((new Date().getTime() - new Date(reminder.due_date).getTime()) / (1000 * 60 * 60 * 24)),
      building_id: reminder.accounting_periods.building_id,
      assigned_to: reminder.assigned_to,
    })) || [];
  }

  /**
   * Mark reminder as sent
   */
  async markReminderAsSent(reminderId: string, actorId?: string): Promise<void> {
    await this.updateReminderStatus(reminderId, 'sent', actorId);
  }

  /**
   * Mark reminder as acknowledged
   */
  async markReminderAsAcknowledged(reminderId: string, actorId?: string, notes?: string): Promise<void> {
    await this.updateReminderStatus(reminderId, 'acknowledged', actorId, notes);
  }

  /**
   * Mark reminder as completed
   */
  async markReminderAsCompleted(reminderId: string, actorId?: string, notes?: string): Promise<void> {
    await this.updateReminderStatus(reminderId, 'completed', actorId, notes);
  }

  /**
   * Get reminder status color
   */
  getStatusColor(status: string, daysUntilDue: number): 'green' | 'amber' | 'red' {
    if (status === 'completed') return 'green';
    if (status === 'acknowledged') return 'amber';
    if (daysUntilDue < 0) return 'red';
    if (daysUntilDue <= 7) return 'amber';
    return 'green';
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): 'green' | 'amber' | 'red' {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'amber';
      case 'medium': return 'green';
      case 'low': return 'green';
      default: return 'green';
    }
  }

  /**
   * Process daily reminders (to be called by cron job)
   */
  async processDailyReminders(): Promise<{
    sent: number;
    overdue: number;
    errors: string[];
  }> {
    const results = {
      sent: 0,
      overdue: 0,
      errors: [] as string[]
    };

    try {
      // Get reminders due today
      const dueToday = await this.getRemindersDueToday();
      
      for (const reminder of dueToday) {
        try {
          // Mark as sent (in a real implementation, this would send actual notifications)
          await this.markReminderAsSent(reminder.id);
          results.sent++;
        } catch (error) {
          results.errors.push(`Failed to send reminder ${reminder.id}: ${error}`);
        }
      }

      // Get overdue reminders
      const overdue = await this.getOverdueReminders();
      results.overdue = overdue.length;

      // Mark overdue reminders as overdue
      for (const reminder of overdue) {
        try {
          await this.updateReminderStatus(reminder.id, 'overdue');
        } catch (error) {
          results.errors.push(`Failed to mark reminder ${reminder.id} as overdue: ${error}`);
        }
      }

    } catch (error) {
      results.errors.push(`Daily reminder processing failed: ${error}`);
    }

    return results;
  }
}

// Export singleton instance
export const reminderService = new ReminderService();




