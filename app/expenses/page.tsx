'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Expense {
  id: string;
  date: string;
  registrant: {
    name: string;
    email: string;
  };
  amount: number;
  memo: string;
  isCardUsage: boolean;
  users: {
    name: string;
    amount: number;
  }[];
}

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isCardUsage, setIsCardUsage] = useState<boolean | null>(null);
  const [viewType, setViewType] = useState<'registrant' | 'user'>('registrant');

  // 현�� 달의 시작일과 마지막 날을 계산
  const getDefaultDates = () => {
    const now = new Date();
    // 현재 달의 1일
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    // 다음 달의 0일 (현재 달의 마지막 날)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // YYYY-MM-DD 형식으로 변환
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay)
    };
  };

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (isCardUsage !== null) params.append('isCardUsage', isCardUsage.toString());
      params.append('viewType', viewType);

      const response = await fetch(`/api/expenses?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message);
        return;
      }

      setExpenses(data.expenses);
    } catch (error) {
      console.error('사용 내역 조회 중 오류 발생:', error);
      setError('사용 내역 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, isCardUsage, viewType]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(2); // 연도에서 뒤의 2자리만 사용
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  // 총액 계산
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message);
        return;
      }

      fetchExpenses(); // 목록 새로고침
    } catch (error) {
      setError('삭제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const getUserFromCookie = () => {
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        if (!cookies.user) {
          console.error('User cookie not found');
          return;
        }

        const userData = JSON.parse(decodeURIComponent(cookies.user));

        if (userData) {
          setUserName(userData.name);
          setUserEmail(userData.email);
        }
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    };

    getUserFromCookie();
  }, []);

  // 디버깅을 위한 로그
  useEffect(() => {
  }, [userName]);

  // 등록자 확인 함수 수정
  const isRegistrant = (registrantEmail: string) => {
    return registrantEmail === userEmail;
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        <Card>
          <CardHeader>
            <CardTitle>사용 내역 조회</CardTitle>
            <CardDescription>카드 사용 내역을 조회합니다.</CardDescription>
            <CardDescription className="text-red-500">자신이 결제한 내역만 등록해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="시작일"
                    className="w-full text-xs sm:text-sm appearance-none"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="종료일"
                    className="w-full text-xs sm:text-sm appearance-none"
                    style={{
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  />
                </div>
                <Button onClick={fetchExpenses} className="shrink-0">
                  조회
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">결제수단:</span>
                <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={isCardUsage === null}
                      onChange={() => setIsCardUsage(null)}
                      className="hidden"
                    />
                    <span className={`text-sm ${isCardUsage === null ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      전체
                    </span>
                  </label>
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
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">조회 유형:</span>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={viewType === 'registrant'}
                      onChange={() => setViewType('registrant')}
                      className="hidden"
                    />
                    <span className={`text-sm ${viewType === 'registrant' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      등록자
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="radio"
                      checked={viewType === 'user'}
                      onChange={() => setViewType('user')}
                      className="hidden"
                    />
                    <span className={`text-sm ${viewType === 'user' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      사용자
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="text-red-500 mb-4">{error}</div>
            )}

            <div className="relative border rounded-lg">
              <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                <div 
                  style={{ 
                    maxHeight: 'calc(100vh - 700px)',
                    WebkitOverflowScrolling: 'touch'
                  }} 
                  className="overflow-y-auto min-h-[300px]"
                >
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="bg-gray-100">
                        <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">날짜</th>
                        <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">사용자</th>
                        <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">금액</th>
                        <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">사용내역</th>
                        <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">카드유형</th>
                        <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">관리</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {expenses.map((expense) => (
                        expense.users.map((user, userIndex) => (
                          <tr key={`${expense.id}-${userIndex}`} className="hover:bg-gray-50">
                            <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-center">
                              {userIndex === 0 ? formatDate(expense.date) : ''}
                            </td>
                            <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-center">
                              {user.name}
                            </td>
                            <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-right">
                              {formatAmount(user.amount)}
                            </td>
                            <td className="border p-1 sm:p-2 text-xs sm:text-sm text-center max-w-[100px] truncate">
                              {userIndex === 0 ? expense.memo : ''}
                            </td>
                            <td className="border p-1 sm:p-2 text-xs sm:text-sm text-center">
                              {userIndex === 0 ? (expense.isCardUsage ? '법인' : '개인') : ''}
                            </td>
                            <td className="border p-1 sm:p-2 text-center">
                              {userIndex === 0 && isRegistrant(expense.registrant.email) && (
                                <div className="flex justify-center gap-1">
                                  <Button
                                    onClick={() => router.push(`/expenses/${expense.id}/edit`)}
                                    className="h-6 w-6 p-1"
                                    title="수정"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDelete(expense.id)}
                                    className="h-6 w-6 p-1 bg-red-500 hover:bg-red-600"
                                    title="삭제"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ))}

                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="border p-2 text-center text-gray-500 text-xs sm:text-sm">
                            조회된 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {expenses.length > 0 && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <div className="text-left font-semibold">
                  총액: {formatAmount(totalAmount)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={() => router.push('/expenses/create')}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl"
        style={{
          WebkitTapHighlightColor: 'transparent'
        }}
        title="새 내역 등록"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
} 