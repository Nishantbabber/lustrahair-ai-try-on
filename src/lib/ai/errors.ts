export type AIErrorCode =
  | "RATE_LIMIT_EXCEEDED"
  | "IP_RATE_LIMIT_EXCEEDED"
  | "TIMEOUT"
  | "UNSAFE_IMAGE"
  | "TENANT_QUOTA_EXCEEDED"
  | "SERVER_ERROR";

export interface ClassifiedError {
  code: AIErrorCode;
  status: number;
  userMessage: string;
  isRetryable: boolean;
}

/**
 * Maps arbitrary provider or system errors into distinct, friendly user-facing messages
 * instead of exposing raw API exceptions, stack traces, or cryptic codes.
 */
export function classifyAIError(err: unknown): ClassifiedError {
  const message = err instanceof Error ? err.message : String(err);
  const lowerMsg = message.toLowerCase();

  // 0. Per-IP rate limit (independent of tenant monthly quota and upstream AI limits)
  if (
    lowerMsg.includes("ip_rate_limit_exceeded") ||
    lowerMsg.includes("per-ip") ||
    lowerMsg.includes("hourly try-on limit")
  ) {
    return {
      code: "IP_RATE_LIMIT_EXCEEDED",
      status: 429,
      userMessage:
        "You've reached the hourly try-on limit from this network. Please try again in a little while.",
      isRetryable: false,
    };
  }

  // 1. Tenant monthly quota reached (handled upstream or passed here)
  if (lowerMsg.includes("tenant_quota_exceeded") || lowerMsg.includes("monthly try-on limit")) {
    return {
      code: "TENANT_QUOTA_EXCEEDED",
      status: 429,
      userMessage:
        "This store has reached its monthly virtual try-on limit. Please contact the store or try again next month.",
      isRetryable: false,
    };
  }

  // 2. Upstream AI Rate limit / quota exceeded
  if (
    lowerMsg.includes("429") ||
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("resource_exhausted") ||
    lowerMsg.includes("credits") ||
    lowerMsg.includes("exceeded your current quota")
  ) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      status: 429,
      userMessage:
        "We've hit today's try-on limit for this store — please try again in a few hours.",
      isRetryable: false,
    };
  }

  // 3. Timeout / network disconnection
  if (
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("timed out") ||
    lowerMsg.includes("aborterror") ||
    lowerMsg.includes("econnreset") ||
    lowerMsg.includes("etimedout")
  ) {
    return {
      code: "TIMEOUT",
      status: 504,
      userMessage:
        "The styling engine took longer than expected to render your look. Please try again.",
      isRetryable: true,
    };
  }

  // 4. Invalid or unsafe image upload
  if (
    lowerMsg.includes("safety") ||
    lowerMsg.includes("safety filters") ||
    lowerMsg.includes("blocked by safety") ||
    lowerMsg.includes("inappropriate") ||
    lowerMsg.includes("invalid image") ||
    lowerMsg.includes("image format")
  ) {
    return {
      code: "UNSAFE_IMAGE",
      status: 400,
      userMessage:
        "We couldn't process this photo due to safety or quality guidelines. Please upload a clear portrait with good lighting.",
      isRetryable: false,
    };
  }

  // 5. Default generic server error
  return {
    code: "SERVER_ERROR",
    status: 500,
    userMessage:
      "Something went wrong while creating your preview. Your photo hasn't been changed. Please try again in a moment.",
    isRetryable: true,
  };
}

/**
 * Server-side structured logger ensuring all failures are traceable by tenant ID and timestamp.
 */
export function logServerError({
  tenantId,
  code,
  message,
  originalError,
  context,
}: {
  tenantId: string;
  code: AIErrorCode;
  message: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
}): void {
  const timestamp = new Date().toISOString();
  const errDetails = originalError instanceof Error ? originalError.stack || originalError.message : originalError;

  console.error(
    `[TRYON_ERROR] [tenant: ${tenantId}] [time: ${timestamp}] [code: ${code}] Message: ${message}`,
    context ? `Context: ${JSON.stringify(context)}` : "",
    errDetails ? `\nStack/Details: ${errDetails}` : ""
  );
}

/**
 * Wraps an asynchronous operation with a timeout and 1 automatic retry on transient/timeout errors.
 */
export async function withTimeoutAndRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    timeoutMs?: number;
    maxRetries?: number;
    tenantId: string;
    stageName?: string;
  }
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 50000;
  const maxRetries = options.maxRetries ?? 1;

  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      attempt++;
      const result = await operation(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      const classified = classifyAIError(err);

      if (attempt <= maxRetries && classified.isRetryable) {
        console.warn(
          `[TRYON_RETRY] [tenant: ${options.tenantId}] Attempt ${attempt} failed with ${classified.code}. Automatically retrying in 1s...`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // No more retries or non-retryable error
      throw err;
    }
  }

  throw new Error("Operation failed after maximum retries");
}
