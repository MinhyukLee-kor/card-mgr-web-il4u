import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    message: '로그아웃 되었습니다.'
  });

  // 쿠키 삭제
  response.cookies.delete('user');

  return response;
}