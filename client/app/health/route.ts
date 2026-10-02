import { NextResponse } from "next/server";

/**
 * A dependency-free liveness endpoint. It intentionally does not verify a
 * session, read Firestore, or call any third-party service.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { status: "ok", service: "client" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
