import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('사용자 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 