'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { SignUpForm } from '@/types/auth';
import Link from 'next/link';

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpForm>();
  const password = watch('password');

  const onSubmit = async (data: SignUpForm) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message);
        return;
      }

      alert('회원가입이 완료되었습니다.');
      router.push('/login');
    } catch (error) {
      console.error('회원가입 중 오류 발생:', error);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] flex items-center justify-center bg-gray-50">
      {isLoading && <Loading />}
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>필수 정보를 입력해주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="이메일"
                {...register('email', { 
                  required: true,
                  pattern: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                })}
              />
              {errors.email?.type === 'required' && (
                <span className="text-sm text-red-500">이메일을 입력하세요.</span>
              )}
              {errors.email?.type === 'pattern' && (
                <span className="text-sm text-red-500">올바른 이메일 형식이 아닙니다.</span>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                placeholder="이름"
                {...register('name', { required: true })}
              />
              {errors.name && (
                <span className="text-sm text-red-500">이름을 입력하세요.</span>
              )}
            </div>
            
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="비밀번호"
                {...register('password', { required: true, minLength: 4 })}
              />
              {errors.password?.type === 'required' && (
                <span className="text-sm text-red-500">비밀번호를 입력하세요.</span>
              )}
              {errors.password?.type === 'minLength' && (
                <span className="text-sm text-red-500">비밀번호는 최소 4자 이상이어야 합니다.</span>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                placeholder="비밀번호 확인"
                {...register('confirmPassword', { 
                  required: true,
                  validate: value => value === password || '비밀번호가 일치하지 않습니다.'
                })}
              />
              {errors.confirmPassword && (
                <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}

            <Button type="submit" className="w-full">
              회원가입
            </Button>

            <div className="text-center text-sm text-gray-500">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                로그인
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 