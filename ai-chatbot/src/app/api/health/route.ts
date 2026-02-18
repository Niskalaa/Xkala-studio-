// src/app/api/health/route.ts

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services: {
      bedrock: {
        region: process.env.AWS_REGION || "us-west-2",
        configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      },
      firebase: {
        configured: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      },
    },
  });
}