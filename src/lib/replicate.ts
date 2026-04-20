/**
 * Replicate Client — Nano Banana Pro (Google)
 * ────────────────────────────────────────────
 * Sends the enhanced prompt (from Gemini) to Nano Banana Pro via Replicate
 * and returns the generated image URL(s).
 *
 * - Supports multiple reference images (up to 14)
 * - Built-in fallback to Seedream 5.0 lite on rate limits
 * - Retries up to 3 times on 429 with backoff
 */

const MODEL_ID = "google/nano-banana-pro";
const MAX_CREATE_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = 12000; // 12s between retries

interface ReplicateRequest {
  prompt: string;
  aspectRatio?: string; // e.g., "1:1", "16:9", "3:4", "auto"
  numImages?: number; // 1-4
  imageUrls?: string[]; // URLs to reference images (up to 14)
  resolution?: "1k" | "2k" | "4k";
  outputFormat?: "jpg" | "png";
}

interface ReplicateResponse {
  images: string[]; // URLs of generated images
  success: boolean;
  error?: string;
}

export async function callReplicate({
  prompt,
  aspectRatio = "1:1",
  numImages = 1,
  imageUrls = [],
  resolution = "2k",
  outputFormat = "png",
}: ReplicateRequest): Promise<ReplicateResponse> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return { images: [], success: false, error: "REPLICATE_API_TOKEN not configured" };
  }

  const input: any = {
    prompt,
    aspect_ratio: aspectRatio,
    num_images: numImages,
    output_format: outputFormat,
    resolution,
    safety_tolerance: 5,
    allow_fallback_model: true, // Falls back to Seedream 5.0 lite if rate limited
  };

  // Add reference images if provided (Nano Banana Pro supports up to 14)
  if (imageUrls.length > 0) {
    input.image_urls = imageUrls;
  }

  try {
    // Create prediction with retry on rate limit
    let createResponse: Response | null = null;
    let lastError = "";

    for (let attempt = 0; attempt <= MAX_CREATE_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`Replicate rate limited, retry ${attempt}/${MAX_CREATE_RETRIES} after ${RATE_LIMIT_BACKOFF_MS}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_BACKOFF_MS));
      }

      createResponse = await fetch(`https://api.replicate.com/v1/models/${MODEL_ID}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      // Success or non-rate-limit error — stop retrying
      if (createResponse.ok || createResponse.status !== 429) {
        break;
      }

      // 429 rate limit — will retry
      lastError = await createResponse.text();
      console.log(`Replicate 429: ${lastError.substring(0, 100)}`);
    }

    if (!createResponse || !createResponse.ok) {
      const errorText = lastError || (createResponse ? await createResponse.text() : "No response");
      return {
        images: [],
        success: false,
        error: `Replicate create error (${createResponse?.status || "unknown"}): ${errorText}`,
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
  maxAttempts = 90,
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
