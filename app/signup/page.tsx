'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Select from 'react-select';

interface SignUpForm {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  companyId: number;
}

interface Company {
  id: number;
  name: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors }, watch } = useForm<SignUpForm>();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/companies', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        setCompanies(data.companies);
      } catch (error) {
        console.error('회사 목록 조회 중 오류 발생:', error);
      }
    };

    fetchCompanies();
  }, []);

  const onSubmit = async (data: SignUpForm) => {
    try {
      if (!selectedCompany) {
        setError('회사를 선택해주세요.');
        return;
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          companyName: selectedCompany.name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      router.push('/login');
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="container max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
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
                  validate: value => value === watch('password') || '비밀번호가 일치하지 않습니다.'
                })}
              />
              {errors.confirmPassword && (
                <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">회사</label>
              <Select
                value={selectedCompany}
                onChange={(selected) => setSelectedCompany(selected as Company)}
                options={companies}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id.toString()}
                placeholder="회사 선택"
                className="w-full"
              />
            </div>

            {error && (
              <div className="text-sm text-red-500">{error}</div>
            )}

            <Button type="submit" className="w-full">
              가입하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 