import { useState, useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  lastError: Error | null;
}

/**
 * Hook for executing async functions with automatic retry and exponential backoff
 */
export function useRetry<T>(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
  } = options;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback(
    (attempt: number): number => {
      const delay = initialDelay * Math.pow(backoffFactor, attempt);
      // Add jitter (±10%) to prevent thundering herd
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      return Math.min(delay + jitter, maxDelay);
    },
    [initialDelay, backoffFactor, maxDelay]
  );

  const execute = useCallback(
    async (fn: (signal?: AbortSignal) => Promise<T>): Promise<T> => {
      // Cancel any existing retry
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal.aborted) {
          throw new Error('Operation cancelled');
        }

        try {
          setState({ isRetrying: attempt > 0, attempt, lastError: null });
          const result = await fn(signal);
          setState({ isRetrying: false, attempt: 0, lastError: null });
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attempt < maxRetries) {
            onRetry?.(attempt + 1, lastError);
            const delay = calculateDelay(attempt);
            
            setState({ isRetrying: true, attempt: attempt + 1, lastError });
            
            // Wait before retrying
            await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(resolve, delay);
              signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new Error('Operation cancelled'));
              });
            });
          }
        }
      }

      setState({ isRetrying: false, attempt: 0, lastError });
      throw lastError;
    },
    [maxRetries, calculateDelay, onRetry]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({ isRetrying: false, attempt: 0, lastError: null });
  }, []);

  return {
    execute,
    cancel,
    isRetrying: state.isRetrying,
    attempt: state.attempt,
    lastError: state.lastError,
  };
}

/**
 * Utility function for one-off retry operations (non-hook)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, lastError);
        const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
