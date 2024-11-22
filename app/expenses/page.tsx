'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";

interface Expense {
  id: string;
  date: string;
  registrant: {
    name: string;
    email: string;
  };
  user: {
    name: string;
    email: string;
  };
  amount: number;
  memo: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState<string>('');

  // 현재 달의 시작일과 마지막 날을 계산
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

      const response = await fetch(`/api/expenses?${params}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message);
        return;
      }

      setExpenses(data.expenses);
    } catch (error) {
      setError('사용 내역 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []); // 컴포넌트 마운트 시 자동으로 조회

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
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
        // 쿠키 문자열 파싱
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as { [key: string]: string });

        // user 쿠키 확인
        if (!cookies.user) {
          console.error('User cookie not found');
          return;
        }

        // JSON 파싱
        const userData = JSON.parse(decodeURIComponent(cookies.user));

        if (userData && userData.name) {
          setUserName(userData.name);
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

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>사용 내역 조회</CardTitle>
            <CardDescription>법인카드 사용 내역을 조회합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="시작일"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="종료일"
                />
              </div>
              <Button onClick={fetchExpenses}>
                조회
              </Button>
            </div>

            {error && (
              <div className="text-red-500 mb-4">{error}</div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">날짜</th>
                    <th className="border p-2 text-left">등록자</th>
                    <th className="border p-2 text-left">사용자</th>
                    <th className="border p-2 text-right">금액</th>
                    <th className="border p-2 text-left">비고</th>
                    <th className="border p-2 text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="border p-2">{formatDate(expense.date)}</td>
                      <td className="border p-2">{expense.registrant.name}</td>
                      <td className="border p-2">{expense.user.name}</td>
                      <td className="border p-2 text-right">{formatAmount(expense.amount)}</td>
                      <td className="border p-2">{expense.memo}</td>
                      <td className="border p-2 text-center">
                        {expense.registrant.name === userName && (
                          <div className="flex justify-center gap-2">
                            <Button
                              onClick={() => router.push(`/expenses/${expense.id}/edit`)}
                            >
                              수정
                            </Button>
                            <Button
                              onClick={() => handleDelete(expense.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              삭제
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {expenses.length > 0 && (
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={3} className="border p-2 text-right">총액</td>
                      <td className="border p-2 text-right">{formatAmount(totalAmount)}</td>
                      <td className="border p-2"></td>
                    </tr>
                  )}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="border p-2 text-center text-gray-500">
                        조회된 내역이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <Button onClick={() => router.push('/expenses/create')}>
                새 내역 등록
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 