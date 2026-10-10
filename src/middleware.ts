import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, VISITOR_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAdmin = pathname.startsWith("/admin");
  const needsUser = pathname.startsWith("/account");

  if (needsAdmin || needsUser) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session || (needsAdmin && session.role !== "ADMIN")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();
  if (!req.cookies.get(VISITOR_COOKIE)) {
    res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|images/|uploads/|favicon|api/webhooks).*)"],
};
