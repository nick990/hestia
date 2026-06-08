import type { NextRequest } from "next/server";

const MOBILE_USER_AGENT =
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function isMobileUserAgent(request: NextRequest): boolean {
  const userAgent = request.headers.get("user-agent") ?? "";
  return MOBILE_USER_AGENT.test(userAgent);
}
