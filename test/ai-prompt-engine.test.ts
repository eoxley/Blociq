import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptEngine, AIMode, Tone } from '../lib/ai/promptEngine';

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test response' } }]
        })
      }
    }
  }))
}));

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    }
  })
}));

// Mock context fetcher
vi.mock('../lib/ai/getContext', () => ({
  getContext: vi.fn().mockResolvedValue({
    building: { name: 'Test Building', address: '123 Test St', unit_count: 10 },
    sources: ['Building: Test Building', '10 units']
  })
}));

// Mock draft memory
vi.mock('../lib/ai/draftMemory', () => ({
  saveDraft: vi.fn().mockResolvedValue('draft-123'),
  getDraft: vi.fn().mockResolvedValue({
    id: 'draft-123',
    subject: 'Test Subject',
    body_text: 'Test body content'
  })
}));

describe('PromptEngine', () => {
  let promptEngine: PromptEngine;

  beforeEach(() => {
    promptEngine = new PromptEngine();
    vi.clearAllMocks();
  });

  describe('runAI', () => {
    it('should handle ask mode correctly', async () => {
      const request = {
        mode: 'ask' as AIMode,
        input: 'What is the building status?',
        contextHints: { building_id: 'building-123' }
      };

      const result = await promptEngine.runAI(request);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response');
      expect(result.placeholders).toBeDefined();
    });

    it('should handle generate_reply mode correctly', async () => {
      const request = {
        mode: 'generate_reply' as AIMode,
        input: 'Generate a holding email',
        tone: 'Holding' as Tone,
        contextHints: { building_id: 'building-123' }
      };

      const result = await promptEngine.runAI(request);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response');
      expect(result.placeholders).toBeDefined();
    });

    it('should handle transform_reply mode correctly', async () => {
      const request = {
        mode: 'transform_reply' as AIMode,
        input: 'Make this more casual',
        threadId: 'thread-123',
        tone: 'CasualChaser' as Tone,
        contextHints: { building_id: 'building-123' }
      };

      const result = await promptEngine.runAI(request);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response');
      expect(result.placeholders).toBeDefined();
    });

    it('should throw error for transform mode without thread ID', async () => {
      const request = {
        mode: 'transform_reply' as AIMode,
        input: 'Make this more casual',
        tone: 'CasualChaser' as Tone,
        contextHints: { building_id: 'building-123' }
      };

      // Mock getDraft to return null
      const { getDraft } = await import('../lib/ai/draftMemory');
      vi.mocked(getDraft).mockResolvedValue(null);

      await expect(promptEngine.runAI(request)).rejects.toThrow('No previous draft found for transformation');
    });
  });

  describe('tone instructions', () => {
    it('should provide correct tone instructions for Holding', () => {
      const engine = new PromptEngine();
      const instructions = (engine as any).getToneInstructions('Holding');
      
      expect(instructions).toContain('HOLDING TONE');
      expect(instructions).toContain('Maximum 150 words');
      expect(instructions).toContain('Ask for status/update');
    });

    it('should provide correct tone instructions for SolicitorFormal', () => {
      const engine = new PromptEngine();
      const instructions = (engine as any).getToneInstructions('SolicitorFormal');
      
      expect(instructions).toContain('SOLICITOR FORMAL TONE');
      expect(instructions).toContain('Legal and precise language');
      expect(instructions).toContain('Cite relevant legislation');
    });

    it('should provide correct tone instructions for CasualChaser', () => {
      const engine = new PromptEngine();
      const instructions = (engine as any).getToneInstructions('CasualChaser');
      
      expect(instructions).toContain('CASUAL CHASER TONE');
      expect(instructions).toContain('Light and friendly');
      expect(instructions).toContain('Maintain relationship');
    });
  });

  describe('placeholder detection', () => {
    it('should detect missing recipient name', () => {
      const engine = new PromptEngine();
      const content = 'Dear [PLACEHOLDER],\n\nThis is a test email.\n\nKind regards';
      const placeholders = (engine as any).detectPlaceholders(content);
      
      expect(placeholders).toContain('recipient_name');
    });

    it('should detect missing building name', () => {
      const engine = new PromptEngine();
      const content = 'Dear John,\n\nThis is regarding [PLACEHOLDER].\n\nKind regards';
      const placeholders = (engine as any).detectPlaceholders(content);
      
      expect(placeholders).toContain('building_name');
    });

    it('should return empty array for complete content', () => {
      const engine = new PromptEngine();
      const content = 'Dear John Smith,\n\nThis is regarding Ashwood House.\n\nKind regards';
      const placeholders = (engine as any).detectPlaceholders(content);
      
      expect(placeholders).toEqual([]);
    });
  });

  describe('content processing', () => {
    it('should extract subject from content', () => {
      const engine = new PromptEngine();
      const content = 'Subject: Test Email\n\nDear John,\n\nThis is a test.\n\nKind regards';
      const subject = (engine as any).extractSubject(content);
      
      expect(subject).toBe('Test Email');
    });

    it('should clean content by removing subject line', () => {
      const engine = new PromptEngine();
      const content = 'Subject: Test Email\n\nDear John,\n\nThis is a test.\n\nKind regards';
      const cleanContent = (engine as any).cleanContent(content);
      
      expect(cleanContent).not.toContain('Subject: Test Email');
      expect(cleanContent).toContain('Dear John');
    });

    it('should strip HTML tags', () => {
      const engine = new PromptEngine();
      const html = '<p>Dear <strong>John</strong>,</p><p>This is a test.</p>';
      const text = (engine as any).stripHtml(html);
      
      expect(text).toBe('Dear John,This is a test.');
    });
  });
});
