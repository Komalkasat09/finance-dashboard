import { NextResponse, type NextRequest } from "next/server"


export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname === "/login" || pathname === "/signup"

  if (!accessToken && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (accessToken && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}


export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
