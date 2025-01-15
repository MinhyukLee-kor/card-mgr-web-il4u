import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUserPassword } from '@/lib/googleSheets';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 현재 로그인한 사용자 정보 가져오기
    const userCookie = cookies().get('user');
    if (!userCookie) {
      return NextResponse.json(
        { message: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const userData = JSON.parse(decodeURIComponent(userCookie.value));
    const user = await getUserByEmail(userData.email);

    if (!user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { message: '현재 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 새 비밀번호 해시화
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // 비밀번호 업데이트 (변경일자 포함)
    await updateUserPassword(userData.email, hashedNewPassword);

    return NextResponse.json({
      message: '비밀번호가 변경되었습니다.'
    });
  } catch (error) {
    console.error('비밀번호 변경 중 오류 발생:', error);
    return NextResponse.json(
      { message: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 