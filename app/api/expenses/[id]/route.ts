import { NextRequest, NextResponse } from 'next/server';
import { updateExpense, deleteExpense, getExpenseById } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

// 권한 체크 함수
const checkPermission = (expense: any, userEmail: string) => {
  if (expense.registrant.email !== userEmail) {
    throw new Error('해당 내역의 수정/삭제 권한이 없습니다.');
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const expense = await getExpenseById(params.id, user.companyName);
    if (!expense) {
      return NextResponse.json(
        { message: '사용 내역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    const data = await request.json();

    // 등록자 정보에 회사명 추가
    const expense = {
      ...data,
      registrant: {
        email: user.email,
        name: user.name,
        companyName: user.companyName  // 회사명 추가
      }
    };

    await updateExpense(params.id, expense);
    return NextResponse.json({ message: '수정되었습니다.' });
  } catch (error) {
    console.error('사용 내역 수정 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용 내역 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    
    // 권한 체크
    const expense = await getExpenseById(params.id, user.companyName);
    if (!expense) {
      return NextResponse.json(
        { message: '사용 내역을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    try {
      checkPermission(expense, user.email);
    } catch (error: any) {
      return NextResponse.json(
        { message: error.message },
        { status: 403 }
      );
    }

    await deleteExpense(params.id);
    return NextResponse.json({
      message: '사용 내역이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('사용 내역 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용 내역 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 