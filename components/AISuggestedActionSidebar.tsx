"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Brain, 
  Tag, 
  FileText, 
  MessageSquare, 
  Wrench, 
  AlertTriangle, 
  Archive,
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailAnalysis {
  tags: string[];
  ai_summary: string;
  suggested_action: string;
  suggested_action_type: string;
  suggested_template_id?: string;
  related_unit_id?: string;
  ai_analyzed_at: string;
}

interface AISuggestedActionSidebarProps {
  messageId: string;
  buildingId?: string;
  onActionTaken?: () => void;
}

const tagColors: Record<string, string> = {
  "service charge": "bg-blue-100 text-blue-800",
  "maintenance": "bg-orange-100 text-orange-800",
  "complaint": "bg-red-100 text-red-800",
  "legal": "bg-purple-100 text-purple-800",
  "finance": "bg-green-100 text-green-800",
  "emergency": "bg-red-100 text-red-800",
  "routine": "bg-gray-100 text-gray-800",
  "default": "bg-gray-100 text-gray-700"
};

const actionTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  generate_template: FileText,
  reply: MessageSquare,
  raise_task: Wrench,
  escalate: AlertTriangle,
  archive: Archive
};

const actionTypeLabels: Record<string, string> = {
  generate_template: "Generate Document",
  reply: "Reply to Email",
  raise_task: "Raise Task",
  escalate: "Escalate Issue",
  archive: "Archive"
};

export default function AISuggestedActionSidebar({ 
  messageId, 
  buildingId, 
  onActionTaken 
}: AISuggestedActionSidebarProps) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (messageId) {
      fetchAnalysis();
    }
  }, [messageId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else {
        console.error("Failed to fetch analysis");
      }
    } catch (error) {
      console.error("Error fetching analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  const reanalyzeEmail = async () => {
    try {
      setAnalyzing(true);
      const response = await fetch("/api/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, forceReanalyze: true })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error("Error reanalyzing:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAction = async (actionType: string) => {
    setActionLoading(actionType);
    
    try {
      switch (actionType) {
        case "generate_template":
          if (analysis?.suggested_template_id) {
            router.push(`/communications/templates/${analysis.suggested_template_id}?buildingId=${buildingId || ''}`);
          }
          break;
          
        case "reply":
          // This will be handled by the parent component opening the reply modal
          onActionTaken?.();
          break;
          
        case "raise_task":
          // Navigate to task creation with prefilled data
          router.push(`/dashboard/tasks/new?emailId=${messageId}&buildingId=${buildingId || ''}`);
          break;
          
        case "escalate":
          // Mark as escalated in the system
          await fetch("/api/mark-escalated", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId })
          });
          onActionTaken?.();
          break;
          
        case "archive":
          // Mark as archived
          await fetch("/api/mark-archived", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId })
          });
          onActionTaken?.();
          break;
      }
    } catch (error) {
      console.error("Error executing action:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getTagColor = (tag: string) => {
    const lowerTag = tag.toLowerCase();
    return tagColors[lowerTag] || tagColors.default;
  };

  if (loading) {
    return (
      <Card className="w-80 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Analyzing email...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="w-80 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-4">No AI analysis available</p>
            <Button 
              onClick={reanalyzeEmail} 
              disabled={analyzing}
              size="sm"
              variant="outline"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Analyze Email
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ActionIcon = actionTypeIcons[analysis.suggested_action_type] || FileText;

  return (
    <TooltipProvider>
      <Card className="w-80 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reanalyzeEmail}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Re-analyze email</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            Analyzed {new Date(analysis.ai_analyzed_at).toLocaleString()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Tags */}
          {analysis.tags && analysis.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {analysis.tags.map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className={getTagColor(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {analysis.ai_summary && (
            <div>
              <h4 className="text-sm font-medium mb-2">Summary</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {analysis.ai_summary}
              </p>
            </div>
          )}

          {/* Suggested Action */}
          {analysis.suggested_action && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <ActionIcon className="h-3 w-3" />
                Suggested Action
              </h4>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {analysis.suggested_action}
              </p>
              
              {/* Take Action Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleAction(analysis.suggested_action_type)}
                    disabled={actionLoading === analysis.suggested_action_type}
                    className="w-full"
                    size="sm"
                  >
                    {actionLoading === analysis.suggested_action_type ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {actionTypeLabels[analysis.suggested_action_type] || "Take Action"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Execute the suggested action</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-2">Quick Actions</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleAction("reply")}
                disabled={actionLoading === "reply"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Reply with AI
              </Button>
              
              {analysis.suggested_template_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAction("generate_template")}
                  disabled={actionLoading === "generate_template"}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Document
                  <ExternalLink className="h-3 w-3 ml-auto" />
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleAction("raise_task")}
                disabled={actionLoading === "raise_task"}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
} 