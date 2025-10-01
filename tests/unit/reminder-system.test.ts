import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reminderService } from '@/lib/accounting/reminder-service';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { role: 'manager' },
          error: null
        }))
      }))
    })),
    rpc: vi.fn(() => ({
      data: [
        {
          id: 'reminder-1',
          title: 'Budget Approval Due: Budget Approval 2025',
          description: 'The budget approval for Budget Approval 2025 is due.',
          due_date: '2025-01-31',
          reminder_days: 30,
          status: 'pending',
          priority: 'high',
          period_name: 'Budget Approval 2025',
          days_until_due: 15
        }
      ],
      error: null
    }))
  }))
};

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabase
}));

describe('Reminder System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReminderService', () => {
    it('should get upcoming reminders for a building', async () => {
      const reminders = await reminderService.getUpcomingReminders('building-1', 30);

      expect(reminders).toHaveLength(1);
      expect(reminders[0].title).toBe('Budget Approval Due: Budget Approval 2025');
      expect(reminders[0].status).toBe('pending');
      expect(reminders[0].priority).toBe('high');
      expect(reminders[0].days_until_due).toBe(15);

      // Verify RPC was called with correct parameters
      const rpcCall = mockSupabase.from().rpc.mock.calls[0];
      expect(rpcCall[0]).toBe('get_upcoming_reminders');
      expect(rpcCall[1]).toEqual({
        building_uuid: 'building-1',
        days_ahead: 30
      });
    });

    it('should update reminder status', async () => {
      mockSupabase.from.mockReturnValueOnce({
        rpc: vi.fn(() => ({
          data: true,
          error: null
        }))
      });

      const result = await reminderService.updateReminderStatus(
        'reminder-1',
        'acknowledged',
        'user-1',
        'Acknowledged by user'
      );

      expect(result).toBe(true);

      // Verify RPC was called with correct parameters
      const rpcCall = mockSupabase.from().rpc.mock.calls[0];
      expect(rpcCall[0]).toBe('update_reminder_status');
      expect(rpcCall[1]).toEqual({
        reminder_uuid: 'reminder-1',
        new_status: 'acknowledged',
        actor_uuid: 'user-1',
        notes_text: 'Acknowledged by user'
      });
    });

    it('should create standard accounting periods', async () => {
      mockSupabase.from.mockReturnValueOnce({
        rpc: vi.fn(() => ({
          data: null,
          error: null
        }))
      });

      await reminderService.createStandardPeriods('building-1', 2024);

      // Verify RPC was called
      const rpcCall = mockSupabase.from().rpc.mock.calls[0];
      expect(rpcCall[0]).toBe('create_standard_accounting_periods');
      expect(rpcCall[1]).toEqual({
        building_uuid: 'building-1',
        year: 2024
      });
    });

    it('should get status color correctly', () => {
      expect(reminderService.getStatusColor('completed', 5)).toBe('green');
      expect(reminderService.getStatusColor('acknowledged', 5)).toBe('amber');
      expect(reminderService.getStatusColor('pending', -5)).toBe('red');
      expect(reminderService.getStatusColor('pending', 3)).toBe('amber');
      expect(reminderService.getStatusColor('pending', 10)).toBe('green');
    });

    it('should get priority color correctly', () => {
      expect(reminderService.getPriorityColor('critical')).toBe('red');
      expect(reminderService.getPriorityColor('high')).toBe('amber');
      expect(reminderService.getPriorityColor('medium')).toBe('green');
      expect(reminderService.getPriorityColor('low')).toBe('green');
    });

    it('should process daily reminders', async () => {
      // Mock reminders due today
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [
                {
                  id: 'reminder-1',
                  title: 'Test Reminder',
                  accounting_periods: {
                    period_name: 'Test Period',
                    building_id: 'building-1'
                  }
                }
              ],
              error: null
            }))
          }))
        }))
      });

      // Mock overdue reminders
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              in: vi.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock update reminder status calls
      mockSupabase.from.mockReturnValue({
        rpc: vi.fn(() => ({
          data: true,
          error: null
        }))
      });

      const results = await reminderService.processDailyReminders();

      expect(results.sent).toBe(1);
      expect(results.overdue).toBe(0);
      expect(results.errors).toHaveLength(0);
    });
  });

  describe('Deadlines API', () => {
    it('should return reminders and analysis', async () => {
      const response = await fetch('/api/ai/deadlines?building_id=building-1&action=list');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.reminders).toHaveLength(1);
      expect(data.data.analysis).toBeDefined();
      expect(data.data.summary.total).toBe(1);
    });

    it('should create standard periods', async () => {
      // Mock period creation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: [],
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock period creation RPC
      mockSupabase.from.mockReturnValueOnce({
        rpc: vi.fn(() => ({
          data: null,
          error: null
        }))
      });

      // Mock period fetching after creation
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                data: [
                  { id: 'period-1' },
                  { id: 'period-2' },
                  { id: 'period-3' }
                ],
                error: null
              }))
            }))
          }))
        }))
      });

      // Mock reminder generation
      mockSupabase.from.mockReturnValue({
        rpc: vi.fn(() => ({
          data: null,
          error: null
        }))
      });

      const response = await fetch('/api/ai/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: 'building-1',
          action: 'create',
        }),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.periods_created).toBe(3);
    });

    it('should update reminder status', async () => {
      mockSupabase.from.mockReturnValue({
        rpc: vi.fn(() => ({
          data: true,
          error: null
        }))
      });

      const response = await fetch('/api/ai/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: 'building-1',
          action: 'update',
          reminder_id: 'reminder-1',
          status: 'acknowledged',
          notes: 'Test acknowledgment',
        }),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data).toBe(true);
    });

    it('should generate AI insights', async () => {
      const response = await fetch('/api/ai/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: 'building-1',
          action: 'analyze',
        }),
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.insights).toBeDefined();
      expect(data.data.recommendations).toBeDefined();
      expect(data.data.risk_assessment).toBeDefined();
    });
  });

  describe('Daily Reminder Job', () => {
    it('should process daily reminders successfully', async () => {
      // Mock the reminder service
      vi.spyOn(reminderService, 'processDailyReminders').mockResolvedValue({
        sent: 2,
        overdue: 1,
        errors: []
      });

      const response = await fetch('/api/cron/daily-reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.data.sent).toBe(2);
      expect(data.data.overdue).toBe(1);
      expect(data.data.errors).toHaveLength(0);
    });

    it('should handle unauthorized requests', async () => {
      const response = await fetch('/api/cron/daily-reminders', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-secret',
        },
      });

      expect(response.status).toBe(401);
    });
  });
});




