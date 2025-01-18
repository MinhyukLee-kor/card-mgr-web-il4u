import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const users = await getAllUsers(user.companyName);
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 