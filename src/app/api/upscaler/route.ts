/**
 * WF08 — 4K Upscaler
 * Bible Section 10 — Texture Restoration
 * INPUT: Image (1K or 2K)
 * OUTPUT: Enhanced 4K version
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { TEXTURE_RESTORATION } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "4K Upscaler",
    systemPrompt: TEXTURE_RESTORATION,
    defaultAspectRatio: "1:1",
    defaultCandidates: 1,
    requiresImages: true,
    minImages: 1,
    maxImages: 1,
    outputFormat: "json",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, { name: "4K Upscaler", systemPrompt: "" });
}
