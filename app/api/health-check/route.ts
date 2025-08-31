// Comprehensive Health Check API
// Monitors all critical services and provides detailed status information

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkDatabaseHealth } from '@/lib/db-connection-pool';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthCheckResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceStatus[];
  environment: {
    nodeVersion: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export async function GET(req: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now();
  const services: ServiceStatus[] = [];
  
  // 1. Check Database Connection
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      services.push({
        name: 'Database',
        status: 'unhealthy',
        responseTime: 0,
        error: 'Missing Supabase environment variables'
      });
    } else {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const dbHealth = await checkDatabaseHealth(supabase);
      services.push({
        name: 'Database',
        status: dbHealth.isHealthy ? 'healthy' : 'unhealthy',
        responseTime: dbHealth.responseTime,
        error: dbHealth.error,
        details: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
    }
  } catch (error) {
    services.push({
      name: 'Database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 2. Check OpenAI API
  try {
    const openAIStartTime = Date.now();
    if (!process.env.OPENAI_API_KEY) {
      services.push({
        name: 'OpenAI API',
        status: 'unhealthy',
        responseTime: 0,
        error: 'OpenAI API key not configured'
      });
    } else {
      // Test OpenAI connection with a minimal request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      const responseTime = Date.now() - openAIStartTime;
      
      if (response.ok) {
        services.push({
          name: 'OpenAI API',
          status: 'healthy',
          responseTime,
          details: {
            hasApiKey: true,
            statusCode: response.status
          }
        });
      } else {
        services.push({
          name: 'OpenAI API',
          status: 'degraded',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: {
            hasApiKey: true,
            statusCode: response.status
          }
        });
      }
    }
  } catch (error) {
    services.push({
      name: 'OpenAI API',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // 3. Check External OCR Service
  try {
    const ocrStartTime = Date.now();
    const response = await fetch('https://ocr-server-2-ykmk.onrender.com/health', {
      method: 'GET',
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    const responseTime = Date.now() - ocrStartTime;
    
    if (response.ok) {
      services.push({
        name: 'External OCR Service',
        status: 'healthy',
        responseTime,
        details: {
          statusCode: response.status,
          url: 'https://ocr-server-2-ykmk.onrender.com'
        }
      });
    } else {
      services.push({
        name: 'External OCR Service',
        status: 'degraded',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: {
          statusCode: response.status,
          url: 'https://ocr-server-2-ykmk.onrender.com'
        }
      });
    }
  } catch (error) {
    services.push({
      name: 'External OCR Service',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'OCR service unavailable'
    });
  }

  // 4. Check Memory Usage
  const memoryUsage = process.memoryUsage();
  const memoryStatus: ServiceStatus = {
    name: 'Memory Usage',
    status: 'healthy',
    responseTime: 0,
    details: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    }
  };

  // Mark memory as degraded if heap usage is over 80%
  const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (heapUsagePercent > 80) {
    memoryStatus.status = 'degraded';
    memoryStatus.error = `High memory usage: ${heapUsagePercent.toFixed(1)}%`;
  } else if (heapUsagePercent > 90) {
    memoryStatus.status = 'unhealthy';
    memoryStatus.error = `Critical memory usage: ${heapUsagePercent.toFixed(1)}%`;
  }

  services.push(memoryStatus);

  // Determine overall status
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const degradedCount = services.filter(s => s.status === 'degraded').length;
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthyCount > 0) {
    overall = 'unhealthy';
  } else if (degradedCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  const response: HealthCheckResponse = {
    overall,
    timestamp: new Date().toISOString(),
    services,
    environment: {
      nodeVersion: process.version,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round(heapUsagePercent)
      }
    }
  };

  const httpStatus = overall === 'healthy' ? 200 : overall === 'degraded' ? 202 : 503;

  return NextResponse.json(response, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
