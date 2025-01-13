import { NextRequest, NextResponse } from 'next/server';
import { getNotices } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  try {
    const notices = await getNotices();
    return NextResponse.json(
      { notices },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('공지사항 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '공지사항 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 