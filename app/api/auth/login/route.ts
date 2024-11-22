import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: '비활성화된 계정입니다.' },
        { status: 401 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { message: '비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    const userData = {
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // 응답 생성
    const response = NextResponse.json({
      message: '로그인 성공',
      user: userData
    });

    // 쿠키 설정
    response.cookies.set({
      name: 'user',
      value: JSON.stringify(userData),
      path: '/',
      httpOnly: false, // 클라이언트에서 접근 가능하도록 설정
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24시간
    });

    return response;
  } catch (error) {
    console.error('로그인 처리 중 오류 발생:', error);
    return NextResponse.json(
      { message: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 