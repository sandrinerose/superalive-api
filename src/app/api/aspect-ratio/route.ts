/**
 * WF09 — Aspect Ratio Adapter
 * Bible Section 11 — Composition Expert
 * INPUT: Image + target ratio(s)
 * OUTPUT: 1 adapted image per ratio
 *
 * Supports multiple ratios in a single call — runs them in parallel.
 */
import { callGemini } from "@/lib/gemini";
import { callReplicate, uploadImageToReplicate } from "@/lib/replicate";
import { handleCors, jsonResponse, errorResponse } from "@/lib/cors";
import { COMPOSITION_EXPERT } from "@/lib/system-prompts";

const SUPPORTED_RATIOS = ["16:9", "9:16", "3:2", "2:3", "4:3", "3:4", "5:4", "4:5", "21:9", "1:1"];

export async function POST(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const { prompt = "", images = [], imageMediaTypes = [], ratios = ["16:9"] } = body;

    if (!images || images.length < 1) {
      return errorResponse("This workflow requires at least 1 image.", 400);
    }

    // Validate ratios
    const validRatios = ratios.filter((r: string) => SUPPORTED_RATIOS.includes(r));
    if (validRatios.length === 0) {
      return errorResponse(`Invalid ratios. Supported: ${SUPPORTED_RATIOS.join(", ")}`, 400);
    }

    // Upload reference image once
    const refUrl = await uploadImageToReplicate(images[0], imageMediaTypes[0] || "image/jpeg");

    // Run all ratios in parallel
    const results = await Promise.all(
      validRatios.map(async (ratio: string) => {
        // Call Gemini for this specific ratio
        const gemini = await callGemini({
          systemPrompt: COMPOSITION_EXPERT,
          userPrompt: `${prompt}\nTarget aspect ratio: ${ratio}`,
          images,
          imageMediaTypes,
        });

        if (!gemini.success) return { ratio, image: null, error: gemini.error };

        // Call Replicate
        const replicate = await callReplicate({
          prompt: gemini.text,
          aspectRatio: ratio,
          numOutputs: 1,
          referenceImage: refUrl || undefined,
        });

        if (!replicate.success) return { ratio, image: null, error: replicate.error };

        return { ratio, image: replicate.images[0], error: null };
      })
    );

    return jsonResponse({
      success: true,
      workflow: "Aspect Ratio Adapter",
      results,
      totalGenerated: results.filter((r) => r.image).length,
    });
  } catch (err: any) {
    return errorResponse(`Workflow error: ${err.message}`, 500);
  }
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
}
