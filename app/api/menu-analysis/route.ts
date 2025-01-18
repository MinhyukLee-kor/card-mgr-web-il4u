import { NextRequest, NextResponse } from 'next/server';
import { getMenuAnalysis } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || getDefaultStartDate();
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const viewType = searchParams.get('viewType') || 'all';

    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const analysis = await getMenuAnalysis(
      startDate, 
      endDate, 
      viewType, 
      user.companyName,
      viewType === 'personal' ? user.name : undefined  // 개인별 조회일 때만 사용자 이름 전달
    );
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('메뉴 분석 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '메뉴 분석 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function getDefaultStartDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split('T')[0];
} 