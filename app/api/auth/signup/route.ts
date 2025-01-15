import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/googleSheets';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    // 이메일 중복 체크
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { message: '이미 등록된 이메일입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 현재 날짜를 YYYY-MM-DD 형식으로 가져오기
    const today = new Date().toISOString().split('T')[0];

    // 사용자 생성
    await createUser({
      email,
      name,
      password: hashedPassword,
      role: 'USER',
      isActive: true,
      passwordChangedAt: today  // 오늘 날짜 추가
    });

    return NextResponse.json({
      message: '회원가입이 완료되었습니다.'
    });
  } catch (error) {
    console.error('회원가입 처리 중 오류 발생:', error);
    return NextResponse.json(
      { message: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 