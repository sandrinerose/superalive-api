/**
 * WF01 — Face Grid
 * Bible Section 03 — Cinematic Continuity
 * INPUT: Hero portrait + model description
 * OUTPUT: 2x2 grid (frontal, 3/4, profile, low-angle)
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { CINEMATIC_CONTINUITY } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "Face Grid",
    systemPrompt: CINEMATIC_CONTINUITY,
    defaultAspectRatio: "1:1",
    defaultCandidates: 2,
    requiresImages: true,
    minImages: 1,
    maxImages: 1,
    outputFormat: "json",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, {
    name: "Face Grid",
    systemPrompt: "",
  });
}
