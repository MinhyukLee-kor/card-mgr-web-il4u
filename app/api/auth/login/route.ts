import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/googleSheets';
import bcrypt from 'bcryptjs';

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

    // 비밀번호 비교
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
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

    const response = NextResponse.json({
      message: '로그인되었습니다.',
      redirectTo: '/'
    });

    response.cookies.set({
      name: 'user',
      value: JSON.stringify(userData),
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24
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