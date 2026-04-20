/**
 * WF05 — Edit Image
 * Bible Section 07 — Dreamweaver Image Editing
 * INPUT: Image + optional red mask + editing instruction
 * OUTPUT: Edited image
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { IMAGE_EDITING_OPTIMIZER } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "Edit Image",
    systemPrompt: IMAGE_EDITING_OPTIMIZER,
    defaultAspectRatio: "1:1",
    defaultCandidates: 4,
    requiresImages: true,
    minImages: 1,
    maxImages: 1,
    outputFormat: "raw",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, { name: "Edit Image", systemPrompt: "" });
}
