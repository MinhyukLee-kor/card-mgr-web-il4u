'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ExpenseForm, ExpenseShare, UserOption } from '@/types/expense';
import { Loading } from "@/components/ui/loading";
import { ArrowLeft } from 'lucide-react';
import { formatAmount, parseAmount } from "@/lib/utils";

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [users, setUsers] = useState<ExpenseShare[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCardUsage, setIsCardUsage] = useState(false);
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
          setIsCardUsage(expense.isCardUsage);
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
    } else if (field === 'amount') {
      newUsers[index] = {
        ...newUsers[index],
        amount: parseAmount(value as string)
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
          isCardUsage,
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
      console.error('수정 중 오류 발생:', error);
      setError('수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        <Card>
          <CardHeader>
            <CardTitle>사용 내역 수정</CardTitle>
            <CardDescription>카드 사용 내역을 수정하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="date"
                  {...register('date', { required: true })}
                  className="w-full"
                />
                {errors.date && (
                  <span className="text-sm text-red-500">날짜를 선택하세요.</span>
                )}
              </div>

              {/* 법인카드 여부 선택 */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={isCardUsage === true}
                    onChange={() => setIsCardUsage(true)}
                    className="hidden"
                  />
                  <span className={`text-sm ${isCardUsage === true ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                    법인카드
                  </span>
                </label>
                <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                  <input
                    type="radio"
                    checked={isCardUsage === false}
                    onChange={() => setIsCardUsage(false)}
                    className="hidden"
                  />
                  <span className={`text-sm ${isCardUsage === false ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                    개인카드
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                {users.map((user, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={user.name}
                      onChange={(e) => updateUser(index, 'name', e.target.value)}
                    >
                      <option value="">사용자</option>
                      {userOptions.map((option) => (
                        <option key={option.email} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      placeholder="금액"
                      value={formatAmount(user.amount)}
                      onChange={(e) => updateUser(index, 'amount', e.target.value)}
                      className="w-24 text-right"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="사용내역"
                  {...register('memo')}
                  className="w-full"
                />
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <Button type="submit" className="w-full">
                수정하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 플로팅 뒤로가기 버튼 */}
      <Button
        onClick={() => router.back()}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl bg-white border border-gray-200 hover:bg-gray-100"
        title="뒤로가기"
      >
        <ArrowLeft className="h-6 w-6 text-gray-600" />
      </Button>
    </>
  );
} 