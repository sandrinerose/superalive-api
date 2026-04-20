/**
 * WF06 — Sketch to Render
 * Bible Section 08 — Visual Rendering Architect
 * INPUT: Sketch + optional style reference + description
 * OUTPUT: Photorealistic render
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { VISUAL_RENDERING_ARCHITECT } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "Sketch to Render",
    systemPrompt: VISUAL_RENDERING_ARCHITECT,
    defaultAspectRatio: "1:1",
    defaultCandidates: 4,
    requiresImages: true,
    minImages: 1,
    maxImages: 2,
    outputFormat: "json",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, { name: "Sketch to Render", systemPrompt: "" });
}
