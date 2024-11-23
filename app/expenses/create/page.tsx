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
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ExpenseForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCardUsage, setIsCardUsage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    // 현재 로그인한 사용자 정보 가져오기
    const getUserFromCookie = () => {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        if (cookies.user) {
          const userData = JSON.parse(decodeURIComponent(cookies.user));
          setCurrentUser({
            email: userData.email,
            name: userData.name
          });
        }
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    };

    getUserFromCookie();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/users');
        const data = await response.json();
        setUserOptions(data.users);

        // 현재 사용자가 있으면 첫 번째 사용자로 설정
        if (currentUser) {
          setUsers([{ 
            email: currentUser.email, 
            name: currentUser.name, 
            amount: 0 
          }]);
        }
      } catch (error) {
        console.error('사용자 목록 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // 오늘 날짜를 YYYY-MM-DD 형식으로 설정
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setValue('date', `${year}-${month}-${day}`);
  }, [setValue]);

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>사용 내역 등록</CardTitle>
              <CardDescription>법인카드 사용 내역을 등록하세요.</CardDescription>
            </div>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="shrink-0"
            >
              뒤로가기
            </Button>
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
                      type="number"
                      placeholder="금액"
                      value={user.amount || ''}
                      onChange={(e) => updateUser(index, 'amount', parseInt(e.target.value) || 0)}
                      className="w-24 text-right"
                    />
                    {users.length > 1 && (
                      <Button 
                        type="button" 
                        onClick={() => removeUser(index)}
                        className="h-10 w-10 p-0 flex items-center justify-center"
                        title="삭제"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button 
                  type="button" 
                  onClick={addUser}
                  className="w-full h-9 text-sm"
                >
                  + 사용자 추가
                </Button>
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
                등록하기
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 