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

export default function CreateExpensePage() {
  const router = useRouter();
  const [users, setUsers] = useState<ExpenseShare[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [error, setError] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ExpenseForm>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCardUsage, setIsCardUsage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; companyName: string } | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [expenseType, setExpenseType] = useState<ExpenseType>('점심식대');
  const [isDrinking, setIsDrinking] = useState(false);
  const [menus, setMenus] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRegistrant, setSelectedRegistrant] = useState<UserOption | null>(null);

  useEffect(() => {
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
            name: userData.name,
            companyName: userData.companyName
          });
          
          setUsers([{ 
            email: userData.email, 
            name: userData.name, 
            amount: 0,
            menu: ''
          }]);

          setIsAdmin(userData.role === 'ADMIN');
          if (userData.role === 'ADMIN') {
            setSelectedRegistrant({
              email: userData.email,
              name: userData.name,
              companyName: userData.companyName
            });
          }
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
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        if (cookies.user) {
          const userData = JSON.parse(decodeURIComponent(cookies.user));
          setCurrentUser({
            email: userData.email,
            name: userData.name,
            companyName: userData.companyName
          });

          // 회사명을 포함하여 사용자 목록 조회
          const response = await fetch(`/api/users?companyName=${userData.companyName}`);
          const data = await response.json();
          setUserOptions(data.users);
        }
      } catch (error) {
        console.error('사용자 목록 조회 중 오류 발생:', error);
      }
    };

    fetchUsers();
  }, []);

  // 오늘 날짜를 YYYY-MM-DD 형식으로 설정
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setValue('date', `${year}-${month}-${day}`);
  }, [setValue]);

  const addUser = () => {
    setUsers([...users, { email: '', name: '', amount: 0, menu: '' }]);
  };

  const removeUser = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

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
        // menu 값은 변경하지 않음
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
      const formData = {
        ...data,
        isDrinking,
        memo: expenseType === '기타' ? data.memo : expenseType,
        isCardUsage,
        users,
        registrant: isAdmin && selectedRegistrant ? selectedRegistrant : currentUser
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        },
        body: JSON.stringify(formData),
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

  // 금액 균등 배분 함수
  const distributeAmount = () => {
    if (totalAmount <= 0 || users.length === 0) return;
    
    const amountPerUser = Math.floor(totalAmount / users.length); // 소수점 버림
    const remainder = totalAmount - (amountPerUser * users.length); // 나머지 금액
    
    const newUsers = users.map((user, index) => ({
      ...user,
      amount: amountPerUser + (index === 0 ? remainder : 0) // 나머지 금액은 첫 번째 사용자에게 추가
    }));
    
    setUsers(newUsers);
  };

  // 총액 변경 들러
  const handleTotalAmountChange = (value: string) => {
    setTotalAmount(parseAmount(value));
  };

  // 메뉴 목록 조회
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

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        <Card>
          <CardHeader>
            <CardTitle>사용 내역 등록</CardTitle>
            <CardDescription>카드 사용 내역을 등록하세요.</CardDescription>
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

              {/* 총액 입력과 균등 배분 버튼 */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formatAmount(totalAmount)}
                    onChange={(e) => setTotalAmount(parseAmount(e.target.value))}
                    placeholder="총액"
                    className="text-right"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={distributeAmount}
                    className="whitespace-nowrap"
                    disabled={totalAmount <= 0 || users.length === 0}
                  >
                    균등 배분
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (users.length <= 1) return;
                      const firstUserMenu = users[0].menu;
                      const firstUserCustomMenu = users[0].customMenu;
                      
                      const newUsers = users.map((user, index) => {
                        if (index === 0) return user; // 첫 번째 사용자는 그대로
                        return {
                          ...user,
                          menu: firstUserMenu,
                          customMenu: firstUserCustomMenu
                        };
                      });
                      setUsers(newUsers);
                    }}
                    className="whitespace-nowrap"
                    disabled={users.length <= 1}
                  >
                    메뉴 통일
                  </Button>
                </div>
              </div>

              {/* 사용자별 금액 입력 */}
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
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '40px',
                          })
                        }}
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
                <Button 
                  type="button" 
                  onClick={addUser}
                  className="w-full h-9 text-sm"
                >
                  + 사용자 추가
                </Button>
              </div>

              {/* 현재 총액 표시 */}
              <div className="text-right text-sm text-gray-500">
                현재 총액: {users.reduce((sum, user) => sum + (user.amount || 0), 0).toLocaleString()}원
                {totalAmount > 0 && users.reduce((sum, user) => sum + (user.amount || 0), 0) !== totalAmount && (
                  <span className="text-red-500 ml-2">
                    (입력한 총액과 다릅니다)
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2 items-center">
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
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={isDrinking}
                      onChange={(e) => setIsDrinking(e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${isDrinking ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      술
                    </span>
                  </label>
                  {expenseType === '기타' && (
                    <Input
                      placeholder="사용내역"
                      {...register('memo')}
                      className="w-full"
                    />
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">등록자 선택</label>
                  <Select
                    value={selectedRegistrant}
                    onChange={(selected) => setSelectedRegistrant(selected)}
                    options={userOptions}
                    getOptionLabel={(option) => `${option.name} (${option.email})`}
                    getOptionValue={(option) => option.email}
                    placeholder="등록자 선택"
                    className="w-full"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '40px',
                      })
                    }}
                  />
                </div>
              )}

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