import { NextRequest, NextResponse } from 'next/server';
import { getAllMenus } from '@/lib/googleSheets';

export async function GET(_request: NextRequest) {
  try {
    const menus = await getAllMenus();
    return NextResponse.json(
      { menus },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('메뉴 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '메뉴 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 