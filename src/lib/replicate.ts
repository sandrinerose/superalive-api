/**
 * Replicate Client — Flux Image Generation
 * ──────────────────────────────────────────
 * Sends the enhanced prompt (from Gemini) to Flux via Replicate
 * and returns the generated image URL(s).
 */

interface ReplicateRequest {
  prompt: string;
  aspectRatio?: string; // e.g., "1:1", "16:9", "3:4"
  numOutputs?: number; // 1-4
  referenceImage?: string; // URL to a reference image
  model?: "flux-2-dev" | "flux-2-pro" | "flux-1-schnell" | "flux-1-dev" | "flux-1-pro";
}

interface ReplicateResponse {
  images: string[]; // URLs of generated images
  success: boolean;
  error?: string;
}

// Model identifiers on Replicate
const MODEL_MAP: Record<string, string> = {
  "flux-2-dev": "black-forest-labs/flux-dev",
  "flux-2-pro": "black-forest-labs/flux-pro",
  "flux-1-schnell": "black-forest-labs/flux-schnell",
  "flux-1-dev": "black-forest-labs/flux-dev",
  "flux-1-pro": "black-forest-labs/flux-pro",
};

export async function callReplicate({
  prompt,
  aspectRatio = "1:1",
  numOutputs = 1,
  referenceImage,
  model,
}: ReplicateRequest): Promise<ReplicateResponse> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return { images: [], success: false, error: "REPLICATE_API_TOKEN not configured" };
  }

  const selectedModel = model || process.env.FLUX_MODEL || "flux-2-dev";
  const modelId = MODEL_MAP[selectedModel] || MODEL_MAP["flux-2-dev"];

  const input: any = {
    prompt,
    aspect_ratio: aspectRatio,
    num_outputs: numOutputs,
    output_format: "png",
    output_quality: 90,
  };

  // Add reference image if provided (for image-to-image workflows)
  if (referenceImage) {
    input.image = referenceImage;
  }

  try {
    // Create prediction
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        input,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return {
        images: [],
        success: false,
        error: `Replicate create error (${createResponse.status}): ${errorText}`,
      };
    }

    const prediction = await createResponse.json();

    // Poll for completion
    const resultImages = await pollPrediction(prediction.id, apiToken);
    if (!resultImages) {
      return { images: [], success: false, error: "Replicate prediction timed out or failed" };
    }

    return { images: resultImages, success: true };
  } catch (err: any) {
    return { images: [], success: false, error: `Replicate request failed: ${err.message}` };
  }
}

async function pollPrediction(
  predictionId: string,
  apiToken: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<string[] | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
      }
    );

    if (!response.ok) continue;

    const data = await response.json();

    if (data.status === "succeeded") {
      const output = data.output;
      if (Array.isArray(output)) return output;
      if (typeof output === "string") return [output];
      return null;
    }

    if (data.status === "failed" || data.status === "canceled") {
      console.error("Replicate prediction failed:", data.error);
      return null;
    }

    // Still processing — continue polling
  }

  return null; // Timed out
}

/**
 * Upload a base64 image to a temporary URL that Replicate can access.
 * Uses Replicate's file upload API.
 */
export async function uploadImageToReplicate(
  base64Data: string,
  mediaType: string = "image/jpeg"
): Promise<string | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) return null;

  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Create upload
    const createResponse = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": mediaType,
      },
      body: buffer,
    });

    if (!createResponse.ok) return null;

    const data = await createResponse.json();
    return data.urls?.get || null;
  } catch {
    return null;
  }
}
