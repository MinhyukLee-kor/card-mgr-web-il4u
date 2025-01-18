import { NextRequest, NextResponse } from 'next/server';
import { getAllCompanies } from '@/lib/googleSheets';

export async function GET(_request: NextRequest) {
  try {
    const companies = await getAllCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    console.error('회사 목록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '회사 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 