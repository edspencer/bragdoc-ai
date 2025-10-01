import { type NextRequest, NextResponse } from 'next/server'
import { isPaymentRequired } from '@bragdoc/config'

export async function middleware(request: NextRequest) {
  // Only enforce payment gates if PAYMENT_TOKEN_REQUIRED is true
  if (!isPaymentRequired()) {
    return NextResponse.next()
  }

  // For now, skip payment checks in middleware since they require database access
  // Payment checks can be handled at the page/API route level instead
  // TODO: Implement Edge Runtime compatible payment checks if needed
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}