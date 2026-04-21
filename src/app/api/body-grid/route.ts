/**
 * WF02 — Body Grid
 * Bible Section 04 — Commercial Consistency
 * INPUT: Face grid + outfit/style description
 * OUTPUT: 3x1 panel (front, back-to-side, 3/4 body)
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { COMMERCIAL_CONSISTENCY } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "Body Grid",
    systemPrompt: COMMERCIAL_CONSISTENCY,
    defaultAspectRatio: "16:9",
    defaultCandidates: 2,
    requiresImages: true,
    minImages: 1,
    maxImages: 1,
    outputFormat: "json",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, { name: "Body Grid", systemPrompt: "" });
}
