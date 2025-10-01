'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Loader2 } from 'lucide-react';

interface AskBlocIQButtonProps {
  context: string;
  data: any;
  buildingId: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export function AskBlocIQButton({ 
  context, 
  data, 
  buildingId, 
  className,
  size = 'sm',
  variant = 'ghost'
}: AskBlocIQButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAskBlocIQ = async () => {
    setIsLoading(true);
    
    try {
      // This would integrate with your existing AskBlocIQ system
      // For now, we'll create a context-aware prompt
      const prompt = generateContextualPrompt(context, data, buildingId);
      
      // In a real implementation, this would call your AI service
      console.log('AskBlocIQ prompt:', prompt);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show the prompt in an alert for now
      alert(`AskBlocIQ Context: ${context}\n\nPrompt: ${prompt}`);
      
    } catch (error) {
      console.error('AskBlocIQ error:', error);
      alert('Failed to process AskBlocIQ request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAskBlocIQ}
      disabled={isLoading}
      size={size}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bot className="h-4 w-4" />
      )}
    </Button>
  );
}

function generateContextualPrompt(context: string, data: any, buildingId: string): string {
  const baseContext = `Building ID: ${buildingId}\nContext: ${context}\n\n`;
  
  switch (context) {
    case 'arrears':
      return `${baseContext}I need help with arrears management. Current arrears total: £${data.total.toLocaleString()}. 
      There are ${data.overdue_units.length} overdue units. Please help me draft arrears letters to these leaseholders 
      and suggest a collection strategy.`;
      
    case 'budget_vs_actual':
      return `${baseContext}I need help analyzing budget vs actual performance. Here's the breakdown by category:
      ${data.map((cat: any) => `- ${cat.category}: Budget £${cat.budget.toLocaleString()}, Actual £${cat.actual.toLocaleString()}, Variance ${cat.variancePercent.toFixed(1)}%`).join('\n')}
      Please explain the variances and suggest corrective actions.`;
      
    case 'reserve_fund':
      return `${baseContext}I need help with reserve fund management. Current balance: £${data.balance.toLocaleString()}. 
      Please help me forecast the reserve fund 3 years ahead and suggest optimal funding levels.`;
      
    case 'variance_analysis':
      return `${baseContext}I need detailed variance analysis for ${data.category}. 
      Budget: £${data.budget.toLocaleString()}, Actual: £${data.actual.toLocaleString()}, 
      Variance: £${data.variance.toLocaleString()} (${data.variancePercent.toFixed(1)}%).
      Please explain why costs are ${data.variance > 0 ? 'over' : 'under'} budget and suggest improvements.`;
      
    case 'deadlines':
      return `${baseContext}I need help with upcoming financial deadlines:
      ${data.map((deadline: any) => `- ${deadline.title}: Due ${deadline.due_date} (${deadline.status})`).join('\n')}
      Please help me prepare for these deadlines and suggest a timeline.`;
      
    default:
      return `${baseContext}I need help with financial data analysis. Data: ${JSON.stringify(data, null, 2)}`;
  }
}




