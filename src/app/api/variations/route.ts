/**
 * WF11 — Variations + Action Grid
 * Bible Section 13 — Action Director + 3x3 Grid Camera
 * INPUT: Reference image + mode (multi-angle / action) + prompt
 * OUTPUT: 3x3 grid
 *
 * Routes to different system prompts based on the "mode" parameter.
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { GRID_CAMERA_3X3, ACTION_DIRECTOR } from "@/lib/system-prompts";
import { handleCors } from "@/lib/cors";

export async function POST(request: Request) {
  const body = await request.json();
  const mode = body.mode || "multi-angle";

  const systemPrompt = mode === "action" ? ACTION_DIRECTOR : GRID_CAMERA_3X3;

  const newRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(body),
  });

  return handleWorkflow(newRequest, {
    name: `Variations (${mode})`,
    systemPrompt,
    defaultAspectRatio: "1:1",
    defaultCandidates: 4,
    requiresImages: true,
    minImages: 1,
    maxImages: 6,
    outputFormat: "json",
  });
}

export async function OPTIONS(request: Request) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
}
