export function retryableAIError(error: unknown) {
  const item = error as { message?: string; name?: string; customErrorData?: { status?: number } };
  const status = item?.customErrorData?.status;
  if (status) return status === 404 || status === 408 || status === 429 || status >= 500;
  return /high demand|overloaded|temporarily unavailable|\[(?:404|408|429|5\d\d)\b|load failed|failed to fetch|network|timed? out|timeout/i.test(item?.message || "");
}

export async function requestWithModelFallback<T>(
  models: string[],
  request: (model: string, signal: AbortSignal) => Promise<T>,
  options: { timeoutMs: number; signal?: AbortSignal },
): Promise<{ result: T; model: string }> {
  let lastError: unknown;
  for (const model of [...new Set(models)]) {
    options.signal?.throwIfAborted();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        const fail = (reason: unknown) => {
          controller.abort(reason);
          reject(reason);
        };
        abort = () => fail(options.signal?.reason || new DOMException("Cancelled", "AbortError"));
        options.signal?.addEventListener("abort", abort, { once: true });
        timer = setTimeout(() => fail(new Error("AI request timed out.")), options.timeoutMs);
      });
      const result = await Promise.race([request(model, controller.signal), deadline]);
      return { result, model };
    } catch (error) {
      options.signal?.throwIfAborted();
      if (!retryableAIError(error)) throw error;
      lastError = error;
    } finally {
      clearTimeout(timer);
      if (abort) options.signal?.removeEventListener("abort", abort);
    }
  }
  throw new Error("Google AI is temporarily unavailable. Please try again shortly; your saved data is safe.", { cause: lastError });
}
