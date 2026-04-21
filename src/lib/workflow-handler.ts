/**
 * Shared Workflow Handler
 * ───────────────────────
 * Every workflow follows the same pattern:
 * 1. Parse request (prompt + images)
 * 2. Call Gemini with system prompt
 * 3. Upload ALL reference images to Replicate
 * 4. Call Nano Banana Pro with enhanced prompt + image URLs
 * 5. Return generated images
 *
 * This shared handler eliminates duplication across all 11 endpoints.
 */

import { callGemini } from "./gemini";
import { callReplicate, uploadImageToReplicate } from "./replicate";
import { handleCors, jsonResponse, errorResponse } from "./cors";

export interface WorkflowConfig {
  name: string;
  systemPrompt: string;
  defaultAspectRatio?: string;
  defaultCandidates?: number;
  requiresImages?: boolean;
  minImages?: number;
  maxImages?: number;
  outputFormat?: "json" | "raw"; // Whether Gemini outputs JSON or raw text
  defaultResolution?: "1k" | "2k" | "4k";
}

export async function handleWorkflow(
  request: Request,
  config: WorkflowConfig
) {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  // Only accept POST
  if (request.method !== "POST") {
    return errorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const body = await request.json();
    const {
      prompt,
      images = [],
      imageMediaTypes = [],
      aspectRatio,
      candidates,
      resolution,
    } = body;

    // Validate prompt
    if (!prompt && !config.requiresImages) {
      return errorResponse("Missing 'prompt' in request body.", 400);
    }

    // Validate images if required
    if (config.requiresImages && (!images || images.length < (config.minImages || 1))) {
      return errorResponse(
        `This workflow requires at least ${config.minImages || 1} image(s). Send base64 images in the 'images' array.`,
        400
      );
    }

    // ─── Step 1: Call Gemini with system prompt ─────────
    // Limit images sent to Gemini to the first 2 (prompt enhancement
    // doesn't need every reference image, and large payloads cause timeouts)
    const geminiImages = images.slice(0, 2);
    const geminiMediaTypes = imageMediaTypes.slice(0, 2);

    const geminiResult = await callGemini({
      systemPrompt: config.systemPrompt,
      userPrompt: prompt || "Process the provided image(s)",
      images: geminiImages,
      imageMediaTypes: geminiMediaTypes,
    });

    if (!geminiResult.success) {
      return errorResponse(`Gemini error: ${geminiResult.error}`, 502);
    }

    // ─── Step 2: Extract the image generation prompt ────
    let imagePrompt = geminiResult.text;

    // If Gemini returned JSON, try to extract the key prompt fields
    if (config.outputFormat === "json") {
      try {
        // Clean up markdown code blocks if present
        const cleanedText = imagePrompt
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsed = JSON.parse(cleanedText);
        // Use the full JSON as the prompt — Nano Banana Pro handles detailed prompts well
        imagePrompt = JSON.stringify(parsed);
      } catch {
        // If JSON parsing fails, use the raw text — it's usually still usable
      }
    }

    // ─── Step 3: Upload ALL reference images to Replicate ──
    const uploadedImageUrls: string[] = [];
    if (images.length > 0) {
      console.log(`Uploading ${images.length} reference image(s) to Replicate...`);
      for (let i = 0; i < images.length; i++) {
        const uploaded = await uploadImageToReplicate(
          images[i],
          imageMediaTypes[i] || "image/jpeg"
        );
        if (uploaded) {
          uploadedImageUrls.push(uploaded);
        } else {
          console.warn(`Failed to upload image ${i + 1}/${images.length}`);
        }
      }
      console.log(`Successfully uploaded ${uploadedImageUrls.length}/${images.length} images`);
    }

    // ─── Step 4: Call Nano Banana Pro for image generation ──
    const replicateResult = await callReplicate({
      prompt: imagePrompt,
      aspectRatio: aspectRatio || config.defaultAspectRatio || "1:1",
      numImages: candidates || config.defaultCandidates || 1,
      imageUrls: uploadedImageUrls,
      resolution: resolution || config.defaultResolution || "2k",
    });

    if (!replicateResult.success) {
      return errorResponse(`Replicate error: ${replicateResult.error}`, 502);
    }

    // ─── Step 5: Return results ─────────────────────────
    return jsonResponse({
      success: true,
      workflow: config.name,
      images: replicateResult.images,
      enhancedPrompt: imagePrompt,
      candidateCount: replicateResult.images.length,
      model: geminiResult.model || "gemini-2.5-pro",
    });
  } catch (err: any) {
    return errorResponse(`Workflow error: ${err.message}`, 500);
  }
}
