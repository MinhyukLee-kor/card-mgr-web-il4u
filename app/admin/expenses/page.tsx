'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import Select from 'react-select';

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

interface UserOption {
  email: string;
  name: string;
}

type ExpenseType = '전체' | '점심식대' | '저녁식대' | '야근식대' | '차대' | '휴일근무' | '기타';

export default function AdminExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCardUsage, setIsCardUsage] = useState<boolean | null>(null);
  const [viewType, setViewType] = useState<'date' | 'summary'>('date');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('전체');
  const [selectedExpenseTypes, setSelectedExpenseTypes] = useState<ExpenseType[]>(['전체']);

  // 현재 달의 시작일과 마지막 날을 계산
  const getDefaultDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
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

  // 사용자 목록 조회
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const data = await response.json();
        
        // 사용자 목록을 이름 기준으로 정렬
        const sortedUsers = [...data.users].sort((a, b) => 
          a.name.localeCompare(b.name, 'ko')
        );
        
        setUserOptions(sortedUsers);
      } catch (error) {
        console.error('사용자 목록 조회 실패:', error);
      }
    };

    fetchUsers();
  }, []);

  // fetchData 함수를 useEffect 밖으로 이동
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (isCardUsage !== null) params.append('isCardUsage', isCardUsage.toString());
      if (selectedUser) params.append('selectedUser', selectedUser);
      params.append('viewType', viewType === 'date' ? 'admin' : 'admin-summary');
      
      if (selectedExpenseTypes.length > 0) {
        params.append('expenseTypes', selectedExpenseTypes.join(','));
      }

      const response = await fetch(`/api/expenses?${params}`, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('데이터 조회 실패');
      }

      const data = await response.json();
      setExpenses(data.expenses);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('데이터 조회 중 오류가 발생했습니.');
    } finally {
      setIsLoading(false);
    }
  };

  // useEffect에서는 fetchData 함수 호출
  useEffect(() => {
    fetchData();
  }, [router, isCardUsage, viewType, selectedUser]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + '원';
  };

  // 총액 계산
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // viewType 변경 핸들러 추가
  const handleViewTypeChange = (type: 'date' | 'summary') => {
    setExpenses([]); // 데이터 초기화
    setViewType(type);
  };

  const handleExpenseTypeChange = (type: ExpenseType, checked: boolean) => {
    setSelectedExpenseTypes(prev => {
      let newTypes: ExpenseType[];
      
      if (type === '전체') {
        newTypes = checked ? ['전체'] : [];
      } else {
        const withoutAll = prev.filter(t => t !== '전체');
        
        if (checked) {
          newTypes = [...withoutAll, type];
        } else {
          newTypes = withoutAll.filter(t => t !== type);
        }
      }
      
      return newTypes;
    });
  };

  return (
    <>
      {isLoading && <Loading />}
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        <Card>
          <CardHeader>
            <CardTitle>관리자 사용 내역 조회</CardTitle>
            <CardDescription>전체 사용 내역을 조회합니다.</CardDescription>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={() => fetchData()}
                  className="w-24 h-10"
                >
                  조회
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">조회 유형:</span>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer">
                    <input
                      type="radio"
                      checked={viewType === 'date'}
                      onChange={() => handleViewTypeChange('date')}
                      className="hidden"
                    />
                    <span className={`text-sm ${viewType === 'date' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      날짜-금액
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer">
                    <input
                      type="radio"
                      checked={viewType === 'summary'}
                      onChange={() => handleViewTypeChange('summary')}
                      className="hidden"
                    />
                    <span className={`text-sm ${viewType === 'summary' ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      사용자-합계
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">결제수단:</span>
                <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer">
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
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer">
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
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer">
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
                <span className="text-sm font-medium">사용내역:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('전체')}
                      onChange={(e) => handleExpenseTypeChange('전체', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('전체') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      전체
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('점심식대')}
                      onChange={(e) => handleExpenseTypeChange('점심식대', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('점심식대') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      점심식대
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('저녁식대')}
                      onChange={(e) => handleExpenseTypeChange('저녁식대', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('저녁식대') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      저녁식대
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('야근식대')}
                      onChange={(e) => handleExpenseTypeChange('야근식대', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('야근식대') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      야근식대
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('차대')}
                      onChange={(e) => handleExpenseTypeChange('차대', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('차대') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      차대
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('휴일근무')}
                      onChange={(e) => handleExpenseTypeChange('휴일근무', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('휴일근무') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      휴일근무
                    </span>
                  </label>
                  <label className="flex items-center justify-center px-3 py-2 border rounded-md bg-white cursor-pointer transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedExpenseTypes.includes('기타')}
                      onChange={(e) => handleExpenseTypeChange('기타', e.target.checked)}
                      className="hidden"
                    />
                    <span className={`text-sm ${selectedExpenseTypes.includes('기타') ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}>
                      기타
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm font-medium">사용자:</span>
                <Select
                  value={userOptions.find(option => option.name === selectedUser)}
                  onChange={(selected) => setSelectedUser(selected ? selected.name : '')}
                  options={[
                    { name: '전체', email: '' },
                    ...userOptions
                  ]}
                  getOptionLabel={(option) => option.name}
                  getOptionValue={(option) => option.email}
                  placeholder="사용자 선택"
                  className="flex-1 sm:w-60"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '40px',
                      borderColor: 'rgb(226, 232, 240)',
                      '&:hover': {
                        borderColor: 'rgb(226, 232, 240)'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 50
                    })
                  }}
                  theme={(theme) => ({
                    ...theme,
                    colors: {
                      ...theme.colors,
                      primary: '#2563eb',
                      primary25: '#eff6ff'
                    }
                  })}
                />
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
                    <thead className="sticky top-0 bg-white z-40">
                      <tr className="bg-gray-100">
                        {viewType === 'date' ? (
                          <>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">날짜</th>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">사용자</th>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">금액</th>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">사용내역</th>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">카드유형</th>
                          </>
                        ) : (
                          <>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">사용자</th>
                            <th className="border p-1 sm:p-2 text-center whitespace-nowrap text-xs sm:text-sm">총 사용금액</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {expenses.map((expense, index) => (
                        <tr key={`${expense.id}-${expense.users[0]?.name}`} className="hover:bg-gray-50">
                          {viewType === 'date' ? (
                            <>
                              <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-center">
                                {index === 0 || formatDate(expense.date) !== formatDate(expenses[index - 1].date)
                                  ? formatDate(expense.date)
                                  : ''}
                              </td>
                              <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-center">
                                {expense.users[0]?.name}
                              </td>
                              <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-right">
                                {formatAmount(expense.amount)}
                              </td>
                              <td className="border p-1 sm:p-2 text-xs sm:text-sm text-center max-w-[100px] truncate">
                                {expense.memo}
                              </td>
                              <td className="border p-1 sm:p-2 text-xs sm:text-sm text-center">
                                {expense.isCardUsage ? '법인' : '개인'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-center">
                                {expense.users[0]?.name}
                              </td>
                              <td className="border p-1 sm:p-2 whitespace-nowrap text-xs sm:text-sm text-right">
                                {formatAmount(expense.amount)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}

                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="border p-2 text-center text-gray-500 text-xs sm:text-sm">
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
                <div className="text-right font-semibold">
                  총액: {formatAmount(totalAmount)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
} 