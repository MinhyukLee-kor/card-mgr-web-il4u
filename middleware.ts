import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userCookie = request.cookies.get('user')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isRootPage = request.nextUrl.pathname === '/';

  // 로그인되지 않은 상태에서 로그인 페이지가 아닌 페이지 접근 시
  if (!userCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 이미 로그인된 상태에서 로그인 페이지나 루트 페이지 접근 시
  if (userCookie && (isLoginPage || isRootPage)) {
    return NextResponse.redirect(new URL('/expenses', request.url));
  }

  // 로그인 페이지에서는 헤더를 숨기기 위한 응답 헤더 추가
  if (isLoginPage) {
    const response = NextResponse.next();
    response.headers.set('x-show-header', 'false');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 