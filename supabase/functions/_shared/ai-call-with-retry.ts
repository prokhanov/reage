// Shared AI Gateway caller with validation + reasoning degradation retry.
//
// Policy: ВСЕГДА старт с reasoning=high. Если ответ пустой/слишком короткий —
// один повтор с reasoning=medium. Ниже medium не опускаемся.
// Плюс — обработка 429 (rate limit) с backoff.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type ReasoningEffort = "high" | "medium";

export interface AiCallOptions {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxCompletionTokens: number;
  initialReasoning?: ReasoningEffort | undefined; // undefined = без reasoning (flash-режимы)
  temperature?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  minContentLength?: number; // валидация длины ответа. 0 = не проверять (для tool-calls)
  rateLimitRetries?: number; // сколько раз повторить на 429
  label?: string; // для логов
}

export interface AiCallResult {
  ok: boolean;
  content: string;
  data: any | null;
  totalTokens: number;
  attempts: number; // сколько раз реально вызывали модель
  reasoningUsed: ReasoningEffort | "none";
  status: number;
  errorText?: string;
}

async function fetchOnce(body: string, apiKey: string) {
  return await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });
}

function buildBody(opts: AiCallOptions, reasoning: ReasoningEffort | undefined) {
  const payload: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    max_completion_tokens: opts.maxCompletionTokens,
  };
  if (reasoning) payload.reasoning = { effort: reasoning };
  if (opts.temperature !== undefined) payload.temperature = opts.temperature;
  if (opts.tools) payload.tools = opts.tools;
  if (opts.toolChoice !== undefined) payload.tool_choice = opts.toolChoice;
  return JSON.stringify(payload);
}

async function doAttempt(
  opts: AiCallOptions,
  reasoning: ReasoningEffort | undefined,
): Promise<{ response: Response; body: string }> {
  const body = buildBody(opts, reasoning);
  let response = await fetchOnce(body, opts.apiKey);
  const rlRetries = opts.rateLimitRetries ?? 2;
  for (let a = 1; response.status === 429 && a <= rlRetries; a++) {
    const delay = a * 8000;
    console.warn(`[${opts.label ?? "ai"}] 429; retry ${a}/${rlRetries} in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
    response = await fetchOnce(body, opts.apiKey);
  }
  return { response, body };
}

function extractContent(data: any): string {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return "";
  // Prefer plain text; if tool-call, keep function args as JSON string so caller can detect.
  if (typeof msg.content === "string" && msg.content.trim()) return msg.content;
  const tc = msg.tool_calls?.[0]?.function?.arguments;
  if (typeof tc === "string" && tc.trim()) return tc;
  return "";
}

export async function callAiWithReasoningRetry(
  opts: AiCallOptions,
): Promise<AiCallResult> {
  const label = opts.label ?? "ai";
  const minLen = opts.minContentLength ?? 500;
  const initial = opts.initialReasoning; // может быть undefined в standard-режиме

  let attempts = 0;
  let totalTokens = 0;
  let lastData: any = null;
  let lastStatus = 0;
  let lastError = "";
  let reasoningUsed: ReasoningEffort | "none" = initial ?? "none";

  // ===== Попытка 1: initialReasoning (обычно "high") =====
  attempts++;
  const first = await doAttempt(opts, initial);
  lastStatus = first.response.status;
  if (first.response.status === 402) {
    const t = await first.response.text().catch(() => "");
    return {
      ok: false, content: "", data: null, totalTokens: 0, attempts,
      reasoningUsed, status: 402, errorText: `insufficient_credits: ${t}`,
    };
  }
  if (!first.response.ok) {
    lastError = await first.response.text().catch(() => "");
    console.error(`[${label}] attempt 1 HTTP ${first.response.status}: ${lastError.slice(0, 300)}`);
  } else {
    lastData = await first.response.json();
    totalTokens += lastData?.usage?.total_tokens || 0;
    const content = extractContent(lastData);
    console.log(
      `[${label}] attempt 1 (reasoning=${initial ?? "none"}): ` +
      `len=${content.length}, finish=${lastData?.choices?.[0]?.finish_reason}, ` +
      `tokens=${lastData?.usage?.total_tokens}`,
    );
    if (content.length >= minLen) {
      return {
        ok: true, content, data: lastData, totalTokens, attempts,
        reasoningUsed: initial ?? "none", status: 200,
      };
    }
    console.warn(`[${label}] attempt 1 content too short (${content.length} < ${minLen})`);
  }

  // ===== Попытка 2: degrade reasoning "high" → "medium" =====
  // Если initial уже был не "high" (например undefined в standard-режиме),
  // повторяем с тем же уровнем.
  const retryReasoning: ReasoningEffort | undefined =
    initial === "high" ? "medium" : initial;
  reasoningUsed = retryReasoning ?? "none";
  console.warn(`[${label}] retry with reasoning=${retryReasoning ?? "none"}`);
  await new Promise((r) => setTimeout(r, 3000));
  attempts++;
  const second = await doAttempt(opts, retryReasoning);
  lastStatus = second.response.status;
  if (!second.response.ok) {
    lastError = await second.response.text().catch(() => "");
    console.error(`[${label}] attempt 2 HTTP ${second.response.status}: ${lastError.slice(0, 300)}`);
    return {
      ok: false, content: "", data: lastData, totalTokens, attempts,
      reasoningUsed, status: lastStatus, errorText: lastError,
    };
  }
  lastData = await second.response.json();
  totalTokens += lastData?.usage?.total_tokens || 0;
  const content2 = extractContent(lastData);
  console.log(
    `[${label}] attempt 2 (reasoning=${retryReasoning ?? "none"}): ` +
    `len=${content2.length}, finish=${lastData?.choices?.[0]?.finish_reason}, ` +
    `tokens=${lastData?.usage?.total_tokens}`,
  );
  if (content2.length >= minLen) {
    return {
      ok: true, content: content2, data: lastData, totalTokens, attempts,
      reasoningUsed, status: 200,
    };
  }
  return {
    ok: false, content: content2, data: lastData, totalTokens, attempts,
    reasoningUsed, status: 200,
    errorText: `content_too_short_after_retry: ${content2.length} chars`,
  };
}
