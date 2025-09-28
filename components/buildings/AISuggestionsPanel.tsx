'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Loader2,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  Wrench,
  Mail,
  Calendar,
  TrendingUp,
  X,
  Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';

export interface AISuggestion {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high';
  source: 'AI_Compliance' | 'AI_Communication' | 'AI_Maintenance' | 'AI_Industry';
  confidence: number;
  reasoning: string;
  suggestedDueDate?: string;
  relatedDocuments?: string[];
  contractorSuggestion?: {
    type: string;
    estimatedCost?: number;
    urgency: string;
  };
}

interface AISuggestionsPanelProps {
  buildingId: string;
  onAcceptSuggestion: (suggestion: AISuggestion) => void;
  className?: string;
}

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onAccept, onDismiss }) => {
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50/70';
      case 'medium':
        return 'border-amber-200 bg-amber-50/70';
      case 'low':
        return 'border-green-200 bg-green-50/70';
      default:
        return 'border-gray-200 bg-gray-50/70';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'AI_Compliance':
        return <CheckCircle className="h-3 w-3" />;
      case 'AI_Communication':
        return <Mail className="h-3 w-3" />;
      case 'AI_Maintenance':
        return <Wrench className="h-3 w-3" />;
      case 'AI_Industry':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <Brain className="h-3 w-3" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'AI_Compliance':
        return 'Compliance';
      case 'AI_Communication':
        return 'Communication';
      case 'AI_Maintenance':
        return 'Maintenance';
      case 'AI_Industry':
        return 'Best Practice';
      default:
        return 'AI';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-3 backdrop-blur-sm ${getPriorityStyles(suggestion.priority)}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getPriorityIcon(suggestion.priority)}
            <span className="text-sm font-medium capitalize">{suggestion.priority} Priority</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {getSourceIcon(suggestion.source)}
              <span>{getSourceLabel(suggestion.source)}</span>
            </div>
            {suggestion.suggestedDueDate && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>Due: {formatDate(suggestion.suggestedDueDate)}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-900 mb-2">{suggestion.text}</p>

          <p className="text-xs text-gray-600 mb-3">{suggestion.reasoning}</p>

          {suggestion.contractorSuggestion && (
            <div className="bg-blue-50/50 border border-blue-200 rounded p-2 mb-3">
              <div className="flex items-center gap-1 text-xs text-blue-700 mb-1">
                <Wrench className="h-3 w-3" />
                <span className="font-medium">Contractor Suggested</span>
              </div>
              <p className="text-xs text-blue-600">
                {suggestion.contractorSuggestion.type} - {suggestion.contractorSuggestion.urgency}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="ml-2 text-gray-400 hover:text-gray-600 p-1"
          title="Dismiss suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onAccept}
          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add to Actions
        </button>
      </div>
    </div>
  );
};

const AISuggestionsPanel: React.FC<AISuggestionsPanelProps> = ({
  buildingId,
  onAcceptSuggestion,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  const fetchSuggestions = async () => {
    if (!buildingId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Fetching AI suggestions for building:', buildingId);

      const response = await fetch('/api/action-tracker/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ buildingId })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setSuggestions(data.suggestions || []);

      if (data.suggestions?.length > 0) {
        toast.success(`✨ Found ${data.suggestions.length} AI suggestions for next actions`);
      } else {
        toast.info('✅ No new suggestions - you\'re on top of everything!');
      }

    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch suggestions');
      toast.error('Failed to generate AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = (suggestion: AISuggestion) => {
    onAcceptSuggestion(suggestion);
    setDismissedSuggestions(prev => new Set([...prev, suggestion.id]));
    toast.success('✅ Added suggestion to action tracker');
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
    toast.info('Suggestion dismissed');
  };

  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id));

  // Auto-fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, [buildingId]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="mb-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
      >
        <Brain className="h-4 w-4" />
        Show AI Suggestions
      </button>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-lg p-4 mb-4 border border-blue-200/50 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <h4 className="font-medium text-blue-900">AI Suggestions</h4>
          {!loading && visibleSuggestions.length > 0 && (
            <span className="text-sm text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {visibleSuggestions.length} suggested
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {loading ? 'Thinking...' : 'Refresh'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-blue-400 hover:text-blue-600 p-1"
            title="Hide suggestions"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to generate suggestions: {error}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">AI is analyzing your building data...</span>
          </div>
        </div>
      )}

      {!loading && !error && visibleSuggestions.length === 0 && (
        <div className="text-center py-6">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            Great job! No urgent suggestions at the moment.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Check back later or refresh to get new insights.
          </p>
        </div>
      )}

      {!loading && visibleSuggestions.length > 0 && (
        <div className="space-y-0">
          {visibleSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={() => handleAcceptSuggestion(suggestion)}
              onDismiss={() => handleDismissSuggestion(suggestion.id)}
            />
          ))}

          {dismissedSuggestions.size > 0 && (
            <div className="text-center pt-2">
              <button
                onClick={() => setDismissedSuggestions(new Set())}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Show {dismissedSuggestions.size} dismissed suggestion{dismissedSuggestions.size !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AISuggestionsPanel;