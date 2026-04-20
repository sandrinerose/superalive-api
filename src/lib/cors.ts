/**
 * CORS Helper
 * ───────────
 * Allows your Lovable frontend to call this API from a different domain.
 */

import { NextResponse } from "next/server";

export function corsHeaders(): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(",")
      ? "*" // If multiple origins, handle dynamically in middleware
      : allowedOrigins,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCors(request: Request): NextResponse | null {
  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return NextResponse.json(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }
  return null;
}

export function jsonResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders(),
  });
}

export function errorResponse(message: string, status = 500): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status, headers: corsHeaders() }
  );
}
