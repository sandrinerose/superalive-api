/**
 * Replicate Client — Nano Banana Pro (Google)
 * ────────────────────────────────────────────
 * Sends the enhanced prompt (from Gemini) to Nano Banana Pro via Replicate
 * and returns the generated image URL(s).
 *
 * - Supports multiple reference images (up to 14) via `image_input`
 * - Generates multiple candidates via parallel predictions
 * - Built-in fallback to Seedream 5.0 lite on rate limits
 * - Retries up to 3 times on 429 with backoff
 */

const MODEL_ID = "google/nano-banana-pro";
const MAX_CREATE_RETRIES = 3;
const RATE_LIMIT_BACKOFF_MS = 12000; // 12s between retries

interface ReplicateRequest {
  prompt: string;
  aspectRatio?: string; // e.g., "1:1", "16:9", "3:4", "auto"
  numImages?: number; // 1-4 (runs parallel predictions since model outputs 1 per call)
  imageUrls?: string[]; // URLs to reference images (up to 14)
  resolution?: "1K" | "2K" | "4K";
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
  resolution = "2K",
  outputFormat = "png",
}: ReplicateRequest): Promise<ReplicateResponse> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return { images: [], success: false, error: "REPLICATE_API_TOKEN not configured" };
  }

  // Ensure resolution is uppercase (Replicate requires "1K", "2K", "4K")
  const normalizedResolution = resolution.toUpperCase();

  // Build the input object matching Nano Banana Pro's actual schema
  const input: any = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: outputFormat,
    resolution: normalizedResolution,
    safety_filter_level: "block_only_high",
    allow_fallback_model: true, // Falls back to Seedream 5.0 lite if rate limited
  };

  // Add reference images if provided (Nano Banana Pro supports up to 14)
  // Parameter name is "image_input" (array of URLs), NOT "image_urls"
  if (imageUrls.length > 0) {
    input.image_input = imageUrls;
  }

  try {
    // Nano Banana Pro generates 1 image per prediction.
    // For multiple candidates, we run parallel predictions.
    const count = Math.min(Math.max(numImages, 1), 4); // clamp 1-4

    console.log(`Starting ${count} parallel Nano Banana Pro prediction(s)...`);

    const predictionPromises = Array.from({ length: count }, () =>
      createPredictionWithRetry(input, apiToken)
    );

    const predictionResults = await Promise.all(predictionPromises);

    // Collect all successful prediction IDs
    const predictionIds: string[] = [];
    const errors: string[] = [];

    for (const result of predictionResults) {
      if (result.success && result.predictionId) {
        predictionIds.push(result.predictionId);
      } else {
        errors.push(result.error || "Unknown create error");
      }
    }

    if (predictionIds.length === 0) {
      return {
        images: [],
        success: false,
        error: `All ${count} predictions failed to create: ${errors[0]}`,
      };
    }

    // Poll all predictions in parallel
    const pollPromises = predictionIds.map((id) => pollPrediction(id, apiToken));
    const pollResults = await Promise.all(pollPromises);

    // Flatten all successful images
    const allImages: string[] = [];
    for (const images of pollResults) {
      if (images) {
        allImages.push(...images);
      }
    }

    if (allImages.length === 0) {
      return { images: [], success: false, error: "All predictions timed out or failed" };
    }

    console.log(`Got ${allImages.length} image(s) from ${predictionIds.length} prediction(s)`);
    return { images: allImages, success: true };
  } catch (err: any) {
    return { images: [], success: false, error: `Replicate request failed: ${err.message}` };
  }
}

/**
 * Create a single prediction with retry on rate limit (429).
 */
async function createPredictionWithRetry(
  input: any,
  apiToken: string
): Promise<{ success: boolean; predictionId?: string; error?: string }> {
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
      success: false,
      error: `Replicate create error (${createResponse?.status || "unknown"}): ${errorText}`,
    };
  }

  const prediction = await createResponse.json();
  return { success: true, predictionId: prediction.id };
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
