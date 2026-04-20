/**
 * Gemini Client with Retry + Fallback
 * ─────────────────────────────────────
 * Sends system prompt + user prompt (+ optional images) to Gemini
 * and returns the enhanced prompt for image generation.
 *
 * - Retries up to 3 times with exponential backoff on 503 (overloaded)
 * - Falls back to gemini-2.0-flash if gemini-2.5-pro is unavailable
 */

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const PRIMARY_MODEL = "gemini-2.5-pro";
const FALLBACK_MODEL = "gemini-2.0-flash";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000; // 2s, 4s, 8s

interface GeminiRequest {
  systemPrompt: string;
  userPrompt: string;
  images?: string[]; // base64-encoded images
  imageMediaTypes?: string[]; // e.g., "image/png", "image/jpeg"
}

interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
  model?: string; // which model was actually used
}

async function callGeminiModel(
  model: string,
  body: any,
  apiKey: string
): Promise<{ ok: boolean; status: number; data?: any; errorText?: string }> {
  const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, errorText };
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

async function callWithRetry(
  model: string,
  body: any,
  apiKey: string
): Promise<{ ok: boolean; status: number; data?: any; errorText?: string }> {
  let lastResult: any;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`Gemini ${model} retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    lastResult = await callGeminiModel(model, body, apiKey);

    // Success — return immediately
    if (lastResult.ok) return lastResult;

    // Only retry on 503 (overloaded) or 429 (rate limit)
    if (lastResult.status !== 503 && lastResult.status !== 429) {
      return lastResult; // Non-retryable error
    }
  }

  return lastResult; // All retries exhausted
}

export async function callGemini({
  systemPrompt,
  userPrompt,
  images = [],
  imageMediaTypes = [],
}: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: "", success: false, error: "GEMINI_API_KEY not configured" };
  }

  // Build the parts array for the user content
  const userParts: any[] = [];

  // Add images first (if any)
  for (let i = 0; i < images.length; i++) {
    userParts.push({
      inline_data: {
        mime_type: imageMediaTypes[i] || "image/jpeg",
        data: images[i],
      },
    });
  }

  // Add the text prompt
  userParts.push({ text: userPrompt });

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: userParts,
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  try {
    // Try primary model (gemini-2.5-pro) with retries
    console.log(`Calling Gemini ${PRIMARY_MODEL}...`);
    let result = await callWithRetry(PRIMARY_MODEL, body, apiKey);

    // If primary failed with 503/429 after retries, fall back to flash
    if (!result.ok && (result.status === 503 || result.status === 429)) {
      console.log(`${PRIMARY_MODEL} overloaded, falling back to ${FALLBACK_MODEL}...`);
      result = await callWithRetry(FALLBACK_MODEL, body, apiKey);

      if (result.ok) {
        const text = result.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text) {
          return { text: "", success: false, error: "Gemini returned empty response" };
        }
        return { text, success: true, model: FALLBACK_MODEL };
      }
    }

    // Handle final result
    if (!result.ok) {
      return {
        text: "",
        success: false,
        error: `Gemini API error (${result.status}): ${result.errorText}`,
      };
    }

    const text = result.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      return { text: "", success: false, error: "Gemini returned empty response" };
    }

    return { text, success: true, model: PRIMARY_MODEL };
  } catch (err: any) {
    return { text: "", success: false, error: `Gemini request failed: ${err.message}` };
  }
}
