/**
 * Shared Workflow Handler
 * ───────────────────────
 * Every workflow follows the same pattern:
 * 1. Parse request (prompt + images)
 * 2. Call Gemini with system prompt
 * 3. Call Replicate with enhanced prompt
 * 4. Return generated images
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
      model,
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
    const geminiResult = await callGemini({
      systemPrompt: config.systemPrompt,
      userPrompt: prompt || "Process the provided image(s)",
      images,
      imageMediaTypes,
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
        // Use the full JSON as the prompt — Flux handles detailed prompts well
        imagePrompt = JSON.stringify(parsed);
      } catch {
        // If JSON parsing fails, use the raw text — it's usually still usable
      }
    }

    // ─── Step 3: Upload reference images to Replicate ───
    let referenceImageUrl: string | undefined;
    if (images.length > 0) {
      const uploaded = await uploadImageToReplicate(
        images[0],
        imageMediaTypes[0] || "image/jpeg"
      );
      if (uploaded) {
        referenceImageUrl = uploaded;
      }
    }

    // ─── Step 4: Call Replicate for image generation ────
    const replicateResult = await callReplicate({
      prompt: imagePrompt,
      aspectRatio: aspectRatio || config.defaultAspectRatio || "1:1",
      numOutputs: candidates || config.defaultCandidates || 1,
      referenceImage: referenceImageUrl,
      model: model,
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
    });
  } catch (err: any) {
    return errorResponse(`Workflow error: ${err.message}`, 500);
  }
}
