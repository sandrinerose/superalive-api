/**
 * Gemini 2.5 Pro Client
 * ─────────────────────
 * Sends system prompt + user prompt (+ optional images) to Gemini
 * and returns the enhanced prompt for image generation.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent";

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
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        text: "",
        success: false,
        error: `Gemini API error (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return { text: "", success: false, error: "Gemini returned empty response" };
    }

    return { text, success: true };
  } catch (err: any) {
    return { text: "", success: false, error: `Gemini request failed: ${err.message}` };
  }
}
