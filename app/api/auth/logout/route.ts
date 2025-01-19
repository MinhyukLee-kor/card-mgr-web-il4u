import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  
  // user 쿠키 삭제
  cookieStore.delete('user');

  // 모든 회사의 공지사항 캐시 삭제
  if (typeof window !== 'undefined') {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('notices_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  return NextResponse.json(
    { message: '로그아웃되었습니다.' },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    }
  );
}