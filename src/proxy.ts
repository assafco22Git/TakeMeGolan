import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Lightweight config (no DB imports) — safe for the Edge runtime
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
