'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ExpenseForm, ExpenseShare, UserOption } from '@/types/expense';
import { Loading } from "@/components/ui/loading";

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [users, setUsers] = useState<ExpenseShare[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ExpenseForm>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // 사용자 목록 조회
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        setUserOptions(usersData.users);

        // 기존 내역 조회
        const expenseResponse = await fetch(`/api/expenses/${params.id}`);
        const expenseData = await expenseResponse.json();
        
        if (expenseResponse.ok) {
          const { expense } = expenseData;
          setValue('date', expense.date);
          setValue('memo', expense.memo);
          setUsers(expense.users);
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
        setError('데이터 조회 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id, setValue]);

  const updateUser = (index: number, field: keyof ExpenseShare, value: string | number) => {
    const newUsers = [...users];
    if (field === 'name' && typeof value === 'string') {
      const selectedUser = userOptions.find(option => option.name === value);
      if (selectedUser) {
        newUsers[index] = {
          ...newUsers[index],
          name: selectedUser.name,
          email: selectedUser.email
        };
      }
    } else {
      newUsers[index] = {
        ...newUsers[index],
        [field]: value
      };
    }
    setUsers(newUsers);
  };

  const onSubmit = async (data: ExpenseForm) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/expenses/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          users
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message);
        return;
      }

      router.push('/expenses');
      router.refresh();
    } catch (error) {
      setError('수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>사용 내역 수정</CardTitle>
            <CardDescription>법인카드 사용 내역을 수정하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="date"
                  {...register('date', { required: true })}
                />
                {errors.date && (
                  <span className="text-sm text-red-500">날짜를 선택하세요.</span>
                )}
              </div>

              <div className="space-y-4">
                {users.map((user, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={user.name}
                      onChange={(e) => updateUser(index, 'name', e.target.value)}
                    >
                      <option value="">사용자 선택</option>
                      {userOptions.map((option) => (
                        <option key={option.email} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="금액"
                      value={user.amount}
                      onChange={(e) => updateUser(index, 'amount', parseInt(e.target.value))}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="비고"
                  {...register('memo')}
                />
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  수정하기
                </Button>
                <Button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 