import { NextResponse, type NextRequest } from 'next/server';

/**
 * Shop and location URLs are lowercase. Redirect e.g. /bookshop/Parnassus-Books →
 * /bookshop/parnassus-books and /bookshops/California → /bookshops/california here,
 * before rendering, so the response is a real 308. (Numeric shop ids and other
 * aliases are redirected by the shop page itself.)
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const lower = pathname.toLowerCase();
  if (lower !== pathname) {
    return NextResponse.redirect(new URL(`${lower}${search}`, request.url), 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/bookshop/:slug*', '/bookshops/:path*'],
};
