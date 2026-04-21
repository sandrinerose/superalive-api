/**
 * WF04 — Image Generation
 * Bible Section 06 — Dreamweaver + Director of Photography
 * INPUT: Text prompt + optional reference image(s)
 * OUTPUT: Generated image from description
 *
 * Routes to Dreamweaver (0 refs) or Director of Photography (1+ refs)
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { DREAMWEAVER, DIRECTOR_OF_PHOTOGRAPHY } from "@/lib/system-prompts";
import { handleCors } from "@/lib/cors";

export async function POST(request: Request) {
  // Peek at the body to determine which system prompt to use
  const body = await request.json();
  const hasImages = body.images && body.images.length > 0;

  // Re-create request with the body (since we already consumed it)
  const newRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(body),
  });

  return handleWorkflow(newRequest, {
    name: "Image Generation",
    systemPrompt: hasImages ? DIRECTOR_OF_PHOTOGRAPHY : DREAMWEAVER,
    defaultAspectRatio: body.aspectRatio || "1:1",
    defaultCandidates: 2,
    requiresImages: false, // Optional for this workflow
    maxImages: 8,
    outputFormat: hasImages ? "json" : "raw",
  });
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
}
