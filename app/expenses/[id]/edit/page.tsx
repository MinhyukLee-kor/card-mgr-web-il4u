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
import Select from 'react-select';

type ExpenseType = '점심식대' | '저녁식대' | '야근식대' | '차대' | '휴일근무' | '기타';

export default function EditExpensePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [users, setUsers] = useState<ExpenseShare[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCardUsage, setIsCardUsage] = useState(false);
  const [expenseType, setExpenseType] = useState<ExpenseType>('점심식대');
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ExpenseForm>();
  const [menus, setMenus] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // 사용자 목록 조회
        const usersResponse = await fetch('/api/users', {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
        const usersData = await usersResponse.json();
        
        // 사용자 목록을 이름 기준으로 정렬
        const sortedUsers = [...usersData.users].sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
        
        setUserOptions(sortedUsers);

        // 기존 내역 조회
        const expenseResponse = await fetch(`/api/expenses/${params.id}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
        const expenseData = await expenseResponse.json();
        
        if (expenseResponse.ok) {
          const { expense } = expenseData;
          setValue('date', expense.date);
          setValue('memo', expense.memo);
          setUsers(expense.users);
          setIsCardUsage(expense.isCardUsage);
          const type = ['점심식대', '저녁식대', '야근식대', '차대', '휴일근무'].find(t => t === expense.memo);
          setExpenseType(type ? type as ExpenseType : '기타');
          if (!type) setValue('memo', expense.memo);
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

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await fetch('/api/menus', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          },
          next: {
            revalidate: 0
          }
        });
        const data = await response.json();
        const sortedMenus = [...data.menus].sort((a, b) => 
          a.localeCompare(b, 'ko')
        );
        setMenus(['기타', ...sortedMenus]);
      } catch (error) {
        console.error('메뉴 목록 조회 실패:', error);
      }
    };

    fetchMenus();
  }, []);

  const updateUser = (index: number, field: keyof ExpenseShare, value: string | number | undefined) => {
    
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
    } else if (field === 'amount' && typeof value === 'string') {
      newUsers[index] = {
        ...newUsers[index],
        amount: parseAmount(value)
      };
    } else if (field === 'menu') {
      // menu 필드 업데이트 시 customMenu도 함께 처리
      newUsers[index] = {
        ...newUsers[index],
        menu: value as string,
        // '기타'가 아닌 경우 customMenu를 undefined로
        customMenu: value === '기타' ? newUsers[index].customMenu : undefined
      };
    } else if (field === 'customMenu') {
      newUsers[index] = {
        ...newUsers[index],
        customMenu: value as string
        // menu 값은 '기타'로 유지
      };
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
          'Pragma': 'no-cache',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
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
                  <div key={index} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        instanceId={`user-select-${index}`}
                        value={userOptions.find(option => option.name === user.name)}
                        onChange={(selected) => {
                          if (selected) {
                            updateUser(index, 'name', selected.name);
                          }
                        }}
                        options={userOptions}
                        getOptionLabel={(option) => option.name}
                        getOptionValue={(option) => option.email}
                        placeholder="사용자 선택"
                        className="flex-1"
                      />
                      <Input
                        type="text"
                        value={formatAmount(user.amount)}
                        onChange={(e) => updateUser(index, 'amount', parseAmount(e.target.value))}
                        placeholder="금액"
                        className="flex-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        instanceId={`menu-select-${index}`}
                        value={menus.includes(user.menu || '') ? { value: user.menu, label: user.menu } : null}
                        onChange={(selected) => {
                          if (selected) {
                            updateUser(index, 'menu', selected.value);
                          } else {
                            updateUser(index, 'menu', '');
                          }
                        }}
                        options={menus.map(menu => ({ value: menu, label: menu }))}
                        placeholder="메뉴 선택"
                        className="flex-1"
                        isClearable
                      />
                      {user.menu === '기타' && (
                        <Input
                          type="text"
                          value={user.customMenu || ''}
                          onChange={(e) => updateUser(index, 'customMenu', e.target.value)}
                          placeholder="메뉴 직접 입력"
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="점심식대">점심식대</option>
                    <option value="저녁식대">저녁식대</option>
                    <option value="야근식대">야근식대</option>
                    <option value="차대">차대</option>
                    <option value="휴일근무">휴일근무</option>
                    <option value="기타">기타</option>
                  </select>
                  {expenseType === '기타' && (
                    <Input
                      placeholder="사용내역"
                      {...register('memo')}
                      className="w-full"
                    />
                  )}
                </div>
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