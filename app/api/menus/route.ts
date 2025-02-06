import { NextRequest, NextResponse } from 'next/server';
import { getAllMenus } from '@/lib/googleSheets';
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
    const menus = await getAllMenus(user.companyName);
    
    // 메뉴 이름만 추출하여 반환
    const menuNames = menus.map(menu => menu.name);
    
    return NextResponse.json({ menus: menuNames });
  } catch (error) {
    console.error('메뉴 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '메뉴 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 