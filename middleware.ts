import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { can, ROUTE_PERMISSIONS } from "@/lib/permissions"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Pages publiques
  if (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  const role = (req.auth?.user as any)?.role
  const match = ROUTE_PERMISSIONS.find((r) => nextUrl.pathname.startsWith(r.prefix))

  if (match && role && !can(role, match.permission)) {
    return NextResponse.redirect(new URL("/dashboard?forbidden=1", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
