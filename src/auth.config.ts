import type { NextAuthConfig } from "next-auth";

// Lightweight config — NO database imports — safe for the Edge runtime (proxy.ts)
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";

      if (isLoginPage) {
        // Already logged in → redirect to dashboard
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      // All other routes require login
      return isLoggedIn;
    },
  },
  providers: [], // filled in by auth.ts
} satisfies NextAuthConfig;
