import { NextRequest, NextResponse } from 'next/server';
import { getMenuCalendarData } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

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
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const menuData = await getMenuCalendarData(
      user.name,
      user.companyName,
      parseInt(year!),
      parseInt(month!)
    );
    
    return NextResponse.json({ menuData });
  } catch (error) {
    console.error('메뉴 달력 데이터 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '메뉴 달력 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 