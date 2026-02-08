import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

// Exponential backoff retry function
function exponentialBackoff(attemptIndex: number): number {
  // Returns delay in ms: 1s, 2s, 4s, 8s, capped at 30s
  return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
}

// Determine if error should trigger a retry
function shouldRetry(error: unknown): boolean {
  // Don't retry client errors (4xx except 408, 429)
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Don't retry auth errors
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return false;
    }
    
    // Don't retry validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return false;
    }
    
    // Don't retry "not found" errors
    if (message.includes('not found')) {
      return false;
    }
  }
  
  // Retry network errors and server errors
  return true;
}

// Query client configuration with retry logic
const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Retry configuration
      retry: (failureCount, error) => {
        // Max 3 retries
        if (failureCount >= 3) return false;
        return shouldRetry(error);
      },
      retryDelay: exponentialBackoff,
      
      // Stale/cache configuration
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      
      // Refetch configuration
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      
      // Network error handling
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations less aggressively
      retry: (failureCount, error) => {
        // Max 2 retries for mutations
        if (failureCount >= 2) return false;
        return shouldRetry(error);
      },
      retryDelay: exponentialBackoff,
      
      networkMode: 'offlineFirst',
    },
  },
};

// Create singleton query client
let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient(queryClientConfig);
  }
  return queryClient;
}

// For use in App.tsx
export const createQueryClient = (): QueryClient => getQueryClient();
