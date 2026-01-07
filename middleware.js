import { NextResponse } from 'next/server'

export async function middleware(req) {
  // Skip middleware untuk file static dan API routes
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Jika user belum login dan bukan di halaman login, redirect ke login
  if (req.nextUrl.pathname !== '/login') {
    // Untuk sementara, kita skip middleware check
    // Authentication akan dihandle di client-side dengan ProtectedRoute
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}