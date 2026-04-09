import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ROLE_COOKIE } from "@/lib/role";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get(ROLE_COOKIE)?.value;
  const hasRole = role === "OWNER" || role === "ADMIN";

  // Allow role selector
  if (pathname === "/login") {
    if (hasRole) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  // Protect everything else
  if (!hasRole) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
