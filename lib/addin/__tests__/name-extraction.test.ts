// lib/addin/__tests__/name-extraction.test.ts
import {
  stripHtml,
  latestMessageBlock,
  extractSenderNameFromLatestMessage
} from '../name-extraction';

describe('Name Extraction', () => {
  describe('stripHtml', () => {
    it('should remove HTML tags and convert to plain text', () => {
      const html = '<p>Hello <strong>world</strong>!</p><br><div>Test</div>';
      const result = stripHtml(html);
      expect(result).toBe('Hello world!\nTest');
    });

    it('should handle HTML entities', () => {
      const html = 'Thanks &amp; regards<br>&nbsp;&nbsp;John';
      const result = stripHtml(html);
      expect(result).toBe('Thanks & regards\n  John');
    });

    it('should return plain text unchanged', () => {
      const text = 'Just plain text';
      const result = stripHtml(text);
      expect(result).toBe('Just plain text');
    });
  });

  describe('latestMessageBlock', () => {
    it('should extract latest message before quoted reply', () => {
      const fullText = `Hello there,

I need help with my unit.

Kind regards,
Sarah Thompson

-----Original Message-----
From: manager@building.com
Sent: Monday, 23 September 2024 10:30
To: sarah@email.com`;

      const result = latestMessageBlock(fullText);
      expect(result).toContain('Hello there');
      expect(result).toContain('Sarah Thompson');
      expect(result).not.toContain('Original Message');
    });

    it('should handle "On [date] wrote:" pattern', () => {
      const fullText = `Thanks for your response.

Best,
Mike

On 23/09/2024, at 10:30, building@test.com wrote:
> Previous message here`;

      const result = latestMessageBlock(fullText);
      expect(result).toContain('Thanks for your response');
      expect(result).toContain('Mike');
      expect(result).not.toContain('On 23/09/2024');
    });
  });

  describe('extractSenderNameFromLatestMessage', () => {
    it('should extract name from "Kind regards" sign-off', () => {
      const email = `Hello,

I have a leak in my bathroom.

Kind regards,
Jennifer Smith`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('Jennifer Smith');
    });

    it('should extract name from "Thanks" sign-off', () => {
      const email = `Hi there,

Please fix the heating.

Thanks,
David Wilson`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('David Wilson');
    });

    it('should extract name when it\'s on the next line', () => {
      const email = `Hello,

The door is broken.

Best regards,

Emma Johnson
Flat 5A`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('Emma Johnson');
    });

    it('should handle "Regards" without name on same line', () => {
      const email = `Dear Manager,

The lift is out of order.

Regards,
Thomas Brown`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('Thomas Brown');
    });

    it('should fallback to last line if no sign-off found', () => {
      const email = `Hello,

My heating isn't working.

Can you please help?

Lisa Chen
Unit 12`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('Lisa Chen');
    });

    it('should use Outlook fallback when no name found', () => {
      const email = `Hello,

My issue description here.

Please help.`;

      const result = extractSenderNameFromLatestMessage(email, 'Robert Taylor');
      expect(result).toBe('Robert Taylor');
    });

    it('should fallback to "Resident" when nothing found', () => {
      const email = `Hello,

My issue description here.

Please help.`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('Resident');
    });

    it('should handle HTML email content', () => {
      const htmlEmail = `<div>
        <p>Hello,</p>
        <p>I need assistance with my water pressure.</p>
        <p>Kind regards,<br>
        Maria Rodriguez</p>
      </div>`;

      const result = extractSenderNameFromLatestMessage(htmlEmail);
      expect(result).toBe('Maria Rodriguez');
    });

    it('should ignore email addresses in display names', () => {
      const email = `Hello,

Please help with my boiler.

Thanks,
Alex`;

      const result = extractSenderNameFromLatestMessage(email, 'alex@email.com');
      expect(result).toBe('Alex');
    });

    it('should handle quoted reply in middle of email', () => {
      const email = `Hello,

Following up on my previous email below.

Thanks,
Sophie Williams

-----Original Message-----
From: building@test.com
Sent: Monday
Subject: Re: Heating

Hello Sophie,
We'll look into it.

Regards,
Building Team`;

      const result = extractSenderNameFromLatestMessage(email);
      expect(result).toBe('Sophie Williams');
    });

    it('should handle complex HTML with quoted content', () => {
      const htmlEmail = `<html>
        <body>
          <div>Hi there,</div>
          <div>The fire alarm keeps beeping in my flat.</div>
          <div><br></div>
          <div>Best wishes,</div>
          <div>Christopher Davis</div>
          <div><br></div>
          <div style="border-top: 1px solid #ccc;">
            <p>From: manager@building.com</p>
            <p>Sent: Tuesday</p>
            <p>Previous message content...</p>
          </div>
        </body>
      </html>`;

      const result = extractSenderNameFromLatestMessage(htmlEmail);
      expect(result).toBe('Christopher Davis');
    });
  });
});