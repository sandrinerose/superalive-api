/**
 * WF03 — Faceswap
 * Bible Section 05 — Identity Synthesis
 * INPUT: Face grid + base scene + creative direction
 * OUTPUT: Styled avatar with consistent identity
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { IDENTITY_SYNTHESIS } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "Faceswap",
    systemPrompt: IDENTITY_SYNTHESIS,
    defaultAspectRatio: "1:1",
    defaultCandidates: 4,
    requiresImages: true,
    minImages: 2,
    maxImages: 4,
    outputFormat: "raw",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, { name: "Faceswap", systemPrompt: "" });
}
