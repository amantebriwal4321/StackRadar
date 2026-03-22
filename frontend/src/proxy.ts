import { NextRequest, NextResponse } from "next/server";

// Middleware disabled for frontend-only MVP (no auth required)
export default function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [], // Don't intercept any routes for now
};
