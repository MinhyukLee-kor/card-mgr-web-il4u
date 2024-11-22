import { NextRequest, NextResponse } from 'next/server';
import { createExpense } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userCookie = cookies().get('user');
    
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const expenseId = await createExpense(body, {
      email: user.email,
      name: user.name
    });

    return NextResponse.json({
      message: '사용 내역이 등록되었습니다.',
      expenseId
    });
  } catch (error) {
    console.error('사용 내역 등록 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용 내역 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 