'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface AIFeedbackProps {
  aiLogId: string;
  className?: string;
}

export default function AIFeedback({ aiLogId, className = '' }: AIFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleRating = async (newRating: number) => {
    if (hasSubmitted) return;
    
    setRating(newRating);
    
    // If rating is negative, show comment input
    if (newRating === -1) {
      setShowCommentInput(true);
    } else {
      // Submit immediately for positive ratings
      await submitFeedback(newRating, '');
    }
  };

  const submitFeedback = async (feedbackRating: number, feedbackComment: string) => {
    if (hasSubmitted) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ai_log_id: aiLogId,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setHasSubmitted(true);
      toast.success('Thanks for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (rating === null) return;
    await submitFeedback(rating, comment);
  };

  if (hasSubmitted) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
        <ThumbsUp className="w-4 h-4" />
        <span>Feedback submitted</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Was this helpful?</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleRating(1)}
          disabled={isSubmitting || hasSubmitted}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            rating === 1
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-green-50 hover:border-green-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm">Helpful</span>
        </button>

        <button
          onClick={() => handleRating(-1)}
          disabled={isSubmitting || hasSubmitted}
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
            rating === -1
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-red-50 hover:border-red-300'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span className="text-sm">Not helpful</span>
        </button>
      </div>

      {showCommentInput && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Tell us more (optional)</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What could we improve?"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <button
              onClick={() => {
                setShowCommentInput(false);
                setRating(null);
                setComment('');
              }}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 