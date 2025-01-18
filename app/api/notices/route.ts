import { NextRequest, NextResponse } from 'next/server';
import { getNotices } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  try {
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const notices = await getNotices(user.companyName);
    
    return NextResponse.json({ notices });
  } catch (error) {
    console.error('공지사항 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '공지사항 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 