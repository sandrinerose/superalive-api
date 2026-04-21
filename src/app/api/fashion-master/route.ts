/**
 * WF10 — Fashion Master
 * Bible Section 12 — Fashion Stylist + 3x3 Grid Camera
 * INPUT: Fashion photo + mode (flat-lay / try-on / multi-angle) + prompt
 * OUTPUT: Varies by mode
 *
 * Routes to different system prompts based on the "mode" parameter.
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { FASHION_STYLIST, GRID_CAMERA_3X3, DIRECTOR_OF_PHOTOGRAPHY } from "@/lib/system-prompts";
import { handleCors } from "@/lib/cors";

export async function POST(request: Request) {
  const body = await request.json();
  const mode = body.mode || "flat-lay";

  // Select system prompt based on mode
  let systemPrompt: string;
  let aspectRatio: string;
  let outputFormat: "json" | "raw";

  switch (mode) {
    case "flat-lay":
    case "extraction":
      systemPrompt = FASHION_STYLIST;
      aspectRatio = "1:1";
      outputFormat = "json";
      break;
    case "try-on":
    case "virtual-try-on":
      systemPrompt = DIRECTOR_OF_PHOTOGRAPHY;
      aspectRatio = "3:4";
      outputFormat = "json";
      break;
    case "multi-angle":
    case "grid":
      systemPrompt = GRID_CAMERA_3X3;
      aspectRatio = "1:1";
      outputFormat = "json";
      break;
    default:
      systemPrompt = FASHION_STYLIST;
      aspectRatio = "1:1";
      outputFormat = "json";
  }

  const newRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(body),
  });

  return handleWorkflow(newRequest, {
    name: `Fashion Master (${mode})`,
    systemPrompt,
    defaultAspectRatio: aspectRatio,
    defaultCandidates: 2,
    requiresImages: true,
    minImages: 1,
    maxImages: 6,
    outputFormat,
  });
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
}
