/**
 * WF07 — Product Integration
 * Bible Section 09 — Virtual Try-On
 * INPUT: Base image + product image + integration notes
 * OUTPUT: Product naturally placed on subject
 */
import { handleWorkflow } from "@/lib/workflow-handler";
import { PRODUCT_INTEGRATION } from "@/lib/system-prompts";

export async function POST(request: Request) {
  return handleWorkflow(request, {
    name: "Product Integration",
    systemPrompt: PRODUCT_INTEGRATION,
    defaultAspectRatio: "1:1",
    defaultCandidates: 4,
    requiresImages: true,
    minImages: 2,
    maxImages: 6,
    outputFormat: "json",
  });
}

export async function OPTIONS(request: Request) {
  return handleWorkflow(request, { name: "Product Integration", systemPrompt: "" });
}
