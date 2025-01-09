import { NextRequest, NextResponse } from 'next/server';
import { createExpense, getExpenses } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    const user = JSON.parse(userCookie.value);
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const isCardUsage = searchParams.get('isCardUsage');
    const viewType = searchParams.get('viewType') || 'registrant';
    const expenseTypes = searchParams.get('expenseTypes') || undefined;
    const searchKeyword = searchParams.get('searchKeyword') || undefined;
    const selectedUser = searchParams.get('selectedUser') || undefined;
    
    const isCardUsageBoolean = isCardUsage === null ? undefined : isCardUsage === 'true';

    const expenses = await getExpenses(
      user.email, 
      startDate, 
      endDate, 
      isCardUsageBoolean,
      viewType as 'registrant' | 'user' | 'admin' | 'admin-summary',
      selectedUser,
      expenseTypes,
      searchKeyword
    );

    return NextResponse.json(
      { expenses },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('사용 내역 조회 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용 내역 조회 중 오류가 발생했습니다.' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userCookie = cookies().get('user');
    
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
    }

    const user = JSON.parse(userCookie.value);
    const expenseId = await createExpense({
      ...body,
      registrant: {
        email: user.email,
        name: user.name
      }
    });

    return NextResponse.json(
      {
        message: '사용 내역이 등록되었습니다.',
        expenseId
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('사용 내역 등록 중 오류 발생:', error);
    return NextResponse.json(
      { message: '사용 내역 등록 중 오류가 발생했습니다.' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
} 