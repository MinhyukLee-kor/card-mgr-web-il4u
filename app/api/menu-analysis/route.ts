import { NextRequest, NextResponse } from 'next/server';
import { getMenuAnalysis } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || getDefaultStartDate();
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const viewType = searchParams.get('viewType') || 'all';
    const userEmail = searchParams.get('userEmail') || '';

    const analysis = await getMenuAnalysis(startDate, endDate, viewType, userEmail);
    
    return NextResponse.json(analysis, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('메뉴 분석 중 오류 발생:', error);
    return NextResponse.json(
      { message: '메뉴 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function getDefaultStartDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 3);
  return date.toISOString().split('T')[0];
} 