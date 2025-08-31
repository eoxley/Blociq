// Database Connection Pool and Timeout Management
// Helps prevent database connection bottlenecks and timeouts

import { createClient } from '@supabase/supabase-js';

// Configuration for database connections
const DB_CONFIG = {
  connectionTimeout: 30000, // 30 seconds
  requestTimeout: 45000,    // 45 seconds
  maxRetries: 3,
  retryDelay: 1000,
  poolSize: 10
} as const;

// Retry with exponential backoff for database operations
export async function retryDbOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = DB_CONFIG.maxRetries,
  baseDelay: number = DB_CONFIG.retryDelay
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors or permanent failures
      if (
        error instanceof Error && (
          error.message.includes('JWT') ||
          error.message.includes('unauthorized') ||
          error.message.includes('forbidden') ||
          error.message.includes('not found')
        )
      ) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000);
      console.log(`🔄 Retrying database operation (attempt ${attempt + 1}/${maxRetries}) in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Enhanced Supabase client with timeout and retry logic
export function createEnhancedSupabaseClient(url: string, key: string) {
  const client = createClient(url, key, {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
      }
    }
  });

  // Override the query methods to add timeout and retry logic
  const originalFrom = client.from.bind(client);
  
  client.from = function(table: string) {
    const queryBuilder = originalFrom(table);
    
    // Add timeout wrapper to common operations
    const originalSelect = queryBuilder.select.bind(queryBuilder);
    const originalInsert = queryBuilder.insert.bind(queryBuilder);
    const originalUpdate = queryBuilder.update.bind(queryBuilder);
    const originalDelete = queryBuilder.delete.bind(queryBuilder);
    
    queryBuilder.select = function(...args: any[]) {
      const result = originalSelect(...args);
      return addTimeoutToQuery(result);
    };
    
    queryBuilder.insert = function(...args: any[]) {
      const result = originalInsert(...args);
      return addTimeoutToQuery(result);
    };
    
    queryBuilder.update = function(...args: any[]) {
      const result = originalUpdate(...args);
      return addTimeoutToQuery(result);
    };
    
    queryBuilder.delete = function(...args: any[]) {
      const result = originalDelete(...args);
      return addTimeoutToQuery(result);
    };
    
    return queryBuilder;
  };
  
  return client;
}

// Add timeout to query execution
function addTimeoutToQuery(queryBuilder: any) {
  const originalThen = queryBuilder.then?.bind(queryBuilder);
  
  if (originalThen) {
    queryBuilder.then = function(onFulfilled?: any, onRejected?: any) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Database query timeout after ${DB_CONFIG.requestTimeout}ms`));
        }, DB_CONFIG.requestTimeout);
      });
      
      const queryPromise = originalThen(onFulfilled, onRejected);
      
      return Promise.race([queryPromise, timeoutPromise]);
    };
  }
  
  return queryBuilder;
}

// Health check for database connections
export async function checkDatabaseHealth(supabase: any): Promise<{
  isHealthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Simple health check query
    const { error } = await retryDbOperation(async () => {
      return await supabase
        .from('buildings')
        .select('id')
        .limit(1)
        .single();
    });
    
    const responseTime = Date.now() - startTime;
    
    if (error && !error.message.includes('returned 0 rows')) {
      return {
        isHealthy: false,
        responseTime,
        error: error.message
      };
    }
    
    return {
      isHealthy: true,
      responseTime
    };
  } catch (error) {
    return {
      isHealthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
