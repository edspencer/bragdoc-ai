import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@bragdoc/auth'
import { isPaymentRequired, requiresPayment } from '@bragdoc/config'

export async function middleware(request: NextRequest) {
  // Only enforce payment gates if PAYMENT_TOKEN_REQUIRED is true
  if (!isPaymentRequired()) {
    return NextResponse.next()
  }

  const session = await auth()
  
  // Define protected routes and their required feature levels
  const protectedRoutes: Record<string, string> = {
    '/chat': 'unlimited_documents',
    '/api/ai': 'ai_assistant',
    '/settings/integrations': 'api_access',
    '/achievements': 'unlimited_documents',
    '/documents/generate': 'ai_assistant',
  }

  const pathname = request.nextUrl.pathname
  
  for (const [route, feature] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!session?.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      if (requiresPayment(session.user.level || 'free', feature as any)) {
        const upgradeUrl = new URL('/upgrade', request.url)
        upgradeUrl.searchParams.set('feature', feature)
        return NextResponse.redirect(upgradeUrl)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}