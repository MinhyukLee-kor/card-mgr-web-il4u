'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ExpenseForm, ExpenseShare, UserOption } from '@/types/expense';
import { Loading } from "@/components/ui/loading";

export default function CreateExpensePage() {
  const router = useRouter();
  const [users, setUsers] = useState<ExpenseShare[]>([{ email: '', name: '', amount: 0 }]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [error, setError] = useState<string>('');
  const { register, handleSubmit, formState: { errors } } = useForm<ExpenseForm>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/users');
        const data = await response.json();
        setUserOptions(data.users);
      } catch (error) {
        console.error('사용자 목록 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const addUser = () => {
    setUsers([...users, { email: '', name: '', amount: 0 }]);
  };

  const removeUser = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const updateUser = (index: number, field: keyof ExpenseShare, value: string | number) => {
    const newUsers = [...users];
    if (field === 'name' && typeof value === 'string') {
      // 사용자가 선택되면 이메일도 함께 업데이트
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
      const response = await fetch('/api/expenses', {
        method: 'POST',
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
      console.error('사용 내역 등록 중 오류가 발생했습니다:', error);
      setError('사용 내역 등록 중 오류가 발생했습니다.');
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
            <CardTitle>사용 내역 등록</CardTitle>
            <CardDescription>법인카드 사용 내역을 등록하세요.</CardDescription>
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

              <div className="space-y-4">
                {users.map((user, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2">
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
                      className="w-full sm:w-1/3"
                    />
                    {users.length > 1 && (
                      <Button 
                        type="button" 
                        onClick={() => removeUser(index)}
                        className="w-full sm:w-auto"
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  onClick={addUser}
                  className="w-full sm:w-auto"
                >
                  사용자 추가
                </Button>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="비고"
                  {...register('memo')}
                  className="w-full"
                />
              </div>

              {error && (
                <div className="text-sm text-red-500">{error}</div>
              )}

              <Button type="submit" className="w-full">
                등록하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 