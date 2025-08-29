import React from 'react';

interface AIChatDisclaimerProps {
  className?: string;
}

export default function AIChatDisclaimer({ className = '' }: AIChatDisclaimerProps) {
  return (
    <div className={`ai-chat-disclaimer ${className}`}>
      <strong>Limitation of Liability</strong>: Our liability for any use of this AI tool is limited to the maximum extent permitted by law. We are not liable for any direct, indirect, or consequential damages arising from AI responses.
      
      <style jsx>{`
        .ai-chat-disclaimer {
          font-size: 10px;
          color: #6B7280;
          text-align: center;
          margin-top: 8px;
          margin-bottom: 4px;
          line-height: 1.3;
          font-weight: normal;
        }
        
        .ai-chat-disclaimer strong {
          font-weight: 500;
        }
        
        @media (max-width: 640px) {
          .ai-chat-disclaimer {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}