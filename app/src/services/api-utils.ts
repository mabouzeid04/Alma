/**
 * API Utilities - Shared fetch helpers for resilient API calls
 *
 * Provides retry logic with exponential backoff and timeout handling
 * for all external API calls (Gemini, OpenAI, xAI).
 */

/**
 * Creates an AbortController with a timeout
 * @param timeoutMs Timeout in milliseconds (default: 10000ms = 10s)
 * @returns Object with controller and timeoutId for cleanup
 */
export function createTimeoutController(timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Fetch with exponential backoff retry logic
 *
 * Automatically retries failed requests with exponential backoff:
 * - Retries on 429 (rate limit) with smart delay parsing
 * - Retries on 5xx server errors
 * - Returns successful responses immediately
 *
 * @param url Request URL
 * @param options Fetch options (headers, body, etc.)
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param initialDelay Initial delay in ms (default: 2000ms)
 * @returns Response object
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 2000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        const delay = initialDelay * Math.pow(2, i - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        const errorData = await response.clone().json().catch(() => ({}));
        let retryAfter = initialDelay;

        const retryInfo = (errorData.error?.details as any[] | undefined)?.find(
          (d) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        );

        const retryDelay = retryInfo?.retryDelay as string | undefined;

        if (retryDelay) {
          const seconds = parseFloat(retryDelay.replace('s', ''));
          if (!isNaN(seconds)) {
            retryAfter = seconds * 1000 + 500;
          }
        }

        if (i < maxRetries) {
          console.warn(`⚠️ Rate Limit (429). Retrying in ${retryAfter}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }
      }

      if (response.status >= 500 && i < maxRetries) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries) continue;
      throw lastError;
    }
  }

  throw lastError || new Error('Max retries reached');
}
